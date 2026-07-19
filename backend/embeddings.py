"""
AETHON — Embeddings & Vector Store (ChromaDB)
Stage 2 of the ingestion pipeline.

Wraps ChromaDB with:
  - embed_and_store(chunks)  → ingest list of Chunk dicts
  - retrieve(query, k)       → top-k semantically similar chunks
  - delete_doc(doc_name)     → remove a document from the store
  - count()                  → total stored chunks

Embeddings are generated with the Mistral embedding model (config.EMBED_MODEL).
"""
from __future__ import annotations

import hashlib
import threading
from typing import Any

import chromadb
from chromadb.config import Settings
from config import (
    CHROMA_PATH, CHROMA_URL, CHROMA_CLOUD_API_KEY, CHROMA_TENANT,
    CHROMA_DATABASE, COLLECTION, EMBED_MODEL, RETRIEVAL_K, LLM_MODEL, client,
)


# Serializes ChromaDB write operations (upsert/delete). ChromaDB's client is
# shared process-wide, so concurrent writes from multiple ingestion tasks can
# collide; this lock makes them safe.
_write_lock = threading.Lock()


# ── ChromaDB client (mode auto-selected from env) ───────────────────────────
# Priority: Chroma Cloud (CHROMA_CLOUD_API_KEY) > Server (CHROMA_URL) > Local (CHROMA_PATH)
def _build_client():
    if CHROMA_CLOUD_API_KEY:
        # Managed Chroma Cloud (https://www.trychroma.com)
        return chromadb.CloudClient(
            api_key=CHROMA_CLOUD_API_KEY,
            tenant=CHROMA_TENANT,
            database=CHROMA_DATABASE,
        )
    if CHROMA_URL:
        # Self-hosted Chroma HTTP server (Docker / remote)
        from urllib.parse import urlparse
        parsed = urlparse(CHROMA_URL)
        # Fall back to raw string if not a standard URL (e.g. just a hostname)
        host = parsed.hostname or CHROMA_URL
        port = parsed.port or 8000
        print(f"📊 Connecting to remote ChromaDB server at: {host}:{port}")
        return chromadb.HttpClient(
            host=host,
            port=port,
            settings=Settings(anonymized_telemetry=False),
        )
    # Local on-disk persistent store (default, dev)
    print(f"📊 Initialized local persistent ChromaDB at: {CHROMA_PATH}")
    return chromadb.PersistentClient(
        path=CHROMA_PATH,
        settings=Settings(anonymized_telemetry=False),
    )


_client = _build_client()
_col = _client.get_or_create_collection(
    name=COLLECTION,
    metadata={"hnsw:space": "cosine"},
)


# ── Embedding ───────────────────────────────────────────────────────────────

def _embed(texts: list[str]) -> list[list[float]]:
    """Call Embeddings API. Returns list of embedding vectors.
    Automatically batches requests to avoid hitting token/batch size limits.
    """
    batch_size = 50
    all_embeddings = []
    for i in range(0, len(texts), batch_size):
        batch = texts[i:i + batch_size]
        resp = client.embeddings.create(model=EMBED_MODEL, input=batch)
        all_embeddings.extend([item.embedding for item in resp.data])
    return all_embeddings


def _chunk_id(doc_name: str, chunk_index: int) -> str:
    raw = f"{doc_name}::{chunk_index}"
    return hashlib.md5(raw.encode()).hexdigest()


# ── Reranking ───────────────────────────────────────────────────────────────

def _llm_rerank(query: str, hits: list[dict], k: int) -> list[dict]:
    """
    Reranks hits based on query similarity scoring.
    """
    import json
    import re

    # We format a clean list of candidates for the LLM to score
    candidates = []
    for idx, hit in enumerate(hits):
        candidates.append(
            f"Passage [{idx}]:\n"
            f"Document: {hit['doc_name']}, Page: {hit['page']}\n"
            f"Content: {hit['text'][:350]}\n"
        )

    sep = "\n" + "="*40 + "\n"
    prompt = f"""You are a precise search result reranking assistant for industrial plant operations.
Analyze the following retrieved passage candidates and determine their relevance to the user query.
For each passage, assign a relevance score between 0 and 100, where:
- 100 means the passage contains the exact and complete answer to the query.
- 0 means the passage is completely irrelevant to the query.

User Query: {query}

Passage Candidates:
{"="*40}
{sep.join(candidates)}
{"="*40}

Output your analysis strictly as a JSON array of objects, where each object has "index" (integer) and "score" (number from 0 to 100). Do not include any explanations or extra text.

Example output:
[
  {{"index": 0, "score": 92.5}},
  {{"index": 1, "score": 34.0}}
]

JSON:"""

    try:
        resp = client.chat.completions.create(
            model=LLM_MODEL,
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
            temperature=0.0,
            max_tokens=512,
        )
        raw = resp.choices[0].message.content.strip()
        m = re.search(r"\[.*\]", raw, re.DOTALL)
        if m:
            scores_list = json.loads(m.group())
            # Map new scores back to hits
            for item in scores_list:
                idx = int(item.get("index", -1))
                score = float(item.get("score", 0.0))
                if 0 <= idx < len(hits):
                    hits[idx]["score"] = score

            # Re-sort hits by their new reranked score
            hits.sort(key=lambda x: x["score"], reverse=True)
    except Exception as e:
        # If reranking fails for any reason (e.g. timeout, formatting), fallback gracefully to vector scores
        print(f"[Reranker Warning] LLM reranking failed: {e}. Falling back to vector store scores.")

    return hits[:k]


# ── Public API ───────────────────────────────────────────────────────────────

def embed_and_store(chunks: list[dict]) -> int:
    """
    Embed all chunks and upsert into ChromaDB.
    Returns number of chunks stored.
    """
    global _col
    if not chunks:
        return 0

    ids       = [_chunk_id(c["doc_name"], c["chunk_index"]) for c in chunks]
    texts     = [c["text"] for c in chunks]
    metadatas = [
        {
            "doc_name":    c["doc_name"],
            "page":        c["page"],
            "chunk_index": c["chunk_index"],
            "doc_type":    c["doc_type"],
        }
        for c in chunks
    ]

    # Embed in one pass (batch)
    vectors = _embed(texts)

    with _write_lock:
        try:
            _col.upsert(
                ids=ids,
                embeddings=vectors,
                documents=texts,
                metadatas=metadatas,
            )
        except Exception as e:
            err_str = str(e).lower()
            if "dimension" in err_str or "dimensionality" in err_str:
                print("⚠️ ChromaDB Dimension Mismatch detected. Re-creating collection...")
                try:
                    _client.delete_collection(COLLECTION)
                except Exception:
                    pass
                _col = _client.get_or_create_collection(
                    name=COLLECTION,
                    metadata={"hnsw:space": "cosine"},
                )
                _col.upsert(
                    ids=ids,
                    embeddings=vectors,
                    documents=texts,
                    metadatas=metadatas,
                )
            else:
                raise e
    return len(chunks)


def retrieve(query: str, k: int = RETRIEVAL_K, rerank: bool = True) -> list[dict]:
    """
    Semantic search. Returns top-k chunks sorted by relevance, with optional LLM reranking.
    Each result: {text, doc_name, page, doc_type, score}
    """
    if _col.count() == 0:
        return []
    # If reranking, retrieve more candidates first
    retrieve_k = min(2 * k, _col.count()) if rerank else min(k, _col.count())

    vec = _embed([query])[0]
    results = _col.query(
        query_embeddings=[vec],
        n_results=retrieve_k,
        include=["documents", "metadatas", "distances"],
    )

    hits = []
    for doc, meta, dist in zip(
        results["documents"][0],
        results["metadatas"][0],
        results["distances"][0],
    ):
        # cosine distance → similarity score (0–100)
        score = round((1 - dist) * 100, 1)
        hits.append(
            {
                "text":     doc,
                "doc_name": meta["doc_name"],
                "page":     meta["page"],
                "doc_type": meta["doc_type"],
                "score":    score,
            }
        )

    if rerank and len(hits) > 1:
        return _llm_rerank(query, hits, k)

    return hits[:k]


def delete_doc(doc_name: str) -> int:
    """Remove all chunks belonging to a document. Returns count removed."""
    where = {"doc_name": {"$eq": doc_name}}
    existing = _col.get(where=where, include=[])
    ids = existing["ids"]
    if ids:
        with _write_lock:
            _col.delete(ids=ids)
    return len(ids)


def count() -> int:
    return _col.count()


def list_docs() -> list[str]:
    """Return sorted list of unique document names in the store."""
    if _col.count() == 0:
        return []
    all_meta = _col.get(include=["metadatas"])["metadatas"]
    return sorted({m["doc_name"] for m in all_meta})


# ── CLI helper ───────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import sys
    from ingest import load_and_chunk
    from pathlib import Path

    if len(sys.argv) < 2:
        print(f"Total chunks in store: {count()}")
        print("Docs:", list_docs())
        sys.exit(0)

    pdf = Path(sys.argv[1])
    chunks = load_and_chunk(pdf)
    n = embed_and_store(chunks)
    print(f"Stored {n} chunks from {pdf.name}")
    print(f"Total in store: {count()}")
