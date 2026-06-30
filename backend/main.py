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
import time
import uuid
from pathlib import Path
from typing import Optional

import aiofiles
from fastapi import FastAPI, File, HTTPException, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import config
from config import UPLOAD_DIR
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
)

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

# In-memory document registry (persisted via a JSON sidecar in UPLOAD_DIR)
_DOC_REGISTRY_PATH = UPLOAD_DIR / "_registry.json"


def _load_registry() -> dict[str, dict]:
    if _DOC_REGISTRY_PATH.exists():
        with open(_DOC_REGISTRY_PATH) as f:
            return json.load(f)
    return {}


def _save_registry(reg: dict) -> None:
    with open(_DOC_REGISTRY_PATH, "w") as f:
        json.dump(reg, f, indent=2)


# ── WebSocket connections ────────────────────────────────────────────────────
_ws_connections: list[WebSocket] = []


async def _broadcast(msg: dict) -> None:
    for ws in _ws_connections[:]:
        try:
            await ws.send_json(msg)
        except Exception:
            _ws_connections.remove(ws)


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
async def copilot_query(req: QueryRequest):
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
async def get_documents():
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
ACCEPTED_TYPES = {".pdf", ".docx", ".txt", ".csv", ".xlsx", ".png", ".jpg"}
MAX_BYTES = 50 * 1024 * 1024  # 50 MB


@app.post("/ingest", status_code=202)
async def ingest(file: UploadFile = File(...)):
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
    registry = _load_registry()
    registry[doc_id] = {
        "name":        doc_name,
        "type":        _infer_doc_type(doc_name),
        "status":      "queued",
        "pages":       0,
        "ingested_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }
    _save_registry(registry)

    # Kick off background processing
    asyncio.create_task(_process_doc(doc_id, dest, doc_name))

    return {"id": doc_id, "name": doc_name, "status": "queued"}


async def _process_doc(doc_id: str, path: Path, doc_name: str) -> None:
    """Background task: parse → embed → graph extract, push progress via WS."""
    registry = _load_registry()

    async def _update(stage: str, progress: int):
        registry[doc_id]["status"] = stage
        _save_registry(registry)
        await _broadcast({"id": doc_id, "stage": stage, "progress": progress})

    try:
        await _update("parsing", 10)
        loop = asyncio.get_event_loop()

        # 1. Parse + chunk
        chunks = await loop.run_in_executor(None, load_and_chunk, path)
        registry[doc_id]["pages"] = max((c["page"] for c in chunks), default=0)
        _save_registry(registry)

        await _update("embedding", 35)

        # 2. Embed + store in ChromaDB
        await loop.run_in_executor(None, embed_and_store, chunks)

        await _update("embedding", 75)

        # 3. Knowledge graph extraction
        await loop.run_in_executor(None, add_chunks_to_graph, chunks)

        await _update("indexed", 100)

    except Exception as e:
        registry[doc_id]["status"] = "failed"
        _save_registry(registry)
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
async def get_graph_endpoint():
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, get_graph)


# ══════════════════════════════════════════════════════════════════════════
# 7. COMPLIANCE
# ══════════════════════════════════════════════════════════════════════════
@app.get("/compliance/audit")
async def get_compliance():
    if vec_count() == 0:
        raise HTTPException(503, "No documents indexed yet.")
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, compliance_audit)


# ══════════════════════════════════════════════════════════════════════════
# 8. CONFLICTS
# ══════════════════════════════════════════════════════════════════════════
@app.get("/conflicts")
async def get_conflicts():
    if vec_count() == 0:
        return {"conflicts": []}
    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(None, detect_conflicts)
    return {"conflicts": result}


# ══════════════════════════════════════════════════════════════════════════
# 9. DASHBOARD STATS
# ══════════════════════════════════════════════════════════════════════════
@app.get("/dashboard/stats")
async def dashboard():
    return _dashboard_stats()


# ══════════════════════════════════════════════════════════════════════════
# 10. SCOREBOARD
# ══════════════════════════════════════════════════════════════════════════
@app.get("/scoreboard")
async def scoreboard_endpoint():
    return _scoreboard()
