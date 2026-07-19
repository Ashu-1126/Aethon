import sqlite3
import threading
from typing import List, Dict, Any

class GraphStore:
    def __init__(self, db_path: str = "graph.db"):
        # check_same_thread=False lets the store be used from worker threads
        # (e.g. the ingestion executor). All access is serialized via _lock so
        # concurrent reads/writes can't corrupt the connection or interleave
        # multi-statement transactions.
        self.conn = sqlite3.connect(db_path, check_same_thread=False)
        self._lock = threading.RLock()
        self._init_db()

    def _init_db(self):
        with self._lock:
            cursor = self.conn.cursor()
        # Nodes table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS nodes (
                id TEXT PRIMARY KEY,
                label TEXT NOT NULL,
                type TEXT NOT NULL
            )
        """)
        # Edges table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS edges (
                source TEXT NOT NULL,
                target TEXT NOT NULL,
                relation TEXT NOT NULL,
                UNIQUE(source, target, relation),
                FOREIGN KEY(source) REFERENCES nodes(id),
                FOREIGN KEY(target) REFERENCES nodes(id)
            )
        """)
        self.conn.commit()

    def add_node(self, node_id: str, label: str, node_type: str):
        with self._lock:
            cursor = self.conn.cursor()
            cursor.execute("""
                INSERT OR IGNORE INTO nodes (id, label, type)
                VALUES (?, ?, ?)
            """, (node_id, label, node_type))
            self.conn.commit()

    def add_edge(self, source_id: str, target_id: str, relation: str):
        with self._lock:
            cursor = self.conn.cursor()
            cursor.execute("""
                INSERT OR IGNORE INTO edges (source, target, relation)
                VALUES (?, ?, ?)
            """, (source_id, target_id, relation))
            self.conn.commit()

    def get_all_data(self) -> Dict[str, List[Dict[str, str]]]:
        """Returns all nodes and edges for the frontend visualization API."""
        with self._lock:
            cursor = self.conn.cursor()
        
            cursor.execute("SELECT id, label, type FROM nodes")
            nodes = [{"id": row[0], "label": row[1], "type": row[2]} for row in cursor.fetchall()]
        
            cursor.execute("SELECT source, target, relation FROM edges")
            edges = [{"from": row[0], "to": row[1], "relation": row[2]} for row in cursor.fetchall()]
        
            return {"nodes": nodes, "edges": edges}

    def get_edges_for_node(self, node_id: str) -> List[Dict[str, str]]:
        with self._lock:
            cursor = self.conn.cursor()
            cursor.execute("""
                SELECT target, relation FROM edges WHERE source = ?
            """, (node_id,))
            out = [{"to": row[0], "relation": row[1]} for row in cursor.fetchall()]
        
            cursor.execute("""
                SELECT source, relation FROM edges WHERE target = ?
            """, (node_id,))
            out.extend([{"from": row[0], "relation": row[1]} for row in cursor.fetchall()])
        
            return out
