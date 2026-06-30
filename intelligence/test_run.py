from rag_core import verify_ollama_connection, answer_query, ingest_pdf

print("=== Aethon Intelligence Core Test ===")

# 1. Verify connection
if not verify_ollama_connection():
    print("Cannot proceed without models.")
    exit(1)

# 2. Ingest the sample document
print("\n--- Ingesting sample_manual.pdf ---")
success = ingest_pdf("sample_manual.pdf")
if success:
    print("[OK] Document ingested successfully!")

# 3. Test a specific query
print("\n--- Testing Llama 3.1 directly ---")
query = "What is the required torque for the main valve on Pump P-204?"
try:
    response = answer_query(query)
    print(f"\nResponse:\n{response['answer']}")
    print(f"\nSources:")
    for src in response['sources']:
        print(f" - {src['doc_name']} (Page {src['page']})")
except Exception as e:
    print(f"Error during query: {e}")
