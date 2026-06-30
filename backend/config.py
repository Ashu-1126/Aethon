"""
AETHON Backend — Configuration
Reads environment variables; falls back to sensible local defaults.
"""
import os
from pathlib import Path

# ── Ollama ─────────────────────────────────────────────────────────────────
OLLAMA_BASE_URL: str = os.getenv("OLLAMA_URL", "http://localhost:11434")
LLM_MODEL:       str = os.getenv("LLM_MODEL", "llama3.1:8b")
EMBED_MODEL:     str = os.getenv("EMBED_MODEL", "nomic-embed-text")

# ── ChromaDB ───────────────────────────────────────────────────────────────
CHROMA_PATH: str = os.getenv("CHROMA_PATH", "./data/chroma")
COLLECTION:  str = "aethon_corpus"

# ── SQLite graph ───────────────────────────────────────────────────────────
GRAPH_DB_PATH: str = os.getenv("GRAPH_DB_PATH", "./data/graph.db")

# ── Ingestion ──────────────────────────────────────────────────────────────
CHUNK_SIZE:    int = 750   # target tokens per chunk
CHUNK_OVERLAP: int = 80    # overlap tokens

# ── Upload storage ─────────────────────────────────────────────────────────
UPLOAD_DIR: Path = Path(os.getenv("UPLOAD_DIR", "./data/uploads"))
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# ── RAG ────────────────────────────────────────────────────────────────────
RETRIEVAL_K:     int   = 6     # chunks to retrieve
CONFIDENCE_SCALE: float = 100.0
