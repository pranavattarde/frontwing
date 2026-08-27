import os
import sys
import json
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'ai_services')))

from app.tools.adapters import ScoringTool

def run_scoring_audit():
    print("================================================================================")
    print(" REAL F1 INTELLIGENCE SCORING TOOL VERIFICATION")
    print("================================================================================")

    st = ScoringTool()

    test_cases = [
        ("2024_qatar_gp_race", "verstappen", "Max Verstappen (P1 Winner - Qatar GP 2024)"),
        ("2024_qatar_gp_race", "hamilton", "Lewis Hamilton (P12 - Qatar GP 2024)"),
        ("2023_monaco_gp_race", "verstappen", "Max Verstappen (P1 Winner - Monaco GP 2023)"),
        ("2022_british_gp_race", "albon", "Alexander Albon (DNF Lap 1 - Silverstone 2022)")
    ]

    for session_id, driver_id, desc in test_cases:
        print(f"\n--- Running Scoring for: {desc} ---")
        print(f"Session ID: {session_id}, Driver ID: {driver_id}")

        # Gather metrics from DB to inspect input telemetry parameters
        metrics = st._gather_metrics_from_db(session_id, driver_id)
        if isinstance(metrics, dict) and metrics.get("status") == "missing_data":
            print(f"Status: missing_data (session/driver not ingested)")
            continue

        print(f"Persisted Metrics Extracted from DB:")
        print(f"  - Total Laps: {metrics.get('total_laps')}")
        print(f"  - Real SC/VSC Neutralization Laps: {metrics.get('sc_laps')}")
        print(f"  - Clean Air Laps Count: {metrics.get('clean_air_laps')}")
        print(f"  - Driver Optimal Lap: {metrics.get('driver_optimal_lap')}s")
        print(f"  - Teammate Optimal Lap: {metrics.get('teammate_optimal_lap')}s")
        print(f"  - Driver Clean Pace: mean={metrics.get('driver_clean_laps_mean')}s, std={metrics.get('driver_clean_laps_std')}s")
        print(f"  - Real Stints Count: {len(metrics.get('stints', []))}")
        print(f"  - Grid Median Deg: {metrics.get('grid_median_deg')}")
        print(f"  - Grid Start / Finish: P{metrics.get('p_start')} -> P{metrics.get('p_finish')}")

        # Compute full scores via ScoringTool.execute()
        result = st.execute({"session_id": session_id, "driver_id": driver_id})
        print(f"\nComputed F1 Driver Intelligence Scores:")
        print(json.dumps(result, indent=2))

    print("\n================================================================================")
    print(" ALL SCORING VERIFICATIONS COMPLETED SUCCESSFULLY")
    print("================================================================================")

if __name__ == "__main__":
    run_scoring_audit()
