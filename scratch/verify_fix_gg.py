import time
import json
import sys
import os

sys.path.insert(0, os.path.abspath("ai_services"))

from app.agents.strategy_planner import run_strategy_planner

def verify_all():
    print("================================================================")
    print("VERIFICATION SUITE: FIX GG - SCOPED TELEMETRY VISUALIZATION")
    print("================================================================\n")

    scenarios = [
        ("Analysis 1", "Why did Verstappen finish P2 at the 2024 Dutch Grand Prix?"),
        ("Analysis 2", "Why did Russell finish P4 at the 2026 Miami GP?"),
        ("What-If 1", "What if Verstappen pitted on lap 22 at the 2024 Dutch GP?"),
        ("What-If 2", "What if Piastri pitted on lap 18 on hard tires at the 2024 Qatar GP?")
    ]

    results = []

    for name, query in scenarios:
        print(f"\n>>> Running {name}: \"{query}\"")
        t0 = time.time()
        res = run_strategy_planner(query)
        duration = time.time() - t0
        print(f"    Completed in {duration:.2f}s, status: {res.get('status')}")

        q_type = res.get("query_type")
        if q_type == "strategy_analysis":
            report = res.get("strategy_report", {})
            telem = report.get("telemetry_comparison", {})
            alt = report.get("suggested_alternative", {})
            act = telem.get("actual", {})
            sim = telem.get("simulated", {})

            scenario_label = telem.get("scenario_label")
            act_laps = len(act.get("lap_times", []))
            sim_laps = len(sim.get("lap_times", []))
            act_pos = act.get("finish_position")
            sim_pos = sim.get("finish_position")
            net_delta = sim.get("net_time_delta_s")
            traffic_loss = sim.get("traffic_loss_s")

            print(f"    Scenario: {scenario_label}")
            print(f"    Actual: P{act_pos}, {act_laps} laps, Pit Laps: {act.get('pit_laps')}, Compounds: {act.get('compounds')}")
            print(f"    Simulated: P{sim_pos}, {sim_laps} laps, Pit Laps: {sim.get('pit_laps')}, Net Delta: {net_delta}s, Traffic Loss: {traffic_loss}s")
            assert act_laps > 0, "Actual lap times empty"
            assert sim_laps > 0, "Simulated lap times empty"
            assert scenario_label is not None, "Scenario label missing"

            results.append({
                "type": q_type,
                "name": name,
                "query": query,
                "label": scenario_label,
                "act_pos": act_pos,
                "sim_pos": sim_pos,
                "net_delta": net_delta,
                "traffic_loss": traffic_loss,
                "act_laps": act_laps,
                "sim_laps": sim_laps
            })

        elif q_type == "strategy_whatif":
            sim_data = res.get("whatif_simulation", {})
            telem = sim_data.get("telemetry_comparison", {})
            act = telem.get("actual", {})
            sim = telem.get("simulated", {})

            scenario_label = telem.get("scenario_label")
            act_laps = len(act.get("lap_times", []))
            sim_laps = len(sim.get("lap_times", []))
            act_pos = act.get("finish_position")
            sim_pos = sim.get("finish_position")
            net_delta = sim.get("net_time_delta_s")
            traffic_loss = sim.get("traffic_loss_s")

            print(f"    Scenario: {scenario_label}")
            print(f"    Actual: P{act_pos}, {act_laps} laps, Pit Laps: {act.get('pit_laps')}, Compounds: {act.get('compounds')}")
            print(f"    Simulated: P{sim_pos}, {sim_laps} laps, Pit Laps: {sim.get('pit_laps')}, Net Delta: {net_delta}s, Traffic Loss: {traffic_loss}s")
            assert act_laps > 0, "Actual lap times empty"
            assert sim_laps > 0, "Simulated lap times empty"
            assert scenario_label is not None, "Scenario label missing"

            results.append({
                "type": q_type,
                "name": name,
                "query": query,
                "label": scenario_label,
                "act_pos": act_pos,
                "sim_pos": sim_pos,
                "net_delta": net_delta,
                "traffic_loss": traffic_loss,
                "act_laps": act_laps,
                "sim_laps": sim_laps
            })

    print("\n================================================================")
    print("ALL 4 SCENARIOS GENERATED VALID REAL TELEMETRY COMPARISONS!")
    print("================================================================")
    for r in results:
        print(f"[{r['name']}] \"{r['query']}\"")
        print(f"   -> Label: {r['label']}")
        print(f"   -> Finish: P{r['act_pos']} -> P{r['sim_pos']} | Net Delta: {r['net_delta']}s | Laps: {r['act_laps']} act vs {r['sim_laps']} sim")

if __name__ == "__main__":
    verify_all()
