# 📋 AETHON — Team Task Board

> **Team of 4** · ET AI Hackathon 2026 · PS #8 (Industrial Knowledge Intelligence)
>
> **Current state:** Frontend shell is built & animated with *mock data*. The intelligence backend (ingestion, RAG, knowledge graph, agents) **does not exist yet** — this board builds it from scratch.

---

## ⚙️ Stack Contract — agree in Hour 1 (everyone)

> Settle these before anyone writes code, or people block each other.

- **Backend:** FastAPI on `:8000`
- **Frontend:** Next.js on `:3000` (already built)
- **Vector store:** ChromaDB
- **DB (metadata + graph edges):** SQLite (→ Postgres if time)
- **LLM:** Ollama, local — `llama3.1:8b` (reasoning) + `nomic-embed-text` (embeddings)
- **Transport:** JSON over REST + one WebSocket (`/ws/ingest`) for ingestion progress
- **🔑 The API contract (P2 owns, P3 consumes) is the single most important shared artifact — define it Day 1.**

**The #1 rule:** Get **one question → cited answer, in the browser, on real data** working as early as possible. Everything else is enhancement.

---

## 👤 Person 1 — AI / ML Engineer
*Owns the intelligence: ingestion → embeddings → retrieval → agents.*

### Phase 1 — RAG core (must-have)
- [ ] Stand up Ollama locally; pull `llama3.1:8b` + `nomic-embed-text`; confirm both respond
- [ ] Document loader: PDF→text (PyMuPDF), scanned→OCR (Tesseract/PaddleOCR), DOCX/XLSX→text
- [ ] Chunk documents (~500–800 tokens, ~80 overlap) with metadata `{doc_name, page, section}`
- [ ] Embed chunks with `nomic-embed-text` → store in ChromaDB with metadata
- [ ] `retrieve(query, k)` → top-k chunks + scores; add a reranker (bge-reranker) for precision
- [ ] `answer(query)` → retrieve → prompt `llama3.1:8b` → return **answer + cited sources + confidence** ⭐
- [ ] Expose everything as plain Python functions P2 can import (don't build HTTP — P2 wraps it)

### Phase 2 — Knowledge graph + agents
- [ ] Entity extraction: LLM pass per chunk → `equipment tags, regulations, dates, procedures, failure modes` as JSON
- [ ] Build relationships (`equipment—governed_by→regulation`, `incident—involved→equipment`) → hand P2 nodes + edges
- [ ] Compliance agent → `{compliant, gaps[], cited_clauses[]}`
- [ ] Conflict detector → contradictory values across docs (the "40 Nm vs 55 Nm" moment) ⭐
- [ ] RCA agent → likely root cause + citations

### Phase 3 — Proof (wins judging)
- [ ] 20-question benchmark over the real corpus with known answers
- [ ] Measure accuracy, citation precision, time-to-answer vs. keyword search → hand numbers to P3

**Deliverable:** `intelligence/` Python module + indexed corpus.
**Done when:** a real question returns a correct, cited answer.

---

## 👤 Person 2 — Backend Engineer
*Owns the FastAPI server, database, and the API contract P3 depends on.*

### Phase 1 — Foundation + the contract
- [ ] Scaffold FastAPI app (`main.py`, routers, CORS for `:3000`)
- [ ] DB tables: `documents`, `chunks`, `graph_nodes`, `graph_edges`, `queries`, `compliance_results`
- [ ] **Write the API contract first** (OpenAPI/markdown), share with P3 *before* implementing ⭐
- [ ] `POST /ingest` — accept upload, save, create `documents` row, run P1's pipeline as background task
- [ ] `GET /documents` — list ingested docs + status
- [ ] `WS /ws/ingest` — push ingestion progress (parsing → embedding → done)

### Phase 2 — Wire P1's intelligence behind HTTP
- [ ] `POST /copilot/query` → P1's `answer()` → `{answer, sources[], confidence}`
- [ ] `GET /graph` → nodes + edges for P3's graph viz
- [ ] `GET /compliance/audit` → P1's compliance agent results
- [ ] `GET /conflicts` and `GET /rca/{equipment}`
- [ ] `GET /dashboard/stats` → KPI counts (docs, relationships, compliance %, conflicts)
- [ ] Error handling (file too big, parse failure, model down → graceful messages)

### Phase 3 — Hardening
- [ ] JWT auth (login + protect routes); multi-persona roles if time
- [ ] Seed DB with indexed corpus so the demo has data on boot
- [ ] `GET /health`

**Deliverable:** running FastAPI exposing every endpoint P3 needs.
**Done when:** `curl POST /copilot/query` returns a real cited answer.

---

## 👤 Person 3 — Frontend Engineer
*Turns the existing AETHON UI shell from mock data → live data. (Big head start — UI is built.)*

### Phase 1 — API client + wiring
- [ ] `lib/api.ts` — typed fetch client for every P2 endpoint (start against mocks until P2 is live)
- [ ] `lib/types.ts` — interfaces: `Document, QueryResponse, GraphNode, GraphEdge, ComplianceResult, Conflict`
- [ ] `.env.local` with `NEXT_PUBLIC_API_URL`

### Phase 2 — Replace mock data, page by page
- [ ] **Copilot** (`app/copilot/page.tsx`) — wire input → `POST /copilot/query`; render answer + citations + confidence; keep typing animation as loading state
- [ ] **Dashboard** (`app/dashboard/page.tsx`) — fetch `GET /dashboard/stats`; drive count-up + compliance ring with real numbers
- [ ] **Knowledge Graph** (`app/knowledge-graph/page.tsx`) — replace hardcoded nodes/edges with `GET /graph`; keep animated edges/pulses
- [ ] **New: Upload page** — drag-drop → `POST /ingest` → live progress via `WS /ws/ingest` ⭐

### Phase 3 — Polish
- [ ] Loading + error states on every page (skeletons, "backend offline" banner)
- [ ] Accuracy Scoreboard page from P1's benchmark numbers ⭐
- [ ] Wire `PageTransition` globally; empty states; mobile-responsive pass

**Deliverable:** every page shows real backend data.
**Done when:** upload a doc + ask a question about it end-to-end in the browser.

---

## 👤 Person 4 — DevOps + Project Manager
*Owns delivery, integration, and the 4 graded deliverables.*

### Phase 1 — Infra + unblocking (early)
- [ ] Repo hygiene: branch strategy, `.gitignore` enforced (no `node_modules`/`.env` commits)
- [ ] One-command boot: `docker-compose.yml` or `start.sh` launching Ollama + backend + frontend ⭐
- [ ] Shared `.env.example` + README run instructions; verify a teammate can clone → run
- [ ] Own the API contract doc with P2; keep P2↔P3 unblocked

### Phase 2 — Integration + PM
- [ ] Daily 10-min standups; single task board; flag blockers
- [ ] Integration tester: pull everyone's branches, run full stack, file what breaks
- [ ] Source the real corpus with P1 — public Indian regs: **Factory Act 1948, OISD-116/105, DGMS circulars, PESO**, sample equipment manuals + incident reports ⭐ *(the standout differentiator)*

### Phase 3 — Graded deliverables (don't leave to the end)
- [ ] Architecture diagram (5-stage pipeline: ingest → extract → graph → index → serve)
- [ ] Presentation deck — problem, solution, cited-answer demo, accuracy numbers, business impact (35% time, knowledge cliff)
- [ ] Demo video — the killer 90s: upload a real SOP + Factory Act → "does this comply?" → cited answer + graph link + scoreboard
- [ ] Dress rehearsal day-before; recorded fallback in case live fails

**Deliverable:** one-command demo + diagram + deck + video.
**Done when:** judges can be walked through it flawlessly.

---

## 🔗 Dependency Order (so nobody waits)

1. **Hour 1, everyone:** agree stack + API contract (P2 + P4 lead)
2. **P1** starts RAG core immediately (longest pole) · **P2** scaffolds API against contract · **P3** builds API client against mocks · **P4** sets up boot + sources corpus
3. **First integration point:** P1 `answer()` → P2 `/copilot/query` → P3 copilot page. Get this **one vertical slice** working end-to-end before anything else.
4. Then graph + agents + scoreboard in parallel.

> ⭐ = high-impact / demo-critical item

---

## ✅ The "Definition of Done" for the whole project
Upload a real plant SOP + the Factory Act → ask *"Does this procedure comply with confined-space entry law?"* → AETHON returns a **correct, cited answer** linking the exact Factory Act section and the conflicting SOP line, shows the **graph relationship**, and displays a **measured accuracy score**. That 90 seconds wins the hackathon.
