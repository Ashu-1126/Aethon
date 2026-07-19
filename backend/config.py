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

# ── OpenRouter ─────────────────────────────────────────────────────────────
OPENROUTER_API_KEY:  str = os.getenv("OPENROUTER_API_KEY", "")
OPENROUTER_BASE_URL: str = "https://openrouter.ai/api/v1"
LLM_MODEL:           str = os.getenv("LLM_MODEL", "meta-llama/llama-3.3-70b-instruct:free")
EMBED_MODEL:         str = os.getenv("EMBED_MODEL", "openai/text-embedding-3-small")

from openai import OpenAI
client = OpenAI(
    api_key=OPENROUTER_API_KEY,
    base_url=OPENROUTER_BASE_URL,
)

# ── ChromaDB ───────────────────────────────────────────────────────────────
CHROMA_PATH: str = os.getenv("CHROMA_PATH", "./data/chroma")
COLLECTION:  str = "aethon_corpus"

# Vector store endpoint (self-hosted / Docker Chroma server).
# e.g. http://chromadb:8000  — takes precedence over CHROMA_PATH when set.
CHROMA_URL: str = os.getenv("CHROMA_URL", "")

# ── Chroma Cloud (managed SaaS) ────────────────────────────────────────────
# Set CHROMA_CLOUD_API_KEY to use Chroma Cloud (https://www.trychroma.com).
# When set, it takes precedence over CHROMA_URL and CHROMA_PATH.
# Get the key + tenant/database from the Chroma Cloud console.
CHROMA_CLOUD_API_KEY: str = os.getenv("CHROMA_CLOUD_API_KEY", "")
CHROMA_TENANT:        str = os.getenv("CHROMA_TENANT", "default_tenant")
CHROMA_DATABASE:      str = os.getenv("CHROMA_DATABASE", "default_database")

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

# ── Concurrency ────────────────────────────────────────────────────────────
# Max number of documents allowed to be processed (parsed/embedded/graphed)
# at the same time. Extra uploads are queued until a slot frees up.
MAX_CONCURRENT_INGESTS: int = int(os.getenv("MAX_CONCURRENT_INGESTS", "2"))
