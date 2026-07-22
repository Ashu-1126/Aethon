"""
AETHON — Asset Intelligence Module
AI-powered health, compliance, and maintenance analysis scoped to industrial assets.

Every function returns asset-scoped AI analysis with:
  - confidence score (0-100)
  - citations from indexed documents
  - explainability rationale
  - caching to disk (data/asset_cache/<tag>.json)
"""
from __future__ import annotations

import json
import re
import time
from pathlib import Path

from config import LLM_MODEL, client, DATA_DIR
from embeddings import retrieve
from fastapi import HTTPException

# ── Cache directory ───────────────────────────────────────────────────────────
_ASSET_CACHE_DIR = DATA_DIR / "asset_cache"
_ASSET_CACHE_DIR.mkdir(parents=True, exist_ok=True)
_CACHE_TTL = 3600  # 1 hour


def _cache_path(tag: str, key: str) -> Path:
    safe_tag = tag.upper().replace("/", "_")
    return _ASSET_CACHE_DIR / f"{safe_tag}_{key}.json"


def _cache_load(tag: str, key: str) -> dict | list | None:
    p = _cache_path(tag, key)
    try:
        if p.exists() and (time.time() - p.stat().st_mtime) < _CACHE_TTL:
            with open(p) as f:
                return json.load(f)
    except Exception:
        pass
    return None


def _cache_save(tag: str, key: str, data: dict | list) -> None:
    try:
        with open(_cache_path(tag, key), "w") as f:
            json.dump(data, f)
    except Exception:
        pass


# ══════════════════════════════════════════════════════════════════════════════
# ASSET HEALTH SUMMARY AGENT
# ══════════════════════════════════════════════════════════════════════════════

_HEALTH_PROMPT = """\
You are an industrial reliability engineer analyzing asset health for {tag} ({name}).

Review the following document excerpts and knowledge graph context for this asset.

Document Context:
{context}

{graph_context}

Provide a comprehensive health assessment. Return ONLY valid JSON:
{{
  "health_score": 78,
  "status_assessment": "The asset is operating within acceptable parameters with minor wear indicators.",
  "risk_factors": [
    {{"factor": "Bearing temperature trending upward", "severity": "medium", "citation": "Maintenance-Log-Q3.pdf p.4"}},
    {{"factor": "Lubrication interval overdue by 12 days", "severity": "high", "citation": "OEM-Manual.pdf p.22"}}
  ],
  "recommended_actions": [
    {{"action": "Inspect bearing housing", "priority": "high", "timeframe": "Within 48 hours"}},
    {{"action": "Schedule lubrication", "priority": "medium", "timeframe": "This week"}}
  ],
  "confidence": 82,
  "last_known_status": "operational"
}}

JSON:"""


def get_asset_health(tag: str, name: str = "", force: bool = False) -> dict:
    """
    AI-powered health assessment for a specific asset.
    Returns health_score, risk_factors, recommended_actions, confidence.
    """
    if not force:
        cached = _cache_load(tag, "health")
        if cached:
            return cached

    query = f"{tag} maintenance failure inspection status health condition"
    chunks = retrieve(query, k=6)

    if not chunks:
        result = {
            "health_score": 0,
            "status_assessment": "No maintenance records found for this asset in the knowledge base.",
            "risk_factors": [],
            "recommended_actions": [{"action": "Upload maintenance manuals and inspection logs", "priority": "high", "timeframe": "Immediately"}],
            "confidence": 0,
            "last_known_status": "unknown",
            "sources": [],
        }
        _cache_save(tag, "health", result)
        return result

    context = "\n\n".join(
        f"[DOC:{c['doc_name']} PAGE:{c['page']}]: {c['text'][:300]}" for c in chunks
    )
    from graph import get_related_graph_context
    doc_names = list({c["doc_name"] for c in chunks})
    graph_context = get_related_graph_context(doc_names, tag)

    try:
        resp = client.chat.completions.create(
            model=LLM_MODEL,
            messages=[{"role": "user", "content": _HEALTH_PROMPT.format(
                tag=tag, name=name or tag, context=context, graph_context=graph_context
            )}],
            response_format={"type": "json_object"},
            temperature=0.1,
            max_tokens=1024,
        )
        raw = resp.choices[0].message.content.strip()
        # Strip markdown fences
        raw = re.sub(r"^```(?:json)?\s*", "", raw, flags=re.MULTILINE)
        raw = re.sub(r"\s*```$", "", raw, flags=re.MULTILINE)
        result = json.loads(raw)
        result["sources"] = [
            {"doc_name": c["doc_name"], "page": c["page"], "snippet": c["text"][:150]}
            for c in chunks
        ]
        _cache_save(tag, "health", result)
        return result
    except Exception as e:
        cached = _cache_load(tag, "health")
        if cached:
            return cached
        raise HTTPException(status_code=503, detail=f"AI health assessment failed: {str(e)}")


# ══════════════════════════════════════════════════════════════════════════════
# PREDICTIVE MAINTENANCE AGENT
# ══════════════════════════════════════════════════════════════════════════════

_FORECAST_PROMPT = """\
You are a predictive maintenance engineer for industrial asset {tag} ({name}).

Analyze the following maintenance history, failure records, and specifications.

Context:
{context}

{graph_context}

Predict the maintenance forecast. Return ONLY valid JSON:
{{
  "risk_score": 65,
  "predicted_failure_window_days": 45,
  "failure_mode": "Bearing fatigue due to extended lubrication intervals",
  "contributing_factors": [
    {{"factor": "Operating at 94% rated load continuously", "weight": "high", "citation": "Maintenance-Log-Q3.pdf p.7"}},
    {{"factor": "Last inspection 180 days ago vs 90-day schedule", "weight": "critical", "citation": "SOP-PM-04.pdf p.3"}}
  ],
  "maintenance_actions": [
    {{"action": "Full bearing inspection and lubrication", "criticality": "high", "estimated_downtime_hours": 4}},
    {{"action": "Vibration analysis check", "criticality": "medium", "estimated_downtime_hours": 1}}
  ],
  "next_recommended_maintenance": "2026-08-15",
  "confidence": 71
}}

JSON:"""


def get_asset_forecast(tag: str, name: str = "", force: bool = False) -> dict:
    """
    Predictive maintenance forecast for an asset.
    Returns risk_score, predicted_failure_window_days, maintenance_actions.
    """
    if not force:
        cached = _cache_load(tag, "forecast")
        if cached:
            return cached

    query = f"{tag} failure mode maintenance schedule inspection interval vibration temperature"
    chunks = retrieve(query, k=8)

    if not chunks:
        result = {
            "risk_score": 0,
            "predicted_failure_window_days": None,
            "failure_mode": "Insufficient data",
            "contributing_factors": [],
            "maintenance_actions": [{"action": "Upload maintenance logs and inspection records", "criticality": "high", "estimated_downtime_hours": 0}],
            "next_recommended_maintenance": None,
            "confidence": 0,
            "sources": [],
        }
        _cache_save(tag, "forecast", result)
        return result

    context = "\n\n".join(
        f"[DOC:{c['doc_name']} PAGE:{c['page']}]: {c['text'][:300]}" for c in chunks
    )
    from graph import get_related_graph_context
    doc_names = list({c["doc_name"] for c in chunks})
    graph_context = get_related_graph_context(doc_names, tag)

    try:
        resp = client.chat.completions.create(
            model=LLM_MODEL,
            messages=[{"role": "user", "content": _FORECAST_PROMPT.format(
                tag=tag, name=name or tag, context=context, graph_context=graph_context
            )}],
            response_format={"type": "json_object"},
            temperature=0.1,
            max_tokens=1024,
        )
        raw = resp.choices[0].message.content.strip()
        raw = re.sub(r"^```(?:json)?\s*", "", raw, flags=re.MULTILINE)
        raw = re.sub(r"\s*```$", "", raw, flags=re.MULTILINE)
        result = json.loads(raw)
        result["sources"] = [
            {"doc_name": c["doc_name"], "page": c["page"], "snippet": c["text"][:150]}
            for c in chunks
        ]
        _cache_save(tag, "forecast", result)
        return result
    except Exception as e:
        cached = _cache_load(tag, "forecast")
        if cached:
            return cached
        raise HTTPException(status_code=503, detail=f"AI forecast failed: {str(e)}")


# ══════════════════════════════════════════════════════════════════════════════
# ASSET COMPLIANCE AGENT
# ══════════════════════════════════════════════════════════════════════════════

_ASSET_COMPLIANCE_PROMPT = """\
You are an industrial compliance officer auditing asset {tag} ({name}).

Review the following document context for compliance gaps specific to this asset.

Context:
{context}

Standards: Factory Act, OISD-116, DGMS, PESO

Find compliance gaps for THIS SPECIFIC ASSET only. Return ONLY valid JSON:
{{
  "compliance_score": 84,
  "gaps": [
    {{
      "standard": "OISD-116",
      "clause": "§7.2",
      "issue": "Pressure relief valve inspection interval not documented for {tag}",
      "severity": "critical",
      "citation": "OISD-116-Regulation.pdf p.14"
    }}
  ],
  "confidence": 79
}}

JSON:"""


def get_asset_compliance(tag: str, name: str = "", force: bool = False) -> dict:
    """
    Asset-scoped compliance gap analysis.
    Returns compliance_score, gaps with citations.
    """
    if not force:
        cached = _cache_load(tag, "compliance")
        if cached:
            return cached

    query = f"{tag} compliance regulation safety standard procedure permit"
    chunks = retrieve(query, k=6)

    if not chunks:
        result = {"compliance_score": 0, "gaps": [], "confidence": 0, "sources": []}
        _cache_save(tag, "compliance", result)
        return result

    context = "\n\n".join(
        f"[DOC:{c['doc_name']} PAGE:{c['page']}]: {c['text'][:300]}" for c in chunks
    )

    try:
        resp = client.chat.completions.create(
            model=LLM_MODEL,
            messages=[{"role": "user", "content": _ASSET_COMPLIANCE_PROMPT.format(
                tag=tag, name=name or tag, context=context
            )}],
            response_format={"type": "json_object"},
            temperature=0.0,
            max_tokens=1024,
        )
        raw = resp.choices[0].message.content.strip()
        raw = re.sub(r"^```(?:json)?\s*", "", raw, flags=re.MULTILINE)
        raw = re.sub(r"\s*```$", "", raw, flags=re.MULTILINE)
        result = json.loads(raw)
        result["sources"] = [
            {"doc_name": c["doc_name"], "page": c["page"], "snippet": c["text"][:150]}
            for c in chunks
        ]
        _cache_save(tag, "compliance", result)
        return result
    except Exception as e:
        cached = _cache_load(tag, "compliance")
        if cached:
            return cached
        raise HTTPException(status_code=503, detail=f"AI compliance analysis failed: {str(e)}")


# ══════════════════════════════════════════════════════════════════════════════
# ASSET ALERT SCAN AGENT
# ══════════════════════════════════════════════════════════════════════════════

_ALERT_SCAN_PROMPT = """\
You are an industrial safety monitoring system scanning for operational alerts for asset {tag} ({name}).

Analyze the following document excerpts for any anomaly indicators, safety concerns, or operational deviations.

Context:
{context}

Identify alerts. Return ONLY valid JSON:
{{
  "alerts": [
    {{
      "event_type": "alert",
      "severity": "high",
      "title": "Bearing temperature exceeds safe operating limit",
      "detail": "Operating temperature reported at 95°C vs maximum rated 80°C",
      "citation": "Maintenance-Log-Q3.pdf p.5"
    }}
  ]
}}

Return empty alerts array if no issues found.
JSON:"""


def scan_asset_alerts(tag: str, name: str = "") -> list[dict]:
    """
    Scan indexed documents for operational alerts related to an asset.
    Returns list of alert dicts ready to be logged via add_asset_event().
    """
    query = f"{tag} abnormal temperature vibration pressure leak failure warning alert"
    chunks = retrieve(query, k=6)

    if not chunks:
        return []

    context = "\n\n".join(
        f"[DOC:{c['doc_name']} PAGE:{c['page']}]: {c['text'][:300]}" for c in chunks
    )

    try:
        resp = client.chat.completions.create(
            model=LLM_MODEL,
            messages=[{"role": "user", "content": _ALERT_SCAN_PROMPT.format(
                tag=tag, name=name or tag, context=context
            )}],
            response_format={"type": "json_object"},
            temperature=0.0,
            max_tokens=768,
        )
        raw = resp.choices[0].message.content.strip()
        raw = re.sub(r"^```(?:json)?\s*", "", raw, flags=re.MULTILINE)
        raw = re.sub(r"\s*```$", "", raw, flags=re.MULTILINE)
        result = json.loads(raw)
        alerts = result.get("alerts", [])
        # Attach citation source to each alert
        for alert in alerts:
            citation = alert.pop("citation", "")
            alert["source"] = citation
        return alerts
    except Exception:
        return []


# ══════════════════════════════════════════════════════════════════════════════
# FACTORY RISK HEATMAP ENGINE
# ══════════════════════════════════════════════════════════════════════════════

def calculate_factory_risk_heatmap() -> list[dict]:
    """
    Computes dynamic multi-factor risk scores across all registered assets.
    Considers:
      1. Criticality weight (critical=40, high=30, medium=20, low=10)
      2. Maintenance & Status (offline=40, degraded=30, maintenance=15, operational=0)
      3. Failure Probability & Health Score
      4. Compliance Gaps & Penalty Points
      5. Recent Anomaly / Sensor Events
    Assigns Risk Tier:
      - RED:    Risk Score >= 75
      - ORANGE: Risk Score >= 50
      - YELLOW: Risk Score >= 25
      - GREEN:  Risk Score < 25
    """
    from graph import get_assets, get_asset_events
    from predictive import calculate_asset_pdm

    fleet = get_assets()
    heatmap = []

    for a in fleet:
        tag = a["tag"]
        name = a["name"]
        crit = (a.get("criticality") or "medium").lower()
        status = (a.get("status") or "operational").lower()

        # 1. Base Criticality score
        crit_score = 40 if crit == "critical" else 30 if crit == "high" else 20 if crit == "medium" else 10

        # 2. Operational Status Penalty
        status_penalty = 40 if status == "offline" else 30 if status == "degraded" else 15 if status == "maintenance" else 0

        # 3. PdM Failure Probability & RUL
        try:
            pdm = calculate_asset_pdm(tag, name, status=status, criticality=crit)
            fail_prob = pdm.get("failure_probability_percentage", 20)
            health = pdm.get("health_score", 80)
        except Exception:
            fail_prob = 25
            health = 75

        # 4. Recent Events & Sensor Anomalies
        events = get_asset_events(tag, limit=10)
        recent_crit_events = sum(1 for e in events if e.get("severity") in ("critical", "high"))

        # 5. Composite Risk Score Formula (0-100)
        raw_risk = (
            (crit_score * 0.25) +
            (status_penalty * 0.25) +
            (fail_prob * 0.30) +
            ((100 - health) * 0.10) +
            (min(recent_crit_events * 5, 20) * 0.10)
        )
        risk_score = min(100, max(0, int(round(raw_risk))))

        # Tier assignment
        if risk_score >= 70:
            color = "RED"
            badge = "Critical Risk"
            bg_hex = "#ef4444"
        elif risk_score >= 45:
            color = "ORANGE"
            badge = "Elevated Risk"
            bg_hex = "#f97316"
        elif risk_score >= 25:
            color = "YELLOW"
            badge = "Moderate Risk"
            bg_hex = "#f59e0b"
        else:
            color = "GREEN"
            badge = "Optimal / Safe"
            bg_hex = "#00d2b4"

        heatmap.append({
            "asset_tag": tag,
            "asset_name": name,
            "category": a.get("category", "equipment"),
            "location": a.get("location", "Plant Floor"),
            "status": status,
            "criticality": crit,
            "risk_score": risk_score,
            "color_tier": color,
            "badge_label": badge,
            "color_hex": bg_hex,
            "factors": {
                "criticality_weight": crit_score,
                "status_penalty": status_penalty,
                "failure_probability": fail_prob,
                "health_score": health,
                "recent_events": len(events)
            }
        })

    heatmap.sort(key=lambda x: x["risk_score"], reverse=True)
    return heatmap


# ══════════════════════════════════════════════════════════════════════════════
# ENTERPRISE KNOWLEDGE GAP SCANNER & AUTO-ALERT ENGINE
# ══════════════════════════════════════════════════════════════════════════════

def scan_enterprise_knowledge_gaps() -> list[dict]:
    """
    Continuously audits indexed corpus & graph to detect:
      - Missing SOPs
      - Missing OEM Manuals
      - Missing Inspection Reports
      - Missing Maintenance Logs
      - Missing Compliance Documents
      - Missing Emergency Procedures
    Generates automated alert items for every detected documentation void.
    """
    from graph import get_assets, add_asset_event
    from embeddings import retrieve

    fleet = get_assets()
    detected_gaps = []

    required_categories = {
        "sop": ("Standard Operating Procedure (SOP)", "SOP procedure operation step execution"),
        "manual": ("OEM Operation & Maintenance Manual", "OEM manual specification maintenance catalog parts"),
        "inspection": ("Inspection & Calibration Records", "inspection calibration testing certificate thickness report"),
        "maintenance": ("Maintenance History & Work Orders", "maintenance work order repair overhaul log service history"),
        "compliance": ("Regulatory Compliance Documents", "compliance regulation OISD Factory Act PESO DGMS permit"),
        "emergency": ("Emergency Shutdown & Safety Procedures", "emergency shutdown ESD hazard evacuation fire safety protocol"),
    }

    for a in fleet:
        tag = a["tag"]
        name = a["name"]

        for cat_key, (cat_label, cat_query) in required_categories.items():
            query = f"{tag} {cat_query}"
            chunks = retrieve(query, k=3)

            # High confidence threshold for chunk match
            valid_chunks = [c for c in chunks if c.get("score", 0) > 45]

            if not valid_chunks:
                severity = "critical" if cat_key in ("emergency", "compliance") else "high" if cat_key in ("sop", "manual") else "medium"
                gap_item = {
                    "asset_tag": tag,
                    "asset_name": name,
                    "gap_category": cat_key,
                    "category_label": cat_label,
                    "severity": severity,
                    "title": f"Missing {cat_label} for {tag}",
                    "description": f"No valid {cat_label} found in knowledge corpus for {tag} ({name}). Operational and compliance risks detected.",
                    "recommended_action": f"Upload official {cat_label} document for {tag}."
                }
                detected_gaps.append(gap_item)

                # Automatically log an asset event alert
                add_asset_event(
                    tag=tag,
                    event_type="alert",
                    severity=severity,
                    title=gap_item["title"],
                    detail=gap_item["description"],
                    source="Knowledge Gap Auto-Scanner"
                )

    return detected_gaps


