from openai import OpenAI
import os
import sys

# Load .env variables manually to be sure
from pathlib import Path
env_loaded = False
for env_path in [Path(".env"), Path("../.env"), Path(".env.local"), Path("../.env.local")]:
    if env_path.exists():
        print("Found env file:", env_path.resolve())
        with open(env_path) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    k = k.strip()
                    v = v.strip().strip('"').strip("'")
                    os.environ[k] = v
        env_loaded = True

key = os.getenv("OPENROUTER_API_KEY", "")
print("API Key loaded (first 8 chars):", key[:8] if key else "None")

client = OpenAI(
    api_key=key,
    base_url="https://openrouter.ai/api/v1"
)

embed_model = os.getenv("EMBED_MODEL", "openai/text-embedding-3-small")
llm_model = os.getenv("LLM_MODEL", "meta-llama/llama-3.3-70b-instruct:free")

print("\n--- Testing Embeddings ---")
print("Model:", embed_model)
try:
    resp = client.embeddings.create(
        model=embed_model,
        input=["Testing one two three"]
    )
    print("Embedding success! Vector size:", len(resp.data[0].embedding))
except Exception as e:
    print("Embedding failed!")
    print("Error:", e)

print("\n--- Testing Chat completion ---")
print("Model:", llm_model)
try:
    resp = client.chat.completions.create(
        model=llm_model,
        messages=[{"role": "user", "content": "Say hello!"}],
        max_tokens=10
    )
    print("Chat success! Response:", resp.choices[0].message.content)
except Exception as e:
    print("Chat failed!")
    print("Error:", e)
