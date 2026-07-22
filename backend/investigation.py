"""
AETHON — Autonomous Industrial Investigation Engine
Multi-source evidence collection, deep incident timeline synthesis, root-cause ranking,
and structured report generation.
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
from graph import get_related_graph_context, _conn, _write_lock, init_db
from fastapi import HTTPException

_INVESTIGATION_CACHE_DIR = DATA_DIR / "investigations"
_INVESTIGATION_CACHE_DIR.mkdir(parents=True, exist_ok=True)


def _init_investigations_table() -> None:
    init_db()
    with _write_lock:
        with _conn() as con:
            con.execute("""
                CREATE TABLE IF NOT EXISTS investigations (
                    id                   TEXT PRIMARY KEY,
                    incident_title       TEXT NOT NULL,
                    asset_tag            TEXT,
                    status               TEXT NOT NULL,
                    confidence           INTEGER DEFAULT 0,
                    summary              TEXT,
                    report_json          TEXT NOT NULL,
                    created_at           TEXT NOT NULL,
                    updated_at           TEXT NOT NULL
                )
            """)
            con.execute(
                "CREATE INDEX IF NOT EXISTS idx_inv_asset ON investigations(asset_tag)"
            )



_init_investigations_table()


# ══════════════════════════════════════════════════════════════════════════════
# EVIDENCE COLLECTOR
# ══════════════════════════════════════════════════════════════════════════════

def collect_investigation_evidence(incident_query: str, asset_tag: str = "") -> dict[str, Any]:
    """
    Multi-aspect retrieval:
    1. Maintenance history & failure logs
    2. SOPs & Operating Procedures
    3. Regulatory Standards & Compliance
    4. Sensor & Alarm records
    5. Knowledge Graph contextual subgraphs
    """
    search_scope = f"{asset_tag} {incident_query}".strip()
    
    aspects = {
        "maintenance_and_failures": f"{search_scope} failure breakdown overhaul vibration overheating leak repair history",
        "sops_and_manuals": f"{search_scope} SOP procedure manual operation specification threshold tolerance",
        "compliance_and_standards": f"{search_scope} standard compliance safety regulation limit inspection Factory Act OISD",
        "sensors_and_alarms": f"{search_scope} sensor alarm telemetry pressure temperature flow reading warning tripped",
    }
    
    evidence_by_aspect: dict[str, list[dict]] = {}
    all_chunks = []
    seen_chunk_ids = set()

    for aspect_name, aspect_query in aspects.items():
        hits = retrieve(aspect_query, k=5)
        aspect_hits = []
        for h in hits:
            chunk_key = (h["doc_name"], h["page"], h["text"][:50])
            if chunk_key not in seen_chunk_ids:
                seen_chunk_ids.add(chunk_key)
                aspect_hits.append(h)
                all_chunks.append(h)
        evidence_by_aspect[aspect_name] = aspect_hits

    doc_names = list({c["doc_name"] for c in all_chunks})
    graph_context = get_related_graph_context(doc_names, asset_tag or incident_query)

    return {
        "aspects": evidence_by_aspect,
        "chunks": all_chunks,
        "doc_names": doc_names,
        "graph_context": graph_context,
    }


# ══════════════════════════════════════════════════════════════════════════════
# INVESTIGATION SYNTHESIS PROMPT
# ══════════════════════════════════════════════════════════════════════════════

_INVESTIGATION_PROMPT = """\
You are AETHON's Chief Industrial Incident Investigator & Master Reliability Engineer.
Conduct a deep autonomous investigation for the following incident:

Incident / Equipment: {incident_title} (Asset Tag: {asset_tag})

Multi-Source Context Collected:
{context}

Knowledge Graph Context:
{graph_context}

Perform a rigorous industrial investigation and return ONLY valid JSON matching this schema:
{{
  "probable_root_causes": [
    {{
      "cause": "Primary root cause statement",
      "probability": 85,
      "mechanism": "Physical or procedural failure sequence",
      "evidence_citations": ["Doc-1.pdf p.4", "SOP-12.pdf p.8"]
    }}
  ],
  "contributing_factors": [
    {{
      "factor": "Secondary condition contributing to severity",
      "weight": "high",
      "citation": "Doc-Name.pdf p.2"
    }}
  ],
  "timeline": [
    {{
      "timestamp": "2026-06-12 08:30 UTC",
      "phase": "Pre-Incident Baseline",
      "source_type": "sensor_history",
      "event_title": "Vibration Spike Detected on Drive-End Bearing",
      "description": "Vibration levels reached 4.2 mm/s, exceeding normal baseline threshold of 2.0 mm/s",
      "severity": "high",
      "evidence_ref": "Log-Q3.pdf p.4",
      "evidence_snippet": "Drive-end bearing vibration recorded at 4.2 mm/s under 92% load"
    }}
  ],

  "evidence_ranking": [
    {{
      "rank": 1,
      "source": "Doc-Name.pdf",
      "relevance_score": 95,
      "key_finding": "Summary of critical evidence item"
    }}
  ],
  "corrective_actions": [
    {{
      "action": "Immediate or long-term corrective action",
      "priority": "critical",
      "target_component": "Component or procedure tag"
    }}
  ],
  "overall_confidence": 88,
  "executive_summary": "3-4 sentence comprehensive investigation synthesis"
}}

JSON:"""


# ══════════════════════════════════════════════════════════════════════════════
# PUBLIC ENGINE API
# ══════════════════════════════════════════════════════════════════════════════

def run_autonomous_investigation(incident_title: str, asset_tag: str = "") -> dict[str, Any]:
    """
    Triggers the complete multi-source investigation workflow.
    """
    evidence = collect_investigation_evidence(incident_title, asset_tag)
    
    if not evidence["chunks"]:
        raise HTTPException(status_code=404, detail="No relevant documentation or logs found for investigation.")

    context_parts = []
    for aspect_name, chunks in evidence["aspects"].items():
        context_parts.append(f"=== ASPECT: {aspect_name.upper()} ===")
        for c in chunks:
            context_parts.append(f"[DOC:{c['doc_name']} PAGE:{c['page']}]: {c['text'][:300]}")

    formatted_context = "\n".join(context_parts)

    try:
        resp = client.chat.completions.create(
            model=LLM_MODEL,
            messages=[{"role": "user", "content": _INVESTIGATION_PROMPT.format(
                incident_title=incident_title,
                asset_tag=asset_tag or "UNTAGGED",
                context=formatted_context,
                graph_context=evidence["graph_context"],
            )}],
            response_format={"type": "json_object"},
            temperature=0.1,
            max_tokens=2048,
        )
        raw = resp.choices[0].message.content.strip()
        raw = re.sub(r"^```(?:json)?\s*", "", raw, flags=re.MULTILINE)
        raw = re.sub(r"\s*```$", "", raw, flags=re.MULTILINE)
        report = json.loads(raw)
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Autonomous investigation engine error: {str(e)}")

    inv_id = str(uuid.uuid4())[:12]
    now = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    
    report["investigation_id"] = inv_id
    report["incident_title"] = incident_title
    report["asset_tag"] = asset_tag
    report["timestamp"] = now

    # Persist in DB
    with _write_lock:
        with _conn() as con:
            con.execute(
                """INSERT INTO investigations 
                   (id, incident_title, asset_tag, status, confidence, summary, report_json, created_at, updated_at)
                   VALUES (?,?,?,?,?,?,?,?,?)""",
                (
                    inv_id,
                    incident_title,
                    asset_tag,
                    "completed",
                    report.get("overall_confidence", 0),
                    report.get("executive_summary", ""),
                    json.dumps(report),
                    now,
                    now,
                ),
            )

    return report


def list_investigations(asset_tag: str = "") -> list[dict]:
    init_db()
    with _conn() as con:
        if asset_tag:
            rows = con.execute(
                "SELECT * FROM investigations WHERE UPPER(asset_tag) = UPPER(?) ORDER BY created_at DESC",
                (asset_tag,),
            ).fetchall()
        else:
            rows = con.execute("SELECT * FROM investigations ORDER BY created_at DESC").fetchall()
        
        res = []
        for r in rows:
            d = dict(r)
            d["report"] = json.loads(d["report_json"])
            res.append(d)
        return res


def get_investigation(inv_id: str) -> dict:
    init_db()
    with _conn() as con:
        row = con.execute("SELECT * FROM investigations WHERE id = ?", (inv_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Investigation record not found.")
        d = dict(row)
        d["report"] = json.loads(d["report_json"])
        return d
