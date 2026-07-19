from config import client, EMBED_MODEL, LLM_MODEL
import sys

print("Active LLM Model:", LLM_MODEL)
print("Active Embed Model:", EMBED_MODEL)
print("Base URL:", client.base_url)
print("API Key Prefix:", client.api_key[:8] if client.api_key else "None")

print("\n--- Testing Embeddings ---")
try:
    resp = client.embeddings.create(
        model=EMBED_MODEL,
        input=["Testing active API config"]
    )
    print("Embedding success! Vector size:", len(resp.data[0].embedding))
except Exception as e:
    print("Embedding failed!")
    import traceback
    traceback.print_exc()

print("\n--- Testing Chat Completion ---")
try:
    resp = client.chat.completions.create(
        model=LLM_MODEL,
        messages=[{"role": "user", "content": "Say hello!"}],
        max_tokens=10
    )
    print("Chat success! Response:", resp.choices[0].message.content)
except Exception as e:
    print("Chat failed!")
    import traceback
    traceback.print_exc()
