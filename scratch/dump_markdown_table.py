import sys
sys.path.insert(0, "ai_services")
sys.stdout.reconfigure(encoding="utf-8")
from app.tools.adapters import TelemetryTool

tool = TelemetryTool()
res = tool.execute({'session_id': '2024_dutch_gp_race', 'driver_id': 'verstappen'})
deg = res['tyre_degradation']

print("| Lap | Stint | Compound | Pace Loss (s) | Wear (%) | Tag / Status |")
print("|:---:|:---:|:---:|:---:|:---:|:---|")
for r in deg:
    p_str = f"+{r['pace_loss_s']:.3f}s" if r['pace_loss_s'] is not None else "—"
    w_str = f"{r['wear_pct']:.1f}%" if r['wear_pct'] is not None else "—"
    note = r.get('note') or r.get('status') or "CLEAN"
    print(f"| {r['lap']} | {r['stint']} | {r['compound']} | {p_str} | {w_str} | {note} |")
