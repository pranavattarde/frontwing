import urllib.request
import json
import time

GATEWAY_URL = "http://localhost:5000/engineer/query"

# Fresh novel questions never executed before
NOVEL_QUESTIONS = [
    ("1. Fresh Unseen Australian GP Winner", "Who won Australian Grand Prix 2024?"),
    ("2. Fresh Unseen Sao Paulo GP Podium", "Who finished P3 in Sao Paulo GP 2024?"),
    ("3. Fresh Unseen Singapore GP P2", "Who finished P2 in the 2024 Singapore Grand Prix?"),
    ("4. Fresh Unseen Chinese GP Winner", "Who won the 2024 Chinese Grand Prix?"),
    ("5. Fresh Unseen Abu Dhabi P5", "Who came P5 in the 2024 Abu Dhabi Grand Prix?"),
    ("6. Fresh Unseen Las Vegas Winner", "Who won the 2024 Las Vegas Grand Prix?"),
    ("7. Fresh Unseen Miami P10", "Who finished P10 in the 2024 Miami Grand Prix?"),
    ("8. Fresh Unseen Japanese GP Winner", "Who won the 2024 Japanese Grand Prix?")
]

def run_novel_pipeline_tests():
    print("=" * 60)
    print("GENERAL F1 QUERY PIPELINE -- FRESH NOVEL UNSEEN QUESTIONS")
    print("=" * 60)
    
    passed = 0
    total = len(NOVEL_QUESTIONS)
    
    for label, query in NOVEL_QUESTIONS:
        print(f"\n[{label}] Query: '{query}'")
        payload = json.dumps({"question": query}).encode("utf-8")
        req = urllib.request.Request(
            GATEWAY_URL,
            data=payload,
            headers={"Content-Type": "application/json"}
        )
        
        start_time = time.time()
        try:
            with urllib.request.urlopen(req, timeout=120) as resp:
                elapsed_ms = int((time.time() - start_time) * 1000)
                status = resp.status
                data = json.loads(resp.read().decode("utf-8"))
                
                final_answer = data.get("final_answer", "")
                report = data.get("investigation_report", {})
                exec_summary = report.get("Executive Summary", "")
                
                print(f"   Status: {status} (Latency: {elapsed_ms}ms)")
                print(f"   Final Answer: {final_answer}")
                if exec_summary and exec_summary != final_answer:
                    print(f"   Executive Summary: {exec_summary}")
                
                # Validation checks:
                if status == 200 and (final_answer or exec_summary) and not data.get("error"):
                    print("   Verification Result: [PASS]")
                    passed += 1
                else:
                    print(f"   Verification Result: [FAIL] (Invalid or empty payload: {data})")
        except Exception as e:
            print(f"   Verification Result: [FAIL] Exception: {e}")
            
    print("\n" + "=" * 60)
    print(f"FINAL SUMMARY: {passed}/{total} FRESH NOVEL UNSEEN QUESTIONS PASSED")
    print("=" * 60)
    return passed == total

if __name__ == "__main__":
    run_novel_pipeline_tests()
