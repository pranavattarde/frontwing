import numpy as np

def calculate_tire_score(data: dict) -> float:
    """Calculates Tire Management Score based on clean stint tire wear slopes

    compared against the grid median.
    """
    stints = data.get("stints", [])
    stint_scores = []
    
    for stint in stints:
        # Exclude Intermediates/Wets or forced/aborted stints
        compound = stint.get("compound", "MEDIUM").upper()
        if compound in ["INTERMEDIATE", "WET"] or stint.get("is_forced", False):
            continue
            
        # Extract clean lap times and tire ages
        lap_times = stint.get("clean_laps_times", [])
        if len(lap_times) < 3:
            # Short stint, set to neutral score
            stint_scores.append(100.0)
            continue
            
        # Calculate regression slope (lap times vs. tire age index)
        # Tire age is represented by 1-indexed lap position in stint
        ages = np.arange(1, len(lap_times) + 1)
        
        # Apply fuel correction offset: we deduct 0.06 seconds per lap of fuel decay
        # so fuel-corrected time is: lap_time + 0.06 * age (to isolate tire wear increase)
        corrected_laps = np.array(lap_times) + 0.06 * ages
        
        # Linear regression slope: cov(x, y) / var(x)
        slope_driver = np.polyfit(ages, corrected_laps, 1)[0]
        
        # Compare to grid median slope for this compound
        # Mock grids can supply this value directly in 'grid_median_deg' dict
        grid_median_deg = data.get("grid_median_deg", {})
        slope_grid_median = grid_median_deg.get(compound, 0.080)
        
        if slope_grid_median <= 0:
            # Avoid division by zero or negative grid slope anomalies
            stint_score = 100.0
        elif slope_driver <= slope_grid_median:
            stint_score = 100.0
        else:
            rel_diff = (slope_driver - slope_grid_median) / slope_grid_median
            stint_score = 100.0 * (1.0 - rel_diff)
            
        stint_score = max(0.0, min(100.0, stint_score))
        stint_scores.append(stint_score)

    if len(stint_scores) > 0:
        score = sum(stint_scores) / len(stint_scores)
    else:
        score = 100.0
        
    return round(score, 2)
