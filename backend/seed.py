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

def seed_database():
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
