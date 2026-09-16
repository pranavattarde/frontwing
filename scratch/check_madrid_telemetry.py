import os
import pathlib
import fastf1
import numpy as np

project_root = pathlib.Path(__file__).resolve().parent.parent
cache_dir = project_root / "ai_services" / "cache"
fastf1.Cache.enable_cache(str(cache_dir))

print(f"FastF1 cache enabled at: {cache_dir}")
session = fastf1.get_session(2026, 14, 'R')
print(f"Loading session: {session.event['EventName']} at {session.event['Location']}")
session.load(telemetry=True, laps=True, weather=False)

print(f"Laps loaded: {len(session.laps)}")
fastest_lap = session.laps.pick_fastest()
print(f"Fastest lap: {fastest_lap['Driver']} - {fastest_lap['LapTime']}")
pos = fastest_lap.get_pos_data()
print(f"Pos data points: {len(pos) if pos is not None else 0}")
if pos is not None and len(pos) > 0:
    print("Pos sample:")
    print(pos[['X', 'Y', 'Z']].head())
telem = fastest_lap.get_telemetry()
print(f"Telemetry points: {len(telem) if telem is not None else 0}")
if 'X' in telem.columns and 'Y' in telem.columns:
    print("Telemetry X, Y sample:")
    print(telem[['X', 'Y', 'Z']].head())
