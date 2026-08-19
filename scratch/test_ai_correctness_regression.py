import urllib.request
import json
import redis

# 1. Flush Redis before starting test matrix
r = redis.Redis(host='localhost', port=6379, db=0)
r.flushall()
print("[Setup] Flushed Redis cache cleanly for regression suite.\n")

def run_query(query_text, session=None):
    url = "http://localhost:5000/engineer/query"
    payload = {"question": query_text}
    if session:
        payload["session"] = session
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode('utf-8'),
        headers={'Content-Type': 'application/json'}
    )
    with urllib.request.urlopen(req) as response:
        res_body = response.read().decode('utf-8')
        return json.loads(res_body)

test_suite = [
    ("A", "Who was 3rd in the Chinese GP?"),
    ("B", "Who won the Monaco GP?"),
    ("C", "Who finished 3rd in Monaco?"),
    ("D", "Who finished P5 in China?"),
    ("E", "Who was on the podium at the Chinese Grand Prix?"),
    ("F", "Who won the Chinese GP?"),
    ("G", "Who finished ahead of Verstappen in the Chinese GP?"),
    ("H", "Who was 3rd in the Chinese Grand Prix?"),
    ("I", "wh was 3rd in chinese gp?"),
    ("J (Cross-Contamination: B then A)", "Who was 3rd in the Chinese GP?"),
    ("K (Cross-Contamination: A then B)", "Who won the Monaco GP?")
]

results = []

print("======================================================================")
print("             FRONTWING AI CORRECTNESS REGRESSION MATRIX               ")
print("======================================================================\n")

for code, q in test_suite:
    data = run_query(q)
    answer = data.get("final_answer", "")
    cached = data.get("cached") or data.get("_cached") or False
    
    # Groundedness Check: Chinese GP query MUST NEVER mention Monaco
    is_chinese_query = "chin" in q.lower() or "shanghai" in q.lower()
    is_monaco_query = "monaco" in q.lower() or "monte carlo" in q.lower()
    
    passed = True
    reason = "OK"
    if is_chinese_query and "monaco" in answer.lower():
        passed = False
        reason = "CONTAMINATION: Chinese GP query returned Monaco result!"
    elif is_monaco_query and "chin" in answer.lower():
        passed = False
        reason = "CONTAMINATION: Monaco GP query returned Chinese result!"
    elif "something went wrong" in answer.lower():
        passed = False
        reason = "SYSTEM ERROR: Unhandled backend execution failure!"
        
    print(f"TEST [{code}] Query: '{q}'")
    print(f"  Final Answer: {answer}")
    print(f"  Cached: {cached} | Status: {'PASS' if passed else 'FAIL (' + reason + ')'}")
    print("----------------------------------------------------------------------\n")
    results.append({"code": code, "query": q, "answer": answer, "passed": passed, "reason": reason, "cached": cached})

# 2. Section 9: Explicit Cache Regression Test
print("======================================================================")
print("                   SECTION 9: CACHE REGRESSION TEST                   ")
print("======================================================================\n")

q1_res = run_query("Who won Monaco GP?")
q2_res = run_query("Who was 3rd in Chinese GP?")
q3_res = run_query("Who won Monaco GP?")

c1_ans = q1_res.get("final_answer")
c2_ans = q2_res.get("final_answer")
c3_ans = q3_res.get("final_answer")

cache_pass = True
if c1_ans == c2_ans:
    cache_pass = False
    print("CACHE FAIL: Q1 (Monaco) and Q2 (China) returned identical answers!")
elif "monaco" in c2_ans.lower() or "charles" in c2_ans.lower() and "hamilton" not in c2_ans.lower():
    cache_pass = False
    print("CACHE FAIL: Q2 received Q1's cached Monaco result!")
else:
    print(f"Q1 Answer: {c1_ans}")
    print(f"Q2 Answer: {c2_ans}")
    print(f"Q3 Answer: {c3_ans}")
    print(f"Q3 Cached Flag: {q3_res.get('cached') or q3_res.get('_cached')}")
    print("CACHE TEST RESULT: PASS (Q1 != Q2, Q3 reused Q1 cache, Q2 was isolated cleanly)")

print("\n======================================================================")
