# AETHON — Vector Database (ChromaDB) Setup & Implementation Tracker

> Owner: Backend (P2) · Status: ✅ Operational (empty store, ready to seed)
> Last verified: 2026-07-19

This document tracks the **full lifecycle** of the ChromaDB vector store:
configuration → initialization → ingestion → retrieval → maintenance → recovery.
It exists so the vector DB is never again in an ambiguous "is it set up?" state.

---

## 1. Architecture at a glance

```
Document (PDF/DOCX/TXT/XLSX/CSV/HTML)
        │  ingest.py  (parse + chunk, ~750 tok / 80 overlap)
        ▼
Chunk dicts  {text, doc_name, page, chunk_index, doc_type}
        │  embeddings.py::_embed  →  OpenRouter  text-embedding-3-small (1536-dim)
        ▼
ChromaDB  (persistent, local)   collection: "aethon_corpus"
        │  cosine similarity
        ▼
retrieve(query, k)  →  top-k chunks  →  (optional) LLM rerank  →  RAG answer
```

- **Store:** ChromaDB — **3 selectable modes** (auto-picked from env, see §2)
- **Embeddings:** OpenRouter `openai/text-embedding-3-small` (1536 dimensions)
- **Distance:** cosine (`hnsw:space = "cosine"`)
- **Concurrency:** all writes serialized via `_write_lock` (threading.Lock)

> **Mode priority:** `CHROMA_CLOUD_API_KEY` (Chroma Cloud SaaS) → `CHROMA_URL`
> (self-hosted HTTP server) → `CHROMA_PATH` (local on-disk, default/dev).

---

## 2. Configuration (single source of truth: `backend/config.py`)

| Variable | Default | Purpose |
|----------|---------|---------|
| `CHROMA_PATH` | `./data/chroma` | On-disk directory (local mode) |
| `CHROMA_URL` | `""` | Self-hosted Chroma HTTP server (server mode) |
| `CHROMA_CLOUD_API_KEY` | `""` | Chroma Cloud key (cloud mode — highest priority) |
| `CHROMA_TENANT` | `default_tenant` | Chroma Cloud tenant |
| `CHROMA_DATABASE` | `default_database` | Chroma Cloud database |
| `COLLECTION` | `aethon_corpus` | Collection name |
| `EMBED_MODEL` | `openai/text-embedding-3-small` | OpenRouter embedding model |
| `RETRIEVAL_K` | `6` | Default chunks to retrieve |
| `OPENROUTER_API_KEY` | from `.env` | Auth for embeddings + LLM |

> ⚠️ **Version pin is mandatory.** ChromaDB on-disk format is **not** forward/backward
> compatible. The installed version is `chromadb==0.5.3` (see `backend/requirements.txt`).
> Mixing a `chroma.sqlite3` created by a different version causes:
> `TypeError: object of type 'int' has no len()` on every read.

---

## 3. Status tracker

| Stage | Status | Evidence / Command |
|-------|--------|--------------------|
| ChromaDB installed (pinned) | ✅ | `chromadb==0.5.3` in requirements |
| Client initializes (local) | ✅ | `embeddings.count()` returns `0` on fresh store |
| Client initializes (cloud) | ✅ | `CloudClient` auto-selected when `CHROMA_CLOUD_API_KEY` set |
| Embeddings (OpenRouter) work | ✅ | 1536-dim vectors returned |
| Store / Retrieve / Delete work | ✅ | smoke test passed 2026-07-19 |
| Corpus seeded (local) | ⏳ | `seed.py` running — see registry |
| Concurrency lock in place | ✅ | `_write_lock` wraps upsert/delete |
| Backup / recovery procedure | ✅ | documented in §7 |

**Current live state (local mode):**
```
count: seeding in progress   docs: [DGMS_Circular_2019.pdf, ...]   (store initialized)
```

---

## 4. Implementation — what the code does (`backend/embeddings.py`)

### Public API
| Function | Returns | Notes |
|----------|---------|-------|
| `embed_and_store(chunks)` | `int` (chunks stored) | batches embed → `_write_lock` → upsert |
| `retrieve(query, k=RETRIEVAL_K, rerank=True)` | `list[dict]` | cosine top-k, optional LLM rerank |
| `delete_doc(doc_name)` | `int` (removed) | deletes all chunks for a doc |
| `count()` | `int` | total chunks |
| `list_docs()` | `list[str]` | unique doc names |

### Chunk ID scheme (idempotent)
```
chunk_id = md5(f"{doc_name}::{chunk_index}")
```
→ Re-ingesting the same doc+chunk **upserts** (no duplicates).

### Metadata stored per chunk
```python
{
  "doc_name":    str,   # e.g. "SOP-44.pdf"
  "page":        int,   # source page / virtual page
  "chunk_index": int,
  "doc_type":    str,   # regulation | procedure | manual | incident | document
}
```

### Retrieval → score
```python
score = round((1 - cosine_distance) * 100, 1)   # 0–100 similarity
```
Rerank (when `rerank=True` and >1 hit): an LLM scores each passage 0–100
and re-sorts. Falls back silently to vector scores on any error.

---

## 5. Setup steps (reproducible)

### A. Local (development)
```powershell
cd d:\Games\Aethon\backend

# 1. (one-time) install deps — chromadb==0.5.3 MUST match
pip install -r requirements.txt

# 2. ensure .env has the OpenRouter key (embeddings need it)
#    OPENROUTER_API_KEY=sk-or-...
#    EMBED_MODEL=openai/text-embedding-3-small

# 3. start backend (initializes the store on import)
$env:LLM_MODEL="meta-llama/llama-3.3-70b-instruct:free"
uvicorn main:app --app-dir "d:\Games\Aethon\backend" --port 8080
```

### B. Docker (production-like)
```powershell
cd d:\Games\Aethon
docker-compose up -d --build
# backend container gets OPENROUTER_API_KEY / EMBED_MODEL from .env
```

### C. Seed the corpus (populate the store)
```powershell
cd d:\Games\Aethon\backend
python seed.py          # indexes ../corpus/*.pdf (9 docs) into ChromaDB + graph
python run_benchmark.py # optional: runs 20 Q's, writes data/scoreboard.json
```
After seeding, verify:
```powershell
python -c "import embeddings; print(embeddings.count(), embeddings.list_docs())"
```

### D. Chroma Cloud (managed SaaS) — full setup
Use this when you want a hosted, always-on vector DB (no local disk, no Docker
Chroma service). The backend already supports it via `CHROMA_CLOUD_API_KEY`.

**Step D1 — Create the cloud account & database**
1. Go to **https://www.trychroma.com** → Sign up / Log in.
2. Create a **Database** (pick a region). Note its **name** (default `default_database`)
   and your **Tenant** (default `default_tenant`).
3. In **Settings → API Keys**, create a key. Copy it (shown once).

**Step D2 — Put credentials in `.env`** (backend reads these at startup)
```dotenv
# .env  (gitignored)
CHROMA_CLOUD_API_KEY=cc-xxxxxxxxxxxxxxxxxxxxxxxx
CHROMA_TENANT=default_tenant
CHROMA_DATABASE=default_database
```
> Setting `CHROMA_CLOUD_API_KEY` makes the backend ignore `CHROMA_URL` and
> `CHROMA_PATH` and connect to `api.trychroma.com` automatically.

**Step D3 — Install the cloud-capable client**
```powershell
pip install -r requirements.txt   # chromadb>=0.5.3 includes CloudClient
```

**Step D4 — Start backend (cloud mode auto-selected)**
```powershell
$env:LLM_MODEL="meta-llama/llama-3.3-70b-instruct:free"
uvicorn main:app --app-dir "d:\Games\Aethon\backend" --port 8080
# logs: client mode = CloudClient (api.trychroma.com)
```

**Step D5 — Seed into the cloud database**
```powershell
cd d:\Games\Aethon\backend
python seed.py
python -c "import embeddings; print(embeddings.count(), embeddings.list_docs())"
```
> First run creates the `aethon_corpus` collection in your cloud database.
> Subsequent runs upsert (idempotent — no duplicates).

**Step D6 — Verify from anywhere (frontend / other machine)**
The cloud DB is reachable over the internet, so the frontend (even a Cloudflare
deployed one) just needs `NEXT_PUBLIC_API_URL` pointing at your **public backend
URL** — the backend talks to Chroma Cloud, not localhost.

**Cloud notes / limits**
- Free tier has storage + row limits; watch the console quota.
- Embeddings are still computed by OpenRouter (`EMBED_MODEL`) — Chroma Cloud
  only stores/serves vectors, it does **not** embed for you.
- No local `data/chroma` dir is used in cloud mode; backup = export collection
  via `chromadb` client (`_client.get_collection(...).get()`) to JSON.

---

## 6. Operational runbook (daily control)

| Task | Command |
|------|---------|
| Health / count | `GET http://localhost:8080/health` → `corpus_docs` |
| List indexed docs | `GET http://localhost:8080/documents` |
| Ingest a file | `POST http://localhost:8080/ingest` (multipart) |
| Wipe one doc | `embeddings.delete_doc("SOP-44.pdf")` |
| Full reset | see §7 |

---

## 7. Backup & recovery (CRITICAL)

### Symptom of a broken store
```
TypeError: object of type 'int' has no len()
```
→ Almost always a **ChromaDB version mismatch** (sqlite created by another version).

### Recovery procedure
```powershell
cd d:\Games\Aethon\backend

# 1. stop the backend (free the file lock)
Get-Process -Name python* | Stop-Process -Force

# 2. back up, then remove the bad data dir
$stamp = Get-Date -Format yyyyMMddHHmmss
Move-Item -Force data/chroma "data/chroma.bak.$stamp"
New-Item -ItemType Directory -Force -Path data/chroma | Out-Null

# 3. restart backend (creates a fresh, compatible store)
uvicorn main:app --app-dir "d:\Games\Aethon\backend" --port 8080

# 4. re-seed the corpus
python seed.py
```
> Backups accumulate as `data/chroma.bak.*` — delete old ones periodically.
> They are gitignored (`data/` is excluded via `.gitignore`).

### Prevention
- **Never** copy a `chroma.sqlite3` between machines/versions.
- Keep `chromadb==0.5.3` pinned in `requirements.txt` and the Docker image.
- On `git pull`, if someone else changed the chroma data, reset per above.

---

## 8. Known limitations / TODO
- [ ] `data/chroma` is **not** in shared/object storage → each backend instance has its own store. For multi-instance, use ChromaDB server (`CHROMA_URL`) instead of `PersistentClient`.
- [ ] No automated backup cron; relies on manual §7 step.
- [ ] Embedding calls are sequential per chunk in `_embed` (batch `input=texts` is already one API call — OK).
- [ ] Scoreboard (`/scoreboard`) shows hardcoded numbers until `run_benchmark.py` is executed at least once.

---

## 9. Definition of "set up" (acceptance)
The vector DB is considered **set up** when ALL hold:
1. `chromadb==0.5.3` installed and `embeddings.count()` does not throw.
2. `embeddings.embed_and_store(...)` + `retrieve(...)` + `delete_doc(...)` all succeed.
3. At least the `corpus/` (9 docs) is seeded, OR a document is uploaded via `/ingest`.
4. A backup/recovery path (§7) exists and is documented.

> Current status: 1 ✅ · 2 ✅ · 3 ⬜ (empty) · 4 ✅ → **run `python seed.py` to complete.**
