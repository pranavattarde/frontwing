from typing import List, Dict
from .tire_model import get_tire_parameters_for_driver, project_natural_lap_time

def project_race_timeline(
    driver_actual_laps: List[Dict],
    simulated_stints: List[Dict],
    rivals_laps: Dict[str, List[float]], # driver_id -> list of actual lap times (seconds)
    grid_median_deg: Dict[str, float] = None,
    pit_loss: float = 22.0,
    overtake_difficulty: float = 0.4,
    total_laps: int = 71
) -> List[float]:
    """Projects the simulated lap-by-lap race timeline for the driver.
    
    Returns a list of simulated lap times (seconds) for laps 1 to total_laps.
    """
    # 1. Fit/Get tire parameters (alpha, beta) for each compound used in strategy
    compounds_used = set(s["compound"].upper() for s in simulated_stints)
    tire_params = {}
    for comp in compounds_used:
        alpha, beta = get_tire_parameters_for_driver(driver_actual_laps, comp, grid_median_deg)
        tire_params[comp] = (alpha, beta)
        
    # 2. Build cumulative actual times for all rivals
    rival_cumulative = {}
    for rival_id, laps in rivals_laps.items():
        cum = []
        curr = 0.0
        for l_time in laps:
            curr += l_time
            cum.append(curr)
        rival_cumulative[rival_id] = cum

    simulated_lap_times = []
    cumulative_time = 0.0
    tire_age = 0
    current_stint_idx = 0
    
    # 3. Simulate lap-by-lap
    for k in range(1, total_laps + 1):
        # Find active stint for lap k
        stint = simulated_stints[current_stint_idx]
        if k > stint["end_lap"] and current_stint_idx < len(simulated_stints) - 1:
            current_stint_idx += 1
            stint = simulated_stints[current_stint_idx]
            
        comp = stint["compound"].upper()
        alpha, beta = tire_params[comp]
        
        # Check if pit stop lap
        is_pit = (k == stint["start_lap"] and k > 1)
        if is_pit:
            tire_age = 1
            natural_lap = project_natural_lap_time(alpha, beta, tire_age, k) + pit_loss
        else:
            tire_age += 1
            natural_lap = project_natural_lap_time(alpha, beta, tire_age, k)
            
        # If lap 1, it's the start of the race. Just use natural lap time (usually slower due to standing start)
        if k == 1:
            # If we have actual lap 1 time, use it as baseline start
            actual_lap_1 = next((lap["lap_time"] for lap in driver_actual_laps if lap["lap_number"] == 1), None)
            if actual_lap_1 is not None:
                simulated_lap_times.append(actual_lap_1)
                cumulative_time = actual_lap_1
            else:
                simulated_lap_times.append(natural_lap)
                cumulative_time = natural_lap
            continue

        # 4. Find the rival immediately ahead at the end of lap k-1
        rival_ahead_id = None
        rival_ahead_cum_k_minus_1 = -1.0
        
        for rival_id, cum_times in rival_cumulative.items():
            # Only consider rivals who completed lap k
            if len(cum_times) >= k:
                cum_k_minus_1 = cum_times[k-2] # lap k-1 is at index k-2
                if cum_k_minus_1 < cumulative_time and cum_k_minus_1 > rival_ahead_cum_k_minus_1:
                    rival_ahead_cum_k_minus_1 = cum_k_minus_1
                    rival_ahead_id = rival_id
                    
        # Apply Traffic Bottleneck Constraint
        projected_cum = cumulative_time + natural_lap
        
        if rival_ahead_id is not None:
            gap_k_minus_1 = cumulative_time - rival_ahead_cum_k_minus_1
            rival_actual_lap = rivals_laps[rival_ahead_id][k-1] # lap k is index k-1
            rival_cum_k = rival_cumulative[rival_ahead_id][k-1]
            
            if gap_k_minus_1 <= 1.0:
                # In dirty air behind rival
                if natural_lap < rival_actual_lap:
                    # Target driver is naturally faster
                    pace_diff = rival_actual_lap - natural_lap
                    if pace_diff > overtake_difficulty:
                        # Successful overtake!
                        cumulative_time = projected_cum
                    else:
                        # Stuck behind rival, pace capped
                        cumulative_time = rival_cum_k + 0.6
                else:
                    # Naturally slower, remains behind
                    cumulative_time = max(projected_cum, rival_cum_k + 0.6)
            else:
                # Clean air initially, check if we catch the rival during the lap
                if projected_cum < rival_cum_k:
                    # Caught up during the lap, capped behind
                    cumulative_time = rival_cum_k + 0.6
                else:
                    cumulative_time = projected_cum
        else:
            # P1 or no rivals ahead on track
            cumulative_time = projected_cum
            
        lap_time = cumulative_time - sum(simulated_lap_times)
        simulated_lap_times.append(lap_time)
        
    return simulated_lap_times
