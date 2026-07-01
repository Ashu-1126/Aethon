import json
import ollama
from typing import Dict, Any

class GraphExtractor:
    def __init__(self):
        self.model = "llama3.1:8b"
        
    def extract_from_text(self, text: str) -> Dict[str, Any]:
        """
        Uses Llama 3.1 to extract entities and relations from a text chunk.
        Returns a JSON object containing 'nodes' and 'edges'.
        """
        prompt = f"""You are an industrial knowledge extraction AI. 
Extract entities and relationships from the provided text.

ENTITIES MUST BE OF THESE TYPES ONLY: 
- equipment (e.g. Pump P-204, Boiler)
- regulation (e.g. Factory Act, OSHA, ISO)
- procedure (e.g. SOP-44, Maintenance Manual)
- incident (e.g. Failure, Leak, Accident)
- parameter (e.g. 55 Nm, 200 PSI)

RELATIONS MUST BE OF THESE TYPES ONLY:
- governed_by (equipment -> regulation or procedure -> regulation)
- involves (procedure -> equipment or incident -> equipment)
- specifies (procedure -> parameter)

OUTPUT STRICTLY IN JSON FORMAT matching this schema:
{{
    "nodes": [
        {{"id": "Pump P-204", "label": "Pump P-204", "type": "equipment"}}
    ],
    "edges": [
        {{"source": "Pump P-204", "target": "55 Nm", "relation": "specifies"}}
    ]
}}

TEXT:
{text}
"""
        try:
            print("Extracting graph data using Llama 3.1...")
            response = ollama.generate(
                model=self.model,
                prompt=prompt,
                format="json"
            )
            
            # The response is guaranteed to be JSON due to format="json"
            return json.loads(response["response"])
        except Exception as e:
            print(f"[Error] Failed to extract entities: {e}")
            return {"nodes": [], "edges": []}
