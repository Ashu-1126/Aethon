# Aethon — Developer's Guide to Expanding Components

This guide provides step-by-step instructions on how to extend the Aethon platform by adding new AI agents, custom file parsers, database tables, or API endpoints.

---

## 1. How to Add a New Intelligence Agent
Adding a new agent involves adding LLM logic, exposing a backend route, mapping the API client, and designing the frontend view.

### Step A: Define LLM Logic & Prompt
In [backend/agents.py](file:///c:/Desktop/Stand-Up/Projects/Aethon/backend/agents.py):
1.  Add your agent's system and user prompt templates:
    ```python
    _MY_NEW_AGENT_PROMPT = """\
    You are a specialized industrial assistant. Analyze this context:
    {context}
    Return ONLY valid JSON:
    {
      "analysis": "result here"
    }
    """
    ```
2.  Implement the agent function:
    ```python
    def run_new_agent(param: str) -> dict:
        # Retrieve context from RAG
        from embeddings import retrieve
        chunks = retrieve(param, k=5)
        context = "\n\n".join(c["text"] for c in chunks)
        
        try:
            resp = client.chat.completions.create(
                model=LLM_MODEL,
                messages=[{"role": "user", "content": _MY_NEW_AGENT_PROMPT.format(context=context)}],
                response_format={"type": "json_object"},
                temperature=0.0,
                max_tokens=1024,
            )
            raw = resp.choices[0].message.content.strip()
            result = json.loads(raw)
            _cache_put(f"new_agent:{param}", result)
            return result
        except Exception as e:
            cached = _cache_get(f"new_agent:{param}")
            if cached is not None:
                return cached
            raise HTTPException(status_code=503, detail=str(e))
    ```

### Step B: Expose the FastAPI Endpoint
In [backend/main.py](file:///c:/Desktop/Stand-Up/Projects/Aethon/backend/main.py):
1.  Import your agent function.
2.  Expose the endpoint with authentication:
    ```python
    from agents import run_new_agent

    @app.get("/new-agent/{param}")
    async def get_new_agent_results(param: str, user: dict = Depends(get_current_user)):
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(None, run_new_agent, param)
    ```

### Step C: Define API Client Endpoint
In [frontend/lib/api.ts](file:///c:/Desktop/Stand-Up/Projects/Aethon/frontend/lib/api.ts):
1.  Add the TypeScript fetch function:
    ```typescript
    export async function fetchNewAgentData(param: string): Promise<any> {
      return fetchWithAuth(`/new-agent/${encodeURIComponent(param)}`);
    }
    ```

### Step D: Update Next.js Frontend View
Create or update a route folder in `frontend/app/` (e.g. `frontend/app/new-feature/page.tsx`) to import `fetchNewAgentData`, trigger the call inside a `useEffect`, and display the results in your UI components.

---

## 2. How to Add a New Document Parser
If you need to support a new document type (e.g. Markdown or JSON logs):

### Step A: Update Accepted File Extensions
In [backend/main.py](file:///c:/Desktop/Stand-Up/Projects/Aethon/backend/main.py):
1.  Add the new extension (e.g., `".md"`) to the `ACCEPTED_TYPES` set:
    ```python
    ACCEPTED_TYPES = {".pdf", ".docx", ".txt", ".csv", ".xlsx", ".png", ".jpg", ".html", ".htm", ".md"}
    ```

### Step B: Implement Parsing Logic
In [backend/ingest.py](file:///c:/Desktop/Stand-Up/Projects/Aethon/backend/ingest.py):
1.  Add your custom file reader function:
    ```python
    def _parse_markdown(path: Path) -> list[tuple[int, str]]:
        with open(path, "r", encoding="utf-8") as f:
            content = f.read()
        # Returns list of tuples: (page_number, page_text)
        return [(1, content)]
    ```
2.  Integrate the new parser inside the master `load_and_chunk(path)` function:
    ```python
    if ext == ".md":
        pages = _parse_markdown(path)
    ```

---

## 3. How to Add a New SQLite Table or Graph Logic
If you need to store custom operational metrics or change the graph structure:

### Step A: Update Database Initialization
In [backend/graph.py](file:///c:/Desktop/Stand-Up/Projects/Aethon/backend/graph.py):
1.  Update the SQL DDL commands inside `init_db()`:
    ```python
    con.executescript("""
        CREATE TABLE IF NOT EXISTS custom_metrics (
            id          TEXT PRIMARY KEY,
            doc_name    TEXT,
            metric_val  REAL,
            recorded_at TEXT
        );
    """)
    ```

### Step B: Create Read/Write Helpers
Implement functions using the thread-safe connection context manager `_conn()`:
```python
def add_custom_metric(metric_id: str, doc_name: str, val: float) -> None:
    init_db()
    with _conn() as con:
        con.execute(
            "INSERT OR REPLACE INTO custom_metrics VALUES (?, ?, ?, ?)",
            (metric_id, doc_name, val, time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()))
        )
```
