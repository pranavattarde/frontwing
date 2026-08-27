import os
import sys
import numpy as np
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'ai_services')))

from app.simulation.simulation_engine import load_session_data_from_db

def test_clean_fitting():
    db_data = load_session_data_from_db("2024_qatar_gp_race", "verstappen")
    driver_laps = db_data["driver_actual_laps"]

    # Filter clean laps
    # 1. Base median
    raw_times = [l["lap_time"] for l in driver_laps if l.get("lap_time")]
    median_time = float(np.median(raw_times))
    print(f"Overall Median Lap Time: {median_time:.3f}s")

    for comp in ["MEDIUM", "HARD"]:
        comp_laps = [
            l for l in driver_laps 
            if str(l.get("compound", "")).upper() == comp
            and not l.get("is_pit_out_lap", False)
            and l.get("lap_number", 0) > 1 # exclude standing start lap 1
            and 0.85 * median_time <= l.get("lap_time", 0) <= 1.15 * median_time # exclude SC / outlier laps
        ]
        print(f"\nClean laps for {comp}: {len(comp_laps)} laps")
        for l in comp_laps[:5]:
            print("  ", l)

        ages = np.array([l.get("tire_age", l.get("lap_number", 1)) for l in comp_laps])
        times = np.array([l["lap_time"] for l in comp_laps])
        lap_numbers = np.array([l["lap_number"] for l in comp_laps])

        corrected_times = times + 0.06 * lap_numbers

        slope, intercept = np.polyfit(ages, corrected_times, 1)
        beta = max(0.001, slope)
        alpha = intercept
        print(f"-> Fitted params for {comp}: alpha={alpha:.3f}s, beta={beta:.4f}s/lap")

        # Project sample laps
        print("Sample projected natural laps:")
        for age, lap_n in [(2, 2), (10, 10), (20, 20), (30, 30)]:
            proj = alpha + beta * age - 0.06 * lap_n
            print(f"   Lap {lap_n} (age {age}): {proj:.3f}s")

if __name__ == "__main__":
    test_clean_fitting()
