import sys
import os
import json
import dotenv

dotenv.load_dotenv('ai_services/.env')
os.environ["DISABLE_LLM_PROVIDER"] = "1"
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
    print(f"================================================================================")
    print(f"QUERY #{idx}: {q}")
    print(f"================================================================================")
    
    # NLP Parser & Semantic Contract
    contract = parse_semantic_query(q)
    print(f"A. Raw query: '{q}'")
    print(f"B. NLP parser output: {contract}")
    print(f"C. SemanticQueryContract: {contract}")
    print(f"D. intent: {contract.get('intent')}")
    print(f"E. requested_metric: {contract.get('requested_metric')}")
    
    # Planner
    state_in = {"question": q, "semantic_contract": contract}
    plan_out = plan_node(state_in)
    print(f"F. required_evidence: {plan_out.get('required_evidence')}")
    print(f"G. planner selected tools: {plan_out.get('tools')}")
    print(f"H. planner parameters: {plan_out.get('parameters')}")
    
    # End-to-end execution
    res = run_ai_race_engineer(q)
    report = res.get("investigation_report", {})
    evidence = res.get("evidence", {})
    trace = res.get("intelligence_trace", {})
    
    print(f"I. entity resolver output: {res.get('entities_found') or plan_out.get('entities')}")
    print(f"J. session resolver output: {res.get('resolved_session_id') or res.get('session_id')}")
    print(f"K. exact tools executed: {plan_out.get('tools')}")
    print(f"L. exact tool inputs: {plan_out.get('parameters')}")
    print(f"M. exact tool outputs summary: {json.dumps({k: (v.get('status') if isinstance(v, dict) else str(v)) for k,v in evidence.items()}, indent=2)}")
    print(f"N. evidence object keys after execution: {list(evidence.keys())}")
    print(f"O. synthesizer branch selected: provider={trace.get('llm_provider')}, model={trace.get('llm_model')}")
    print(f"P. exact executive summary source:\n{report.get('Executive Summary')}")
    print(f"--------------------------------------------------------------------------------\n")

