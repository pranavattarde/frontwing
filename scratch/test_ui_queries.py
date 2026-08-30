import urllib.request
import json

def test_query(question):
    print(f"\n=======================================================")
    print(f" TESTING QUERY: '{question}'")
    print(f"=======================================================")
    url = "http://127.0.0.1:8000/engineer/query"
    payload = json.dumps({"question": question}).encode("utf-8")
    req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"})
    
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            print("Status: 200 OK")
            print("Tools used:", data.get("tools_used"))
            print("Final answer:", data.get("final_answer")[:150] if data.get("final_answer") else "None")
            evidence = data.get("evidence", {})
            print("Evidence keys:", list(evidence.keys()))
            if "scoring_tool" in evidence:
                st = evidence["scoring_tool"]
                print(" -> scoring_tool found! Composite Score:", st.get("composite_score"), "Pace Score:", st.get("pace_score"))
            if "simulation_tool" in evidence:
                sim = evidence["simulation_tool"]
                print(" -> simulation_tool found! Pos Change:", sim.get("position_change"), "Net Gain ms:", sim.get("simulated_net_time_gain_ms"))
            return data
    except Exception as e:
        print("ERROR:", e)
        return None

if __name__ == "__main__":
    test_query("How did Verstappen perform at Qatar GP?")
