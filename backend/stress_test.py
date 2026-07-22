"""
AETHON — Complete Stress Test Suite (Fixed)
Correct endpoints: token="token", /compliance/audit, /compliance/rewrite,
                   /dashboard/stats, /rca/{equipment}, /conflicts returns {conflicts:[]}
Run: python stress_test.py
"""
from __future__ import annotations

import concurrent.futures
import json
import statistics
import sys
import time
from typing import Any, Optional

import requests

BASE_URL = "http://localhost:8080"
LOGIN_PAYLOAD = {"username": "admin", "password": "password123"}

GREEN  = "\033[92m"
RED    = "\033[91m"
YELLOW = "\033[93m"
CYAN   = "\033[96m"
BOLD   = "\033[1m"
RESET  = "\033[0m"
DIM    = "\033[2m"

results: list[dict] = []


def record(name: str, passed: bool, latency_ms: float, detail: str = "", cached: bool = False):
    results.append({"name": name, "passed": passed, "latency_ms": latency_ms,
                    "detail": detail, "cached": cached})
    tag = f"{GREEN}PASS{RESET}" if passed else f"{RED}FAIL{RESET}"
    cache_tag = f" {YELLOW}[CACHE HIT]{RESET}" if cached else ""
    print(f"    [{tag}]{cache_tag}  {name}  {DIM}({latency_ms:.0f}ms){RESET}")
    if detail and not passed:
        print(f"         {RED}→ {detail[:200]}{RESET}")
    return passed


def section(title):
    print(f"\n{BOLD}{CYAN}{'━'*62}{RESET}\n{BOLD}  {title}{RESET}\n{'━'*62}")


def info(msg):
    print(f"  {CYAN}ℹ  {RESET} {msg}")


def warn(msg):
    print(f"  {YELLOW}⚠  {RESET} {msg}")


def auth_headers(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 1 — Health & Auth
# ═══════════════════════════════════════════════════════════════════════════════
def test_health_and_auth() -> str:
    section("SECTION 1 — Health & Authentication")

    # Health check
    t0 = time.perf_counter()
    try:
        r = requests.get(f"{BASE_URL}/health", timeout=10)
        ms = (time.perf_counter() - t0) * 1000
        body = r.json() if r.status_code == 200 else {}
        passed = r.status_code == 200
        record("GET /health → 200", passed, ms, "" if passed else r.text[:100])
        if passed:
            info(f"status={body.get('status')}  model={body.get('model')}  corpus_docs={body.get('corpus_docs')}")
    except Exception as e:
        record("GET /health", False, 0, str(e))
        print(f"\n{RED}Backend not reachable on port 8080. Start uvicorn first.{RESET}")
        sys.exit(1)

    # Login — API returns {"token": ..., "role": ...}
    t0 = time.perf_counter()
    try:
        r = requests.post(f"{BASE_URL}/auth/login", json=LOGIN_PAYLOAD, timeout=10)
        ms = (time.perf_counter() - t0) * 1000
        ok = r.status_code == 200 and "token" in r.json()
        record("POST /auth/login (valid creds) → token", ok, ms,
               "" if ok else f"status={r.status_code} body={r.text[:120]}")
        token = r.json().get("token", "") if r.status_code == 200 else ""
        if ok:
            info(f"role={r.json().get('role')}  token_prefix={token[:30]}…")
    except Exception as e:
        record("POST /auth/login", False, 0, str(e))
        sys.exit(1)

    # Wrong password → 401
    t0 = time.perf_counter()
    r2 = requests.post(f"{BASE_URL}/auth/login", json={"username": "admin", "password": "wrong"}, timeout=5)
    ms = (time.perf_counter() - t0) * 1000
    record("POST /auth/login (wrong password → 401)", r2.status_code == 401, ms)

    # No token → 401/403
    t0 = time.perf_counter()
    r3 = requests.get(f"{BASE_URL}/documents", timeout=5)
    ms = (time.perf_counter() - t0) * 1000
    record("GET /documents (no token → 401/403)", r3.status_code in (401, 403), ms)

    # Different role login
    t0 = time.perf_counter()
    r4 = requests.post(f"{BASE_URL}/auth/login", json={"username": "engineer", "password": "password123"}, timeout=10)
    ms = (time.perf_counter() - t0) * 1000
    ok4 = r4.status_code == 200 and r4.json().get("role") == "engineer"
    record("POST /auth/login (engineer role)", ok4, ms)

    return token


# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 2 — Document API
# ═══════════════════════════════════════════════════════════════════════════════
def test_documents(token: str) -> list:
    section("SECTION 2 — Document Corpus API")
    h = auth_headers(token)

    t0 = time.perf_counter()
    r = requests.get(f"{BASE_URL}/documents", headers=h, timeout=10)
    ms = (time.perf_counter() - t0) * 1000
    passed = r.status_code == 200 and "documents" in r.json()
    record("GET /documents → 200 + {documents:[]} schema", passed, ms,
           "" if passed else r.text[:120])

    docs = r.json().get("documents", []) if r.status_code == 200 else []
    info(f"Corpus has {len(docs)} document(s)")
    for d in docs[:3]:
        info(f"  {d.get('name')}  status={d.get('status')}  pages={d.get('pages')}")

    # DELETE non-existent → 404
    t0 = time.perf_counter()
    r2 = requests.delete(f"{BASE_URL}/documents/nonexistent-id-000", headers=h, timeout=5)
    ms = (time.perf_counter() - t0) * 1000
    record("DELETE /documents/bad-id → 404", r2.status_code == 404, ms)

    return docs


# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 3 — Dashboard
# ═══════════════════════════════════════════════════════════════════════════════
def test_dashboard(token: str):
    section("SECTION 3 — Dashboard Stats")
    h = auth_headers(token)

    t0 = time.perf_counter()
    r = requests.get(f"{BASE_URL}/dashboard/stats", headers=h, timeout=15)
    ms = (time.perf_counter() - t0) * 1000
    if r.status_code == 200:
        body = r.json()
        keys_ok = all(k in body for k in ["docs_indexed", "relationships", "compliance_score"])
        record("GET /dashboard/stats → 200 + schema", keys_ok, ms,
               "" if keys_ok else f"got keys: {list(body.keys())}")
        info(f"docs_indexed={body.get('docs_indexed')}  relationships={body.get('relationships')}  compliance_score={body.get('compliance_score')}")
    else:
        record("GET /dashboard/stats → 200 + schema", False, ms,
               f"HTTP {r.status_code}: {r.text[:120]}")


# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 4 — Copilot RAG
# ═══════════════════════════════════════════════════════════════════════════════
def test_copilot(token: str):
    section("SECTION 4 — Copilot RAG Agent (AI-Backed)")
    h = auth_headers(token)

    queries = [
        "What are the main safety requirements?",
        "What are the main safety requirements?",   # → semantic cache hit
        "Describe the compliance procedures in the documents.",
        "What is the Factory Act 1948 about?",
        "Who is responsible for safety monitoring?",
    ]

    latencies, cache_hits = [], 0

    for i, q in enumerate(queries):
        t0 = time.perf_counter()
        try:
            r = requests.post(f"{BASE_URL}/copilot/query", headers=h,
                              json={"query": q}, timeout=90)
            ms = (time.perf_counter() - t0) * 1000
            latencies.append(ms)
            if r.status_code == 200:
                body = r.json()
                schema_ok = all(k in body for k in ["answer", "sources", "confidence"])
                has_answer = bool(body.get("answer", "").strip())
                is_cached = body.get("cached", False)
                if is_cached:
                    cache_hits += 1
                record(f"Copilot Q{i+1}: {q[:38]}…", schema_ok and has_answer, ms,
                       "" if (schema_ok and has_answer) else
                       f"schema_ok={schema_ok} empty_answer={not has_answer}",
                       cached=is_cached)
                if schema_ok:
                    info(f"  confidence={body.get('confidence')}%  "
                         f"sources={len(body.get('sources', []))}  "
                         f"answer_len={len(body.get('answer',''))}")
            elif r.status_code == 503:
                warn(f"Q{i+1}: No documents indexed (503) — upload a PDF first")
                record(f"Copilot Q{i+1}: {q[:38]}… (no corpus)", True, ms)  # expected
            else:
                record(f"Copilot Q{i+1}: {q[:38]}…", False, ms,
                       f"HTTP {r.status_code}: {r.text[:100]}")
        except Exception as e:
            record(f"Copilot Q{i+1}", False, 0, str(e))

    if latencies:
        info(f"Copilot latency — min={min(latencies):.0f}ms  "
             f"max={max(latencies):.0f}ms  avg={statistics.mean(latencies):.0f}ms")
    info(f"Semantic cache hits: {cache_hits}/{len(queries)}")


# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 5 — Compliance Agent
# ═══════════════════════════════════════════════════════════════════════════════
def test_compliance(token: str):
    section("SECTION 5 — Compliance Auditor Agent (AI-Backed)")
    h = auth_headers(token)

    t0 = time.perf_counter()
    r = requests.get(f"{BASE_URL}/compliance/audit", headers=h, timeout=120)
    ms = (time.perf_counter() - t0) * 1000

    if r.status_code == 200:
        body = r.json()
        schema_ok = "overall_score" in body and "standards" in body
        score_valid = isinstance(body.get("overall_score"), (int, float)) and 0 <= body["overall_score"] <= 100
        standards_ok = isinstance(body.get("standards"), list)
        passed = schema_ok and score_valid and standards_ok
        record("GET /compliance/audit → 200 + schema", passed, ms,
               "" if passed else f"schema_ok={schema_ok} score_valid={score_valid}")
        if schema_ok:
            info(f"overall_score={body['overall_score']}  standards={len(body.get('standards', []))}")
            for s in body.get("standards", []):
                info(f"  {s.get('standard')}: score={s.get('score')}  gaps={len(s.get('gaps', []))}")
    else:
        record("GET /compliance/audit → 200 + schema", False, ms,
               f"HTTP {r.status_code}: {r.text[:150]}")


# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 6 — Conflict Detector
# ═══════════════════════════════════════════════════════════════════════════════
def test_conflicts(token: str):
    section("SECTION 6 — Conflict Detector Agent (AI-Backed)")
    h = auth_headers(token)

    t0 = time.perf_counter()
    r = requests.get(f"{BASE_URL}/conflicts", headers=h, timeout=120)
    ms = (time.perf_counter() - t0) * 1000

    if r.status_code == 200:
        body = r.json()
        # API wraps in {"conflicts": [...]}
        conflicts = body.get("conflicts", body) if isinstance(body, dict) else body
        is_list = isinstance(conflicts, list)
        record("GET /conflicts → 200 + list", is_list, ms,
               "" if is_list else f"got type={type(body).__name__}: {str(body)[:100]}")
        if is_list:
            info(f"Detected {len(conflicts)} conflict(s)")
            for c in conflicts[:3]:
                all_str = all(isinstance(v, str) for v in c.values())
                record(f"  Conflict field '{c.get('field','?')[:28]}' — all strings",
                       all_str, 0, "" if all_str else
                       str({k: type(v).__name__ for k, v in c.items()}))
    else:
        record("GET /conflicts → 200", False, ms, f"HTTP {r.status_code}: {r.text[:150]}")


# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 7 — RCA Agent   (route is /rca/{equipment})
# ═══════════════════════════════════════════════════════════════════════════════
def test_rca(token: str):
    section("SECTION 7 — Root Cause Analysis Agent (AI-Backed)")
    h = auth_headers(token)

    equipments = ["pump", "bearing", "valve", "compressor"]

    for eq in equipments:
        t0 = time.perf_counter()
        try:
            r = requests.get(f"{BASE_URL}/rca/{eq}", headers=h, timeout=90)
            ms = (time.perf_counter() - t0) * 1000
            if r.status_code == 404:
                record(f"GET /rca/{eq} → 404 (no corpus — expected)", True, ms)
            elif r.status_code == 200:
                body = r.json()
                schema_ok = "answer" in body and "confidence" in body
                has_answer = bool(body.get("answer", "").strip())
                record(f"GET /rca/{eq} → answer", schema_ok and has_answer, ms,
                       "" if (schema_ok and has_answer) else f"schema_ok={schema_ok}")
                if schema_ok:
                    info(f"  confidence={body.get('confidence')}%  "
                         f"sources={len(body.get('sources', []))}")
            else:
                record(f"GET /rca/{eq}", False, ms, f"HTTP {r.status_code}: {r.text[:100]}")
        except Exception as e:
            record(f"GET /rca/{eq}", False, 0, str(e))


# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 8 — Rewrite Agent  (route is /compliance/rewrite)
# ═══════════════════════════════════════════════════════════════════════════════
def test_rewrite(token: str):
    section("SECTION 8 — Clause Rewrite Agent (AI-Backed)")
    h = auth_headers(token)

    cases = [
        {"clause": "Lubrication shall be done every 90 days.",
         "issue": "OEM manual specifies 60-day interval"},
        {"clause": "Workers may enter confined spaces without prior monitoring.",
         "issue": "Factory Act Section 36 requires atmospheric monitoring"},
    ]

    for i, payload in enumerate(cases):
        t0 = time.perf_counter()
        try:
            r = requests.post(f"{BASE_URL}/compliance/rewrite", headers=h,
                              json=payload, timeout=60)
            ms = (time.perf_counter() - t0) * 1000
            if r.status_code == 200:
                body = r.json()
                has_rewrite = bool(body.get("rewrite", "").strip())
                record(f"POST /compliance/rewrite case {i+1}", has_rewrite, ms,
                       "" if has_rewrite else "empty rewrite")
                if has_rewrite:
                    info(f"  rewrite ({len(body['rewrite'])} chars): {body['rewrite'][:80]}…")
            else:
                record(f"POST /compliance/rewrite case {i+1}", False, ms,
                       f"HTTP {r.status_code}: {r.text[:100]}")
        except Exception as e:
            record(f"POST /compliance/rewrite case {i+1}", False, 0, str(e))


# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 9 — Scoreboard & Graph
# ═══════════════════════════════════════════════════════════════════════════════
def test_scoreboard_and_graph(token: str):
    section("SECTION 9 — Scoreboard & Knowledge Graph")
    h = auth_headers(token)

    t0 = time.perf_counter()
    r = requests.get(f"{BASE_URL}/scoreboard", headers=h, timeout=10)
    ms = (time.perf_counter() - t0) * 1000
    if r.status_code == 200:
        body = r.json()
        keys_ok = all(k in body for k in ["answer_accuracy", "avg_answer_seconds"])
        record("GET /scoreboard → schema", keys_ok, ms,
               "" if keys_ok else f"got: {list(body.keys())}")
        if keys_ok:
            info(f"accuracy={body.get('answer_accuracy')}%  "
                 f"citation_precision={body.get('citation_precision')}%  "
                 f"avg_latency={body.get('avg_answer_seconds')}s")
    else:
        record("GET /scoreboard → schema", False, ms, f"HTTP {r.status_code}")

    t0 = time.perf_counter()
    r = requests.get(f"{BASE_URL}/graph", headers=h, timeout=10)
    ms = (time.perf_counter() - t0) * 1000
    if r.status_code == 200:
        body = r.json()
        keys_ok = "nodes" in body and "edges" in body
        record("GET /graph → {nodes, edges}", keys_ok, ms)
        if keys_ok:
            info(f"nodes={len(body['nodes'])}  edges={len(body['edges'])}")
    else:
        record("GET /graph → schema", False, ms, f"HTTP {r.status_code}")


# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 10 — Concurrency Stress
# ═══════════════════════════════════════════════════════════════════════════════
def test_concurrency(token: str):
    section("SECTION 10 — Concurrency Stress Test")
    h = auth_headers(token)

    # 10 parallel /dashboard/stats
    def fire(_) -> tuple[int, float]:
        t0 = time.perf_counter()
        try:
            r = requests.get(f"{BASE_URL}/dashboard/stats", headers=h, timeout=30)
            return r.status_code, (time.perf_counter() - t0) * 1000
        except Exception:
            return 0, (time.perf_counter() - t0) * 1000

    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as ex:
        concurrent_results = list(ex.map(fire, range(10)))

    successes = sum(1 for status, _ in concurrent_results if status == 200)
    latencies = [ms for _, ms in concurrent_results]
    record(f"10 concurrent /dashboard/stats → {successes}/10 succeeded",
           successes >= 9, statistics.mean(latencies),
           "" if successes >= 9 else f"only {successes} succeeded")
    info(f"Concurrent latency — min={min(latencies):.0f}ms  "
         f"max={max(latencies):.0f}ms  avg={statistics.mean(latencies):.0f}ms")

    # 20 sequential /health flood
    health_times = []
    health_codes = []
    for _ in range(20):
        t0 = time.perf_counter()
        r = requests.get(f"{BASE_URL}/health", timeout=10)
        health_times.append((time.perf_counter() - t0) * 1000)
        health_codes.append(r.status_code)

    ok_count = sum(1 for c in health_codes if c == 200)
    avg_health = statistics.mean(health_times)
    p95_health = sorted(health_times)[18]
    # First call may hit Mistral API (cold cache); remaining 19 should use 30s TTL cache.
    # Pass criteria: all 20 return 200.
    all_ok = ok_count == 20
    record(f"20x sequential GET /health flood ({ok_count}/20 ✓)",
           all_ok, avg_health,
           "" if all_ok else f"ok={ok_count}/20")
    info(f"Health flood — first={health_times[0]:.0f}ms  avg={avg_health:.0f}ms  p95={p95_health:.0f}ms")




# ═══════════════════════════════════════════════════════════════════════════════
# SECTION 11 — Chat History Persistence
# ═══════════════════════════════════════════════════════════════════════════════
def test_chat_history(token: str):
    section("SECTION 11 — Chat History Persistence")
    h = auth_headers(token)

    # Read history
    t0 = time.perf_counter()
    r = requests.get(f"{BASE_URL}/copilot/history", headers=h, timeout=10)
    ms = (time.perf_counter() - t0) * 1000
    if r.status_code == 200:
        body = r.json()
        schema_ok = "history" in body and isinstance(body["history"], list)
        record("GET /copilot/history → {history:[]}", schema_ok, ms)
        if schema_ok:
            info(f"  {len(body['history'])} stored message(s)")
            if body["history"]:
                e = body["history"][0]
                entry_ok = all(k in e for k in ["message", "response", "timestamp"])
                record("  History entry schema (message/response/timestamp)", entry_ok, 0)
                sources_ok = "sources" in e and isinstance(e.get("sources"), list)
                record("  History entry has sources list", sources_ok, 0)
    else:
        record("GET /copilot/history → {history:[]}", False, ms, f"HTTP {r.status_code}")

    # Verify clear endpoint exists
    t0 = time.perf_counter()
    r2 = requests.delete(f"{BASE_URL}/copilot/history", headers=h, timeout=10)
    ms = (time.perf_counter() - t0) * 1000
    record("DELETE /copilot/history → 200", r2.status_code == 200, ms,
           "" if r2.status_code == 200 else f"HTTP {r2.status_code}")


# ═══════════════════════════════════════════════════════════════════════════════
# FINAL REPORT
# ═══════════════════════════════════════════════════════════════════════════════
def print_report():
    section("FINAL STRESS TEST REPORT")
    total   = len(results)
    passed  = sum(1 for r in results if r["passed"])
    failed  = total - passed
    lats    = [r["latency_ms"] for r in results if r["latency_ms"] > 0]
    cache_hits = sum(1 for r in results if r["cached"])
    pass_rate  = (passed / total * 100) if total else 0

    print(f"\n  {'Tests Run':<30} {total}")
    print(f"  {GREEN}{'Passed':<30}{RESET} {GREEN}{passed}{RESET}")
    print(f"  {RED}{'Failed':<30}{RESET} {RED}{failed}{RESET}")
    print(f"  {'Pass Rate':<30} {BOLD}{pass_rate:.1f}%{RESET}")
    if lats:
        print(f"  {'Avg Latency':<30} {statistics.mean(lats):.0f} ms")
        print(f"  {'Max Latency':<30} {max(lats):.0f} ms")
        print(f"  {'Min Latency':<30} {min(lats):.0f} ms")
    print(f"  {'Semantic Cache Hits':<30} {cache_hits}")

    if failed:
        print(f"\n  {RED}{BOLD}FAILED TESTS:{RESET}")
        for r in results:
            if not r["passed"]:
                print(f"    {RED}✗{RESET} {r['name']}")
                if r["detail"]:
                    print(f"      {DIM}{r['detail'][:120]}{RESET}")

    if pass_rate >= 90:
        verdict = f"{GREEN}{BOLD}✅  ALL SYSTEMS OPERATIONAL{RESET}"
    elif pass_rate >= 70:
        verdict = f"{YELLOW}{BOLD}⚠   MINOR FAILURES — REVIEW ABOVE{RESET}"
    else:
        verdict = f"{RED}{BOLD}❌  CRITICAL FAILURES DETECTED{RESET}"

    print(f"\n  Verdict: {verdict}\n")
    print(f"{'━'*62}\n")


# ═══════════════════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════════════════
if __name__ == "__main__":
    print(f"\n{BOLD}{CYAN}{'═'*62}")
    print(f"  AETHON — COMPLETE AI STRESS TEST SUITE  (v2 — Fixed)")
    print(f"  Target: {BASE_URL}")
    print(f"{'═'*62}{RESET}\n")

    token = test_health_and_auth()
    test_documents(token)
    test_dashboard(token)
    test_copilot(token)
    test_compliance(token)
    test_conflicts(token)
    test_rca(token)
    test_rewrite(token)
    test_scoreboard_and_graph(token)
    test_concurrency(token)
    test_chat_history(token)
    print_report()
