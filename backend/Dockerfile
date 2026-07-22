FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for pymupdf/pytesseract
RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for layer caching
COPY requirements.txt .

# Force install with no cache to avoid stale httpx/openai versions
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy rest of backend
COPY . .

# Create data directories
RUN mkdir -p data/chroma data/uploads

EXPOSE 8080

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
