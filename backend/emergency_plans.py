"""
AETHON — Industrial Emergency Response Plan Generator Engine
Generates emergency response protocols for industrial hazards:
  - Fire
  - Gas leak
  - Equipment failure
  - Chemical spill
  - Power failure
Returns: Emergency SOP, Isolation steps, Required PPE, Evacuation protocols, Emergency contacts, Shutdown sequence.
"""
from __future__ import annotations

import json
import re
import time
import uuid
from typing import Any

from config import LLM_MODEL, client, DATA_DIR
from embeddings import retrieve
from graph import _conn, _write_lock, init_db
from fastapi import HTTPException

_ERP_CACHE_DIR = DATA_DIR / "emergency_plans"
_ERP_CACHE_DIR.mkdir(parents=True, exist_ok=True)


def _init_emergency_plans_table() -> None:
    init_db()
    with _write_lock:
        with _conn() as con:
            con.execute("""
                CREATE TABLE IF NOT EXISTS emergency_plans (
                    plan_id                   TEXT PRIMARY KEY,
                    hazard_type               TEXT NOT NULL,
                    asset_tag                 TEXT NOT NULL,
                    title                     TEXT NOT NULL,
                    plan_json                 TEXT NOT NULL,
                    created_at                TEXT NOT NULL
                )
            """)
            con.execute(
                "CREATE INDEX IF NOT EXISTS idx_erp_hazard ON emergency_plans(hazard_type)"
            )



_init_emergency_plans_table()

_ERP_PROMPT = """\
You are AETHON's Industrial Safety Director & Disaster Response Coordinator.

Generate a comprehensive Emergency Response Plan for the following incident scenario:
Hazard Type: {hazard_type} (Options: Fire, Gas leak, Equipment failure, Chemical spill, Power failure)
Asset / Facility Area: {asset_tag} ({asset_name})

Indexed OEM Manuals, SOPs, & Safety Context:
{context}

Return ONLY valid JSON matching this exact schema:
{{
  "plan_id": "ERP-20260722-FIRE-01",
  "hazard_type": "{hazard_type}",
  "asset_tag": "{asset_tag}",
  "title": "Emergency Response Protocol for {hazard_type} at {asset_tag}",
  "emergency_sop": "Standard operating emergency procedure detailing immediate 60-second command actions.",
  "shutdown_sequence": [
    "1. Press Emergency Shutdown (ESD) Push Button ESD-01 to trip main feed motor.",
    "2. Close pneumatic fast-acting isolation valve XV-101.",
    "3. Vent header pressure to flare stack via FV-902."
  ],
  "isolation_steps": [
    "Electrical isolation: Open breaker CB-04 and apply LOTO red padlock.",
    "Process isolation: Double-block-and-bleed inlet valve V-101 and outlet valve V-102.",
    "Utilities isolation: Close nitrogen purge line N2-04."
  ],
  "required_ppe": [
    "SCBA (Self-Contained Breathing Apparatus) with positive pressure mask",
    "Level A Flash Fire Enclosure Suit",
    "Heavy-duty chemical & thermal resistant gloves"
  ],
  "evacuation_protocol": {{
    "primary_assembly_point": "Assembly Point Bravo (North Gate Field)",
    "secondary_assembly_point": "Assembly Point Delta (Admin Building Lawn)",
    "evacuation_routes": "Evacuate upwind via Cross-Plant Walkway East, away from Flare Stack.",
    "wind_direction_dependency": "Check wind sock at Tower 2 — if wind is from South, use Route North."
  }},
  "emergency_contacts": [
    {{"role": "Plant Fire & Rescue Command", "phone": "Ext. 5555 / +91-98765-00101"}},
    {{"role": "Chief Safety Officer (CSO)", "phone": "Ext. 5501 / +91-98765-00102"}},
    {{"role": "Control Room Master Desk", "phone": "Ext. 5000"}},
    {{"role": "District Disaster Management Unit", "phone": "112 / +91-22-2401-0000"}}
  ]
}}

JSON:"""


def generate_emergency_plan(
    hazard_type: str, asset_tag: str = "PLANT-WIDE", asset_name: str = "Central Facility"
) -> dict[str, Any]:
    """
    Generates a complete emergency response plan covering SOPs, isolation steps, PPE,
    evacuation, emergency contacts, and shutdown sequence.
    """
    valid_hazards = ["Fire", "Gas leak", "Equipment failure", "Chemical spill", "Power failure"]
    normalized_hazard = hazard_type.strip().capitalize()
    
    # Match hazard type flexibly
    matched_hazard = "Fire"
    for h in valid_hazards:
        if h.lower() in hazard_type.lower():
            matched_hazard = h
            break

    query = f"emergency response protocol {matched_hazard} {asset_tag} ESD shutdown evacuation PPE isolation"
    chunks = retrieve(query, k=6)

    context = "\n\n".join(
        f"[DOC:{c['doc_name']} p.{c['page']}]: {c['text'][:300]}" for c in chunks
    ) if chunks else "Standard plant emergency response context."

    try:
        resp = client.chat.completions.create(
            model=LLM_MODEL,
            messages=[{"role": "user", "content": _ERP_PROMPT.format(
                hazard_type=matched_hazard,
                asset_tag=asset_tag,
                asset_name=asset_name,
                context=context,
            )}],
            response_format={"type": "json_object"},
            temperature=0.1,
            max_tokens=1800,
        )
        raw = resp.choices[0].message.content.strip()
        raw = re.sub(r"^```(?:json)?\s*", "", raw, flags=re.MULTILINE)
        raw = re.sub(r"\s*```$", "", raw, flags=re.MULTILINE)
        plan = json.loads(raw)
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Emergency plan generator error: {str(e)}")

    plan_id = f"ERP-{str(uuid.uuid4())[:6].upper()}"
    plan["plan_id"] = plan_id
    plan["created_at"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())

    # Save to SQLite
    with _write_lock:
        with _conn() as con:
            con.execute(
                """INSERT INTO emergency_plans (plan_id, hazard_type, asset_tag, title, plan_json, created_at)
                   VALUES (?,?,?,?,?,?)""",
                (plan_id, matched_hazard, asset_tag.upper(), plan.get("title", ""), json.dumps(plan), plan["created_at"]),
            )

    return plan


def list_emergency_plans(hazard_type: str = "") -> list[dict]:
    init_db()
    with _conn() as con:
        if hazard_type:
            rows = con.execute("SELECT plan_json FROM emergency_plans WHERE LOWER(hazard_type) LIKE LOWER(?) ORDER BY created_at DESC", (f"%{hazard_type}%",)).fetchall()
        else:
            rows = con.execute("SELECT plan_json FROM emergency_plans ORDER BY created_at DESC").fetchall()
        
        res = []
        for r in rows:
            try:
                res.append(json.loads(r[0]))
            except Exception:
                pass
        return res
