"""
AETHON — FastAPI Backend
All 10 endpoints from API_CONTRACT.md, wired to real intelligence.

Run locally:
    cd backend
    uvicorn main:app --reload --port 8080

Or via docker-compose (port 8080).
"""
from __future__ import annotations

import asyncio
import json
import os
import threading
import time
import uuid
from pathlib import Path
from typing import Optional

import aiofiles
from fastapi import FastAPI, File, HTTPException, UploadFile, WebSocket, WebSocketDisconnect, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import config
from config import UPLOAD_DIR, MAX_CONCURRENT_INGESTS
from ingest import load_and_chunk, _infer_doc_type
from embeddings import embed_and_store, count as vec_count, delete_doc, list_docs
from graph import (
    init_db,
    add_chunks_to_graph,
    get_graph,
    delete_doc_from_graph,
    relationship_count,
)
from agents import (
    compliance_audit,
    detect_conflicts,
    dashboard_stats as _dashboard_stats,
    scoreboard as _scoreboard,
    root_cause_analysis,
)
from auth import USERS, create_access_token, get_current_user

# ── App ──────────────────────────────────────────────────────────────────────
app = FastAPI(title="AETHON Backend", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Init graph DB on startup
init_db()

# In-memory document registry (persisted via a JSON sidecar in UPLOAD_DIR).
# A single shared dict is the source of truth; every read-modify-write goes
# through _registry_lock so concurrent ingestion tasks can't clobber each
# other's updates (the previous per-task snapshot approach lost updates).
_DOC_REGISTRY_PATH = UPLOAD_DIR / "_registry.json"
_registry: dict[str, dict] | None = None
# RLock (reentrant) so a thread that already holds the lock can call helpers
# that also acquire it (e.g. _patch_registry -> _load_registry) without
# deadlocking on itself.
_registry_lock = threading.RLock()


def _load_registry() -> dict[str, dict]:
    """Return the shared in-memory registry, loading from disk on first use."""
    global _registry
    with _registry_lock:
        if _registry is None:
            if _DOC_REGISTRY_PATH.exists():
                with open(_DOC_REGISTRY_PATH) as f:
                    _registry = json.load(f)
            else:
                _registry = {}
        return _registry


def _save_registry() -> None:
    """Persist the shared registry to disk atomically (temp file + rename)."""
    global _registry
    tmp = _DOC_REGISTRY_PATH.with_suffix(".json.tmp")
    with _registry_lock:
        with open(tmp, "w") as f:
            json.dump(_registry, f, indent=2)
        tmp.replace(_DOC_REGISTRY_PATH)


def _patch_registry(doc_id: str, **fields) -> None:
    """Atomically update one document's fields and persist.

    Loads the shared registry under the lock, applies the field updates, and
    writes it back — so concurrent tasks never overwrite each other.
    """
    with _registry_lock:
        reg = _registry if _registry is not None else _load_registry()
        reg.setdefault(doc_id, {})
        reg[doc_id].update(fields)
        _save_registry()


# ── Startup recovery ────────────────────────────────────────────────────────
# After a crash/restart no ingestion tasks are running, so any document left in
# a non-terminal state (parsing/embedding/queued) is orphaned. Reset those to
# "failed" so the UI never shows a doc stuck forever.
def _recover_orphaned_docs() -> None:
    reg = _load_registry()
    orphaned = False
    for doc_id, info in reg.items():
        if info.get("status") not in ("indexed", "failed"):
            reg[doc_id]["status"] = "failed"
            orphaned = True
    if orphaned:
        _save_registry()


_recover_orphaned_docs()


# Limits how many documents are processed (parsed → embedded → graphed) at once.
# Uploads beyond the limit are queued until a slot frees up. Created lazily
# inside the running event loop so it binds to the correct loop (a module-level
# Semaphore created before uvicorn starts would bind to the wrong loop and fail
# to actually limit concurrency).
_ingest_semaphore: asyncio.Semaphore | None = None


async def _get_ingest_semaphore() -> asyncio.Semaphore:
    global _ingest_semaphore
    if _ingest_semaphore is None:
        _ingest_semaphore = asyncio.Semaphore(MAX_CONCURRENT_INGESTS)
    return _ingest_semaphore


# ── WebSocket connections ────────────────────────────────────────────────────
_ws_connections: list[WebSocket] = []


async def _broadcast(msg: dict) -> None:
    for ws in _ws_connections[:]:
        try:
            await ws.send_json(msg)
        except Exception:
            _ws_connections.remove(ws)


# ══════════════════════════════════════════════════════════════════════════
# 0. AUTHENTICATION
# ══════════════════════════════════════════════════════════════════════════
class LoginRequest(BaseModel):
    username: str
    password: str

@app.post("/auth/login")
async def login(req: LoginRequest):
    user = USERS.get(req.username)
    if not user or user["password"] != req.password:
        raise HTTPException(status_code=401, detail="Invalid username or password")
    
    token = create_access_token(req.username, user["role"])
    return {"token": token, "role": user["role"]}


# ══════════════════════════════════════════════════════════════════════════
# 1. HEALTH
# ══════════════════════════════════════════════════════════════════════════
@app.get("/health")
async def health():
    try:
        import ollama
        ollama.list()
        model_ok = True
    except Exception:
        model_ok = False

    return {
        "status": "ok" if model_ok else "degraded",
        "model":  config.LLM_MODEL,
        "corpus_docs": vec_count(),
    }


# ══════════════════════════════════════════════════════════════════════════
# 2. COPILOT (RAG) ⭐
# ══════════════════════════════════════════════════════════════════════════
class QueryRequest(BaseModel):
    query: str


@app.post("/copilot/query")
async def copilot_query(req: QueryRequest, user: dict = Depends(get_current_user)):
    if not req.query.strip():
        raise HTTPException(400, "Query cannot be empty")
    if vec_count() == 0:
        raise HTTPException(503, "No documents indexed yet. Please upload documents first.")

    # Run blocking RAG in a thread so we don't block the event loop
    from rag import answer as rag_answer
    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(None, rag_answer, req.query)
    return result


# ══════════════════════════════════════════════════════════════════════════
# 3. DOCUMENTS
# ══════════════════════════════════════════════════════════════════════════
@app.get("/documents")
async def get_documents(user: dict = Depends(get_current_user)):
    registry = _load_registry()
    docs = [
        {
            "id":          doc_id,
            "name":        info["name"],
            "type":        info["type"],
            "status":      info["status"],
            "pages":       info.get("pages", 0),
            "ingested_at": info["ingested_at"],
        }
        for doc_id, info in registry.items()
    ]
    return {"documents": sorted(docs, key=lambda d: d["ingested_at"], reverse=True)}


# ══════════════════════════════════════════════════════════════════════════
# 4. INGEST (upload) ⭐
# ══════════════════════════════════════════════════════════════════════════
ACCEPTED_TYPES = {".pdf", ".docx", ".txt", ".csv", ".xlsx", ".png", ".jpg", ".html", ".htm"}
MAX_BYTES = 50 * 1024 * 1024  # 50 MB


@app.post("/ingest", status_code=202)
async def ingest(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    ext = Path(file.filename).suffix.lower()
    if ext not in ACCEPTED_TYPES:
        raise HTTPException(415, f"Unsupported file type: {ext}")

    # Size check
    contents = await file.read()
    if len(contents) > MAX_BYTES:
        raise HTTPException(413, "File exceeds 50 MB limit")

    doc_id   = str(uuid.uuid4())[:8]
    doc_name = file.filename
    dest     = UPLOAD_DIR / f"{doc_id}_{doc_name}"

    async with aiofiles.open(dest, "wb") as f:
        await f.write(contents)

    # Register as "queued"
    _patch_registry(
        doc_id,
        name=doc_name,
        type=_infer_doc_type(doc_name),
        status="queued",
        pages=0,
        ingested_at=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    )

    # Kick off background processing (concurrency-limited via semaphore)
    asyncio.create_task(_process_doc(doc_id, dest, doc_name))

    return {"id": doc_id, "name": doc_name, "status": "queued"}


async def _process_doc(doc_id: str, path: Path, doc_name: str) -> None:
    """Background task: parse → embed → graph extract, push progress via WS.

    Acquires the ingestion semaphore so only MAX_CONCURRENT_INGESTS documents
    are processed simultaneously; the rest wait their turn.
    """
    async def _update(stage: str, progress: int):
        _patch_registry(doc_id, status=stage)
        await _broadcast({"id": doc_id, "stage": stage, "progress": progress})

    sem = await _get_ingest_semaphore()
    async with sem:
        try:
            await _update("parsing", 10)
            loop = asyncio.get_event_loop()

            # 1. Parse + chunk
            chunks = await loop.run_in_executor(None, load_and_chunk, path)
            _patch_registry(doc_id, pages=max((c["page"] for c in chunks), default=0))

            await _update("embedding", 35)

            # 2. Embed + store in ChromaDB
            await loop.run_in_executor(None, embed_and_store, chunks)

            await _update("embedding", 75)

            # 3. Knowledge graph extraction
            await loop.run_in_executor(None, add_chunks_to_graph, chunks)

            await _update("indexed", 100)

        except Exception as e:
            _patch_registry(doc_id, status="failed")
            await _broadcast({"id": doc_id, "stage": "failed", "progress": 0, "error": str(e)})


# ══════════════════════════════════════════════════════════════════════════
# 5. INGESTION PROGRESS (WebSocket) ⭐
# ══════════════════════════════════════════════════════════════════════════
@app.websocket("/ws/ingest")
async def ws_ingest(ws: WebSocket):
    await ws.accept()
    _ws_connections.append(ws)
    try:
        while True:
            await ws.receive_text()  # keep alive
    except WebSocketDisconnect:
        if ws in _ws_connections:
            _ws_connections.remove(ws)


# ══════════════════════════════════════════════════════════════════════════
# 6. KNOWLEDGE GRAPH
# ══════════════════════════════════════════════════════════════════════════
@app.get("/graph")
async def get_graph_endpoint(user: dict = Depends(get_current_user)):
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, get_graph)


# ══════════════════════════════════════════════════════════════════════════
# 7. COMPLIANCE
# ══════════════════════════════════════════════════════════════════════════
@app.get("/compliance/audit")
async def get_compliance(user: dict = Depends(get_current_user)):
    if vec_count() == 0:
        raise HTTPException(503, "No documents indexed yet.")
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, compliance_audit)


# ══════════════════════════════════════════════════════════════════════════
# 8. CONFLICTS
# ══════════════════════════════════════════════════════════════════════════
@app.get("/conflicts")
async def get_conflicts(user: dict = Depends(get_current_user)):
    if vec_count() == 0:
        return {"conflicts": []}
    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(None, detect_conflicts)
    return {"conflicts": result}


# ══════════════════════════════════════════════════════════════════════════
# 9. DASHBOARD STATS
# ══════════════════════════════════════════════════════════════════════════
@app.get("/dashboard/stats")
async def dashboard(user: dict = Depends(get_current_user)):
    return _dashboard_stats()


# ══════════════════════════════════════════════════════════════════════════
# 10. SCOREBOARD
# ══════════════════════════════════════════════════════════════════════════
@app.get("/scoreboard")
async def scoreboard_endpoint(user: dict = Depends(get_current_user)):
    return _scoreboard()


# ══════════════════════════════════════════════════════════════════════════
# 11. RCA (Root Cause Analysis)
# ══════════════════════════════════════════════════════════════════════════
@app.get("/rca/{equipment}")
async def get_rca(equipment: str, user: dict = Depends(get_current_user)):
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, root_cause_analysis, equipment)
