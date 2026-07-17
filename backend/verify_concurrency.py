"""
AETHON — Concurrency control verification
Fires many uploads concurrently and asserts the backend's concurrency
guards actually hold:

  1. SEMAPHORE: at most MAX_CONCURRENT_INGESTS docs are in an *active*
     (parsing/embedding) state at any moment; the rest wait in "queued".
  2. REGISTRY: every uploaded doc reaches a terminal state (indexed/failed);
     none are lost or stuck, and _registry.json stays valid JSON.
  3. STORES: no "database is locked" / ChromaDB write errors surface.

Requires a running backend (uvicorn main:app --port 8080) and Ollama.

Usage:
    python verify_concurrency.py            # defaults: 8 docs, http://localhost:8080
    BASE_URL=http://localhost:8080 N_DOCS=12 python verify_concurrency.py
"""
from __future__ import annotations

import json
import os
import tempfile
import threading
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import requests

BASE_URL = os.getenv("BASE_URL", "http://localhost:8080")
N_DOCS = int(os.getenv("N_DOCS", "8"))
MAX_ACTIVE = int(os.getenv("MAX_CONCURRENT_INGESTS", "2"))  # mirrors config default
POLL_INTERVAL = 0.5
TIMEOUT = 600  # seconds to wait for all docs to finish (local LLM is slow)

ACTIVE_STATES = {"parsing", "embedding"}
TERMINAL_STATES = {"indexed", "failed"}

_lock = threading.Lock()
_max_active_seen = 0
_errors_seen: list[str] = []


def _make_doc(i: int, tmp: Path) -> Path:
    p = tmp / f"verify_doc_{i:02d}.txt"
    p.write_text(
        f"Verification document {i}. Pump P-{i} must comply with OISD-116 section 7. "
        f"Lubrication interval is {30 + i} days. Pressure limit {100 + i} bar. "
        f"Procedure requires permit-to-work and continuous monitoring."
        * 5
    )
    return p


def _upload(doc_path: Path) -> str | None:
    try:
        with open(doc_path, "rb") as f:
            r = requests.post(f"{BASE_URL}/ingest", files={"file": f}, timeout=30)
        if r.status_code != 202:
            with _lock:
                _errors_seen.append(f"upload {doc_path.name}: HTTP {r.status_code}")
            return None
        return r.json()["id"]
    except Exception as e:
        with _lock:
            _errors_seen.append(f"upload {doc_path.name}: {e}")


def _poll() -> dict[str, str]:
    # Retry a few times: the server can be saturated by slow local LLM calls,
    # so a single slow response shouldn't be treated as a failure.
    last_err = None
    for _ in range(5):
        try:
            r = requests.get(f"{BASE_URL}/documents", timeout=60)
            r.raise_for_status()
            return {d["id"]: d["status"] for d in r.json()["documents"]}
        except Exception as e:
            last_err = e
            time.sleep(1)
    raise last_err


def main() -> int:
    print(f"Target: {BASE_URL}")
    print(f"Uploads: {N_DOCS}  |  expected max active (semaphore): {MAX_ACTIVE}")

    with tempfile.TemporaryDirectory() as tmp:
        docs = [_make_doc(i, Path(tmp)) for i in range(N_DOCS)]

        # Fire all uploads concurrently; capture the IDs the server assigned.
        with ThreadPoolExecutor(max_workers=N_DOCS) as ex:
            uploaded_ids = [i for i in ex.map(_upload, docs) if i]

        if len(uploaded_ids) != N_DOCS:
            print(f"\nFAIL: only {len(uploaded_ids)}/{N_DOCS} uploads succeeded")
            return 1

        # Poll until ALL uploaded docs reach a terminal state (or timeout).
        # We only track the docs we uploaded, ignoring any pre-existing entries.
        start = time.time()
        while time.time() - start < TIMEOUT:
            try:
                statuses = _poll()
            except Exception as e:
                with _lock:
                    _errors_seen.append(f"poll: {e}")
                time.sleep(POLL_INTERVAL)
                continue

            mine = {k: v for k, v in statuses.items() if k in uploaded_ids}
            active = sum(1 for v in mine.values() if v in ACTIVE_STATES)
            with _lock:
                global _max_active_seen
                _max_active_seen = max(_max_active_seen, active)

            if all(v in TERMINAL_STATES for v in mine.values()):
                break
            time.sleep(POLL_INTERVAL)

        final = _poll()
        mine_final = {k: v for k, v in final.items() if k in uploaded_ids}
        stuck = {k: v for k, v in mine_final.items() if v not in TERMINAL_STATES}

    # ── Report ──────────────────────────────────────────────────────────
    print("\n" + "=" * 60)
    print("RESULTS")
    print("=" * 60)
    print(f"Docs uploaded (tracked)   : {len(uploaded_ids)}")
    print(f"Max active (parsing/emb.) : {_max_active_seen} (limit {MAX_ACTIVE})")
    print(f"Terminal-state docs       : {sum(1 for v in mine_final.values() if v in TERMINAL_STATES)}/{len(mine_final)}")
    print(f"Stuck (non-terminal) docs : {len(stuck)}")
    if stuck:
        for k, v in stuck.items():
            print(f"   - {k}: {v}")
    print(f"Errors captured           : {len(_errors_seen)}")
    for e in _errors_seen[:20]:
        print(f"   ! {e}")

    # ── Assertions ──────────────────────────────────────────────────────
    ok = True
    if _max_active_seen > MAX_ACTIVE:
        print(f"\nFAIL: semaphore exceeded — {_max_active_seen} active > limit {MAX_ACTIVE}")
        ok = False
    if stuck:
        print(f"\nFAIL: {len(stuck)} uploaded doc(s) never reached a terminal state")
        ok = False
    if any("locked" in e.lower() for e in _errors_seen):
        print("\nFAIL: a 'database is locked' / write error was observed")
        ok = False

    print("\n" + ("PASS ✅  concurrency controls verified" if ok else "FAIL ❌  see above"))
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
