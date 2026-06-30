import fitz  # PyMuPDF
from typing import List, Dict, Any
from langchain_text_splitters import RecursiveCharacterTextSplitter

class DocumentLoader:
    def __init__(self, chunk_size: int = 800, chunk_overlap: int = 80):
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            length_function=len,
            is_separator_regex=False,
        )

    def load_pdf(self, filepath: str) -> List[Dict[str, Any]]:
        """
        Loads a PDF file and extracts text page by page.
        Returns a list of chunks with metadata.
        """
        print(f"Loading document: {filepath}")
        chunks = []
        doc_name = filepath.split("/")[-1].split("\\")[-1]
        
        try:
            doc = fitz.open(filepath)
            for page_num in range(len(doc)):
                page = doc.load_page(page_num)
                text = page.get_text("text")
                
                if not text.strip():
                    continue
                    
                # Split the text from this page into chunks
                page_chunks = self.text_splitter.split_text(text)
                
                for chunk in page_chunks:
                    chunks.append({
                        "content": chunk,
                        "metadata": {
                            "doc_name": doc_name,
                            "page": page_num + 1,
                        }
                    })
            doc.close()
            print(f"Successfully loaded and chunked {len(chunks)} chunks from {doc_name}.")
            return chunks
        except Exception as e:
            print(f"Error loading {filepath}: {e}")
            return []

if __name__ == "__main__":
    # Simple test if run directly
    import sys
    if len(sys.argv) > 1:
        test_file = sys.argv[1]
        loader = DocumentLoader()
        chunks = loader.load_pdf(test_file)
        if chunks:
            print(f"First chunk preview:\n{chunks[0]['content'][:200]}...")
            print(f"Metadata: {chunks[0]['metadata']}")
    else:
        print("Provide a PDF path to test. Usage: python document_loader.py <path_to_pdf>")
