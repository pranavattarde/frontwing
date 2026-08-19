import sys
import os
import json
import dotenv

dotenv.load_dotenv('ai_services/.env')
sys.path.insert(0, 'ai_services')

from app.agents.nlp_parser import parse_semantic_query
from app.agents.planner import plan_node, execute_node
from app.core.entity_resolver import EntityResolver
from app.core.session_resolver import SessionResolver

def trace_query(q):
    print("="*70)
    print(f"INPUT QUERY: '{q}'")
    
    contract = parse_semantic_query(q)
    print(f"SEMANTIC CONTRACT: season={contract.get('season')}, gp={contract.get('grand_prix')}, drivers={contract.get('comparison_drivers')}, metric={contract.get('requested_metric')}")
    
    state = {'question': q}
    p = plan_node(state)
    state.update(p)
    
    plan_entities = (p.get("structured_plan") or {}).get("entities", {})
    plan_order = (p.get("structured_plan") or {}).get("execution_order", [])
    print(f"PLANNER ENTITIES: {plan_entities}")
    print(f"PLANNER EXECUTION ORDER: {plan_order}")
    
    resolved = EntityResolver.resolve(q, state)
    print(f"RESOLVED ENTITIES: {resolved}")
    
    e = execute_node(state)
    print(f"FINAL EXECUTION PARAMETERS: {state.get('intelligence_trace', {}).get('timelines', {}).get('parameters_sent', {})}")
    print(f"EXECUTED TOOLS: {e.get('tools_used')}")
    print("="*70 + "\n")

if __name__ == "__main__":
    trace_query("Compare Max and Charles at Monaco in 2024")
    trace_query("compare and give telemetry analysis of max and charles monaco gp lap timings")
    trace_query("Compare lap timings and delta analysis")
