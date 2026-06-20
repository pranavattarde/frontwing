def calculate_strategy_score(data: dict) -> float:
    """Calculates Strategy Score based on Clean Air Ratio (CAR),

    Strategic Position Gain (SPG), and Tire Stint Efficiency (TSE).
    """
    total_laps = data.get("total_laps", 1)
    sc_laps = data.get("sc_laps", 0)
    clean_air_laps = data.get("clean_air_laps", 0)
    
    # 1. Clean Air Ratio (CAR)
    den = total_laps - sc_laps
    car = (clean_air_laps / den * 100) if den > 0 else 100.0
    car = max(0.0, min(100.0, car))

    # 2. Strategic Position Gain (SPG)
    pit_stops = data.get("pit_stops", [])
    net_position_gain = 0
    valid_stops = 0
    for stop in pit_stops:
        if not stop.get("is_forced_stop", False):
            # Subtract on-track overtakes to isolate strategic pit/undercut gains from driver moves
            gain = stop.get("position_before", 0) - stop.get("position_after", 0)
            overtakes = stop.get("overtakes_on_track", 0)
            net_position_gain += (gain - overtakes)
            valid_stops += 1
            
    spg = 50.0 + 10.0 * net_position_gain
    spg = max(0.0, min(100.0, spg))

    # 3. Tire Stint Efficiency (TSE)
    stints = data.get("stints", [])
    valid_stint_count = 0
    total_stint_deduction = 0.0
    
    for stint in stints:
        if not stint.get("is_forced", False):
            stint_len = stint.get("length", 0)
            opt_len = stint.get("optimal_length", 1)
            if opt_len > 0:
                deduction = (abs(stint_len - opt_len) / opt_len) * 100.0
                total_stint_deduction += deduction
                valid_stint_count += 1
                
    if valid_stint_count > 0:
        avg_deduction = total_stint_deduction / valid_stint_count
        tse = 100.0 - avg_deduction
    else:
        tse = 100.0
        
    tse = max(0.0, min(100.0, tse))

    # Combined strategy score
    score = 0.4 * car + 0.4 * spg + 0.2 * tse
    return round(score, 2)
