import json
import sys
import requests

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

queries = [
    "Who designed the Red Bull RB19 and what aerodynamic concept made it so dominant?",
    "What is the 107% qualifying rule in Formula 1 and when was it introduced?",
    "What materials are Formula 1 brake discs made of and what operating temperatures do they reach?"
]

url = "http://localhost:8000/engineer/query"

for i, q in enumerate(queries, 1):
    print(f"\n========================================================", flush=True)
    print(f"TEST {i}: {q}", flush=True)
    print(f"========================================================", flush=True)
    try:
        resp = requests.post(url, json={"question": q}, timeout=120)
        if resp.status_code != 200:
            print(f"FAILED with status {resp.status_code}: {resp.text}")
            continue
        data = resp.json()
        
        tools_used = data.get("tools_used", [])
        final_answer = data.get("final_answer", "")
        sources = data.get("sources", [])
        evidence = data.get("evidence", {})
        investigation_report = data.get("investigation_report") or {}
        visuals = data.get("visuals", [])
        
        print(f"Status: SUCCESS")
        print(f"Tools Used: {tools_used}")
        print(f"Sources count: {len(sources)}")
        for s in sources:
            print(f"  - [{s.get('title')}]({s.get('url')})")
        print(f"\nFinal Answer preview:\n{final_answer[:400]}...\n")
        
        # Scope rule validation:
        # 1. No dummy "No data available." sections in investigation_report
        findings = investigation_report.get("telemetry_findings")
        simulations = investigation_report.get("simulations")
        print(f"Scope Check - telemetry_findings: {findings}")
        print(f"Scope Check - simulations: {simulations}")
        print(f"Scope Check - visuals: {visuals}")
        
        has_invalid_telemetry = (
            findings is not None or
            simulations is not None or
            len(visuals) > 0 or
            "No data available" in str(findings) or
            "No data available" in str(simulations)
        )
        if has_invalid_telemetry:
            print("ERROR: Dummy telemetry / simulation section attached to out-of-scope query!")
        else:
            print("PASS: Pure knowledge query returned clean answer without unnecessary telemetry artifacts.")
            
    except Exception as e:
        print(f"EXCEPTION: {e}")
