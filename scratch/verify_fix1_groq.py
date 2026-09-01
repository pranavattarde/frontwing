import os
import sys
sys.path.insert(0, os.path.abspath("."))
from app.core.providers import GroqProvider

def verify_fix1_groq():
    print("=== Testing FIX 1: openai/gpt-oss-120b Groq Provider ===")
    provider = GroqProvider()
    
    queries = [
        ("Planning Test", "You are the Lead F1 Adaptive Planner Agent. Return valid JSON only: {\"intent\": \"comparison\", \"entities\": {\"drivers\": [\"leclerc\", \"sainz\"]}}", "Compare Leclerc and Sainz qualifying at Monza"),
        ("Synthesis Test", "You are an F1 Aerodynamics Engineer.", "Explain how ground effect floors generate downforce.")
    ]
    
    for label, sys_p, user_p in queries:
        print(f"\n--- {label}: {user_p} ---")
        if "Planning" in label:
            plan, met = provider.generate_plan(sys_p, user_p)
            print(f"Plan: {plan}")
            print(f"Model: {met.get('llm_model')}, Latency: {met.get('llm_latency')}ms")
            assert met.get("llm_model") == "openai/gpt-oss-120b"
            assert isinstance(plan, dict)
        else:
            resp, met = provider.generate_response(sys_p, user_p)
            print(f"Response Preview: {resp[:120].encode('ascii', 'replace').decode('ascii')}...")
            print(f"Model: {met.get('llm_model')}, Latency: {met.get('llm_latency')}ms")
            assert met.get("llm_model") == "openai/gpt-oss-120b"
            assert len(resp) > 20
            
    print("\n[SUCCESS] FIX 1 verified: openai/gpt-oss-120b works for planning and synthesis!")

if __name__ == "__main__":
    verify_fix1_groq()
