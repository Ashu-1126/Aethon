import fitz
from pathlib import Path
import sys

pdf_path = Path("data/uploads/d9aafde0_et ai.pdf")
print("File exists:", pdf_path.exists())
if pdf_path.exists():
    print("Size:", pdf_path.stat().st_size, "bytes")
    try:
        doc = fitz.open(str(pdf_path))
        print("Page count:", len(doc))
        for i in range(min(5, len(doc))):
            page = doc[i]
            text = page.get_text("text").strip()
            print(f"\n--- Page {i+1} PyMuPDF Text Length: {len(text)} ---")
            if len(text) < 30:
                print("PyMuPDF text empty/too short, running OCR test...")
                try:
                    import pytesseract
                    from PIL import Image
                    import io
                    mat = page.get_pixmap(dpi=200)
                    img = Image.open(io.BytesIO(mat.tobytes("png")))
                    ocr_text = pytesseract.image_to_string(img).strip()
                    print(f"OCR Text Length: {len(ocr_text)}")
                    print("OCR Snippet:", repr(ocr_text[:200]))
                except Exception as ocr_err:
                    print("OCR failed with exception:", ocr_err)
            else:
                print("Text Snippet:", repr(text[:200]))
    except Exception as e:
        print("Error opening/reading PDF:", e)
else:
    print("PDF not found at expected path.")
