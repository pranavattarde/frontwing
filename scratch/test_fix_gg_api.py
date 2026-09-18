import requests
import json

def test_queries():
    # 1. strategy_analysis
    print("--- 1. Testing strategy_analysis ---")
    r1 = requests.post("http://localhost:8000/strategy/query", json={"question": "Why did Verstappen finish P2 at the 2024 Dutch GP?"})
    d1 = r1.json()
    print("Status:", d1.get("status"))
    strat_rep = d1.get("strategy_report", {})
    telem1 = strat_rep.get("telemetry_comparison", {})
    print("telemetry_comparison keys in strategy_report:", list(telem1.keys()))
    if telem1:
        print("actual keys:", list(telem1.get("actual", {}).keys()))
        print("actual lap_times sample:", telem1.get("actual", {}).get("lap_times", [])[:3])
        print("simulated keys:", list(telem1.get("simulated", {}).keys()))
        print("simulated lap_times sample:", telem1.get("simulated", {}).get("lap_times", [])[:3])

    # 2. strategy_whatif
    print("\n--- 2. Testing strategy_whatif ---")
    r2 = requests.post("http://localhost:8000/strategy/query", json={"question": "What if Verstappen pitted on lap 22 at the 2024 Dutch GP?"})
    d2 = r2.json()
    print("Status:", d2.get("status"))
    whatif = d2.get("whatif_simulation", {})
    telem2 = whatif.get("telemetry_comparison", {})
    print("telemetry_comparison keys in whatif_simulation:", list(telem2.keys()))
    if telem2:
        print("scenario_label:", telem2.get("scenario_label"))
        print("actual keys:", list(telem2.get("actual", {}).keys()))
        print("simulated keys:", list(telem2.get("simulated", {}).keys()))

if __name__ == "__main__":
    test_queries()
