import sys
sys.path.insert(0, "ai_services")
sys.stdout.reconfigure(encoding='utf-8')
import json
from app.tools.adapters import TelemetryTool

tool = TelemetryTool()
res = tool.execute({
    "session_id": "2024_dutch_gp_race",
    "driver_id": "verstappen",
    "comparative_driver_id": "norris"
})

print("Status:", res.get("status"))
print("Keys:", list(res.keys()))
comp_analysis = res.get("comparative_analysis", {})
print("Comparative Analysis Keys:", list(comp_analysis.keys()) if isinstance(comp_analysis, dict) else comp_analysis)
if comp_analysis:
    print(f"Faster Driver: {comp_analysis.get('faster_driver')} by {comp_analysis.get('lap_delta_s')}s")
    sec_breakdown = comp_analysis.get("sector_breakdown", {})
    print("\n--- Sector Breakdown ---")
    for s_name in ["S1", "S2", "S3"]:
        s_info = sec_breakdown.get(s_name, {})
        print(f"{s_name}: A={s_info.get('driver_a_time')}s, B={s_info.get('driver_b_time')}s, Delta={s_info.get('delta')}s, Faster={s_info.get('faster_driver')}, Badge='{s_info.get('winner_badge')}'")

print(f"\nHas Gear Data: {res.get('has_gear_data')}")
print(f"Lap Number Driver A: {res.get('lap_number')}, Lap Number Driver B: {res.get('comparative_lap_number')}")
print(f"Lap Time Driver A: {res.get('lap_time_s')}s, Lap Time Driver B: {res.get('comparative_lap_time_s')}s")

telemetry_a = res.get("speed_trace", [])
telemetry_b = res.get("comparative_speed_trace", [])
gears_a = [p.get("gear") for p in telemetry_a if p.get("gear") is not None]
gears_b = [p.get("gear") for p in telemetry_b if p.get("gear") is not None]
print(f"\nDriver A Gears sample (first 25): {gears_a[:25]}")
print(f"Driver A Distinct Gears: {sorted(list(set(gears_a)))}")
print(f"Driver B Gears sample (first 25): {gears_b[:25]}")
print(f"Driver B Distinct Gears: {sorted(list(set(gears_b)))}")
