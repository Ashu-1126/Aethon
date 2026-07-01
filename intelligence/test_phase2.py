import fitz
from rag_core import ingest_pdf
from agents import IntelligentAgents
import json

def create_conflict_pdf():
    doc = fitz.open()
    page = doc.new_page()
    text = """OEM Manual - Pump P-204

1. Torque Specifications
According to the original manufacturer guidelines, the required torque for the main valve on Pump P-204 is 40 Nm. 
Exceeding 40 Nm will void the warranty and may cause micro-fractures in the casing.
"""
    page.insert_text((50, 50), text)
    doc.save("oem_manual.pdf")
    doc.close()
    print("Created oem_manual.pdf (Conflict Document)")

print("=== Aethon Intelligence Phase 2 Test ===")

# 1. Create and ingest conflicting PDF
create_conflict_pdf()
print("\n--- Ingesting oem_manual.pdf ---")
ingest_pdf("oem_manual.pdf")

# 2. Test Agents
agents = IntelligentAgents()

print("\n--- Testing Conflict Detector Agent ---")
conflict_result = agents.detect_conflicts("Pump P-204 main valve torque")
print(json.dumps(conflict_result, indent=2))

print("\n--- Testing Compliance Agent ---")
# We will compare the procedure (Pump P-204) against a regulation (Factory Act)
compliance_result = agents.run_compliance_audit("Pump P-204 Maintenance", "Factory Act Section 36")
print(json.dumps(compliance_result, indent=2))

print("\n--- Testing SQLite Graph Output ---")
from graph_store import GraphStore
db = GraphStore()
graph_data = db.get_all_data()
print(f"Total Nodes: {len(graph_data['nodes'])}")
print(f"Total Edges: {len(graph_data['edges'])}")
if len(graph_data['nodes']) > 0:
    print("Sample Node:", graph_data['nodes'][0])
