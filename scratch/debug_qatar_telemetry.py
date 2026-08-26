import sys
import os
import json
import dotenv

dotenv.load_dotenv('ai_services/.env')
sys.path.insert(0, os.path.abspath('ai_services'))

from app.tools.adapters import TelemetryTool

tool = TelemetryTool()

payload = {
    "driver_id": "max verstappen",
    "comparative_driver_id": "hamilton",
    "session_id": "2024_qatar_gp_race",
    "grand_prix": "Qatar GP"
}

print("=== EXACT INPUT ===")
print(json.dumps(payload, indent=2))

res = tool.execute(payload)
print("\n=== TELEMETRY TOOL RETURN VALUES ===")
print(f"Status: {res.get('status')}")
print(f"Session ID: {res.get('session_id')}")
print(f"Grand Prix: {res.get('grand_prix')}")
print(f"Driver A ({res.get('driver_id')}): lap_time={res.get('lap_time_s')}, pts={len(res.get('telemetry', []))}")
print(f"Driver B ({res.get('comparative_driver_id')}): lap_time={res.get('comparative_lap_time_s')}, pts={len(res.get('comparative_telemetry', []))}")
print(f"Delta Lap Time (s): {res.get('delta_lap_time_s')}")
print(f"Sector Times: {json.dumps(res.get('sector_times'), indent=2)}")
