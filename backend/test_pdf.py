import fitz
from pathlib import Path
import os

pdf_path = Path("data/uploads/e40ffb5c_orvanto master guide.pdf")
print("File exists:", pdf_path.exists())
if pdf_path.exists():
    print("Size:", pdf_path.stat().st_size, "bytes")
    try:
        doc = fitz.open(str(pdf_path))
        print("Page count:", len(doc))
        for i in range(min(5, len(doc))):
            page = doc[i]
            text = page.get_text("text")
            print(f"--- Page {i+1} Text Length: {len(text.strip())} ---")
            print("Snippet:", repr(text.strip()[:200]))
    except Exception as e:
        print("Error opening/reading PDF:", e)
else:
    print("PDF not found at expected path.")
