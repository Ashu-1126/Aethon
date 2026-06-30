"""
AETHON — Embeddings & Vector Store (ChromaDB)
Stage 2 of the ingestion pipeline.

Wraps ChromaDB with:
  - embed_and_store(chunks)  → ingest list of Chunk dicts
  - retrieve(query, k)       → top-k semantically similar chunks
  - delete_doc(doc_name)     → remove a document from the store
  - count()                  → total stored chunks
"""
from __future__ import annotations

import hashlib
from typing import Any

import chromadb
from chromadb.config import Settings
import ollama

from config import CHROMA_PATH, COLLECTION, EMBED_MODEL, RETRIEVAL_K


# ── ChromaDB client (persistent, local) ────────────────────────────────────
_client = chromadb.PersistentClient(
    path=CHROMA_PATH,
    settings=Settings(anonymized_telemetry=False),
)
_col = _client.get_or_create_collection(
    name=COLLECTION,
    metadata={"hnsw:space": "cosine"},
)


# ── Embedding ───────────────────────────────────────────────────────────────

def _embed(texts: list[str]) -> list[list[float]]:
    """Call Ollama nomic-embed-text. Returns list of embedding vectors."""
    vectors: list[list[float]] = []
    # Ollama embed endpoint handles one text at a time; batch in loop
    for text in texts:
        resp = ollama.embeddings(model=EMBED_MODEL, prompt=text)
        vectors.append(resp["embedding"])
    return vectors


def _chunk_id(doc_name: str, chunk_index: int) -> str:
    raw = f"{doc_name}::{chunk_index}"
    return hashlib.md5(raw.encode()).hexdigest()


# ── Public API ───────────────────────────────────────────────────────────────

def embed_and_store(chunks: list[dict]) -> int:
    """
    Embed all chunks and upsert into ChromaDB.
    Returns number of chunks stored.
    """
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

    _col.upsert(
        ids=ids,
        embeddings=vectors,
        documents=texts,
        metadatas=metadatas,
    )
    return len(chunks)


def retrieve(query: str, k: int = RETRIEVAL_K) -> list[dict]:
    """
    Semantic search.  Returns top-k chunks sorted by relevance.
    Each result: {text, doc_name, page, doc_type, score}
    """
    vec = _embed([query])[0]
    results = _col.query(
        query_embeddings=[vec],
        n_results=min(k, _col.count()),
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
    return hits


def delete_doc(doc_name: str) -> int:
    """Remove all chunks belonging to a document. Returns count removed."""
    where = {"doc_name": {"$eq": doc_name}}
    existing = _col.get(where=where, include=[])
    ids = existing["ids"]
    if ids:
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
