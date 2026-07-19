from typing import Dict, Any, List
from vector_store import VectorStore
from graph_store import GraphStore
from openrouter_client import chat_json, LLM_MODEL

class IntelligentAgents:
    def __init__(self):
        self.model = LLM_MODEL
        self.vector_store = VectorStore()
        self.graph_store = GraphStore()

    def run_compliance_audit(self, procedure_name: str, regulation_name: str) -> Dict[str, Any]:
        """Compares a procedure against a regulation to find gaps."""
        # 1. Get related chunks
        proc_chunks = self.vector_store.search(procedure_name, k=2)
        reg_chunks = self.vector_store.search(regulation_name, k=2)
        
        context = "PROCEDURE TEXT:\n"
        for c in proc_chunks: context += f"- {c['content']}\n"
        context += "\nREGULATION TEXT:\n"
        for c in reg_chunks: context += f"- {c['content']}\n"
        
        prompt = f"""You are a Compliance Auditor AI.
Compare the PROCEDURE against the REGULATION to identify any safety or compliance gaps.

CONTEXT:
{context}

Output a JSON object with:
- "compliant": boolean (true if no gaps)
- "gaps": list of strings detailing the violations
- "cited_clauses": list of strings (the specific regulation rules violated)

STRICT JSON OUTPUT ONLY.
"""
        try:
            return chat_json(prompt, model=self.model, max_tokens=1024)
        except:
            return {"compliant": False, "gaps": ["Error parsing response"], "cited_clauses": []}

    def detect_conflicts(self, equipment_name: str) -> Dict[str, Any]:
        """Finds contradictions about an equipment piece across different docs."""
        chunks = self.vector_store.search(equipment_name, k=5)
        
        context = ""
        for c in chunks: 
            context += f"Source: {c['metadata']['doc_name']}\nContent: {c['content']}\n\n"
            
        prompt = f"""You are a Conflict Detector AI.
Look at the following excerpts about '{equipment_name}' from different documents.
Are there any contradicting numbers, parameters, or rules? (e.g. one doc says 40Nm, another says 55Nm).

CONTEXT:
{context}

Output a JSON object with:
- "has_conflict": boolean
- "conflicts": list of objects with {{"field": "parameter name", "value_a": "value 1", "value_b": "value 2", "doc_a": "source 1", "doc_b": "source 2"}}

STRICT JSON OUTPUT ONLY.
"""
        try:
            return chat_json(prompt, model=self.model, max_tokens=1024)
        except:
            return {"has_conflict": False, "conflicts": []}

    def run_rca(self, incident_description: str) -> Dict[str, Any]:
        """Root Cause Analysis using Graph + RAG."""
        chunks = self.vector_store.search(incident_description, k=3)
        context = "\n".join([c['content'] for c in chunks])
        
        prompt = f"""You are a Root Cause Analysis AI.
Based on the incident description and the retrieved historical context/procedures, what is the likely root cause?

INCIDENT: {incident_description}
CONTEXT: {context}

Output a JSON object with:
- "likely_cause": string
- "citations": list of strings (procedures or past failures that prove the cause)

STRICT JSON OUTPUT ONLY.
"""
        try:
            return chat_json(prompt, model=self.model, max_tokens=1024)
        except:
            return {"likely_cause": "Unknown", "citations": []}
