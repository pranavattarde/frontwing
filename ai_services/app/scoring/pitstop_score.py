def calculate_pitstop_score(data: dict) -> float:
    """Calculates Pit Stop Score separating crew wheel change time

    from driver pit lane entry/exit transit execution.
    """
    pit_stops = data.get("pit_stops", [])
    t_opt_stationary = 2.0  # optimal benchmark stationary time
    t_opt_lane = data.get("t_pit_lane_opt", 20.80)  # fastest recorded pit lane transit

    valid_stops = 0
    total_stop_score = 0.0

    for stop in pit_stops:
        if stop.get("is_forced_stop", False):
            continue
            
        t_stationary = stop.get("t_stationary", 2.0)
        t_lane = stop.get("t_pit_lane", 20.80)

        # 1. Stationary Factor (SF) - Crew Wheel Change
        sf = 1.0 - ((t_stationary - t_opt_stationary) / t_opt_stationary)
        sf = max(0.0, sf)

        # 2. Lane Factor (LF) - Driver Entry/Exit Transit
        lf = 1.0 - ((t_lane - t_opt_lane) / t_opt_lane)
        lf = max(0.0, lf)

        stop_score = 0.5 * sf + 0.5 * lf
        total_stop_score += stop_score
        valid_stops += 1

    if valid_stops > 0:
        score = (total_stop_score / valid_stops) * 100.0
    else:
        score = 100.0

    return round(score, 2)
