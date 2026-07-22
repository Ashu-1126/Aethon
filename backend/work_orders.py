"""
AETHON — Industrial Work Order Generator Engine
Generates production-grade, safety-compliant maintenance work orders using asset memory,
RAG documentation, OEM manuals, and SOP context.
"""
from __future__ import annotations

import json
import re
import time
import uuid
from pathlib import Path
from typing import Any

from config import LLM_MODEL, client, DATA_DIR
from embeddings import retrieve
from graph import _conn, _write_lock, init_db
from fastapi import HTTPException

_WO_CACHE_DIR = DATA_DIR / "work_orders"
_WO_CACHE_DIR.mkdir(parents=True, exist_ok=True)


def _init_work_orders_table() -> None:
    init_db()
    with _write_lock:
        with _conn() as con:
            con.execute("""
                CREATE TABLE IF NOT EXISTS work_orders (
                    wo_id                     TEXT PRIMARY KEY,
                    asset_tag                 TEXT NOT NULL,
                    title                     TEXT NOT NULL,
                    priority                  TEXT NOT NULL,
                    estimated_duration_hours   REAL NOT NULL,
                    shutdown_required         INTEGER NOT NULL,
                    work_order_json           TEXT NOT NULL,
                    created_at                TEXT NOT NULL
                )
            """)
            con.execute(
                "CREATE INDEX IF NOT EXISTS idx_wo_asset ON work_orders(asset_tag)"
            )


_init_work_orders_table()

_WO_PROMPT = """\
You are AETHON's Chief Maintenance Engineer & Work Order Planning Specialist.

Generate a complete, production-grade Maintenance Work Order for asset {tag} ({name}).
Task / Maintenance Objective: {title}

Context from OEM Manuals, SOPs, and Asset Memory:
{context}

Return ONLY valid JSON matching this exact schema:
{{
  "wo_id": "WO-99201",
  "asset_tag": "{tag}",
  "title": "{title}",
  "priority": "critical",
  "estimated_duration_hours": 4.5,
  "required_manpower": [
    {{"role": "Senior Mechanical Technician", "count": 2}},
    {{"role": "Certified Electrician", "count": 1}}
  ],
  "required_tools": [
    "Hydraulic torque wrench (500 Nm)",
    "Vibration analysis meter (SKF Microlog)",
    "Laser shaft alignment kit"
  ],
  "required_parts": [
    {{"part_number": "SKF-6205-C3", "description": "Deep groove ball bearing", "quantity": 2}},
    {{"part_number": "OR-V-90", "description": "Viton O-ring seal kit", "quantity": 1}}
  ],
  "safety_checklist": [
    "Verify 100% Lockout/Tagout (LOTO) on primary power feed",
    "Perform 30-minute continuous atmospheric H2S and LEL gas test",
    "Depressurize pump casing and drain residual fluid to flare line"
  ],
  "required_ppe": [
    "Level B Chemical Splash Suit",
    "Full-face respiratory mask with ABEK filter",
    "Cut-resistant steel-toe boots"
  ],
  "shutdown_required": true,
  "dependencies": [
    "Permit-to-Work PTW-8821 approval",
    "Cooling loop isolation confirmation by Shift Supervisor"
  ],
  "step_by_step_instructions": [
    "1. Isolate inlet valve V-101 and outlet valve V-102.",
    "2. Apply LOTO lock #8812 to motor breaker CB-04.",
    "3. Unbolt bearing housing cover using 24mm socket.",
    "4. Pull old bearing with mechanical gear puller.",
    "5. Heat new SKF-6205 bearing to 110°C using induction heater and press fit."
  ]
}}

JSON:"""


def generate_work_order(
    asset_tag: str, title: str, priority: str = "high", name: str = ""
) -> dict[str, Any]:
    """
    Generates a complete maintenance work order with tools, parts, duration, manpower,
    safety checklists, PPE, shutdown requirements, priorities, and dependencies.
    """
    query = f"{asset_tag} {title} maintenance procedure repair manual tools parts safety SOP"
    chunks = retrieve(query, k=6)

    context = "\n\n".join(
        f"[DOC:{c['doc_name']} PAGE:{c['page']}]: {c['text'][:300]}" for c in chunks
    ) if chunks else "Standard OEM procedure context."

    try:
        resp = client.chat.completions.create(
            model=LLM_MODEL,
            messages=[{"role": "user", "content": _WO_PROMPT.format(
                tag=asset_tag,
                name=name or asset_tag,
                title=title,
                context=context,
            )}],
            response_format={"type": "json_object"},
            temperature=0.1,
            max_tokens=1800,
        )
        raw = resp.choices[0].message.content.strip()
        raw = re.sub(r"^```(?:json)?\s*", "", raw, flags=re.MULTILINE)
        raw = re.sub(r"\s*```$", "", raw, flags=re.MULTILINE)
        wo = json.loads(raw)
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Work order generation error: {str(e)}")

    wo_id = f"WO-{str(uuid.uuid4())[:6].upper()}"
    wo["wo_id"] = wo_id
    wo["asset_tag"] = asset_tag
    wo["created_at"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

    # Save to SQLite
    with _write_lock:
        with _conn() as con:
            con.execute(
                """INSERT INTO work_orders
                   (wo_id, asset_tag, title, priority, estimated_duration_hours, shutdown_required, work_order_json, created_at)
                   VALUES (?,?,?,?,?,?,?,?)""",
                (
                    wo_id,
                    asset_tag.upper(),
                    title,
                    wo.get("priority", priority),
                    wo.get("estimated_duration_hours", 2.0),
                    1 if wo.get("shutdown_required") else 0,
                    json.dumps(wo),
                    wo["created_at"],
                ),
            )

    return wo


def list_work_orders(asset_tag: str = "") -> list[dict]:
    init_db()
    with _conn() as con:
        if asset_tag:
            rows = con.execute("SELECT work_order_json FROM work_orders WHERE UPPER(asset_tag) = UPPER(?) ORDER BY created_at DESC", (asset_tag,)).fetchall()
        else:
            rows = con.execute("SELECT work_order_json FROM work_orders ORDER BY created_at DESC").fetchall()
        
        res = []
        for r in rows:
            try:
                res.append(json.loads(r[0]))
            except Exception:
                pass
        return res
