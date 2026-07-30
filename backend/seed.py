import sys
import shutil
import time
import uuid
import json
from pathlib import Path

# Add the current directory to python path
sys.path.append(str(Path(__file__).parent))

from config import UPLOAD_DIR
from ingest import load_and_chunk, _infer_doc_type
from embeddings import embed_and_store
from graph import add_chunks_to_graph, init_db, add_document_to_db, get_documents_from_db


# Fixed demo fleet. Render's free tier has no persistent disk, so local
# SQLite/Chroma stores are wiped on every restart (idle spin-down, redeploy).
# Rather than showing an empty asset dropdown after every restart, re-seed
# this fixture fleet if the assets table is empty. Never touches anything if
# assets already exist.
DEMO_ASSETS = [
    ("M-801", "Conveyor Drive Motor", "Motor", "Packaging Line", "medium", "Siemens", "Simotics-SD"),
    ("P-204", "Feed Pump", "Pump", "Process Area A", "high", "Grundfos", "CR-64"),
    ("V-301", "Pressure Vessel", "Vessel", "Boiler House", "critical", "Thermax", "PV-3000"),
    ("C-102", "Air Compressor", "Compressor", "Utility Block", "high", "Atlas Copco", "GA-90"),
    ("B-101", "Boiler Unit", "Boiler", "Boiler House", "critical", "Cleaver-Brooks", "CB-700"),
    ("F-501", "Fire Extinguisher Station A", "Safety", "Zone A", "medium", "Kidde", "ABC-10"),
    ("MON-C03", "CO2/O2 Monitor", "Sensor", "Zone C", "high", "Honeywell", "BW-Ultra"),
    ("HVAC-01", "HVAC Unit", "HVAC", "Admin Block", "low", "Carrier", "30XA"),
]


def seed_demo_assets() -> int:
    """Insert the demo fleet if the assets table is currently empty. Returns count inserted."""
    from graph import get_assets, add_asset

    if get_assets():
        return 0

    for tag, name, category, location, criticality, manufacturer, model_number in DEMO_ASSETS:
        add_asset(
            tag=tag, name=name, category=category, location=location,
            criticality=criticality, manufacturer=manufacturer, model_number=model_number,
        )
    return len(DEMO_ASSETS)


def seed_database(limit: int | None = None):
    """Index every file in corpus/ that isn't already indexed.

    limit: if set, only process the first N unindexed files. Used for the
    startup auto-heal (deployment) so it re-populates a usable demo corpus
    quickly instead of re-embedding everything, which is slow and expensive
    (each doc is an LLM embedding call per chunk).
    """
    # Try multiple paths to find corpus directory
    possible_paths = [
        Path("../corpus"),
        Path("corpus"),
        Path(__file__).resolve().parent.parent / "corpus",
    ]

    corpus_dir = None
    for p in possible_paths:
        if p.exists() and p.is_dir():
            corpus_dir = p
            break
            
    if not corpus_dir:
        print("[Error] Corpus directory not found!")
        return

    print(f"Seeding database from: {corpus_dir.absolute()}")

    # Create destination uploads dir if not exists
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    
    init_db()

    # Load registry from SQLite
    try:
        db_docs = get_documents_from_db()
    except Exception:
        db_docs = []

    # Find all docs in corpus
    supported_extensions = {".pdf", ".docx", ".txt", ".csv", ".xlsx", ".html", ".htm"}
    files = [p for p in corpus_dir.glob("*") if p.suffix.lower() in supported_extensions]
    if limit is not None:
        files = files[:limit]

    print(f"Found {len(files)} documents to index.")

    for idx, path in enumerate(files, 1):
        doc_name = path.name
        doc_type = _infer_doc_type(doc_name)
        
        # Check if already in registry
        already_indexed = False
        for entry in db_docs:
            if entry.get("name") == doc_name and entry.get("status") == "indexed":
                already_indexed = True
                break
                
        if already_indexed:
            print(f"[{idx}/{len(files)}] '{doc_name}' is already indexed. Skipping.")
            continue

        print(f"[{idx}/{len(files)}] Processing '{doc_name}' ({doc_type})...")
        
        # Assign doc_id
        doc_id = str(uuid.uuid4())[:8]
        dest_path = UPLOAD_DIR / f"{doc_id}_{doc_name}"
        
        # Copy to uploads
        shutil.copy2(path, dest_path)
        
        try:
            # 1. Parse and chunk
            chunks = load_and_chunk(dest_path)
            pages = max((c["page"] for c in chunks), default=0)
            
            # 2. Embed & store in ChromaDB
            embed_and_store(chunks)
            
            # 3. Add to Knowledge Graph
            add_chunks_to_graph(chunks)
            
            # Update registry in SQLite
            add_document_to_db(
                doc_id,
                name=doc_name,
                doc_type=doc_type,
                status="indexed",
                pages=pages,
                ingested_at=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
            )
            print(f"Successfully indexed '{doc_name}' with {len(chunks)} chunks ({pages} pages).")
        except Exception as e:
            print(f"Failed to process '{doc_name}': {e}")
            add_document_to_db(
                doc_id,
                name=doc_name,
                doc_type=doc_type,
                status="failed",
                pages=0,
                ingested_at=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
            )

    print("\nDatabase seeding completed successfully.")

if __name__ == "__main__":
    seed_database()
