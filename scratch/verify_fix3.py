import sys
import os
sys.path.insert(0, os.path.abspath("."))
import time
import json
from app.core.config import Settings
_settings = Settings()
from app.core.providers import GroqProvider
from app.prompts.loader import load_prompt

def verify_fix3():
    print("=== Testing FIX 3: Groq Planning for Telemetry Comparison Intent ===")
    groq = GroqProvider()
    system_prompt = load_prompt("planning")
    user_content = "User question: compare verstappen and norris at bahrain\nClassified Intent: comparison\n\nSession ID: None\nDriver ID: None"
    
    for run in range(1, 4):
        start = time.time()
        plan, metrics = groq.generate_plan(
            system_instruction=system_prompt,
            contents=user_content,
            timeout_seconds=30.0
        )
        duration = time.time() - start
        print(f"\n[Run {run}/3] Duration: {duration:.2f}s | Latency: {metrics.get('llm_latency')}ms")
        print(f"Plan JSON: {json.dumps(plan, indent=2)}")
        
        assert isinstance(plan, dict), f"Run {run}: Plan must be a dictionary!"
        assert plan.get("intent") in ("comparison", "telemetry", "telemetry_comparison"), f"Run {run}: Unexpected intent {plan.get('intent')}"
        drivers = plan.get("entities", {}).get("drivers", [])
        assert "verstappen" in [d.lower() for d in (drivers or [])], f"Run {run}: 'verstappen' must be in extracted drivers!"
        print(f"[Run {run}/3] PASS - Valid JSON plan parsed successfully with zero validation errors.")
        
    print("\n[SUCCESS] FIX 3 verified: Groq planning succeeded 3/3 times consecutively for telemetry_comparison!")

if __name__ == "__main__":
    verify_fix3()
