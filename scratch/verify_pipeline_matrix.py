import sys
import os
import json
import dotenv

dotenv.load_dotenv('ai_services/.env')
sys.path.insert(0, 'ai_services')

from app.agents.nlp_parser import parse_semantic_query
from app.core.entity_resolver import EntityResolver
from app.core.session_resolver import SessionResolver

def test_q(q):
    print("="*70)
    print(f"QUERY: '{q}'")
    contract = parse_semantic_query(q)
    entities = contract.get("entities", {})
    drivers = contract.get("comparison_drivers") or ([entities.get("driver")] if entities.get("driver") else [])
    
    print(f"1. SEMANTIC CONTRACT:")
    print(f"   Intent: {contract.get('intent')}")
    print(f"   Metric: {contract.get('requested_metric')}")
    print(f"   Grand Prix: {entities.get('grand_prix')}")
    print(f"   Season: {entities.get('season')}")
    print(f"   Drivers: {drivers}")
    
    sess_res = SessionResolver.resolve_session(
        grand_prix=entities.get("grand_prix"),
        season=entities.get("season")
    )
    print(f"2. SESSION RESOLUTION:")
    print(f"   Status: {sess_res.get('status')}")
    print(f"   Session ID: {sess_res.get('session_id')}")
    print(f"   Season: {sess_res.get('season')}")
    
    # Contract validation check for telemetry comparison
    if contract.get("requested_metric") == "telemetry_comparison" or contract.get("intent") in ("telemetry_comparison", "comparison"):
        if len(drivers) < 2:
            print("3. CONTRACT VALIDATION: FAILED (Incomplete telemetry comparison -> Clarification Triggered)")
        else:
            print("3. CONTRACT VALIDATION: PASSED")
    else:
        print("3. CONTRACT VALIDATION: PASSED")
    print("="*70 + "\n")

if __name__ == "__main__":
    print("RUNNING VERIFICATION MATRIX FOR QUERY RESOLUTION & PARAMETER INTEGRITY\n")
    test_q("Who won Monaco in 2024?")
    test_q("Who won Monaco in 2026?")
    test_q("Who won Monaco?")
    test_q("Compare Max and Charles at Monaco in 2024.")
    test_q("Compare lap timings and delta analysis")
    test_q("Who won in Sao Paulo?")
    test_q("Who finished third in china?")
