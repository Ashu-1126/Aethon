import chromadb
import threading
from typing import List, Dict, Any
from openrouter_client import embed

# NOTE: This module is a legacy/standalone reference implementation that used
# Ollama for embeddings. The running backend uses backend/embeddings.py
# (OpenRouter embeddings) instead. Kept thread-safe for reuse/tests.

class VectorStore:
    def __init__(self, collection_name: str = "documents"):
        # Initialize a local persistent ChromaDB client
        self.client = chromadb.PersistentClient(path="./chroma_db")
        self._lock = threading.Lock()
        self.collection = self.client.get_or_create_collection(name=collection_name)

    def _get_embedding(self, text: str) -> List[float]:
        """Generate embedding using OpenRouter embeddings."""
        return embed(text)

    def add_chunks(self, chunks: List[Dict[str, Any]]):
        """Add a list of document chunks (with metadata) to the vector store."""
        if not chunks:
            return
            
        ids = []
        embeddings = []
        documents = []
        metadatas = []
        
        # In a real app, IDs should be robust. Here we'll generate simple unique IDs.
        with self._lock:
            base_id = self.collection.count()
        
            print(f"Generating embeddings for {len(chunks)} chunks...")
            for i, chunk in enumerate(chunks):
                doc_text = chunk["content"]
                metadata = chunk["metadata"]
                
                # Generate ID
                chunk_id = f"chunk_{base_id + i}"
                
                # Generate embedding
                emb = self._get_embedding(doc_text)
                
                ids.append(chunk_id)
                embeddings.append(emb)
                documents.append(doc_text)
                metadatas.append(metadata)
            
            # Add to ChromaDB
            self.collection.add(
                ids=ids,
                embeddings=embeddings,
                documents=documents,
                metadatas=metadatas
            )
        print(f"[OK] Added {len(chunks)} chunks to vector store.")

    def search(self, query: str, k: int = 5) -> List[Dict[str, Any]]:
        """Search for the top-k chunks related to a query."""
        query_embedding = self._get_embedding(query)
        
        with self._lock:
            results = self.collection.query(
                query_embeddings=[query_embedding],
                n_results=k
            )
        
        # Format results
        formatted_results = []
        if results and results["documents"]:
            for i in range(len(results["documents"][0])):
                formatted_results.append({
                    "content": results["documents"][0][i],
                    "metadata": results["metadatas"][0][i],
                    "distance": results["distances"][0][i]
                })
                
        return formatted_results

if __name__ == "__main__":
    # Test initialization
    print("Initializing VectorStore...")
    vs = VectorStore()
    print(f"Current chunks in DB: {vs.collection.count()}")
