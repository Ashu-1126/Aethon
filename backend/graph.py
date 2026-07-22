"""
AETHON — Knowledge Graph (SQLite)
Stores entities and relationships extracted from documents.

Schema:
  nodes  (id, label, type, doc_name)
  edges  (from_id, to_id, relation, doc_name)

Entity/relation extraction uses the configured LLM (config.LLM_MODEL) with a
JSON prompt.
"""
from __future__ import annotations

import json
import re
import sqlite3
import threading
import uuid
from contextlib import contextmanager
from typing import Optional

from config import GRAPH_DB_PATH, LLM_MODEL, client

# Serializes graph writes. SQLite is opened with a busy_timeout so concurrent
# connections wait instead of raising "database is locked", and this lock keeps
# multi-statement transactions (node + edge upserts) atomic.
_write_lock = threading.Lock()


# ── DB setup ────────────────────────────────────────────────────────────────

@contextmanager
def _conn():
    con = sqlite3.connect(GRAPH_DB_PATH, timeout=30.0)
    con.row_factory = sqlite3.Row
    con.execute("PRAGMA journal_mode=WAL;")
    try:
        yield con
        con.commit()
    finally:
        con.close()


def init_db() -> None:
    with _conn() as con:
        con.executescript("""
            CREATE TABLE IF NOT EXISTS nodes (
                id       TEXT PRIMARY KEY,
                label    TEXT NOT NULL,
                type     TEXT NOT NULL,
                doc_name TEXT,
                x        REAL,
                y        REAL
            );
            CREATE TABLE IF NOT EXISTS edges (
                id        TEXT PRIMARY KEY,
                from_id   TEXT NOT NULL,
                to_id     TEXT NOT NULL,
                relation  TEXT NOT NULL,
                doc_name  TEXT,
                FOREIGN KEY (from_id) REFERENCES nodes(id),
                FOREIGN KEY (to_id)   REFERENCES nodes(id)
            );
            CREATE TABLE IF NOT EXISTS documents (
                id          TEXT PRIMARY KEY,
                name        TEXT NOT NULL,
                type        TEXT NOT NULL,
                status      TEXT NOT NULL,
                pages       INTEGER DEFAULT 0,
                ingested_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS chat_history (
                id         TEXT PRIMARY KEY,
                username   TEXT NOT NULL,
                message    TEXT NOT NULL,
                response   TEXT NOT NULL,
                sources    TEXT,
                confidence INTEGER DEFAULT 0,
                timestamp  TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_edge_from ON edges(from_id);
            CREATE INDEX IF NOT EXISTS idx_edge_to   ON edges(to_id);
            CREATE TABLE IF NOT EXISTS custom_metrics (
                id          TEXT PRIMARY KEY,
                doc_name    TEXT,
                metric_val  REAL,
                recorded_at TEXT
            );
        """)
        # ── Migration: chat_history columns ──────────────────────────────────
        for alter in [
            "ALTER TABLE chat_history ADD COLUMN sources TEXT",
            "ALTER TABLE chat_history ADD COLUMN confidence INTEGER DEFAULT 0",
        ]:
            try:
                con.execute(alter)
            except Exception:
                pass

        # ── Asset Registry tables (idempotent) ────────────────────────────────
        con.executescript("""
            CREATE TABLE IF NOT EXISTS assets (
                id           TEXT PRIMARY KEY,
                tag          TEXT UNIQUE NOT NULL,
                name         TEXT NOT NULL,
                category     TEXT NOT NULL,
                location     TEXT,
                criticality  TEXT DEFAULT 'medium',
                status       TEXT DEFAULT 'operational',
                manufacturer TEXT,
                model_number TEXT,
                install_date TEXT,
                created_at   TEXT NOT NULL,
                updated_at   TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS asset_documents (
                asset_id TEXT NOT NULL,
                doc_name TEXT NOT NULL,
                PRIMARY KEY (asset_id, doc_name)
            );
            CREATE TABLE IF NOT EXISTS asset_events (
                id         TEXT PRIMARY KEY,
                asset_id   TEXT NOT NULL,
                event_type TEXT NOT NULL,
                severity   TEXT NOT NULL,
                title      TEXT NOT NULL,
                detail     TEXT,
                source     TEXT,
                timestamp  TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_asset_tag       ON assets(tag);
            CREATE INDEX IF NOT EXISTS idx_asset_events_id ON asset_events(asset_id);
        """)
        # ── Migration: add columns to assets if DB existed before ─────────────
        for alter in [
            "ALTER TABLE assets ADD COLUMN manufacturer TEXT",
            "ALTER TABLE assets ADD COLUMN model_number TEXT",
            "ALTER TABLE assets ADD COLUMN install_date TEXT",
        ]:
            try:
                con.execute(alter)
            except Exception:
                pass


# ── Asset Registry CRUD ──────────────────────────────────────────────────────

def add_asset(
    tag: str,
    name: str,
    category: str,
    location: str = "",
    criticality: str = "medium",
    manufacturer: str = "",
    model_number: str = "",
    install_date: str = "",
) -> dict:
    """Create a new asset record. Returns the created asset dict."""
    import time as _time
    init_db()
    now = _time.strftime("%Y-%m-%dT%H:%M:%SZ", _time.gmtime())
    asset_id = str(uuid.uuid4())[:12]
    with _write_lock:
        with _conn() as con:
            con.execute(
                """INSERT INTO assets
                   (id, tag, name, category, location, criticality, status,
                    manufacturer, model_number, install_date, created_at, updated_at)
                   VALUES (?,?,?,?,?,?,'operational',?,?,?,?,?)""",
                (asset_id, tag.upper(), name, category, location, criticality,
                 manufacturer, model_number, install_date, now, now),
            )
    return get_asset(tag)


def get_assets(category: str = None, criticality: str = None) -> list[dict]:
    """List all assets, optionally filtered."""
    init_db()
    with _conn() as con:
        query = "SELECT * FROM assets"
        params: list = []
        filters = []
        if category:
            filters.append("category = ?")
            params.append(category)
        if criticality:
            filters.append("criticality = ?")
            params.append(criticality)
        if filters:
            query += " WHERE " + " AND ".join(filters)
        query += " ORDER BY criticality DESC, tag ASC"
        rows = con.execute(query, params).fetchall()
        return [dict(r) for r in rows]


def get_asset(tag: str) -> dict | None:
    """Get a single asset by plant tag (case-insensitive)."""
    init_db()
    with _conn() as con:
        row = con.execute(
            "SELECT * FROM assets WHERE UPPER(tag) = UPPER(?)", (tag,)
        ).fetchone()
        return dict(row) if row else None


def update_asset(tag: str, **fields) -> dict | None:
    """Update arbitrary fields on an asset. Returns updated asset or None."""
    import time as _time
    if not fields:
        return get_asset(tag)
    init_db()
    allowed = {"name", "category", "location", "criticality", "status",
                "manufacturer", "model_number", "install_date"}
    safe_fields = {k: v for k, v in fields.items() if k in allowed}
    if not safe_fields:
        return get_asset(tag)
    now = _time.strftime("%Y-%m-%dT%H:%M:%SZ", _time.gmtime())
    safe_fields["updated_at"] = now
    set_clause = ", ".join(f"{k} = ?" for k in safe_fields)
    values = list(safe_fields.values()) + [tag.upper()]
    with _write_lock:
        with _conn() as con:
            con.execute(
                f"UPDATE assets SET {set_clause} WHERE UPPER(tag) = UPPER(?)", values
            )
    return get_asset(tag)


def delete_asset(tag: str) -> bool:
    """Delete an asset and all its events/document links."""
    init_db()
    asset = get_asset(tag)
    if not asset:
        return False
    with _write_lock:
        with _conn() as con:
            con.execute("DELETE FROM asset_events   WHERE asset_id = ?", (asset["id"],))
            con.execute("DELETE FROM asset_documents WHERE asset_id = ?", (asset["id"],))
            con.execute("DELETE FROM assets          WHERE id = ?", (asset["id"],))
    return True


def add_asset_event(
    tag: str,
    event_type: str,
    severity: str,
    title: str,
    detail: str = "",
    source: str = "",
) -> dict | None:
    """Log an event (alert/maintenance/inspection/incident) for an asset."""
    import time as _time
    init_db()
    asset = get_asset(tag)
    if not asset:
        return None
    event_id = str(uuid.uuid4())
    now = _time.strftime("%Y-%m-%dT%H:%M:%SZ", _time.gmtime())
    with _write_lock:
        with _conn() as con:
            con.execute(
                """INSERT INTO asset_events
                   (id, asset_id, event_type, severity, title, detail, source, timestamp)
                   VALUES (?,?,?,?,?,?,?,?)""",
                (event_id, asset["id"], event_type, severity, title, detail, source, now),
            )
    return {
        "id": event_id, "asset_id": asset["id"], "event_type": event_type,
        "severity": severity, "title": title, "detail": detail,
        "source": source, "timestamp": now,
    }


def get_asset_events(tag: str, limit: int = 50) -> list[dict]:
    """Get event timeline for an asset (most recent first)."""
    init_db()
    asset = get_asset(tag)
    if not asset:
        return []
    with _conn() as con:
        rows = con.execute(
            """SELECT * FROM asset_events WHERE asset_id = ?
               ORDER BY timestamp DESC LIMIT ?""",
            (asset["id"], limit),
        ).fetchall()
        return [dict(r) for r in rows]


def link_asset_document(tag: str, doc_name: str) -> None:
    """Associate a document with an asset (idempotent)."""
    init_db()
    asset = get_asset(tag)
    if not asset:
        return
    with _write_lock:
        with _conn() as con:
            con.execute(
                "INSERT OR IGNORE INTO asset_documents (asset_id, doc_name) VALUES (?,?)",
                (asset["id"], doc_name),
            )


def get_asset_documents(tag: str) -> list[str]:
    """Get list of document names linked to an asset."""
    init_db()
    asset = get_asset(tag)
    if not asset:
        return []
    with _conn() as con:
        rows = con.execute(
            "SELECT doc_name FROM asset_documents WHERE asset_id = ?", (asset["id"],)
        ).fetchall()
        return [r[0] for r in rows]


def get_asset_by_graph_label(label: str) -> dict | None:
    """Try to match a graph node label to an asset tag (fuzzy: tag substring match)."""
    init_db()
    with _conn() as con:
        rows = con.execute("SELECT tag FROM assets").fetchall()
        label_upper = label.upper()
        for row in rows:
            if row[0].upper() in label_upper or label_upper in row[0].upper():
                return get_asset(row[0])
    return None


def add_custom_metric(metric_id: str, doc_name: str, val: float) -> None:
    """Save custom operational metric."""
    import time
    init_db()
    with _conn() as con:
        con.execute(
            "INSERT OR REPLACE INTO custom_metrics (id, doc_name, metric_val, recorded_at) VALUES (?, ?, ?, ?)",
            (metric_id, doc_name, val, time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()))
        )


def add_document_to_db(doc_id: str, name: str, doc_type: str, status: str, pages: int, ingested_at: str) -> None:
    init_db()
    with _conn() as con:
        con.execute(
            "INSERT OR REPLACE INTO documents (id, name, type, status, pages, ingested_at) VALUES (?,?,?,?,?,?)",
            (doc_id, name, doc_type, status, pages, ingested_at)
        )


def update_document_status_in_db(doc_id: str, status: str, pages: Optional[int] = None) -> None:
    init_db()
    with _conn() as con:
        if pages is not None:
            con.execute(
                "UPDATE documents SET status = ?, pages = ? WHERE id = ?",
                (status, pages, doc_id)
            )
        else:
            con.execute(
                "UPDATE documents SET status = ? WHERE id = ?",
                (status, doc_id)
            )


def get_documents_from_db() -> list[dict]:
    init_db()
    with _conn() as con:
        rows = con.execute("SELECT * FROM documents ORDER BY ingested_at DESC").fetchall()
        return [dict(r) for r in rows]


def delete_document_from_db(doc_id: str) -> Optional[str]:
    init_db()
    with _conn() as con:
        row = con.execute("SELECT name FROM documents WHERE id = ?", (doc_id,)).fetchone()
        if row:
            doc_name = row["name"]
            con.execute("DELETE FROM documents WHERE id = ?", (doc_id,))
            return doc_name
    return None


# ── LLM extraction ──────────────────────────────────────────────────────────

_EXTRACT_PROMPT = """\
You are an enterprise industrial knowledge graph extraction engine.
Given the text from document "{doc_name}", extract:
1. Entities: asset, document, maintenance, inspection, sensor, incident, work_order, spare_part, operator, vendor, regulation, rca, compliance, manual.
2. Relationships connecting industrial entities to assets or related operations.

Return ONLY valid JSON:
{{
  "entities": [
    {{"label": "Pump P-204", "type": "asset"}},
    {{"label": "WO-89241", "type": "work_order"}},
    {{"label": "Bearing SKF-6205", "type": "spare_part"}},
    {{"label": "OISD-116 §7.2", "type": "regulation"}}
  ],
  "relations": [
    {{"from": "Pump P-204", "to": "WO-89241", "relation": "serviced_by"}},
    {{"from": "WO-89241", "to": "Bearing SKF-6205", "relation": "replaces_part"}},
    {{"from": "Pump P-204", "to": "OISD-116 §7.2", "relation": "governed_by"}}
  ]
}}

Valid entity types: asset, document, maintenance, inspection, sensor, incident, work_order, spare_part, operator, vendor, regulation, rca, compliance, manual, equipment, procedure
Valid relation types: governed_by, operated_via, must_comply, involved_in, documented_by, serviced_by, references, conflicts_with, caused_by, replaces_part, monitored_by, supplied_by, inspected_by, assigned_to
"""



def _extract_entities_from_chunk(text: str, doc_name: str) -> dict:
    """Call LLM to extract entities and relations from a text chunk."""
    prompt = _EXTRACT_PROMPT.format(doc_name=doc_name, text=text[:2000])
    try:
        resp = client.chat.completions.create(
            model=LLM_MODEL,
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"},
            temperature=0.0,
            max_tokens=512,
        )
        raw = resp.choices[0].message.content.strip()
        # Extract JSON from the response (model may wrap in markdown)
        m = re.search(r"\{.*\}", raw, re.DOTALL)
        if m:
            return json.loads(m.group())
    except Exception:
        pass
    return {"entities": [], "relations": []}


# ── Node / edge helpers ──────────────────────────────────────────────────────

def _node_id(label: str) -> str:
    """Deterministic ID from label so identical entities merge.

    A short hash suffix is appended so two distinct long labels that share the
    same 64-char prefix don't collide into a single node.
    """
    import hashlib
    base = label.lower().strip().replace(" ", "_")[:64]
    suffix = hashlib.sha1(label.lower().strip().encode()).hexdigest()[:8]
    return f"{base}_{suffix}"


def _upsert_node(con: sqlite3.Connection, label: str, ntype: str, doc_name: str) -> str:
    nid = _node_id(label)
    con.execute(
        "INSERT OR IGNORE INTO nodes(id, label, type, doc_name) VALUES (?,?,?,?)",
        (nid, label, ntype, doc_name),
    )
    return nid


def _upsert_edge(
    con: sqlite3.Connection,
    from_id: str,
    to_id: str,
    relation: str,
    doc_name: str,
) -> None:
    eid = str(uuid.uuid4())
    # Avoid duplicate edges (same from/to/relation)
    exists = con.execute(
        "SELECT 1 FROM edges WHERE from_id=? AND to_id=? AND relation=?",
        (from_id, to_id, relation),
    ).fetchone()
    if not exists:
        con.execute(
            "INSERT INTO edges(id, from_id, to_id, relation, doc_name) VALUES (?,?,?,?,?)",
            (eid, from_id, to_id, relation, doc_name),
        )


# ── Public API ───────────────────────────────────────────────────────────────

def add_chunks_to_graph(chunks: list[dict]) -> int:
    """
    Run entity extraction on a sample of chunks (every 3rd, max 60)
    and store into the graph.  Returns number of nodes added.
    """
    init_db()
    # Sample chunks to keep extraction time reasonable (max 15 chunks spread across the doc)
    sampled = chunks[::6][:15]
    from concurrent.futures import ThreadPoolExecutor
    
    # Run network LLM extraction calls in parallel threads (5 concurrent workers to avoid rate limits)
    with ThreadPoolExecutor(max_workers=5) as executor:
        futures = [
            executor.submit(_extract_entities_from_chunk, chunk["text"], chunk["doc_name"])
            for chunk in sampled
        ]
        results = [f.result() for f in futures]

    nodes_added = 0
    with _write_lock:
        with _conn() as con:
            for extracted, chunk in zip(results, sampled):
                doc_name = chunk["doc_name"]

                # Upsert entities
                label_to_id: dict[str, str] = {}
                for ent in extracted.get("entities", []):
                    label = ent.get("label", "").strip()
                    etype = ent.get("type", "document")
                    if label:
                        nid = _upsert_node(con, label, etype, doc_name)
                        label_to_id[label] = nid
                        nodes_added += 1

                # Upsert relations
                for rel in extracted.get("relations", []):
                    from_label = rel.get("from", "").strip()
                    to_label   = rel.get("to", "").strip()
                    relation   = rel.get("relation", "references")
                    if from_label in label_to_id and to_label in label_to_id:
                        _upsert_edge(
                            con,
                            label_to_id[from_label],
                            label_to_id[to_label],
                            relation,
                            doc_name,
                        )

    return nodes_added


def get_graph() -> dict:
    """Return full graph as {nodes, edges} matching API contract."""
    init_db()
    with _conn() as con:
        nodes = [
            {
                "id":    r["id"],
                "label": r["label"],
                "type":  r["type"],
                "x":     r["x"],
                "y":     r["y"],
            }
            for r in con.execute("SELECT * FROM nodes").fetchall()
        ]
        edges = [
            {
                "from":     r["from_id"],
                "to":       r["to_id"],
                "relation": r["relation"],
            }
            for r in con.execute("SELECT * FROM edges").fetchall()
        ]
    return {"nodes": nodes, "edges": edges}


def get_related_graph_context(doc_names: list[str], query: str = None) -> str:
    """
    Retrieve nodes and edges related to the given document names or query,
    formatted as a readable context string for the LLM.
    """
    init_db()
    if not doc_names and not query:
        return ""

    nodes_list = []
    edges_list = []

    with _conn() as con:
        # 1. Fetch nodes matching document names
        if doc_names:
            placeholders = ",".join("?" for _ in doc_names)
            nodes_rows = con.execute(
                f"SELECT id, label, type FROM nodes WHERE doc_name IN ({placeholders})",
                doc_names
            ).fetchall()
            nodes_list.extend([dict(r) for r in nodes_rows])

            edges_rows = con.execute(
                f"SELECT from_id, to_id, relation FROM edges WHERE doc_name IN ({placeholders})",
                doc_names
            ).fetchall()
            edges_list.extend([dict(r) for r in edges_rows])

        # 2. Fetch nodes matching query (keyword match on label)
        if query:
            query_term = f"%{query}%"
            nodes_q_rows = con.execute(
                "SELECT id, label, type FROM nodes WHERE label LIKE ?",
                (query_term,)
            ).fetchall()
            q_nodes = [dict(r) for r in nodes_q_rows]

            # Merge unique nodes
            existing_ids = {n["id"] for n in nodes_list}
            for qn in q_nodes:
                if qn["id"] not in existing_ids:
                    nodes_list.append(qn)
                    existing_ids.add(qn["id"])

            # Fetch edges connected to query nodes
            if q_nodes:
                node_ids = [qn["id"] for qn in q_nodes]
                id_placeholders = ",".join("?" for _ in node_ids)
                edges_q_rows = con.execute(
                    f"SELECT from_id, to_id, relation FROM edges WHERE from_id IN ({id_placeholders}) OR to_id IN ({id_placeholders})",
                    node_ids + node_ids
                ).fetchall()

                existing_edges = {(e["from_id"], e["to_id"], e["relation"]) for e in edges_list}
                for er in edges_q_rows:
                    e_dict = dict(er)
                    edge_key = (e_dict["from_id"], e_dict["to_id"], e_dict["relation"])
                    if edge_key not in existing_edges:
                        edges_list.append(e_dict)
                        existing_edges.add(edge_key)

    if not nodes_list:
        return ""

    # Map node IDs to labels for edge display
    id_to_label = {n["id"]: n["label"] for n in nodes_list}

    parts = ["Knowledge Graph Context:"]
    parts.append("Entities:")
    for n in nodes_list:
        parts.append(f"  - {n['label']} ({n['type']})")

    if edges_list:
        parts.append("Relationships:")
        for e in edges_list:
            from_label = id_to_label.get(e["from_id"], e["from_id"])
            to_label = id_to_label.get(e["to_id"], e["to_id"])
            parts.append(f"  - {from_label} --[{e['relation']}]--> {to_label}")

    return "\n".join(parts)


def delete_doc_from_graph(doc_name: str) -> None:
    init_db()
    with _write_lock:
        with _conn() as con:
            # Get node IDs for this doc
            ids = [r["id"] for r in con.execute(
                "SELECT id FROM nodes WHERE doc_name=?", (doc_name,)
            ).fetchall()]
            if ids:
                placeholders = ",".join("?" * len(ids))
                con.execute(f"DELETE FROM edges WHERE from_id IN ({placeholders}) OR to_id IN ({placeholders})", ids + ids)
                con.execute(f"DELETE FROM nodes WHERE id IN ({placeholders})", ids)


def relationship_count() -> int:
    init_db()
    with _conn() as con:
        return con.execute("SELECT COUNT(*) FROM edges").fetchone()[0]


def add_chat_log(username: str, message: str, response: str, sources: list = None, confidence: int = 0) -> None:
    import time
    import json
    init_db()
    with _conn() as con:
        sources_json = json.dumps(sources) if sources else "[]"
        con.execute(
            "INSERT OR REPLACE INTO chat_history (id, username, message, response, sources, confidence, timestamp) VALUES (?,?,?,?,?,?,?)",
            (str(uuid.uuid4()), username, message, response, sources_json, confidence, time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()))
        )


def get_chat_history(username: str) -> list[dict]:
    import json
    init_db()
    with _conn() as con:
        rows = con.execute(
            "SELECT message, response, sources, confidence, timestamp FROM chat_history WHERE username=? ORDER BY timestamp ASC",
            (username,)
        ).fetchall()
        res = []
        for r in rows:
            try:
                srcs = json.loads(r[2]) if r[2] else []
            except Exception:
                srcs = []
            res.append({
                "message": r[0],
                "response": r[1],
                "sources": srcs,
                "confidence": r[3] or 0,
                "timestamp": r[4]
            })
        return res


def clear_chat_history(username: str) -> None:
    init_db()
    with _conn() as con:
        con.execute("DELETE FROM chat_history WHERE username=?", (username,))


# ── Semantic Traversal & Asset Memory Graph ─────────────────────────────────

def traverse_asset_memory_graph(start_label: str, depth: int = 2) -> dict:
    """
    Perform multi-hop semantic graph traversal originating from an Asset or Entity label.
    Traverses outward up to 'depth' hops to return a focused subgraph of connected:
    Assets -> Documents -> Maintenance -> Inspections -> Sensors -> Incidents -> Work Orders -> Spare Parts -> Vendors -> Regulations -> RCA -> Compliance.
    """
    init_db()
    visited_node_ids = set()
    visited_edge_ids = set()
    
    nodes_out = []
    edges_out = []

    with _conn() as con:
        # Match starting node by label or substring
        start_rows = con.execute(
            "SELECT * FROM nodes WHERE UPPER(label) LIKE UPPER(?)",
            (f"%{start_label}%",)
        ).fetchall()

        current_level_ids = {r["id"] for r in start_rows}
        for r in start_rows:
            visited_node_ids.add(r["id"])
            nodes_out.append(dict(r))

        for _ in range(depth):
            if not current_level_ids:
                break

            placeholders = ",".join("?" for _ in current_level_ids)
            id_list = list(current_level_ids)

            edge_rows = con.execute(
                f"SELECT * FROM edges WHERE from_id IN ({placeholders}) OR to_id IN ({placeholders})",
                id_list + id_list
            ).fetchall()

            next_level_ids = set()
            for e in edge_rows:
                e_dict = dict(e)
                if e_dict["id"] not in visited_edge_ids:
                    visited_edge_ids.add(e_dict["id"])
                    edges_out.append({
                        "from": e_dict["from_id"],
                        "to": e_dict["to_id"],
                        "relation": e_dict["relation"],
                        "doc_name": e_dict.get("doc_name", "")
                    })

                if e_dict["from_id"] not in visited_node_ids:
                    next_level_ids.add(e_dict["from_id"])
                if e_dict["to_id"] not in visited_node_ids:
                    next_level_ids.add(e_dict["to_id"])

            if next_level_ids:
                next_placeholders = ",".join("?" for _ in next_level_ids)
                node_rows = con.execute(
                    f"SELECT * FROM nodes WHERE id IN ({next_placeholders})",
                    list(next_level_ids)
                ).fetchall()

                for n in node_rows:
                    visited_node_ids.add(n["id"])
                    nodes_out.append(dict(n))

            current_level_ids = next_level_ids

    return {
        "start_label": start_label,
        "depth": depth,
        "nodes": nodes_out,
        "edges": edges_out,
        "total_nodes": len(nodes_out),
        "total_edges": len(edges_out)
    }
