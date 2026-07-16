#!/usr/bin/env bash

echo "=========================================="
echo "🚀 Booting AETHON Full Stack"
echo "=========================================="

# Check if docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker could not be found. Please install Docker and try again."
    exit 1
fi

# Ensure .env exists
if [ ! -f .env.local ]; then
    echo "⚠️ .env.local not found. Copying from .env.example..."
    cp .env.example .env.local
fi

# Create a dummy backend folder if it doesn't exist so docker-compose doesn't crash on Person 4's machine
if [ ! -d "./backend" ]; then
    echo "⚠️ Backend directory not found. Creating a placeholder for now..."
    mkdir backend
    cat << 'EOF' > backend/Dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN touch requirements.txt && pip install -r requirements.txt
COPY . .
# Keep alive placeholder
CMD ["tail", "-f", "/dev/null"]
EOF
    touch backend/requirements.txt
fi

# Boot containers
echo "🔄 Starting Docker containers..."
docker-compose up -d --build

# Wait for Ollama to be ready
echo "⏳ Waiting for Ollama engine to start..."
sleep 10

# Pull models
echo "🧠 Pulling llama3.1:8b (this might take a while on the first run)..."
docker exec aethon-ollama ollama run llama3.1:8b "Hi, verify you are working."

echo "🧠 Pulling nomic-embed-text for embeddings..."
docker exec aethon-ollama ollama pull nomic-embed-text

echo "=========================================="
echo "✅ Boot complete!"
echo "🌐 Frontend: http://localhost:3000"
echo "⚙️ Backend: http://localhost:8080"
echo "=========================================="
