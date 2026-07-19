"""
AETHON — Core RAG Engine  ⭐
Stage 3: Retrieval + Answer Generation

answer(query) → {answer, sources, confidence}

Pipeline:
  1. Embed query → semantic search in ChromaDB (top-k)
  2. Build citation-aware prompt with retrieved chunks
  3. Call the configured LLM (config.LLM_MODEL) → generate answer
  4. Parse cited sources from the response
  5. Compute confidence from top chunk similarity score
"""
from __future__ import annotations

import re

from config import LLM_MODEL, RETRIEVAL_K, client
from embeddings import retrieve


# ══════════════════════════════════════════════════════════════════════════
# PROMPT TEMPLATE
# ══════════════════════════════════════════════════════════════════════════

_SYSTEM_PROMPT = """\
You are AETHON, an industrial knowledge intelligence system for plant operations.
You answer questions about equipment, safety procedures, maintenance, and regulatory compliance.

Rules:
- Answer ONLY from the provided context chunks.
- Every factual claim MUST cite its source using [DOC:filename, PAGE:n] format.
- If the context is insufficient, say so clearly — do not guess.
- Be concise and factual. Use bullet points for multiple findings.
- Start with the direct answer (Yes/No/Explanation), then elaborate.
"""

_USER_PROMPT = """\
Context chunks (use these to answer):
{context}

{graph_context}

---
Question: {query}

Answer (cite every fact as [DOC:filename, PAGE:n]):"""


# ══════════════════════════════════════════════════════════════════════════
# HELPERS
# ══════════════════════════════════════════════════════════════════════════

def _build_context(hits: list[dict]) -> str:
    parts = []
    for i, h in enumerate(hits, 1):
        parts.append(
            f"[{i}] Source: {h['doc_name']} | Page: {h['page']} | Score: {h['score']}\n"
            f"{h['text']}"
        )
    return "\n\n".join(parts)


def _parse_sources(answer: str, hits: list[dict]) -> list[dict]:
    """
    Extract cited sources from the answer.
    Looks for [DOC:..., PAGE:...] patterns and also falls back to
    matching doc names mentioned in the answer.
    """
    cited: list[dict] = []
    seen: set[str] = set()

    # Pattern 1: explicit [DOC:..., PAGE:...] citations
    pattern = re.compile(r"\[DOC:([^,\]]+),\s*PAGE:(\d+)\]", re.IGNORECASE)
    for m in pattern.finditer(answer):
        doc_name = m.group(1).strip()
        page = int(m.group(2))
        key = f"{doc_name}:{page}"
        if key not in seen:
            seen.add(key)
            # Find the snippet from the matching hit
            snippet = next(
                (h["text"][:200] for h in hits if h["doc_name"] == doc_name and h["page"] == page),
                "",
            )
            cited.append({"doc_name": doc_name, "page": page, "snippet": snippet})

    # Pattern 2: fallback — top-2 retrieved chunks if no explicit citations
    if not cited:
        for h in hits[:2]:
            key = f"{h['doc_name']}:{h['page']}"
            if key not in seen:
                seen.add(key)
                cited.append(
                    {"doc_name": h["doc_name"], "page": h["page"], "snippet": h["text"][:200]}
                )

    return cited


def _confidence(hits: list[dict]) -> int:
    """Compute confidence from top hit's similarity score (0–100).

    The floor was previously 30, which made low-relevance answers look
    confident. Now the score is reported proportionally (capped at 97) so a
    weak match surfaces as low confidence instead of being padded.
    """
    if not hits:
        return 0
    top = hits[0]["score"]  # already 0-100 from embeddings.retrieve()
    # Scale: very high similarity (>90) → cap at 97, lower → proportional
    return min(97, int(top))


# ══════════════════════════════════════════════════════════════════════════
# PUBLIC API
# ══════════════════════════════════════════════════════════════════════════

def _fetch_graph_keyword_match(query: str) -> tuple[list[dict], list[dict]]:
    """Helper to query SQLite graph for nodes/edges matching the query keywords."""
    from graph import _conn, init_db
    init_db()
    nodes_list = []
    edges_list = []
    if query:
        try:
            with _conn() as con:
                query_term = f"%{query}%"
                nodes_rows = con.execute(
                    "SELECT id, label, type FROM nodes WHERE label LIKE ?",
                    (query_term,)
                ).fetchall()
                nodes_list = [dict(r) for r in nodes_rows]
                if nodes_list:
                    node_ids = [n["id"] for n in nodes_list]
                    placeholders = ",".join("?" for _ in node_ids)
                    edges_rows = con.execute(
                        f"SELECT from_id, to_id, relation FROM edges WHERE from_id IN ({placeholders}) OR to_id IN ({placeholders})",
                        node_ids + node_ids
                    ).fetchall()
                    edges_list = [dict(r) for r in edges_rows]
        except Exception:
            pass
    return nodes_list, edges_list


def _compress_context(hits: list[dict], query: str) -> str:
    """Compress context chunks by scoring sentences based on query keyword overlap to filter out boilerplate noise."""
    import re
    
    stop_words = {"what", "who", "where", "when", "why", "how", "is", "are", "was", "were", "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "with", "by", "of", "about"}
    query_words = {w.strip().lower() for w in re.split(r'\W+', query) if w.strip() and w.lower() not in stop_words}
    
    compressed_parts = []
    for h in hits:
        text = h["text"]
        doc_name = h["doc_name"]
        page = h["page"]
        
        # Split into sentences
        sentences = re.split(r'(?<=[.!?])\s+', text)
        scored_sents = []
        for s in sentences:
            s_clean = s.strip()
            if not s_clean:
                continue
            words = {w.lower() for w in re.split(r'\W+', s_clean) if w.strip()}
            overlap = len(query_words.intersection(words))
            # Base score on keyword overlap
            score = overlap * 2.0
            if any(c.isdigit() for c in s_clean):
                score += 0.5
            scored_sents.append((score, s_clean))
            
        # Filter: keep only sentences that have query keywords or if chunk is small
        keep = []
        for score, s_clean in scored_sents:
            if score > 0 or len(scored_sents) <= 3:
                keep.append(s_clean)
                
        if keep:
            comp_text = " ".join(keep)
            comp_text = re.sub(r'\s+', ' ', comp_text).strip()
            compressed_parts.append(
                f"Source: {doc_name} | Page: {page}\n{comp_text}"
            )
            
    return "\n\n".join(compressed_parts)


def answer(query: str, k: int = RETRIEVAL_K) -> dict:
    """
    Core RAG function.
    Uses Semantic Cache, Parallel Retrieval, and Context Compression.
    """
    # 1. Semantic Cache Check
    from embeddings import check_semantic_cache, set_semantic_cache
    cached_val = check_semantic_cache(query)
    if cached_val is not None:
        return cached_val

    # 2. Parallel Retrieval
    from concurrent.futures import ThreadPoolExecutor
    with ThreadPoolExecutor(max_workers=2) as executor:
        future_hits = executor.submit(retrieve, query, k=k)
        future_graph = executor.submit(_fetch_graph_keyword_match, query)
        
        hits = future_hits.result()
        q_nodes, q_edges = future_graph.result()

    if not hits:
        return {
            "answer": (
                "No relevant information found in the corpus for that question. "
                "Please ingest documents first, or try rephrasing."
            ),
            "sources": [],
            "confidence": 0,
        }

    # 3. Context Compression
    context = _compress_context(hits, query)

    # 4. Integrate SQLite Graph Context (Doc-specific + Keyword-specific)
    from graph import _conn
    doc_names = list({h["doc_name"] for h in hits})
    doc_nodes = []
    doc_edges = []
    try:
        with _conn() as con:
            placeholders = ",".join("?" for _ in doc_names)
            doc_nodes = [dict(r) for r in con.execute(
                f"SELECT id, label, type FROM nodes WHERE doc_name IN ({placeholders})", doc_names
            ).fetchall()]
            doc_edges = [dict(r) for r in con.execute(
                f"SELECT from_id, to_id, relation FROM edges WHERE doc_name IN ({placeholders})", doc_names
            ).fetchall()]
    except Exception:
        pass

    # Merge nodes and edges
    merged_nodes = {n["id"]: n for n in doc_nodes + q_nodes}
    merged_edges = []
    seen_edges = set()
    for e in doc_edges + q_edges:
        edge_key = f"{e['from_id']}:{e['to_id']}:{e['relation']}"
        if edge_key not in seen_edges:
            seen_edges.add(edge_key)
            merged_edges.append(e)

    # Build Graph context text
    graph_parts = []
    id_to_label = {nid: n["label"] for nid, n in merged_nodes.items()}
    if merged_nodes:
        graph_parts.append("Knowledge Graph Entities:")
        for n in merged_nodes.values():
            graph_parts.append(f"  - {n['label']} ({n['type']})")
    if merged_edges:
        graph_parts.append("Relationships:")
        for e in merged_edges:
            from_label = id_to_label.get(e["from_id"], e["from_id"])
            to_label = id_to_label.get(e["to_id"], e["to_id"])
            graph_parts.append(f"  - {from_label} --[{e['relation']}]--> {to_label}")
    graph_context = "\n".join(graph_parts)

    # 5. Generate Answer via LLM
    messages = [
        {"role": "system", "content": _SYSTEM_PROMPT},
        {"role": "user",   "content": _USER_PROMPT.format(context=context, graph_context=graph_context, query=query)},
    ]

    resp = client.chat.completions.create(
        model=LLM_MODEL,
        messages=messages,
        temperature=0.1,
        max_tokens=1024,
    )
    raw_answer = resp.choices[0].message.content.strip()

    # Parse sources and confidence
    sources = _parse_sources(raw_answer, hits)
    clean_answer = re.sub(r"\[DOC:[^\]]+\]", "", raw_answer).strip()
    confidence = _confidence(hits)

    # 6. Populate Semantic Cache
    set_semantic_cache(query, clean_answer or raw_answer, sources, confidence)

    return {
        "answer":     clean_answer or raw_answer,
        "sources":    sources,
        "confidence": confidence,
    }


# ══════════════════════════════════════════════════════════════════════════
# ⭐  DELIVERABLE 1 — standalone CLI script
# python rag.py path/to/doc.pdf "Does this procedure comply?"
# ══════════════════════════════════════════════════════════════════════════
if __name__ == "__main__":
    import sys
    import json
    from pathlib import Path
    from ingest import load_and_chunk
    from embeddings import embed_and_store, count

    if len(sys.argv) < 3:
        print("Usage: python rag.py <path/to/doc.pdf> '<query>'")
        sys.exit(1)

    pdf_path = Path(sys.argv[1])
    query    = sys.argv[2]

    print(f"\n📄 Loading & chunking: {pdf_path.name}...")
    chunks = load_and_chunk(pdf_path)
    print(f"   → {len(chunks)} chunks")

    print("🧮 Embedding & storing...")
    n = embed_and_store(chunks)
    print(f"   → stored {n} chunks  (total in store: {count()})")

    print(f"\n💬 Query: {query}")
    print("🧠 Generating answer...\n")

    result = answer(query)

    print("=" * 60)
    print("ANSWER:")
    print(result["answer"])
    print()
    print(f"CONFIDENCE: {result['confidence']}%")
    print()
    print("SOURCES:")
    for s in result["sources"]:
        print(f"  • {s['doc_name']} · p.{s['page']}")
        print(f"    \"{s['snippet'][:120]}...\"")

    print("=" * 60)
    print()
    print("JSON output:")
    print(json.dumps(result, indent=2))
