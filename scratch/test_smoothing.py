import numpy as np

def test_smoothing_methods(laps, fc_deltas):
    # Method 1: Isotonic regression (strictly monotonic non-decreasing)
    from sklearn.isotonic import IsotonicRegression
    ir = IsotonicRegression(increasing=True, out_of_bounds='clip')
    iso_fit = ir.fit_transform(laps, fc_deltas)
    
    # Method 2: Monotonic-leaning Exponential Moving Average / Cumulative Max blend
    # e.g., smooth with rolling window (size 3) and apply max with previous value * decay factor
    ema = []
    curr = 0.0
    for v in fc_deltas:
        v_non_neg = max(0.0, v)
        # Monotonic leaning: allow slight dip (noise) but heavily weight non-decreasing trend
        curr = max(curr * 0.95, v_non_neg)
        ema.append(curr)
        
    # Method 3: Low-degree polynomial fit (e.g. robust quadratic or linear + exponential degradation)
    # Physical tyre degradation is typically linear-to-quadratic: deg(t) = a * t + b * t^2
    ages = np.array(laps) - laps[0]
    # Constrain slope >= 0
    p = np.polyfit(ages, fc_deltas, 1) # linear degradation slope
    linear_fit = np.maximum(0.0, p[0] * ages + max(0.0, p[1]))
    
    # Method 4: Rolling window smoothed + monotonic lower bound
    # A rolling mean of size 3, clamped to >= 0 and non-decreasing with previous
    smoothed = []
    prev = 0.0
    for i in range(len(fc_deltas)):
        window = fc_deltas[max(0, i-1):min(len(fc_deltas), i+2)]
        mean_val = float(np.mean(window))
        # Monotonic-leaning: can't drop more than 5% below previous clean point
        clamped = max(0.0, mean_val)
        val = max(prev * 0.98, clamped)
        prev = val
        smoothed.append(round(val, 3))
        
    return iso_fit, ema, linear_fit, smoothed

print("Testing smoothing methods imported successfully")
