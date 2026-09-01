import os
import sys
sys.path.insert(0, os.path.abspath("."))
import time
from unittest.mock import patch
from app.core.providers import ReliableLLMProvider
from app.agents.planner import run_ai_race_engineer

def verify_fix2_call_counts():
    print("=== Testing FIX 2: LLM Call Count Efficiency Per Query Type ===")
    
    os.environ["LLM_CACHE_ENABLED"] = "false" # Test cold calls
    
    queries = [
        ("race_result", "Who won the 2024 Qatar Grand Prix?"),
        ("telemetry_comparison", "Compare lap timings and delta analysis for Verstappen and Norris at Qatar GP"),
        ("knowledge", "Explain what aerodynamic dirty air is in Formula 1"),
        ("scoring", "How did Verstappen perform at Qatar GP?"),
        ("simulation", "What if Verstappen pitted on lap 30 at Qatar GP?")
    ]
    
    for qtype, question in queries:
        llm_calls = 0
        from app.core.providers import reliable_llm_provider
        
        orig_plan = reliable_llm_provider.generate_plan
        orig_resp = reliable_llm_provider.generate_response
        
        def mock_plan(*args, **kwargs):
            nonlocal llm_calls
            llm_calls += 1
            return orig_plan(*args, **kwargs)
            
        def mock_resp(*args, **kwargs):
            nonlocal llm_calls
            llm_calls += 1
            return orig_resp(*args, **kwargs)
            
        with patch.object(reliable_llm_provider, "generate_plan", side_effect=mock_plan), \
             patch.object(reliable_llm_provider, "generate_response", side_effect=mock_resp):
            
            start_t = time.time()
            res = run_ai_race_engineer(question)
            dur = time.time() - start_t
            
            print(f"\n[{qtype.upper()}] Query: '{question}'")
            print(f"Total LLM Calls: {llm_calls} (Duration: {dur:.2f}s)")
            print(f"Tools Used: {res.get('tools_used', [])}")
            print(f"Answer Preview: {res.get('final_answer', '')[:100]}...")
            
            assert llm_calls <= 2, f"Expected at most 2 LLM calls for {qtype}, got {llm_calls}"
            
    print("\n[SUCCESS] FIX 2 verified: All query types execute with <= 2 LLM calls (reduced from 3)!")

if __name__ == "__main__":
    verify_fix2_call_counts()
