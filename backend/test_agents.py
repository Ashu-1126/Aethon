import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from agents import compliance_audit, detect_conflicts, root_cause_analysis
    
    print("--- Testing Compliance Agent ---")
    try:
        res = compliance_audit()
        print(f"Result: {res}")
    except Exception as e:
        print(f"Compliance Error: {e}")

    print("\n--- Testing Conflict Detector ---")
    try:
        res = detect_conflicts()
        print(f"Result: {res}")
    except Exception as e:
        print(f"Conflict Error: {e}")

    print("\n--- Testing RCA Agent ---")
    try:
        res = root_cause_analysis("Pump")
        print(f"Result: {res}")
    except Exception as e:
        print(f"RCA Error: {e}")
        
except Exception as e:
    print(f"Import Error: {e}")
