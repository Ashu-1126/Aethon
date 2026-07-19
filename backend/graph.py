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
        # Migration for existing databases
        try:
            con.execute("ALTER TABLE chat_history ADD COLUMN sources TEXT")
        except Exception:
            pass
        try:
            con.execute("ALTER TABLE chat_history ADD COLUMN confidence INTEGER DEFAULT 0")
        except Exception:
            pass


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
You are an industrial knowledge extraction engine.
Given the following text from a document called "{doc_name}", extract:
1. Entities: machines, equipment, regulations, procedures, incidents, standards, persons.
2. Relationships between entities.

Return ONLY valid JSON in this exact format:
{{
  "entities": [
    {{"label": "Pump P-204", "type": "equipment"}},
    {{"label": "OISD-116 §7.2", "type": "regulation"}}
  ],
  "relations": [
    {{"from": "Pump P-204", "to": "OISD-116 §7.2", "relation": "governed_by"}}
  ]
}}

Valid entity types: equipment, regulation, procedure, incident, document
Valid relation types: governed_by, operated_via, must_comply, involved_in, documented_by, serviced_by, references, conflicts_with, caused_by

TEXT:
{text}

JSON:"""


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
