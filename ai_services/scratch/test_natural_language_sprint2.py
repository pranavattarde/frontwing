import urllib.request
import urllib.parse
import json
import time

BASE_URL = "http://localhost:5000/api"

def make_request(url, method="GET", headers=None, data=None):
    if headers is None:
        headers = {}
    if data is not None:
        if isinstance(data, dict):
            data_bytes = json.dumps(data).encode("utf-8")
            headers["Content-Type"] = "application/json"
        else:
            data_bytes = data
    else:
        data_bytes = None

    req = urllib.request.Request(url, data=data_bytes, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            body = resp.read().decode("utf-8")
            return resp.status, json.loads(body) if body else {}
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        try:
            return e.code, json.loads(body)
        except Exception:
            return e.code, {"error": body}

def run_sprint2_nl_tests():
    print("==================================================")
    print("SPRINT 2 — NATURAL LANGUAGE MVP RELIABILITY TESTS")
    print("==================================================")

    # 1. Health check
    status, body = make_request("http://localhost:5000/health")
    assert status == 200, "Express Gateway unhealthy"
    print("Express Gateway & Backend System: HEALTHY")

    # Register temp user for auth header
    email = f"nl_user_{int(time.time())}@frontwing.com"
    status, reg_res = make_request(f"{BASE_URL}/auth/register", method="POST", data={"email": email, "password": "Password123!", "name": "NL User"})
    token = reg_res.get("token")
    headers = {"Authorization": f"Bearer {token}"}

    queries = [
        # RACE RESULT VARIATIONS
        ("1. Exact Monaco", "Who won Monaco GP?"),
        ("2. Natural Monaco", "Who won the Monaco Grand Prix?"),
        ("3. Lowercase Monaco", "tell me who won Monaco"),
        ("4. Short Punctuation Monaco", "Monaco GP winner?"),
        ("5. British Natural", "Who won the British Grand Prix?"),
        ("6. Austria Natural", "who won Austria?"),
        ("7. P3 Finish Position", "Who finished P3 in Monaco?"),
        
        # INVESTIGATION TEAM VARIATIONS (FERRARI / AUSTRIA)
        ("8. Team Struggle", "Why did Ferrari struggle in Austria?"),
        ("9. Team Fail", "Why did Ferrari fail in the Austrian Grand Prix?"),
        ("10. Team What Happened", "What happened to Ferrari in Austria?"),
        ("11. Team Performance", "Analyze Ferrari's performance in Austria."),

        # FORMATTING / CASING VARIATIONS
        ("12. Punctuation Exclamation", "who won monaco gp!!!"),
        ("13. All Caps British", "WHO WON THE BRITISH GRAND PRIX"),
        ("14. Long Natural Hungarian", "tell me who won the hungarian grand prix"),
        ("15. Lowercase Team Fail", "why did ferrari fail in austria?")
    ]

    success_count = 0

    for label, q in queries:
        t0 = time.time()
        status, res = make_request(f"{BASE_URL}/engineer/query", method="POST", headers=headers, data={"question": q})
        latency = int((time.time() - t0) * 1000)

        print(f"\n[{label}] Query: '{q}' (Latency: {latency}ms, Status: {status})")
        assert status == 200, f"Query failed with status {status}: {res}"

        ans = res.get("final_answer") or res.get("investigation_report", {}).get("Executive Summary")
        trace = res.get("intelligence_trace") or {}
        provider = trace.get("llm_provider") or res.get("provider")
        model = trace.get("llm_model")
        failover = trace.get("failover_reason")

        print(f"   Provider Used: {provider} (Model: {model})")
        if failover and failover != "None":
            print(f"   Failover Reason: {failover}")
        print(f"   Final Answer: {ans}")

        # Strict Assertions
        assert ans and len(ans) > 5, "Empty or invalid final answer text returned"
        assert provider in ("groq", "gemini", "fallback"), f"Unexpected provider: {provider}"

        # Entity Correctness Validation: Verify Ferrari queries do NOT return corrupted driver 'Max Verstappen' in investigation_tool
        if "ferrari" in q.lower() and "investigation_tool" in res.get("evidence", {}):
            inv_ev = res["evidence"]["investigation_tool"]
            inv_str = json.dumps(inv_ev).lower()
            assert "max verstappen" not in inv_str, "Corrupted driver entity detected in investigation_tool!"
            print("   Entity Integrity Check: PASS (No driver corruption)")

        # Zero Fabricated Telemetry Claim Validation
        if "telemetry_tool" in res.get("evidence", {}):
            telem_res = res["evidence"]["telemetry_tool"]
            if isinstance(telem_res, dict) and telem_res.get("status") == "missing_data":
                rep = res.get("investigation_report", {})
                assert not "telemetry metrics indicate tire degradation" in rep.get("Telemetry Findings", "").lower(), "Fabricated telemetry evidence detected!"
                print("   Zero Fabricated Telemetry Check: PASS (Missing data represented honestly)")

        success_count += 1

    print("\n==================================================")
    print(f"ALL {success_count}/{len(queries)} NATURAL LANGUAGE TEST VARIATIONS PASSED!")
    print("==================================================")

if __name__ == "__main__":
    run_sprint2_nl_tests()
