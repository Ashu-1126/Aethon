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
    add_document_to_db,
    update_document_status_in_db,
    get_documents_from_db,
    delete_document_from_db,
    add_chat_log,
    get_chat_history,
    clear_chat_history,
)
from agents import (
    compliance_audit,
    detect_conflicts,
    dashboard_stats as _dashboard_stats,
    scoreboard as _scoreboard,
    root_cause_analysis,
    generate_rewrite,
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


# ── Startup recovery ────────────────────────────────────────────────────────
# After a crash/restart no ingestion tasks are running, so any document left in
# a non-terminal state (parsing/embedding/queued) is orphaned. Reset those to
# "failed" so the UI never shows a doc stuck forever.
def _recover_orphaned_docs() -> None:
    import sqlite3
    from config import GRAPH_DB_PATH
    try:
        con = sqlite3.connect(GRAPH_DB_PATH, timeout=30.0)
        con.execute("PRAGMA journal_mode=WAL;")
        con.execute(
            "UPDATE documents SET status = 'failed' WHERE status NOT IN ('indexed', 'failed')"
        )
        con.commit()
        con.close()
    except Exception:
        pass


_recover_orphaned_docs()


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
        from config import client
        client.with_options(timeout=5.0).models.list()
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
    loop = asyncio.get_running_loop()
    result = await loop.run_in_executor(None, rag_answer, req.query)
    
    # Persist chat log in DB with sources and confidence
    add_chat_log(
        user["username"],
        req.query,
        result.get("answer", ""),
        sources=result.get("sources", []),
        confidence=result.get("confidence", 0)
    )
    
    return result


@app.get("/copilot/history")
async def get_history(user: dict = Depends(get_current_user)):
    history = get_chat_history(user["username"])
    return {"history": history}


@app.delete("/copilot/history")
async def clear_history(user: dict = Depends(get_current_user)):
    clear_chat_history(user["username"])
    return {"status": "success", "message": "Chat history cleared successfully"}


# ══════════════════════════════════════════════════════════════════════════
# 3. DOCUMENTS
# ══════════════════════════════════════════════════════════════════════════
@app.get("/documents")
async def get_documents(user: dict = Depends(get_current_user)):
    docs = get_documents_from_db()
    return {"documents": docs}


@app.delete("/documents/{doc_id}")
async def delete_document(doc_id: str, user: dict = Depends(get_current_user)):
    import sqlite3
    from config import GRAPH_DB_PATH
    con = sqlite3.connect(GRAPH_DB_PATH)
    row = con.execute("SELECT name FROM documents WHERE id=?", (doc_id,)).fetchone()
    con.close()
    if not row:
        raise HTTPException(status_code=404, detail="Document not found")
    doc_name = row[0]

    # 1. Delete vectors from ChromaDB
    delete_doc(doc_name)

    # 2. Delete from Graph & Document DB
    delete_doc_from_graph(doc_name)
    delete_document_from_db(doc_id)

    # 3. Delete file from local storage
    try:
        for p in UPLOAD_DIR.glob(f"{doc_id}_*"):
            p.unlink()
    except Exception:
        pass

    return {"status": "success", "message": f"Document '{doc_name}' deleted successfully"}


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

    # Register as "queued" in DB
    add_document_to_db(
        doc_id,
        name=doc_name,
        doc_type=_infer_doc_type(doc_name),
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
        update_document_status_in_db(doc_id, status=stage)
        await _broadcast({"id": doc_id, "stage": stage, "progress": progress})

    sem = await _get_ingest_semaphore()
    async with sem:
        try:
            await _update("parsing", 10)
            loop = asyncio.get_running_loop()

            # 1. Parse + chunk
            chunks = await loop.run_in_executor(None, load_and_chunk, path)
            update_document_status_in_db(doc_id, status="parsing", pages=max((c["page"] for c in chunks), default=0))

            await _update("embedding", 35)

            # 2. Embed + store in ChromaDB
            await loop.run_in_executor(None, embed_and_store, chunks)

            await _update("embedding", 75)

            # 3. Knowledge graph extraction
            await loop.run_in_executor(None, add_chunks_to_graph, chunks)

            await _update("indexed", 100)

        except Exception as e:
            import traceback
            traceback.print_exc()
            update_document_status_in_db(doc_id, status="failed")
            await _broadcast({"id": doc_id, "stage": "failed", "progress": 0, "error": str(e)})


# ══════════════════════════════════════════════════════════════════════════
# 5. INGESTION PROGRESS (WebSocket) ⭐
# ══════════════════════════════════════════════════════════════════════════
@app.websocket("/ws/ingest")
async def ws_ingest(ws: WebSocket):
    await ws.accept()
    _ws_connections.append(ws)
    # Notify the client it is subscribed so the UI can show "live" state.
    try:
        await ws.send_json({"type": "connected"})
    except Exception:
        _ws_connections.remove(ws)
        return
    try:
        # Server→client push channel: progress is broadcast via _broadcast().
        # We still read from the socket so that a client disconnect (or a
        # ping/close frame) is detected promptly and the connection cleaned up.
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        if ws in _ws_connections:
            _ws_connections.remove(ws)


# ══════════════════════════════════════════════════════════════════════════
# 6. KNOWLEDGE GRAPH
# ══════════════════════════════════════════════════════════════════════════
@app.get("/graph")
async def get_graph_endpoint(user: dict = Depends(get_current_user)):
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, get_graph)


# ══════════════════════════════════════════════════════════════════════════
# 7. COMPLIANCE
# ══════════════════════════════════════════════════════════════════════════
@app.get("/compliance/audit")
async def get_compliance(user: dict = Depends(get_current_user)):
    if vec_count() == 0:
        return {"overall_score": 0, "standards": []}
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, compliance_audit)


class RewriteRequest(BaseModel):
    clause: str
    issue: str


@app.post("/compliance/rewrite")
async def post_compliance_rewrite(req: RewriteRequest, user: dict = Depends(get_current_user)):
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, generate_rewrite, req.clause, req.issue)


# ══════════════════════════════════════════════════════════════════════════
# 8. CONFLICTS
# ══════════════════════════════════════════════════════════════════════════
@app.get("/conflicts")
async def get_conflicts(user: dict = Depends(get_current_user)):
    if vec_count() == 0:
        return {"conflicts": []}
    loop = asyncio.get_running_loop()
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
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, root_cause_analysis, equipment)
