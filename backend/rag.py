"""
AETHON — Core RAG Engine  ⭐
Stage 3: Retrieval + Answer Generation

answer(query) → {answer, sources, confidence}

Pipeline:
  1. Embed query → semantic search in ChromaDB (top-k)
  2. Build citation-aware prompt with retrieved chunks
  3. Call llama3.1:8b → generate answer
  4. Parse cited sources from the response
  5. Compute confidence from top chunk similarity score
"""
from __future__ import annotations

import re

import ollama

from config import LLM_MODEL, RETRIEVAL_K
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
    """Compute confidence from top hit's similarity score (0–100)."""
    if not hits:
        return 0
    top = hits[0]["score"]  # already 0-100 from embeddings.retrieve()
    # Scale: very high similarity (>90) → cap at 97, lower → proportional
    return min(97, max(30, int(top)))


# ══════════════════════════════════════════════════════════════════════════
# PUBLIC API
# ══════════════════════════════════════════════════════════════════════════

def answer(query: str, k: int = RETRIEVAL_K) -> dict:
    """
    Core RAG function.
    Returns: {answer: str, sources: list[{doc_name, page, snippet}], confidence: int}
    """
    # 1. Retrieve relevant chunks
    hits = retrieve(query, k=k)

    if not hits:
        return {
            "answer": (
                "No relevant information found in the corpus for that question. "
                "Please ingest documents first, or try rephrasing."
            ),
            "sources": [],
            "confidence": 0,
        }

    # 2. Build context
    context = _build_context(hits)

    # 3. Call LLM
    messages = [
        {"role": "system", "content": _SYSTEM_PROMPT},
        {"role": "user",   "content": _USER_PROMPT.format(context=context, query=query)},
    ]

    resp = ollama.chat(
        model=LLM_MODEL,
        messages=messages,
        options={"temperature": 0.1, "num_predict": 1024},
    )
    raw_answer = resp["message"]["content"].strip()

    # 4. Parse sources
    sources = _parse_sources(raw_answer, hits)

    # 5. Clean up citation tags from answer text (optional: keep them for transparency)
    clean_answer = re.sub(r"\[DOC:[^\]]+\]", "", raw_answer).strip()

    return {
        "answer":     clean_answer or raw_answer,
        "sources":    sources,
        "confidence": _confidence(hits),
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
