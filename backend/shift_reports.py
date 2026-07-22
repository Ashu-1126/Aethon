"""
AETHON — Shift Handover & Operational Report Generator Engine
Automatically synthesizes plant operations data, work orders, alarms, asset statuses,
maintenance forecasts, and incident logs into comprehensive shift handover reports.
"""
from __future__ import annotations

import json
import re
import time
import uuid
from pathlib import Path
from typing import Any

from config import LLM_MODEL, client, DATA_DIR
from graph import get_assets, get_asset_events, _conn, _write_lock, init_db
from predictive import get_all_pdm_predictions
from work_orders import list_work_orders
from fastapi import HTTPException

_SHIFT_CACHE_DIR = DATA_DIR / "shift_reports"
_SHIFT_CACHE_DIR.mkdir(parents=True, exist_ok=True)


def _init_shift_reports_table() -> None:
    init_db()
    with _write_lock:
        with _conn() as con:
            con.execute("""
                CREATE TABLE IF NOT EXISTS shift_reports (
                    report_id                 TEXT PRIMARY KEY,
                    shift_name                TEXT NOT NULL,
                    author_name               TEXT NOT NULL,
                    report_json               TEXT NOT NULL,
                    created_at                TEXT NOT NULL
                );
            """)


_init_shift_reports_table()

_SHIFT_PROMPT = """\
You are AETHON's Shift Operations Lead & Plant Handover Coordinator.

Synthesize a comprehensive, executive-ready Shift Handover Report for the following shift:
Shift: {shift_name}
Author / Lead Engineer: {author_name}

Current Plant Fleet Context:
{fleet_context}

Work Orders Context:
{wo_context}

Predictive Maintenance & Health Context:
{pdm_context}

Generate ONLY valid JSON matching this exact schema:
{{
  "report_id": "SHIFT-20260722-A",
  "shift_name": "{shift_name}",
  "author_name": "{author_name}",
  "timestamp": "2026-07-22T18:30:00Z",
  "completed_work": [
    {{"task": "Replaced drive-end SKF bearing on Pump P-204", "asset_tag": "P-204", "status": "completed"}},
    {{"task": "Calibrated pressure transmitter PT-102", "asset_tag": "V-301", "status": "completed"}}
  ],
  "pending_work": [
    {{"task": "Perform thermographic scan on Compressor K-101 motor housing", "asset_tag": "K-101", "priority": "high"}}
  ],
  "open_alarms": [
    {{"title": "Bearing temperature high on P-204 (88°C)", "severity": "high", "asset_tag": "P-204"}}
  ],
  "machine_status_summary": [
    {{"asset_tag": "P-204", "status": "degraded", "notes": "Vibration elevated, running under 80% load"}},
    {{"asset_tag": "K-101", "status": "operational", "notes": "Normal operation"}}
  ],
  "maintenance_due": [
    {{"asset_tag": "E-301", "due_task": "Bi-weekly tube-side flush", "due_in_days": 2}}
  ],
  "incidents_summary": [
    {{"title": "Spike in vibration on P-204 during 14:00 shift transition", "asset_tag": "P-204", "status": "investigated"}}
  ],
  "executive_recommendations": [
    "Ensure continuous cooling water flow to Unit 4 heat exchangers during incoming Night Shift.",
    "Verify PTW permit #8821 before starting morning overhaul on V-301."
  ]
}}

JSON:"""


def generate_shift_report(
    shift_name: str = "Day Shift (06:00 - 18:00)", author_name: str = "Operations Lead"
) -> dict[str, Any]:
    """
    Automatically collects fleet statuses, work orders, alarms, and PdM forecasts,
    synthesizing a complete shift handover report.
    """
    fleet = get_assets()
    wos = list_work_orders()
    pdms = get_all_pdm_predictions()

    fleet_summary = [
        f"- {a['tag']} ({a['name']}): Status={a.get('status','operational')}, Criticality={a.get('criticality','medium')}"
        for a in fleet
    ]
    wo_summary = [
        f"- WO {w.get('wo_id')}: {w.get('title')} on {w.get('asset_tag')} (Priority: {w.get('priority')})"
        for w in wos[:5]
    ]
    pdm_summary = [
        f"- {p.get('asset_tag')}: Health={p.get('health_score')}, RUL={p.get('remaining_useful_life_days')}d, Mode={p.get('primary_failure_mode')}"
        for p in pdms[:5]
    ]

    try:
        resp = client.chat.completions.create(
            model=LLM_MODEL,
            messages=[{"role": "user", "content": _SHIFT_PROMPT.format(
                shift_name=shift_name,
                author_name=author_name,
                fleet_context="\n".join(fleet_summary) if fleet_summary else "Fleet nominal.",
                wo_context="\n".join(wo_summary) if wo_summary else "No open work orders.",
                pdm_context="\n".join(pdm_summary) if pdm_summary else "No failure predictions.",
            )}],
            response_format={"type": "json_object"},
            temperature=0.1,
            max_tokens=1800,
        )
        raw = resp.choices[0].message.content.strip()
        raw = re.sub(r"^```(?:json)?\s*", "", raw, flags=re.MULTILINE)
        raw = re.sub(r"\s*```$", "", raw, flags=re.MULTILINE)
        rep = json.loads(raw)
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Shift report generator error: {str(e)}")

    report_id = f"SHIFT-{str(uuid.uuid4())[:6].upper()}"
    rep["report_id"] = report_id
    rep["created_at"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

    # Save to SQLite
    with _write_lock:
        with _conn() as con:
            con.execute(
                """INSERT INTO shift_reports (report_id, shift_name, author_name, report_json, created_at)
                   VALUES (?,?,?,?,?)""",
                (report_id, shift_name, author_name, json.dumps(rep), rep["created_at"]),
            )

    return rep


def list_shift_reports() -> list[dict]:
    init_db()
    with _conn() as con:
        rows = con.execute("SELECT report_json FROM shift_reports ORDER BY created_at DESC").fetchall()
        res = []
        for r in rows:
            try:
                res.append(json.loads(r[0]))
            except Exception:
                pass
        return res
