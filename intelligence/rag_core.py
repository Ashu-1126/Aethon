import os
from typing import List, Dict, Any
import ollama

def verify_ollama_connection() -> bool:
    """
    Verifies that the local Ollama instance is running and the required models are available.
    """
    required_models = ["llama3.1:8b", "nomic-embed-text:latest"]
    try:
        models_response = ollama.list()
        # In newer ollama-python versions, this is an object, not a dict
        available_models = [m.model for m in models_response.models]
        print(f"Available local models: {available_models}")
        
        all_found = True
        for rm in required_models:
            # allow partial matches in case tag is different
            if not any(rm.split(':')[0] in am for am in available_models):
                print(f"[Warning] Required model '{rm}' not found. Please run: `ollama pull {rm}`")
                all_found = False
                
        if all_found:
            print("[OK] All required Ollama models are available.")
            
        return all_found
    except Exception as e:
        print(f"[Error] Error connecting to Ollama: {e}")
        print("Please ensure Ollama is running in the background.")
        return False

def pull_models_if_missing():
    """Helper to pull models if they aren't downloaded yet."""
    models_to_pull = ["llama3.1:8b", "nomic-embed-text"]
    for model in models_to_pull:
        print(f"Pulling {model} (this may take a while if not already downloaded)...")
        try:
            ollama.pull(model)
            print(f"[OK] Successfully pulled {model}")
        except Exception as e:
            print(f"[Error] Failed to pull {model}: {e}")

from document_loader import DocumentLoader
from vector_store import VectorStore

def ingest_pdf(filepath: str) -> bool:
    """End-to-end: Load a PDF, chunk it, and store it in ChromaDB."""
    try:
        loader = DocumentLoader()
        chunks = loader.load_pdf(filepath)
        
        if not chunks:
            print("[Error] No text could be extracted from the document.")
            return False
            
        store = VectorStore()
        store.add_chunks(chunks)
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
    print(f"Asking Llama 3.1: '{query}'...")
    response = ollama.generate(model="llama3.1:8b", prompt=prompt)
    
    # Extract sources for the frontend
    sources = [{"doc_name": r["metadata"]["doc_name"], "page": r["metadata"]["page"], "snippet": r["content"][:100] + "..."} for r in results]
    
    return {
        "answer": response["response"],
        "sources": sources,
        "confidence": 85  # Placeholder until we implement a real confidence metric
    }

if __name__ == "__main__":
    print("Initializing Aethon AI Intelligence Core...")
    if not verify_ollama_connection():
        print("Attempting to pull required models...")
        pull_models_if_missing()
        verify_ollama_connection()
    else:
        print("[OK] Ready for operations.")
        print("\n--- Usage Examples ---")
        print("1. To ingest a document: ingest_pdf('path/to/manual.pdf')")
        print("2. To ask a question: print(answer_query('What is the torque for the pump?'))")
