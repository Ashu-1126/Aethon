"""
AETHON — Knowledge Graph (SQLite)
Stores entities and relationships extracted from documents.

Schema:
  nodes  (id, label, type, doc_name)
  edges  (from_id, to_id, relation, doc_name)

Entity/relation extraction uses llama3.1:8b with a JSON prompt.
"""
from __future__ import annotations

import json
import re
import sqlite3
import threading
import uuid
from contextlib import contextmanager
from typing import Optional

import ollama

from config import GRAPH_DB_PATH, LLM_MODEL

# Serializes graph writes. SQLite is opened with a busy_timeout so concurrent
# connections wait instead of raising "database is locked", and this lock keeps
# multi-statement transactions (node + edge upserts) atomic.
_write_lock = threading.Lock()


# ── DB setup ────────────────────────────────────────────────────────────────

@contextmanager
def _conn():
    con = sqlite3.connect(GRAPH_DB_PATH, timeout=30)
    con.row_factory = sqlite3.Row
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
            CREATE INDEX IF NOT EXISTS idx_edge_from ON edges(from_id);
            CREATE INDEX IF NOT EXISTS idx_edge_to   ON edges(to_id);
        """)


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
        resp = ollama.generate(
            model=LLM_MODEL,
            prompt=prompt,
            options={"temperature": 0.0, "num_predict": 512},
        )
        raw = resp["response"].strip()
        # Extract JSON from the response (model may wrap in markdown)
        m = re.search(r"\{.*\}", raw, re.DOTALL)
        if m:
            return json.loads(m.group())
    except Exception:
        pass
    return {"entities": [], "relations": []}


# ── Node / edge helpers ──────────────────────────────────────────────────────

def _node_id(label: str) -> str:
    """Deterministic ID from label so identical entities merge."""
    return label.lower().strip().replace(" ", "_")[:64]


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
    Run entity extraction on a sample of chunks (every 3rd, max 20)
    and store into the graph.  Returns number of nodes added.
    """
    init_db()
    # Sample chunks to keep extraction time reasonable
    sampled = chunks[::3][:20]
    nodes_added = 0

    with _write_lock:
        with _conn() as con:
            for chunk in sampled:
                doc_name = chunk["doc_name"]
                extracted = _extract_entities_from_chunk(chunk["text"], doc_name)

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
