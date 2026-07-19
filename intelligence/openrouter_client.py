"""
AETHON Intelligence — OpenRouter client (OpenAI-compatible).
Replaces the previous Ollama-based LLM/embedding access.
"""
import os
from openai import OpenAI

OPENROUTER_API_KEY: str = os.getenv("OPENROUTER_API_KEY", "")
OPENROUTER_BASE_URL: str = "https://openrouter.ai/api/v1"
LLM_MODEL: str = os.getenv("LLM_MODEL", "meta-llama/llama-3.3-70b-instruct:free")
EMBED_MODEL: str = os.getenv("EMBED_MODEL", "openai/text-embedding-3-small")

client = OpenAI(
    api_key=OPENROUTER_API_KEY,
    base_url=OPENROUTER_BASE_URL,
)


def chat_json(prompt: str, model: str = LLM_MODEL, max_tokens: int = 1024) -> dict:
    """Send a prompt and parse a JSON object response."""
    import json
    resp = client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": prompt}],
        response_format={"type": "json_object"},
        temperature=0.0,
        max_tokens=max_tokens,
    )
    return json.loads(resp.choices[0].message.content.strip())


def embed(text: str, model: str = EMBED_MODEL) -> list[float]:
    """Return the embedding vector for a single text."""
    resp = client.embeddings.create(model=model, input=text)
    return resp.data[0].embedding
