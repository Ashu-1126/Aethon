import os
from typing import List, Dict, Any
from openrouter_client import client, LLM_MODEL, chat_json

def verify_openrouter_connection() -> bool:
    """
    Verifies that the OpenRouter API key is configured and reachable.
    """
    from openrouter_client import OPENROUTER_API_KEY
    if not OPENROUTER_API_KEY:
        print("[Error] OPENROUTER_API_KEY is not set. Add it to your .env file.")
        return False
    try:
        client.with_options(timeout=10.0).models.list()
        print("[OK] OpenRouter connection verified.")
        return True
    except Exception as e:
        print(f"[Error] Error connecting to OpenRouter: {e}")
        return False

from document_loader import DocumentLoader
from vector_store import VectorStore
from graph_store import GraphStore
from extractor import GraphExtractor

def ingest_pdf(filepath: str) -> bool:
    """End-to-end: Load a PDF, chunk it, extract knowledge graph, and store it."""
    try:
        loader = DocumentLoader()
        chunks = loader.load_pdf(filepath)
        
        if not chunks:
            print("[Error] No text could be extracted from the document.")
            return False
            
        # 1. Store chunks in Vector Database
        store = VectorStore()
        store.add_chunks(chunks)
        
        # 2. Extract and Store in Graph Database
        graph_db = GraphStore()
        extractor = GraphExtractor()
        
        print("Extracting entities and relationships for the Knowledge Graph...")
        for chunk in chunks:
            graph_data = extractor.extract_from_text(chunk["content"])
            
            # Save nodes
            for node in graph_data.get("nodes", []):
                graph_db.add_node(node["id"], node["label"], node["type"])
                
            # Save edges
            for edge in graph_data.get("edges", []):
                graph_db.add_edge(edge["source"], edge["target"], edge["relation"])
                
        print("[OK] Knowledge Graph updated successfully!")
        return True
    except Exception as e:
        print(f"[Error] Failed to ingest {filepath}: {e}")
        return False

def answer_query(query: str) -> Dict[str, Any]:
    """Retrieve relevant chunks and generate an answer using Llama 3.1."""
    store = VectorStore()
    
    # 1. Retrieve top-k chunks
    results = store.search(query, k=3)
    if not results:
        return {"answer": "No relevant documents found in the database.", "sources": [], "confidence": 0}
        
    # 2. Build the context string from results
    context_text = "\n\n".join([f"[Source: {r['metadata']['doc_name']} (Page {r['metadata']['page']})]\n{r['content']}" for r in results])
    
    # 3. Create the prompt for Llama 3.1
    prompt = f"""You are PlantBrain, an expert industrial AI assistant. 
Answer the user's question based ONLY on the provided context. 
If the answer is not in the context, say "I don't have enough information to answer that based on the current documents."

CONTEXT:
{context_text}

QUESTION:
{query}

ANSWER:
"""

    # 4. Generate the response
    print(f"Asking LLM via OpenRouter: '{query}'...")
    resp = client.chat.completions.create(
        model=LLM_MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.1,
        max_tokens=1024,
    )
    answer_text = resp.choices[0].message.content.strip()

    # Extract sources for the frontend
    sources = [{"doc_name": r["metadata"]["doc_name"], "page": r["metadata"]["page"], "snippet": r["content"][:100] + "..."} for r in results]

    return {
        "answer": answer_text,
        "sources": sources,
        "confidence": 85  # Placeholder until we implement a real confidence metric
    }

if __name__ == "__main__":
    print("Initializing Aethon AI Intelligence Core...")
    if not verify_openrouter_connection():
        print("Please set OPENROUTER_API_KEY in your .env file and retry.")
    else:
        print("[OK] Ready for operations.")
        print("\n--- Usage Examples ---")
        print("1. To ingest a document: ingest_pdf('path/to/manual.pdf')")
        print("2. To ask a question: print(answer_query('What is the torque for the pump?'))")
