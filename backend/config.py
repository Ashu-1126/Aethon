"""
AETHON Backend — Configuration
Reads environment variables; falls back to sensible local defaults.
"""
import os
from pathlib import Path

for env_path in [Path(".env"), Path("../.env"), Path(".env.local"), Path("../.env.local")]:
    if env_path.exists():
        with open(env_path) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    k = k.strip()
                    v = v.strip().strip('"').strip("'")
                    os.environ[k] = v

# ── AI Model Configuration (Mistral API) ───────────────────────────────────
MISTRAL_API_KEY: str = os.getenv("MISTRAL_API_KEY", "")
MISTRAL_BASE_URL: str = "https://api.mistral.ai/v1"
LLM_MODEL:       str = os.getenv("LLM_MODEL", "mistral-small-latest")
EMBED_MODEL:     str = os.getenv("EMBED_MODEL", "mistral-embed")

from openai import OpenAI
client = OpenAI(
    api_key=MISTRAL_API_KEY,
    base_url=MISTRAL_BASE_URL,
)

# ── ChromaDB ───────────────────────────────────────────────────────────────
CHROMA_PATH: str = os.getenv("CHROMA_PATH", "./data/chroma")
COLLECTION:  str = "aethon_corpus"

# ── SQLite graph ───────────────────────────────────────────────────────────
GRAPH_DB_PATH: str = os.getenv("GRAPH_DB_PATH", "./data/graph.db")

# ── Ingestion ──────────────────────────────────────────────────────────────
CHUNK_SIZE:    int = 750   # target tokens per chunk
CHUNK_OVERLAP: int = 80    # overlap tokens

# ── Upload storage ─────────────────────────────────────────────────────────
DATA_DIR: Path = Path(os.getenv("DATA_DIR", "./data"))
DATA_DIR.mkdir(parents=True, exist_ok=True)
UPLOAD_DIR: Path = Path(os.getenv("UPLOAD_DIR", str(DATA_DIR / "uploads")))
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# ── RAG ────────────────────────────────────────────────────────────────────
RETRIEVAL_K:     int   = 6     # chunks to retrieve
CONFIDENCE_SCALE: float = 100.0

# ── Concurrency ────────────────────────────────────────────────────────────
# Max number of documents allowed to be processed (parsed/embedded/graphed)
# at the same time. Extra uploads are queued until a slot frees up.
MAX_CONCURRENT_INGESTS: int = int(os.getenv("MAX_CONCURRENT_INGESTS", "2"))
