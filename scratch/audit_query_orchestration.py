import sys
import os
import json
import dotenv

dotenv.load_dotenv('ai_services/.env')
os.environ["DISABLE_LLM_PROVIDER"] = "1"
os.environ["GEMINI_API_KEY"] = ""
os.environ["GROQ_API_KEY"] = ""
sys.path.insert(0, os.path.abspath('ai_services'))

from app.core.providers import reliable_llm_provider
reliable_llm_provider.gemini_client = None
reliable_llm_provider.groq_client = None


from app.agents.nlp_parser import parse_semantic_query
from app.agents.planner import run_ai_race_engineer, plan_node

queries = [
    "What is understeer in F1?",
    "What is fastest lap?",
    "Explain the difference between soft and hard tyres.",
    "Compare lap timings of Verstappen and Hamilton at Qatar GP"
]

for idx, q in enumerate(queries, 1):
    print(f"\n================================================================================")
    print(f" AUDIT QUERY #{idx}: '{q}'")
    print(f"================================================================================")
    
    # 1. NLP Parser
    contract = parse_semantic_query(q)
    print(f"\n--- B-E. NLP PARSER / SEMANTIC QUERY CONTRACT ---")
    print(f"Intent: {contract.get('intent')}")
    print(f"Requested Metric: {contract.get('requested_metric')}")
    print(f"Requested Position: {contract.get('requested_position')}")
    print(f"Requested Driver: {contract.get('requested_driver')}")
    print(f"Requested Team: {contract.get('requested_team')}")
    print(f"Entities: {contract.get('entities')}")
    print(f"Comparison Drivers: {contract.get('comparison_drivers')}")
    
    # 2. Planner Node
    state_in = {"question": q, "semantic_contract": contract}
    plan_out = plan_node(state_in)
    print(f"\n--- F-H. PLANNER ORDER ---")
    print(f"Intent: {plan_out.get('intent')}")
    print(f"Required Evidence: {plan_out.get('required_evidence')}")
    print(f"Missing Evidence: {plan_out.get('missing_evidence')}")
    print(f"Tools: {plan_out.get('tools')}")
    print(f"Parameters: {plan_out.get('parameters')}")
    print(f"Execution Order: {plan_out.get('execution_order')}")
    
    # 3. Full End-to-End Execution via run_ai_race_engineer
    print(f"\n--- I-P. END-TO-END EXECUTION VIA RUN_AI_RACE_ENGINEER ---")
    result = run_ai_race_engineer(q)
    
    report = result.get("investigation_report", {})
    evidence = result.get("evidence", {})
    trace = result.get("intelligence_trace", {})
    
    print(f"Synthesizer Branch / Model: {trace.get('llm_provider')} / {trace.get('llm_model')}")
    print(f"Failover Reason: {trace.get('failover_reason')}")
    print(f"Executive Summary:\n{report.get('Executive Summary')}")
    print(f"Confidence: {report.get('Confidence')}")
    print(f"Evidence Keys Returned: {list(evidence.keys())}")
    for k, v in evidence.items():
        if isinstance(v, dict):
            status = v.get("status")
            err = v.get("error")
            sess = v.get("session_id")
            print(f"  - Tool '{k}': status={status}, session_id={sess}, keys={list(v.keys())[:8]}, error={err}")
        else:
            print(f"  - Tool '{k}': {type(v)}")

