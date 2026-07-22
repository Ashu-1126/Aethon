"""
AETHON — AI Predictive Maintenance Engine (PdM)
Synthesizes maintenance history, inspection reports, telemetry, operating hours,
and failure history to calculate:
  - Health Score (0-100)
  - Remaining Useful Life (RUL in days & operating hours)
  - Failure Probability %
  - Criticality Score
  - Recommended Inspection Schedule
  - Actionable Maintenance Recommendations
"""
from __future__ import annotations

import json
import re
import time
from pathlib import Path
from typing import Any

from config import LLM_MODEL, client, DATA_DIR
from embeddings import retrieve
from graph import get_related_graph_context, _conn, _write_lock, init_db
from fastapi import HTTPException

_PDM_CACHE_DIR = DATA_DIR / "pdm"
_PDM_CACHE_DIR.mkdir(parents=True, exist_ok=True)


def _init_pdm_table() -> None:
    init_db()
    with _write_lock:
        with _conn() as con:
            con.execute("""
                CREATE TABLE IF NOT EXISTS asset_pdm_predictions (
                    asset_tag                 TEXT PRIMARY KEY,
                    health_score              INTEGER NOT NULL,
                    rul_days                  INTEGER,
                    rul_hours                 INTEGER,
                    failure_probability       INTEGER NOT NULL,
                    criticality_score         INTEGER NOT NULL,
                    inspection_schedule       TEXT NOT NULL,
                    prediction_json           TEXT NOT NULL,
                    updated_at                TEXT NOT NULL
                );
            """)


_init_pdm_table()

_PDM_PROMPT = """\
You are AETHON's Lead AI Predictive Maintenance Specialist & Reliability Economist.

Analyze the comprehensive technical context for asset {tag} ({name}):

Operating Hours & Telemetry Context:
- Estimated Operating Hours: {operating_hours} hrs
- Current Status: {status}
- Criticality Rating: {criticality}

Retrieved Document & Maintenance Context:
{context}

Knowledge Graph Context:
{graph_context}

Calculate exact predictive maintenance analytics. For EVERY recommendation, estimate:
1. Downtime (hours)
2. Production loss ($ USD)
3. Maintenance cost ($ USD)
4. Repair cost ($ USD)
5. Risk reduction (%)
6. Operational impact summary
7. ROI multiplier (Calculated as: (Production Loss Avoided + Avoided Catastrophic Repair) / Maintenance Cost)

Return ONLY valid JSON matching this exact schema:
{{
  "health_score": 76,
  "remaining_useful_life_days": 42,
  "remaining_useful_life_hours": 1008,
  "failure_probability_percentage": 28,
  "criticality_score": 85,
  "primary_failure_mode": "Bearing fatigue due to extended lubrication intervals",
  "maintenance_recommendations": [
    {{
      "action": "Perform vibration spectrum analysis and drive-end bearing replacement",
      "priority": "high",
      "estimated_downtime_hours": 4.0,
      "estimated_production_loss_usd": 12500,
      "estimated_maintenance_cost_usd": 1200,
      "estimated_repair_cost_usd": 45000,
      "risk_reduction_percentage": 85,
      "operational_impact": "Prevents catastrophic shaft seizure during peak Q3 production run",
      "roi_multiplier": 37.5
    }}
  ],
  "recommended_inspection_schedule": "Bi-weekly visual and thermographic inspection",
  "next_inspection_date": "2026-08-05",
  "contributing_factors": [
    {{"factor": "Operating at 92% rated capacity", "impact": "high", "citation": "Log-Q3.pdf p.4"}}
  ],
  "confidence": 89
}}

JSON:"""



def calculate_asset_pdm(
    tag: str,
    name: str = "",
    operating_hours: int = 4200,
    status: str = "operational",
    criticality: str = "high",
    force: bool = False
) -> dict[str, Any]:
    """
    Computes AI Predictive Maintenance parameters for an asset.
    Persists predictions in SQLite `asset_pdm_predictions`.
    """
    if not force:
        with _conn() as con:
            row = con.execute("SELECT prediction_json FROM asset_pdm_predictions WHERE UPPER(asset_tag) = UPPER(?)", (tag,)).fetchone()
            if row:
                try:
                    return json.loads(row[0])
                except Exception:
                    pass

    query = f"{tag} failure maintenance repair inspection vibration temperature operating hours component replacement"
    chunks = retrieve(query, k=8)
    
    context = "\n\n".join(
        f"[DOC:{c['doc_name']} PAGE:{c['page']}]: {c['text'][:300]}" for c in chunks
    ) if chunks else "No historical document logs available."

    from graph import get_related_graph_context
    doc_names = list({c["doc_name"] for c in chunks}) if chunks else []
    graph_context = get_related_graph_context(doc_names, tag)

    try:
        resp = client.chat.completions.create(
            model=LLM_MODEL,
            messages=[{"role": "user", "content": _PDM_PROMPT.format(
                tag=tag,
                name=name or tag,
                operating_hours=operating_hours,
                status=status,
                criticality=criticality,
                context=context,
                graph_context=graph_context,
            )}],
            response_format={"type": "json_object"},
            temperature=0.1,
            max_tokens=1536,
        )
        raw = resp.choices[0].message.content.strip()
        raw = re.sub(r"^```(?:json)?\s*", "", raw, flags=re.MULTILINE)
        raw = re.sub(r"\s*```$", "", raw, flags=re.MULTILINE)
        pdm = json.loads(raw)
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Predictive Maintenance engine error: {str(e)}")

    pdm["asset_tag"] = tag
    pdm["timestamp"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

    # Save to SQLite
    now = pdm["timestamp"]
    with _write_lock:
        with _conn() as con:
            con.execute(
                """INSERT OR REPLACE INTO asset_pdm_predictions
                   (asset_tag, health_score, rul_days, rul_hours, failure_probability, criticality_score, inspection_schedule, prediction_json, updated_at)
                   VALUES (?,?,?,?,?,?,?,?,?)""",
                (
                    tag.upper(),
                    pdm.get("health_score", 100),
                    pdm.get("remaining_useful_life_days", 90),
                    pdm.get("remaining_useful_life_hours", 2160),
                    pdm.get("failure_probability_percentage", 0),
                    pdm.get("criticality_score", 50),
                    pdm.get("recommended_inspection_schedule", "Monthly"),
                    json.dumps(pdm),
                    now,
                ),
            )

    return pdm


def get_all_pdm_predictions() -> list[dict]:
    init_db()
    with _conn() as con:
        rows = con.execute("SELECT prediction_json FROM asset_pdm_predictions ORDER BY failure_probability DESC").fetchall()
        res = []
        for r in rows:
            try:
                res.append(json.loads(r[0]))
            except Exception:
                pass
        return res
