# Aethon — Agents 3 & 4 Implementation & Algorithms

This document provides the exact code, prompts, schemas, and RAG integration details for **Agent 3 (Compliance Auditor)** and **Agent 4 (Conflict Detector)**, which are fully implemented in the Aethon repository.

---

## 1. RAG Pipeline Integration (Data Fetching)
Both Agent 3 and Agent 4 do not query databases directly; instead, they retrieve context by calling the RAG pipeline's semantic search interface:
*   **Function:** `retrieve(query: str, k: int, rerank: bool = True)` (defined in [embeddings.py](file:///c:/Desktop/Stand-Up/Projects/Aethon/backend/embeddings.py)).
*   **Mechanism:**
    1.  Computes the embedding of the query using the `mistral-embed` model.
    2.  Queries ChromaDB (filtering by document name if a specific doc is mentioned in the query).
    3.  Scores chunk similarities using Cosine Distance.
    4.  Reranks candidate results using `_llm_rerank()` with the `mistral-small-latest` model to prioritize the most relevant safety or maintenance clauses.

---

## 2. Agent 3: Compliance Auditor
Located in [agents.py](file:///c:/Desktop/Stand-Up/Projects/Aethon/backend/agents.py#L48-L130).

### Python Algorithm
```python
def compliance_audit() -> dict:
    """Run compliance check against all indexed procedures and regulations."""
    # 1. Retrieve safety procedures and standard acts from RAG
    proc_chunks  = retrieve("procedure safety monitoring entry permit", k=4)
    reg_chunks   = retrieve("Factory Act OISD DGMS PESO regulation compliance", k=4)
    all_chunks   = proc_chunks + reg_chunks

    if not all_chunks:
        return {
            "overall_score": 0,
            "standards": [],
        }

    # 2. Compile context
    context = "\n\n".join(
        f"[{c['doc_name']} p.{c['page']}]: {c['text'][:400]}" for c in all_chunks
    )

    # 3. Query LLM with strict Compliance Prompt
    try:
        resp = client.chat.completions.create(
            model=LLM_MODEL,
            messages=[{"role": "user", "content": _COMPLIANCE_PROMPT.format(context=context)}],
            response_format={"type": "json_object"},
            temperature=0.0,
            max_tokens=1024,
        )
        raw = resp.choices[0].message.content.strip()
        result = json.loads(raw)
        
        # Cache successful audit result
        if "overall_score" in result and "standards" in result:
            from config import DATA_DIR
            with open(DATA_DIR / "compliance_cache.json", "w") as f:
                json.dump(result, f)
            _cache_put("compliance", result)
            return result
    except Exception as e:
        # Fall back to cache on API rate limits or failures
        cached = _cache_get("compliance")
        if cached is not None:
            return cached
        from config import DATA_DIR
        try:
            with open(DATA_DIR / "compliance_cache.json", "r") as f:
                return json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            pass
        raise HTTPException(status_code=503, detail=f"AI Model Offline: {str(e)}")
```

### Prompt & Schema (`_COMPLIANCE_PROMPT`)
```markdown
You are an industrial compliance expert. Given the following context from plant documents,
evaluate compliance against the listed standards.

Context:
{context}

Standards to evaluate: Factory Act, OISD-116, DGMS, PESO

For each standard, rate compliance 0-100 and list any specific gaps found.
Return ONLY valid JSON in this exact format:
{
  "overall_score": 92,
  "standards": [
    {
      "standard": "Factory Act",
      "score": 96,
      "gaps": []
    },
    {
      "standard": "OISD-116",
      "score": 88,
      "gaps": [
        {"clause": "§7.2", "issue": "Continuous monitoring not specified in procedure"}
      ]
    }
  ]
}
```

---

## 3. Agent 4: Conflict Detector
Located in [agents.py](file:///c:/Desktop/Stand-Up/Projects/Aethon/backend/agents.py#L133-L212).

### Python Algorithm
```python
def detect_conflicts() -> list[dict]:
    """Find contradicting values across documents."""
    # 1. Retrieve specification and interval metrics from RAG
    chunks = retrieve("interval specification tolerance pressure temperature days hours", k=8)

    if len(chunks) < 2:
        return []

    # 2. Compile context
    context = "\n\n".join(
        f"[DOC:{c['doc_name']} PAGE:{c['page']}]: {c['text'][:400]}" for c in chunks
    )

    # 3. Query LLM to compare document values
    try:
        resp = client.chat.completions.create(
            model=LLM_MODEL,
            messages=[{"role": "user", "content": _CONFLICT_PROMPT.format(context=context)}],
            response_format={"type": "json_object"},
            temperature=0.0,
            max_tokens=1024, # Increased to 1024 to prevent JSON truncation
        )
        raw = resp.choices[0].message.content.strip()
        result = json.loads(raw)
        conflicts = result.get("conflicts", [])
        
        # Helper to safely sanitize and convert nested JSON objects to strings
        def _to_str(v) -> str:
            if isinstance(v, dict):
                return ", ".join(f"{k}: {val}" for k, val in v.items())
            if isinstance(v, list):
                return ", ".join(str(x) for x in v)
            return "" if v is None else str(v)

        # Normalize results to prevent UI exceptions
        normalized = [
            {
                "doc_a": _to_str(c.get("doc_a")),
                "doc_b": _to_str(c.get("doc_b")),
                "field": _to_str(c.get("field")),
                "value_a": _to_str(c.get("value_a")),
                "value_b": _to_str(c.get("value_b")),
            }
            for c in conflicts
        ]
        _cache_put("conflicts", normalized)
        return normalized
    except Exception as e:
        cached = _cache_get("conflicts")
        if cached is not None:
            return cached
        raise HTTPException(status_code=503, detail=f"AI Model Offline: {str(e)}")
```

### Prompt & Schema (`_CONFLICT_PROMPT`)
```markdown
You are a document conflict detection engine. Analyze these text excerpts from different documents
and find contradictions — especially numeric values, intervals, requirements, or rules that differ.

Documents:
{context}

Find conflicts and return ONLY valid JSON:
{
  "conflicts": [
    {
      "doc_a": "OEM_Manual.pdf",
      "doc_b": "SOP-44.docx",
      "field": "lubrication_interval",
      "value_a": "60 days",
      "value_b": "90 days"
    }
  ]
}
```
