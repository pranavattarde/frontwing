import os
import sys
import numpy as np
import json
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'ai_services')))

from app.core.db import execute_query
from app.tools.adapters import ScoringTool
from app.scoring.tire_score import calculate_tire_score
from app.scoring.pace_score import calculate_pace_score

def diagnose_all():
    print("================================================================================")
    print(" 1. DIAGNOSING VERSTAPPEN PACE SCORE (QATAR 2024)")
    print("================================================================================")
    st = ScoringTool()
    qatar_ver = st._gather_metrics_from_db("2024_qatar_gp_race", "verstappen")
    
    mean = qatar_ver["driver_clean_laps_mean"]
    std = qatar_ver["driver_clean_laps_std"]
    drv_opt = qatar_ver["driver_optimal_lap"]
    tm_opt = qatar_ver["teammate_optimal_lap"]
    
    print(f"Inputs: mean={mean}, std={std}, driver_optimal={drv_opt}, teammate_optimal={tm_opt}")
    
    # Trace step-by-step
    std_limit = 1.5
    raw_consistency = 1.0 - (std / std_limit)
    consistency = max(0.0, min(1.0, raw_consistency))
    print(f"1. Consistency Trace:")
    print(f"   std / std_limit = {std} / {std_limit} = {std / std_limit:.4f}")
    print(f"   raw_consistency = 1.0 - {std / std_limit:.4f} = {raw_consistency:.4f}")
    print(f"   clamped consistency = {consistency:.4f}")
    print(f"   consistency component (50 * consistency) = {50.0 * consistency:.2f}")
    
    delta_limit = 2.0
    l_optimal = min(drv_opt, tm_opt) if tm_opt else drv_opt
    pace_delta = mean - l_optimal
    raw_speed_margin = 1.0 - (pace_delta / delta_limit)
    speed_margin = max(0.0, min(1.0, raw_speed_margin))
    print(f"\n2. Speed Margin Trace:")
    print(f"   l_optimal = min({drv_opt}, {tm_opt}) = {l_optimal}")
    print(f"   driver_mean - l_optimal = {mean} - {l_optimal} = {pace_delta:.4f}s")
    print(f"   pace_delta / delta_limit = {pace_delta:.4f} / {delta_limit} = {pace_delta / delta_limit:.4f}")
    print(f"   raw_speed_margin = 1.0 - {pace_delta / delta_limit:.4f} = {raw_speed_margin:.4f}")
    print(f"   clamped speed_margin = {speed_margin:.4f}")
    print(f"   speed_margin component (50 * speed_margin) = {50.0 * speed_margin:.2f}")
    
    total_pace = 50.0 * consistency + 50.0 * speed_margin
    print(f"\n3. Total Pace Score: {50.0 * consistency:.2f} + {50.0 * speed_margin:.2f} = {round(total_pace, 2)}")

    print("\n================================================================================")
    print(" 2. DIAGNOSING TIRE SCORE (QATAR 2024 vs MONACO 2023)")
    print("================================================================================")
    
    # Qatar 2024
    print("--- A. Qatar 2024 (Verstappen) ---")
    print(f"Grid median deg: {qatar_ver['grid_median_deg']}")
    for idx, stint in enumerate(qatar_ver['stints']):
        comp = stint['compound']
        times = stint['clean_laps_times']
        if len(times) >= 3:
            ages = np.arange(1, len(times) + 1)
            corrected = np.array(times) + 0.06 * ages
            slope = float(np.polyfit(ages, corrected, 1)[0])
            grid_slope = qatar_ver['grid_median_deg'].get(comp, 0.080)
            print(f"   Stint {idx+1} ({comp}, {len(times)} laps): driver_slope={slope:.4f}, grid_median_slope={grid_slope:.4f}")
            if slope <= grid_slope:
                print(f"     -> driver_slope ({slope:.4f}) <= grid_slope ({grid_slope:.4f}) -> Score = 100.0")
            else:
                rel_diff = (slope - grid_slope) / grid_slope
                score = max(0.0, min(100.0, 100.0 * (1.0 - rel_diff)))
                print(f"     -> rel_diff={rel_diff:.4f} -> Score = {score:.2f}")
        else:
            print(f"   Stint {idx+1} ({comp}, {len(times)} laps): < 3 laps -> Default Score = 100.0")
            
    print(f"Total Qatar Tire Score = {calculate_tire_score(qatar_ver)}")

    # Monaco 2023
    print("\n--- B. Monaco 2023 (Verstappen) ---")
    monaco_ver = st._gather_metrics_from_db("2023_monaco_gp_race", "verstappen")
    print(f"Grid median deg: {monaco_ver['grid_median_deg']}")
    for idx, stint in enumerate(monaco_ver['stints']):
        comp = stint['compound']
        times = stint['clean_laps_times']
        print(f"   Stint {idx+1} ({comp}): {len(times)} clean laps -> {times}")
        if comp in ["INTERMEDIATE", "WET"]:
            print(f"     -> Compound {comp} is skipped per formula rules (Inter/Wet excluded).")
            continue
        if len(times) >= 3:
            ages = np.arange(1, len(times) + 1)
            corrected = np.array(times) + 0.06 * ages
            slope = float(np.polyfit(ages, corrected, 1)[0])
            grid_slope = monaco_ver['grid_median_deg'].get(comp, 0.080)
            print(f"     Driver slope (with +0.06*age fuel offset): {slope:.4f}")
            print(f"     Grid median slope for {comp}: {grid_slope:.4f}")
            rel_diff = (slope - grid_slope) / grid_slope
            raw_stint_score = 100.0 * (1.0 - rel_diff)
            stint_score = max(0.0, min(100.0, raw_stint_score))
            print(f"     rel_diff = ({slope:.4f} - {grid_slope:.4f}) / {grid_slope:.4f} = {rel_diff:.4f}")
            print(f"     raw_stint_score = 100.0 * (1.0 - {rel_diff:.4f}) = {raw_stint_score:.2f}")
            print(f"     clamped stint_score = {stint_score:.2f}")
        else:
            print(f"     < 3 clean laps -> Default Score = 100.0")
            
    print(f"Total Monaco Tire Score = {calculate_tire_score(monaco_ver)}")

    print("\n================================================================================")
    print(" 3. DIAGNOSING ALEXANDER ALBON (2022 BRITISH GP)")
    print("================================================================================")
    sess_id = "2022_british_gp_race"
    
    # 1. Check sessions table
    sess_row = execute_query("SELECT * FROM sessions WHERE id = %s", (sess_id,), fetch=True)
    print(f"1. Sessions table for '{sess_id}':\n   {sess_row}")

    # 2. Check drivers table for Albon
    albon_drv = execute_query("SELECT * FROM drivers WHERE id LIKE '%albon%' OR code = 'ALB'", fetch=True)
    print(f"\n2. Drivers table for Albon:\n   {albon_drv}")

    # 3. Check race_results table for session & Albon
    rr_albon = execute_query("SELECT * FROM race_results WHERE session_id = %s AND (driver_id LIKE '%albon%' OR driver_id IN (SELECT id FROM drivers WHERE code = 'ALB'))", (sess_id,), fetch=True)
    print(f"\n3. race_results for Albon in '{sess_id}':\n   {rr_albon}")
    
    # Check all race_results for this session
    rr_all = execute_query("SELECT driver_id, constructor_id, grid_position, position, status, points FROM race_results WHERE session_id = %s", (sess_id,), fetch=True)
    print(f"\n   All race_results for '{sess_id}' ({len(rr_all)} rows):")
    for r in rr_all:
        print(f"     {r}")

    # 4. Check laps table for session & Albon
    laps_albon = execute_query("SELECT lap_number, lap_time_ms, is_valid, is_pit_out_lap FROM laps WHERE session_id = %s AND (driver_id LIKE '%albon%' OR driver_id IN (SELECT id FROM drivers WHERE code = 'ALB'))", (sess_id,), fetch=True)
    print(f"\n4. Laps table for Albon in '{sess_id}':\n   {laps_albon}")

    # Check distinct drivers in laps
    laps_drvs = execute_query("SELECT DISTINCT driver_id, COUNT(*) as lap_count FROM laps WHERE session_id = %s GROUP BY driver_id", (sess_id,), fetch=True)
    print(f"\n   Distinct drivers in laps for '{sess_id}':\n   {laps_drvs}")

    # 5. Check stints table for session & Albon
    stints_albon = execute_query("SELECT * FROM stints WHERE session_id = %s AND (driver_id LIKE '%albon%' OR driver_id IN (SELECT id FROM drivers WHERE code = 'ALB'))", (sess_id,), fetch=True)
    print(f"\n5. Stints table for Albon in '{sess_id}':\n   {stints_albon}")

    # 6. Check telemetry_metadata for session & Albon
    telem_albon = execute_query("SELECT * FROM telemetry_metadata WHERE session_id = %s AND (driver_id LIKE '%albon%' OR driver_id IN (SELECT id FROM drivers WHERE code = 'ALB'))", (sess_id,), fetch=True)
    print(f"\n6. Telemetry metadata for Albon in '{sess_id}':\n   {telem_albon}")

if __name__ == "__main__":
    diagnose_all()
