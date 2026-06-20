from typing import List, Dict

def get_pit_lane_loss(session_data: dict, driver_id: str = None) -> float:
    """Returns the total pit stop loss time (pit lane transit + stationary service)."""
    # Try to find optimized time from session metadata, defaulting to 22.0 seconds
    t_opt_lane = session_data.get("t_pit_lane_opt", 20.80)
    
    # We assume a standard pit stop stationary time of 2.5 seconds
    t_stationary = 2.5
    
    # Total pit loss is optimal lane transit + stationary time
    # If the track has specific lane transit, use it
    return t_opt_lane + t_stationary

def adjust_stints_for_simulated_stop(
    original_stints: List[Dict],
    simulated_pit_lap: int,
    target_compound: str = None,
    total_laps: int = 71
) -> List[Dict]:
    """Reconstructs the strategy stints by shifting a pit stop to a new lap.
    
    If the target driver has multiple stints, this adjusts the first stop to happen on
    simulated_pit_lap and shifts the subsequent stints accordingly.
    """
    if not original_stints:
        # If no stints exist, create a default 2-stint strategy
        comp = target_compound or "HARD"
        return [
            {"compound": "MEDIUM", "start_lap": 1, "end_lap": simulated_pit_lap},
            {"compound": comp.upper(), "start_lap": simulated_pit_lap + 1, "end_lap": total_laps}
        ]
        
    # Copy stints to avoid mutating inputs
    stints = [dict(s) for s in original_stints]
    
    # Find the stint that contains the simulated_pit_lap
    # Or, if there is only 1 stint, split it.
    if len(stints) == 1:
        comp = target_compound or "HARD"
        old_end = stints[0]["end_lap"] or total_laps
        stints[0]["end_lap"] = simulated_pit_lap
        stints.append({
            "compound": comp.upper(),
            "start_lap": simulated_pit_lap + 1,
            "end_lap": old_end
        })
        return stints

    # If there are multiple stints, we shift the boundary between Stint 1 and Stint 2
    # to simulated_pit_lap
    stints[0]["end_lap"] = simulated_pit_lap
    stints[1]["start_lap"] = simulated_pit_lap + 1
    
    if target_compound:
        stints[1]["compound"] = target_compound.upper()
        
    # Ensure subsequent stints preserve their length or are shifted
    # Let's shift subsequent stint boundaries:
    for i in range(1, len(stints) - 1):
        stint_len = stints[i]["end_lap"] - stints[i]["start_lap"] + 1
        stints[i]["end_lap"] = stints[i]["start_lap"] + stint_len - 1
        stints[i+1]["start_lap"] = stints[i]["end_lap"] + 1
        
    # The final stint always ends on the total laps of the race
    stints[-1]["end_lap"] = total_laps
    
    # Filter out any stints that have collapsed (start_lap > end_lap)
    valid_stints = []
    for s in stints:
        if s["start_lap"] <= s["end_lap"]:
            valid_stints.append(s)
        else:
            # Shift starting lap of next stint back if we deleted this one
            pass
            
    # Re-index start/end laps to make sure they are sequential and cover [1, total_laps]
    current_lap = 1
    for s in valid_stints:
        s["start_lap"] = current_lap
        if s == valid_stints[-1]:
            s["end_lap"] = total_laps
        current_lap = s["end_lap"] + 1
        
    return valid_stints
