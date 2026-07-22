"""
Repair script for agents.py — restores the missing RCA prompt/function
and fixes the corrupted generate_rewrite function.
Run once then delete.
"""
import re

with open("agents.py", "r", encoding="utf-8") as f:
    content = f.read()

# ── 1. Locate the scoreboard function end (the clean boundary before corruption) ──
# The scoreboard_stats function ends with the closing of its try/except
# and a return statement for the fallback dict.
# We'll find the last clean top-level function and truncate everything after it.

scoreboard_end_marker = '    }\n\n\n'
pos = content.rfind(scoreboard_end_marker)
if pos == -1:
    scoreboard_end_marker = '    }\r\n\r\n\r\n'
    pos = content.rfind(scoreboard_end_marker)

print(f"Scoreboard end marker found at pos: {pos}")
if pos == -1:
    print("ERROR: Could not find scoreboard end marker. Aborting.")
    exit(1)

# Keep everything up to and including the scoreboard function's closing brace
clean_head = content[:pos + len(scoreboard_end_marker)]

# ── 2. Append the correct RCA + Rewrite sections ──
rca_and_rewrite = '''
# ══════════════════════════════════════════════════════════════════════════
# RCA AGENT
# ══════════════════════════════════════════════════════════════════════════

_RCA_PROMPT = """\\
You are an industrial reliability engineer. Analyze the following context and knowledge graph relationships to determine the root cause of failures for {equipment}.

Context:
{context}

{graph_context}

Provide a concise, analytical root cause analysis in 2-3 sentences.
Then estimate a confidence percentage (0-100).
Return ONLY valid JSON:
{{
  "answer": "The repeated bearing failures are caused by incorrect lubrication intervals...",
  "confidence": 85
}}

JSON:"""

def root_cause_analysis(equipment: str) -> dict:
    chunks = retrieve(equipment + " failure interval specification procedure manual", k=6)
    if not chunks:
        raise HTTPException(status_code=404, detail="No maintenance records found for this equipment.")

    context = "\\n\\n".join(
        f"[DOC:{c[\'doc_name\']} PAGE:{c[\'page\']}]: {c[\'text\'][:200]}" for c in chunks
    )

    from graph import get_related_graph_context
    doc_names = list({c["doc_name"] for c in chunks})
    graph_context = get_related_graph_context(doc_names, equipment)

    try:
        resp = client.chat.completions.create(
            model=LLM_MODEL,
            messages=[{"role": "user", "content": _RCA_PROMPT.format(equipment=equipment, context=context, graph_context=graph_context)}],
            response_format={"type": "json_object"},
            temperature=0.0,
            max_tokens=1024,
        )
        raw = resp.choices[0].message.content.strip()
        result = json.loads(raw)
        sources = [
            {**c, "snippet": c.get("text", "")[:200]} for c in chunks
        ]
        raw_answer = result.get("answer", "Analysis generated.")
        if isinstance(raw_answer, dict):
            raw_answer = raw_answer.get("text") or raw_answer.get("answer") or str(raw_answer)
        raw_answer = str(raw_answer)
        raw_confidence = result.get("confidence", 75)
        if isinstance(raw_confidence, dict):
            raw_confidence = 75
        try:
            raw_confidence = int(raw_confidence)
        except (TypeError, ValueError):
            raw_confidence = 75
        result_dict = {
            "answer": raw_answer,
            "sources": sources,
            "confidence": raw_confidence,
        }
        _cache_put(f"rca:{equipment}", result_dict)
        return result_dict
    except Exception as e:
        cached = _cache_get(f"rca:{equipment}")
        if cached is not None:
            return cached
        raise HTTPException(status_code=503, detail=f"AI Model Offline or Error: {str(e)}")


# ══════════════════════════════════════════════════════════════════════════
# REWRITE AGENT
# ══════════════════════════════════════════════════════════════════════════

_REWRITE_PROMPT = """\\
You are an industrial compliance officer. Rewrite the clause below into a concise, precise, regulation-compliant replacement. Keep it to 1-2 sentences maximum.

Clause: {clause}
Issue: {issue}

Return ONLY this JSON (no markdown, no extra text):
{{"rewrite": "<your 1-2 sentence compliant clause here>"}}

JSON:"""


def generate_rewrite(clause: str, issue: str) -> dict:
    """Ask the LLM to generate a compliant rewrite of a failing SOP clause."""
    import re as _re
    try:
        resp = client.chat.completions.create(
            model=LLM_MODEL,
            messages=[{"role": "user", "content": _REWRITE_PROMPT.format(
                clause=clause[:600], issue=issue[:400]
            )}],
            response_format={"type": "json_object"},
            temperature=0.1,
            max_tokens=512,
        )
        raw = resp.choices[0].message.content.strip()

        # Strip markdown fences the LLM sometimes wraps output in
        raw = _re.sub(r"^```(?:json)?\\s*", "", raw, flags=_re.MULTILINE)
        raw = _re.sub(r"\\s*```$", "", raw, flags=_re.MULTILINE)
        raw = raw.strip()

        # Try full JSON parse
        try:
            result = json.loads(raw)
            rewrite_val = result.get("rewrite", "")
            if isinstance(rewrite_val, dict):
                rewrite_val = rewrite_val.get("text") or rewrite_val.get("rewrite") or str(rewrite_val)
            if rewrite_val:
                return {"rewrite": str(rewrite_val)}
        except json.JSONDecodeError:
            pass

        # Truncation recovery — pull text from a cut-off JSON string
        m = _re.search(r\'"rewrite"\\s*:\\s*"(.*)\', raw, _re.DOTALL)
        if m:
            partial = m.group(1).rstrip(\'"\\\\ \\n\').strip()
            if partial:
                return {"rewrite": partial}

        # Last resort
        if len(raw) > 20:
            return {"rewrite": raw}

        return {"rewrite": "Could not generate compliant draft rewrite."}

    except Exception as e:
        raise HTTPException(status_code=503, detail=f"AI Model Offline or Error: {str(e)}")
'''

new_content = clean_head + rca_and_rewrite

with open("agents.py", "w", encoding="utf-8") as f:
    f.write(new_content)

print("agents.py repaired successfully.")
print(f"New line count: {new_content.count(chr(10))}")
