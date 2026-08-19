import sys
import os
import json
import time
import dotenv

dotenv.load_dotenv('ai_services/.env')
sys.path.insert(0, 'ai_services')
from app.agents.planner import plan_node, execute_node, synthesize_node

def run_query(question, conversation_state=None):
    time.sleep(2)
    state = {'question': question}
    if conversation_state:
        state.update(conversation_state)
        
    p = plan_node(state)
    state.update(p)
    e = execute_node(state)
    state.update(e)
    s = synthesize_node(state)
    state.update(s)
    return state

def run_verification():
    print("======================================================================")
    print("      FRONTWING TELEMETRY FINAL MANUAL VERIFICATION MATRIX           ")
    print("======================================================================\n")

    # 1. Normal Query Test
    print("--- 2. NORMAL FACTUAL QUERY TEST ---")
    q1 = "Who won the Monaco GP?"
    res1 = run_query(q1)
    print(f"Query: '{q1}'")
    print(f"Answer: {res1.get('final_answer')}")
    print(f"Tools Used: {res1.get('tools_used')}\n")

    # 2. Telemetry Query Test
    print("--- 3. TELEMETRY QUERY TEST ---")
    q2 = "Compare Verstappen and Norris telemetry at Silverstone."
    res2 = run_query(q2)
    print(f"Query: '{q2}'")
    print(f"Answer: {res2.get('final_answer')}")
    print(f"Tools Used: {res2.get('tools_used')}")
    telem = res2.get("evidence", {}).get("telemetry_tool", {})
    print(f"Driver A: {telem.get('driver_id')} ({len(telem.get('telemetry', []))} pts), Driver B: {telem.get('comparative_driver_id')} ({len(telem.get('comparative_telemetry', []))} pts)")
    print(f"Delta Lap: {telem.get('delta_lap_time_s')}s, Sector Times: {telem.get('sector_times')}\n")

    # 3. Lap Times Query Test
    print("--- 4. LAP TIMES QUERY TEST ---")
    q3 = "Compare the lap times of Verstappen and Norris at Silverstone."
    res3 = run_query(q3)
    print(f"Query: '{q3}'")
    print(f"Answer: {res3.get('final_answer')}")
    print(f"Tools Used: {res3.get('tools_used')}\n")

    # 4. Sector Times Query Test
    print("--- 5. SECTOR TIMES QUERY TEST ---")
    q4 = "Compare the sector times of Verstappen and Norris at Silverstone."
    res4 = run_query(q4)
    print(f"Query: '{q4}'")
    print(f"Answer: {res4.get('final_answer')}")
    print(f"Tools Used: {res4.get('tools_used')}\n")

    # 5. Standalone Pronoun Query Test (WITHOUT CONTEXT)
    print("--- 6. STANDALONE PRONOUN QUERY TEST (FRESH THREAD) ---")
    q5 = "Compare their sector times at Silverstone."
    res5 = run_query(q5)
    print(f"Query: '{q5}'")
    print(f"Answer: {res5.get('final_answer')}")
    print(f"Contract Drivers: {res5.get('semantic_contract', {}).get('comparison_drivers')}")
    print(f"Resolved Driver ID: {res5.get('evidence', {}).get('telemetry_tool', {}).get('driver_id')}\n")

    # 6. Multi-turn Telemetry Context Test
    print("--- 7. MULTI-TURN TELEMETRY CONTEXT TEST ---")
    mt_state = {}
    mt_q1 = "Compare Verstappen and Norris telemetry at Silverstone."
    mt_r1 = run_query(mt_q1)
    print(f"Q1: '{mt_q1}' -> Answer: {mt_r1.get('final_answer')}\n")

    mt_q2 = "Where did Verstappen gain time?"
    mt_r2 = run_query(mt_q2, conversation_state=mt_r1)
    print(f"Q2: '{mt_q2}' -> Answer: {mt_r2.get('final_answer')}\n")

    mt_q3 = "Which sector was Norris better in?"
    mt_r3 = run_query(mt_q3, conversation_state=mt_r2)
    print(f"Q3: '{mt_q3}' -> Answer: {mt_r3.get('final_answer')}\n")

    mt_q4 = "What about their speed?"
    mt_r4 = run_query(mt_q4, conversation_state=mt_r3)
    print(f"Q4: '{mt_q4}' -> Answer: {mt_r4.get('final_answer')}\n")

    # 7. Session Isolation Test
    print("--- 8. SESSION ISOLATION TEST (FRESH THREAD) ---")
    iso_q1 = "Who was third in the Chinese GP?"
    iso_r1 = run_query(iso_q1)
    print(f"Q1: '{iso_q1}' -> Answer: {iso_r1.get('final_answer')}\n")

    iso_q2 = "Who was second?"
    iso_r2 = run_query(iso_q2, conversation_state=iso_r1)
    print(f"Q2: '{iso_q2}' -> Answer: {iso_r2.get('final_answer')}\n")

if __name__ == "__main__":
    run_verification()
