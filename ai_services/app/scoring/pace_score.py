def calculate_pace_score(data: dict) -> float:
    """Calculates Pace Efficiency Score based on Consistency and SpeedMargin."""
    driver_mean = data.get("driver_clean_laps_mean", 0.0)
    driver_std = data.get("driver_clean_laps_std", 0.0)
    
    # 1. Consistency
    std_limit = 1.5
    consistency = max(0.0, min(1.0, 1.0 - (driver_std / std_limit)))

    # 2. Speed Margin
    # Machine potential is the faster of driver's own peak or teammate's peak clean lap
    driver_opt = data.get("driver_optimal_lap", 0.0)
    teammate_opt = data.get("teammate_optimal_lap")
    
    if driver_opt and driver_opt > 0 and teammate_opt and teammate_opt > 0:
        l_optimal = min(driver_opt, teammate_opt)
    elif driver_opt and driver_opt > 0:
        l_optimal = driver_opt
    else:
        l_optimal = driver_mean if driver_mean > 0 else 0.0
        
    delta_limit = 2.0
    if l_optimal > 0 and driver_mean > 0:
        speed_margin = max(0.0, min(1.0, 1.0 - ((driver_mean - l_optimal) / delta_limit)))
    else:
        speed_margin = consistency

    # Combined score
    score = 50.0 * consistency + 50.0 * speed_margin
    return round(score, 2)

