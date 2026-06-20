import numpy as np
from typing import Dict, List, Tuple

# Default compound offsets relative to MEDIUM
COMPOUND_OFFSETS = {
    "SOFT": -0.50,
    "MEDIUM": 0.00,
    "HARD": 0.80,
    "INTERMEDIATE": 2.50,
    "WET": 5.00
}

# Fallback degradation rates (seconds per lap of age)
DEFAULT_DEG_RATES = {
    "SOFT": 0.12,
    "MEDIUM": 0.08,
    "HARD": 0.05,
    "INTERMEDIATE": 0.15,
    "WET": 0.20
}

def fit_tire_parameters(clean_laps: List[Dict]) -> Tuple[float, float]:
    """Fits base pace (alpha) and degradation rate (beta) from actual clean laps.
    
    clean_laps should be a list of dicts, e.g. [{"lap_number": 5, "lap_time": 71.2, "tire_age": 5}]
    """
    if len(clean_laps) < 3:
        # Not enough data to fit, return standard fallbacks
        return 70.0, 0.08

    ages = np.array([lap["tire_age"] for lap in clean_laps])
    times = np.array([lap["lap_time"] for lap in clean_laps])
    lap_numbers = np.array([lap["lap_number"] for lap in clean_laps])

    # Fuel weight correction: deduct 0.06s per lap of fuel burn
    # Corrected time = lap_time + 0.06 * lap_number (to isolate tire wear)
    corrected_times = times + 0.06 * lap_numbers

    # Fit linear regression: corrected_time = alpha + beta * age
    slope, intercept = np.polyfit(ages, corrected_times, 1)
    
    # Ensure degradation slope is non-negative to remain physically sound
    beta = max(0.001, slope)
    alpha = intercept

    return alpha, beta

def get_tire_parameters_for_driver(
    driver_laps: List[Dict],
    target_compound: str,
    grid_median_deg: Dict[str, float] = None
) -> Tuple[float, float]:
    """Retrieves or estimates tire parameters (alpha, beta) for a target compound and driver."""
    target_compound = target_compound.upper()
    
    # 1. Filter laps by compound to see if driver ran it
    actual_laps_on_target = [lap for lap in driver_laps if lap.get("compound", "").upper() == target_compound and not lap.get("is_pit_out_lap", False)]
    
    if len(actual_laps_on_target) >= 3:
        return fit_tire_parameters(actual_laps_on_target)
        
    # 2. If target compound was not run, find another compound run by this driver to estimate base pace (alpha)
    other_compounds = list(set([lap.get("compound", "").upper() for lap in driver_laps if lap.get("compound")]))
    
    base_alpha = None
    for other in other_compounds:
        other_laps = [lap for lap in driver_laps if lap.get("compound", "").upper() == other and not lap.get("is_pit_out_lap", False)]
        if len(other_laps) >= 3:
            alpha_other, _ = fit_tire_parameters(other_laps)
            # Estimate alpha for target compound using relative compound offsets
            offset_other = COMPOUND_OFFSETS.get(other, 0.00)
            offset_target = COMPOUND_OFFSETS.get(target_compound, 0.80)
            base_alpha = alpha_other - offset_other + offset_target
            break
            
    if base_alpha is None:
        # Fallback if no clean stints are found
        if driver_laps:
            base_alpha = np.mean([lap["lap_time"] for lap in driver_laps])
        else:
            base_alpha = 70.0 # general baseline
            
    # 3. Retrieve degradation rate (beta) from grid median or default fallbacks
    if grid_median_deg and target_compound in grid_median_deg:
        beta = grid_median_deg[target_compound]
    else:
        beta = DEFAULT_DEG_RATES.get(target_compound, 0.08)
        
    return base_alpha, beta

def project_natural_lap_time(
    alpha: float,
    beta: float,
    tire_age: int,
    lap_number: int
) -> float:
    """Projects the clean-air natural lap time based on fitted parameters and fuel burn."""
    # Lap time = alpha + beta * age - 0.06 * lap_number
    return alpha + beta * tire_age - 0.06 * lap_number
