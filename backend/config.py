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

# ── Mistral & OpenRouter Configuration ─────────────────────────────────────
MISTRAL_API_KEY: str = os.getenv("MISTRAL_API_KEY", "")

if MISTRAL_API_KEY:
    # Use native Mistral API
    LLM_MODEL:   str = os.getenv("LLM_MODEL", "mistral-small-latest")
    EMBED_MODEL: str = os.getenv("EMBED_MODEL", "mistral-embed")
    API_KEY:     str = MISTRAL_API_KEY
    BASE_URL:    str = os.getenv("MISTRAL_BASE_URL", "https://api.mistral.ai/v1")
else:
    # Fallback to OpenRouter (legacy)
    OPENROUTER_API_KEY:  str = os.getenv("OPENROUTER_API_KEY", "")
    OPENROUTER_BASE_URL: str = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")
    LLM_MODEL:           str = os.getenv("LLM_MODEL", "meta-llama/llama-3.3-70b-instruct:free")
    EMBED_MODEL:         str = os.getenv("EMBED_MODEL", "openai/text-embedding-3-small")
    API_KEY:             str = OPENROUTER_API_KEY
    BASE_URL:            str = OPENROUTER_BASE_URL

from openai import OpenAI
import httpx as _httpx
client = OpenAI(
    api_key=API_KEY,
    base_url=BASE_URL,
    http_client=_httpx.Client(),
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
