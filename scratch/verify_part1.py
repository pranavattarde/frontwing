import sys
import os
import json
import time
import dotenv

dotenv.load_dotenv('ai_services/.env')
sys.path.insert(0, 'ai_services')
from app.agents.planner import plan_node, execute_node, synthesize_node

def run_query(question):
    state = {'question': question}
    p = plan_node(state)
    state.update(p)
    e = execute_node(state)
    state.update(e)
    s = synthesize_node(state)
    state.update(s)
    return state

print("--- 2. NORMAL FACTUAL QUERY TEST ---")
r1 = run_query("Who won the Monaco GP?")
print(f"Q: Who won the Monaco GP?")
print(f"A: {r1.get('final_answer')}")
print(f"Tools: {r1.get('tools_used')}\n")

time.sleep(5)

print("--- 3. TELEMETRY QUERY TEST ---")
r2 = run_query("Compare Verstappen and Norris telemetry at Silverstone.")
print(f"Q: Compare Verstappen and Norris telemetry at Silverstone.")
print(f"A: {r2.get('final_answer')}")
print(f"Tools: {r2.get('tools_used')}")
telem = r2.get("evidence", {}).get("telemetry_tool", {})
print(f"Driver A: {telem.get('driver_id')} ({len(telem.get('telemetry', []))} pts)")
print(f"Driver B: {telem.get('comparative_driver_id')} ({len(telem.get('comparative_telemetry', []))} pts)")
print(f"Delta Lap Time: {telem.get('delta_lap_time_s')}s")
print(f"Sector Times: {telem.get('sector_times')}\n")

time.sleep(5)

print("--- 4. LAP TIMES QUERY TEST ---")
r3 = run_query("Compare the lap times of Verstappen and Norris at Silverstone.")
print(f"Q: Compare the lap times of Verstappen and Norris at Silverstone.")
print(f"A: {r3.get('final_answer')}")
print(f"Tools: {r3.get('tools_used')}\n")

time.sleep(5)

print("--- 5. SECTOR TIMES QUERY TEST ---")
r4 = run_query("Compare the sector times of Verstappen and Norris at Silverstone.")
print(f"Q: Compare the sector times of Verstappen and Norris at Silverstone.")
print(f"A: {r4.get('final_answer')}")
print(f"Tools: {r4.get('tools_used')}\n")
