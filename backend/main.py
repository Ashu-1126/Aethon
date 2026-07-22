"""
AETHON — FastAPI Backend
All endpoints wired to industrial AI engines and SQLite database.
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
    traverse_asset_memory_graph,
    add_asset,
    get_assets,
    get_asset,
    update_asset,
    delete_asset,
    add_asset_event,
    get_asset_events,
    link_asset_document,
    get_asset_documents,
)
from agents import (
    compliance_audit,
    detect_conflicts,
    dashboard_stats as _dashboard_stats,
    scoreboard as _scoreboard,
    root_cause_analysis,
    generate_rewrite,
)
from assets import (
    get_asset_health,
    get_asset_forecast,
    get_asset_compliance,
    scan_asset_alerts,
    calculate_factory_risk_heatmap,
    scan_enterprise_knowledge_gaps,
)
from investigation import (
    run_autonomous_investigation,
    list_investigations,
    get_investigation,
)
from predictive import (
    calculate_asset_pdm,
    get_all_pdm_predictions,
)
from work_orders import (
    generate_work_order,
    list_work_orders,
)
from shift_reports import (
    generate_shift_report,
    list_shift_reports,
)
from emergency_plans import (
    generate_emergency_plan,
    list_emergency_plans,
)
from auth import USERS, create_access_token, get_current_user


# ── App Initialization ────────────────────────────────────────────────────────
app = FastAPI(title="AETHON Backend", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

init_db()


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

_ingest_semaphore: asyncio.Semaphore | None = None

async def _get_ingest_semaphore() -> asyncio.Semaphore:
    global _ingest_semaphore
    if _ingest_semaphore is None:
        _ingest_semaphore = asyncio.Semaphore(MAX_CONCURRENT_INGESTS)
    return _ingest_semaphore


_ws_connections: list[WebSocket] = []

async def _broadcast(msg: dict) -> None:
    for ws in _ws_connections[:]:
        try:
            await ws.send_json(msg)
        except Exception:
            _ws_connections.remove(ws)


# ── 0. AUTHENTICATION ─────────────────────────────────────────────────────────
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


# ── 1. HEALTH ─────────────────────────────────────────────────────────────────
_health_cache: dict = {"model_ok": None, "corpus_docs": 0, "ts": 0.0}
_HEALTH_TTL = 30

@app.get("/health")
async def health():
    now = time.time()
    if _health_cache["model_ok"] is None or (now - _health_cache["ts"]) > _HEALTH_TTL:
        try:
            from config import client
            client.with_options(timeout=5.0).models.list()
            _health_cache["model_ok"] = True
        except Exception:
            _health_cache["model_ok"] = False
        _health_cache["corpus_docs"] = vec_count()
        _health_cache["ts"] = now

    return {
        "status": "ok" if _health_cache["model_ok"] else "degraded",
        "model": config.LLM_MODEL,
        "corpus_docs": _health_cache["corpus_docs"],
    }


# ── 2. COPILOT (RAG) ──────────────────────────────────────────────────────────
class QueryRequest(BaseModel):
    query: str

@app.post("/copilot/query")
async def copilot_query(req: QueryRequest, user: dict = Depends(get_current_user)):
    if not req.query.strip():
        raise HTTPException(400, "Query cannot be empty")
    if vec_count() == 0:
        raise HTTPException(503, "No documents indexed yet. Please upload documents first.")

    from rag import answer as rag_answer
    loop = asyncio.get_running_loop()
    result = await loop.run_in_executor(None, rag_answer, req.query)
    
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


# ── 3. DOCUMENTS ──────────────────────────────────────────────────────────────
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

    delete_doc(doc_name)
    delete_doc_from_graph(doc_name)
    delete_document_from_db(doc_id)

    try:
        for p in UPLOAD_DIR.glob(f"{doc_id}_*"):
            p.unlink()
    except Exception:
        pass

    return {"status": "success", "message": f"Document '{doc_name}' deleted successfully"}


# ══════════════════════════════════════════════════════════════════════════
# 4. INGEST (upload) ⭐
# ══════════════════════════════════════════════════════════════════════════
ACCEPTED_TYPES = {".pdf", ".docx", ".txt", ".csv", ".xlsx", ".png", ".jpg", ".html", ".htm", ".md"}
MAX_BYTES = 50 * 1024 * 1024  # 50 MB

@app.post("/ingest", status_code=202)
async def ingest(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    ext = Path(file.filename).suffix.lower()
    if ext not in ACCEPTED_TYPES:
        raise HTTPException(415, f"Unsupported file type: {ext}")

    contents = await file.read()
    if len(contents) > MAX_BYTES:
        raise HTTPException(413, "File exceeds 50 MB limit")

    doc_id = str(uuid.uuid4())[:8]
    doc_name = file.filename
    dest = UPLOAD_DIR / f"{doc_id}_{doc_name}"

    async with aiofiles.open(dest, "wb") as f:
        await f.write(contents)

    add_document_to_db(
        doc_id,
        name=doc_name,
        doc_type=_infer_doc_type(doc_name),
        status="queued",
        pages=0,
        ingested_at=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    )

    asyncio.create_task(_process_doc(doc_id, dest, doc_name))
    return {"id": doc_id, "name": doc_name, "status": "queued"}


async def _process_doc(doc_id: str, path: Path, doc_name: str) -> None:
    async def _update(stage: str, progress: int):
        update_document_status_in_db(doc_id, status=stage)
        await _broadcast({"id": doc_id, "stage": stage, "progress": progress})

    sem = await _get_ingest_semaphore()
    async with sem:
        try:
            await _update("parsing", 10)
            loop = asyncio.get_running_loop()
            chunks = await loop.run_in_executor(None, load_and_chunk, path)
            update_document_status_in_db(doc_id, status="parsing", pages=max((c["page"] for c in chunks), default=0))

            await _update("embedding", 35)
            await loop.run_in_executor(None, embed_and_store, chunks)

            await _update("embedding", 75)
            await loop.run_in_executor(None, add_chunks_to_graph, chunks)

            await _update("indexed", 100)
        except Exception as e:
            import traceback
            traceback.print_exc()
            update_document_status_in_db(doc_id, status="failed")
            await _broadcast({"id": doc_id, "stage": "failed", "progress": 0, "error": str(e)})


@app.websocket("/ws/ingest")
async def ws_ingest(ws: WebSocket):
    await ws.accept()
    _ws_connections.append(ws)
    try:
        await ws.send_json({"type": "connected"})
    except Exception:
        _ws_connections.remove(ws)
        return
    try:
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        if ws in _ws_connections:
            _ws_connections.remove(ws)


# ── 5. KNOWLEDGE GRAPH ────────────────────────────────────────────────────────
@app.get("/graph")
async def get_graph_endpoint(user: dict = Depends(get_current_user)):
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, get_graph)

@app.get("/graph/traverse")
async def traverse_graph_endpoint(label: str, depth: int = 2, user: dict = Depends(get_current_user)):
    if not label.strip():
        raise HTTPException(400, "label query parameter is required.")
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, lambda: traverse_asset_memory_graph(label, depth))


# ── 6. COMPLIANCE & CONFLICTS ────────────────────────────────────────────────
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

@app.get("/conflicts")
async def get_conflicts(user: dict = Depends(get_current_user)):
    if vec_count() == 0:
        return {"conflicts": []}
    loop = asyncio.get_running_loop()
    result = await loop.run_in_executor(None, detect_conflicts)
    return {"conflicts": result}

@app.post("/conflicts/rescan")
async def rescan_conflicts(user: dict = Depends(get_current_user)):
    if vec_count() == 0:
        return {"conflicts": [], "message": "No documents indexed."}
    loop = asyncio.get_running_loop()
    result = await loop.run_in_executor(None, lambda: detect_conflicts(force_rescan=True))
    return {"conflicts": result, "message": f"Scan complete — {len(result)} conflict(s) found."}


# ── 7. DASHBOARD STATS & SCOREBOARD ──────────────────────────────────────────
@app.get("/dashboard/stats")
async def dashboard(user: dict = Depends(get_current_user)):
    return _dashboard_stats()

@app.get("/scoreboard")
async def scoreboard_endpoint(user: dict = Depends(get_current_user)):
    return _scoreboard()

@app.get("/rca/{equipment}")
async def get_rca(equipment: str, user: dict = Depends(get_current_user)):
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, root_cause_analysis, equipment)



# ══════════════════════════════════════════════════════════════════════════
# 12. NEW AGENT ENDPOINT
# ══════════════════════════════════════════════════════════════════════════
@app.get("/new-agent/{param}")
async def get_new_agent_route(param: str, user: dict = Depends(get_current_user)):
    from agents import run_new_agent
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, run_new_agent, param)

# ── 8. ASSET REGISTRY ─────────────────────────────────────────────────────────
class AssetCreateRequest(BaseModel):
    tag: str
    name: str
    category: str
    location: Optional[str] = ""
    criticality: Optional[str] = "medium"
    manufacturer: Optional[str] = ""
    model_number: Optional[str] = ""
    install_date: Optional[str] = ""

class AssetUpdateRequest(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    location: Optional[str] = None
    criticality: Optional[str] = None
    status: Optional[str] = None
    manufacturer: Optional[str] = None
    model_number: Optional[str] = None
    install_date: Optional[str] = None

class AssetEventRequest(BaseModel):
    event_type: str
    severity: str
    title: str
    detail: Optional[str] = ""
    source: Optional[str] = ""

@app.get("/assets")
async def list_assets(category: Optional[str] = None, criticality: Optional[str] = None, user: dict = Depends(get_current_user)):
    loop = asyncio.get_running_loop()
    result = await loop.run_in_executor(None, lambda: get_assets(category, criticality))
    return {"assets": result}

@app.post("/assets", status_code=201)
async def create_asset(req: AssetCreateRequest, user: dict = Depends(get_current_user)):
    existing = get_asset(req.tag)
    if existing:
        raise HTTPException(409, f"Asset with tag '{req.tag.upper()}' already exists.")
    loop = asyncio.get_running_loop()
    asset = await loop.run_in_executor(None, lambda: add_asset(
        tag=req.tag, name=req.name, category=req.category,
        location=req.location or "", criticality=req.criticality or "medium",
        manufacturer=req.manufacturer or "", model_number=req.model_number or "",
        install_date=req.install_date or "",
    ))
    return {"asset": asset}

@app.get("/assets/{tag}")
async def get_asset_detail(tag: str, user: dict = Depends(get_current_user)):
    asset = get_asset(tag)
    if not asset:
        raise HTTPException(404, f"Asset '{tag.upper()}' not found.")
    return {"asset": asset}

@app.put("/assets/{tag}")
async def update_asset_endpoint(tag: str, req: AssetUpdateRequest, user: dict = Depends(get_current_user)):
    asset = get_asset(tag)
    if not asset:
        raise HTTPException(404, f"Asset '{tag.upper()}' not found.")
    fields = {k: v for k, v in req.model_dump().items() if v is not None}
    loop = asyncio.get_running_loop()
    updated = await loop.run_in_executor(None, lambda: update_asset(tag, **fields))
    return {"asset": updated}

@app.delete("/assets/{tag}")
async def delete_asset_endpoint(tag: str, user: dict = Depends(get_current_user)):
    asset = get_asset(tag)
    if not asset:
        raise HTTPException(404, f"Asset '{tag.upper()}' not found.")
    loop = asyncio.get_running_loop()
    await loop.run_in_executor(None, lambda: delete_asset(tag))
    return {"status": "success", "message": f"Asset '{tag.upper()}' deleted."}

@app.get("/assets/{tag}/events")
async def list_asset_events(tag: str, user: dict = Depends(get_current_user)):
    asset = get_asset(tag)
    if not asset:
        raise HTTPException(404, f"Asset '{tag.upper()}' not found.")
    loop = asyncio.get_running_loop()
    events = await loop.run_in_executor(None, lambda: get_asset_events(tag))
    return {"events": events}

@app.post("/assets/{tag}/events", status_code=201)
async def create_asset_event(tag: str, req: AssetEventRequest, user: dict = Depends(get_current_user)):
    asset = get_asset(tag)
    if not asset:
        raise HTTPException(404, f"Asset '{tag.upper()}' not found.")
    loop = asyncio.get_running_loop()
    event = await loop.run_in_executor(None, lambda: add_asset_event(
        tag=tag, event_type=req.event_type, severity=req.severity,
        title=req.title, detail=req.detail or "", source=req.source or "",
    ))
    return {"event": event}

@app.get("/assets/{tag}/documents")
async def list_asset_documents(tag: str, user: dict = Depends(get_current_user)):
    asset = get_asset(tag)
    if not asset:
        raise HTTPException(404, f"Asset '{tag.upper()}' not found.")
    loop = asyncio.get_running_loop()
    docs = await loop.run_in_executor(None, lambda: get_asset_documents(tag))
    return {"documents": docs}

@app.post("/assets/{tag}/documents")
async def link_document_to_asset(tag: str, body: dict, user: dict = Depends(get_current_user)):
    asset = get_asset(tag)
    if not asset:
        raise HTTPException(404, f"Asset '{tag.upper()}' not found.")
    doc_name = body.get("doc_name", "").strip()
    if not doc_name:
        raise HTTPException(400, "doc_name is required.")
    loop = asyncio.get_running_loop()
    await loop.run_in_executor(None, lambda: link_asset_document(tag, doc_name))
    return {"status": "linked", "tag": tag.upper(), "doc_name": doc_name}

@app.get("/assets/{tag}/health")
async def get_asset_health_endpoint(tag: str, force: bool = False, user: dict = Depends(get_current_user)):
    asset = get_asset(tag)
    if not asset:
        raise HTTPException(404, f"Asset '{tag.upper()}' not found.")
    if vec_count() == 0:
        raise HTTPException(503, "No documents indexed. Upload documents first.")
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, lambda: get_asset_health(tag, asset.get("name", ""), force))

@app.get("/assets/{tag}/forecast")
async def get_asset_forecast_endpoint(tag: str, force: bool = False, user: dict = Depends(get_current_user)):
    asset = get_asset(tag)
    if not asset:
        raise HTTPException(404, f"Asset '{tag.upper()}' not found.")
    if vec_count() == 0:
        raise HTTPException(503, "No documents indexed. Upload documents first.")
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, lambda: get_asset_forecast(tag, asset.get("name", ""), force))

@app.get("/assets/{tag}/compliance")
async def get_asset_compliance_endpoint(tag: str, force: bool = False, user: dict = Depends(get_current_user)):
    asset = get_asset(tag)
    if not asset:
        raise HTTPException(404, f"Asset '{tag.upper()}' not found.")
    if vec_count() == 0:
        raise HTTPException(503, "No documents indexed. Upload documents first.")
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, lambda: get_asset_compliance(tag, asset.get("name", ""), force))

@app.post("/assets/{tag}/scan")
async def scan_asset_alerts_endpoint(tag: str, user: dict = Depends(get_current_user)):
    asset = get_asset(tag)
    if not asset:
        raise HTTPException(404, f"Asset '{tag.upper()}' not found.")
    if vec_count() == 0:
        return {"alerts_logged": 0, "message": "No documents indexed."}
    loop = asyncio.get_running_loop()
    alerts = await loop.run_in_executor(None, lambda: scan_asset_alerts(tag, asset.get("name", "")))
    logged = 0
    for alert in alerts:
        add_asset_event(
            tag=tag,
            event_type=alert.get("event_type", "alert"),
            severity=alert.get("severity", "medium"),
            title=alert.get("title", "Unnamed alert"),
            detail=alert.get("detail", ""),
            source=alert.get("source", "AI Alert Scan"),
        )
        logged += 1
    return {
        "alerts_logged": logged,
        "alerts": alerts,
        "message": f"Alert scan complete. {logged} new alert(s) logged.",
    }


# ── 9. RISK HEATMAP & KNOWLEDGE GAPS ──────────────────────────────────────────
@app.get("/risk-heatmap")
async def get_risk_heatmap_endpoint(user: dict = Depends(get_current_user)):
    loop = asyncio.get_running_loop()
    result = await loop.run_in_executor(None, calculate_factory_risk_heatmap)
    return {"heatmap": result}

@app.get("/knowledge-gaps/scan")
async def scan_knowledge_gaps_endpoint(user: dict = Depends(get_current_user)):
    loop = asyncio.get_running_loop()
    result = await loop.run_in_executor(None, scan_enterprise_knowledge_gaps)
    return {"gaps": result}


# ── 10. PREDICTIVE MAINTENANCE (PdM) ──────────────────────────────────────────
@app.get("/predictive/{tag}")
async def get_predictive_endpoint(tag: str, force: bool = False, user: dict = Depends(get_current_user)):
    loop = asyncio.get_running_loop()
    result = await loop.run_in_executor(None, lambda: calculate_asset_pdm(tag, force))
    return result

@app.get("/predictive")
async def get_all_predictive_endpoint(user: dict = Depends(get_current_user)):
    loop = asyncio.get_running_loop()
    result = await loop.run_in_executor(None, get_all_pdm_predictions)
    return {"predictions": result}


# ── 11. INVESTIGATIONS ────────────────────────────────────────────────────────
class InvestigationRequest(BaseModel):
    query: str
    asset_tag: Optional[str] = None

@app.post("/investigations/run")
async def run_investigation_endpoint(req: InvestigationRequest, user: dict = Depends(get_current_user)):
    if not req.query.strip():
        raise HTTPException(400, "Query is required.")
    loop = asyncio.get_running_loop()
    result = await loop.run_in_executor(
        None, lambda: run_autonomous_investigation(req.query, req.asset_tag)
    )
    return result

@app.get("/investigations")
async def list_investigations_endpoint(user: dict = Depends(get_current_user)):
    loop = asyncio.get_running_loop()
    result = await loop.run_in_executor(None, list_investigations)
    return {"investigations": result}

@app.get("/investigations/{inv_id}")
async def get_investigation_endpoint(inv_id: str, user: dict = Depends(get_current_user)):
    loop = asyncio.get_running_loop()
    result = await loop.run_in_executor(None, lambda: get_investigation(inv_id))
    if not result:
        raise HTTPException(404, "Investigation report not found.")
    return result


# ── 12. WORK ORDERS ───────────────────────────────────────────────────────────
class WorkOrderRequest(BaseModel):
    asset_tag: str
    issue_description: str
    priority: Optional[str] = "medium"

@app.post("/work-orders/generate")
async def generate_work_order_endpoint(req: WorkOrderRequest, user: dict = Depends(get_current_user)):
    loop = asyncio.get_running_loop()
    result = await loop.run_in_executor(
        None, lambda: generate_work_order(req.asset_tag, req.issue_description, req.priority)
    )
    return result

@app.get("/work-orders")
async def list_work_orders_endpoint(asset_tag: Optional[str] = None, user: dict = Depends(get_current_user)):
    loop = asyncio.get_running_loop()
    result = await loop.run_in_executor(None, lambda: list_work_orders(asset_tag))
    return {"work_orders": result}


# ── 13. SHIFT REPORTS ─────────────────────────────────────────────────────────
class ShiftReportRequest(BaseModel):
    shift_name: Optional[str] = "Day Shift (06:00 - 18:00)"
    author_role: Optional[str] = "Lead Operations Engineer"

@app.post("/shift-reports/generate")
async def generate_shift_report_endpoint(req: ShiftReportRequest, user: dict = Depends(get_current_user)):
    loop = asyncio.get_running_loop()
    result = await loop.run_in_executor(
        None, lambda: generate_shift_report(req.shift_name, req.author_role)
    )
    return result

@app.get("/shift-reports")
async def list_shift_reports_endpoint(user: dict = Depends(get_current_user)):
    loop = asyncio.get_running_loop()
    result = await loop.run_in_executor(None, list_shift_reports)
    return {"reports": result}


# ── 14. EMERGENCY RESPONSE PLANS ──────────────────────────────────────────────
class EmergencyPlanRequest(BaseModel):
    hazard_type: str
    asset_tag: Optional[str] = None

@app.post("/emergency-plans/generate")
async def generate_emergency_plan_endpoint(req: EmergencyPlanRequest, user: dict = Depends(get_current_user)):
    loop = asyncio.get_running_loop()
    result = await loop.run_in_executor(
        None, lambda: generate_emergency_plan(req.hazard_type, req.asset_tag)
    )
    return result

@app.get("/emergency-plans")
async def list_emergency_plans_endpoint(hazard_type: Optional[str] = None, user: dict = Depends(get_current_user)):
    loop = asyncio.get_running_loop()
    result = await loop.run_in_executor(None, lambda: list_emergency_plans(hazard_type))
    return {"plans": result}

