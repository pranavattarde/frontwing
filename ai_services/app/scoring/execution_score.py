def calculate_execution_score(data: dict) -> float:
    """Calculates Race Execution Score penalizing penalties, warnings, and lockups,
    while rewarding grid progression and front-runner retention.
    """
    penalties = data.get("penalties_count", 0)
    warnings = data.get("warnings_count", 0)
    lockups = data.get("lockups_count", 0)
    
    p_start = data.get("p_start", 1)
    p_finish = data.get("p_finish", 1)
    
    # 1. Progression: Gaining positions from starting grid
    progression = max(0.0, 2.0 * (p_start - p_finish))
    
    # 2. Retention: Maintaining top 10 positions when starting high (avoids Winner's Penalty)
    retention = 0.0
    if p_finish <= p_start and p_finish <= 10:
        retention = 2.0 * (11 - p_finish)
        
    ppf = progression + retention
    
    score = 80.0 - 15.0 * penalties - 5.0 * warnings - 5.0 * lockups + ppf
    score = max(0.0, min(100.0, score))
    
    return round(score, 2)
