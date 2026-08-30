import sys
import os
sys.path.insert(0, os.path.abspath("."))
import time
from app.core.config import Settings
_settings = Settings()
from app.core.providers import GroqProvider

def verify_fix2():
    print("=== Testing FIX 2: Groq Synthesis Timeout & Consecutive Execution ===")
    groq = GroqProvider()
    
    queries = [
        ("What is DRS?", "Explain the DRS concept for an F1 driver."),
        ("What is understeer?", "Explain understeer vs oversteer."),
        ("Explain tire degradation", "Explain tire compound degradation in Formula 1."),
        ("What is an undercut?", "Explain the undercut pit strategy."),
        ("Explain Safety Car rules", "Explain delta times during Safety Car periods.")
    ]
    
    for i, (topic, prompt) in enumerate(queries, 1):
        start = time.time()
        res, metrics = groq.generate_response(
            system_instruction="You are an expert F1 race engineer. Provide a concise 2-sentence technical answer.",
            contents=prompt,
            timeout_seconds=30.0
        )
        duration = time.time() - start
        print(f"\n[Query {i}/5] '{topic}' | Duration: {duration:.2f}s | Latency: {metrics.get('llm_latency')}ms")
        print(f"Response Preview: {res.strip()[:120]}...")
        assert len(res.strip()) > 0, f"Query {i} returned empty response!"
        
    print("\n[SUCCESS] FIX 2 verified: All 5 consecutive Groq synthesis calls completed cleanly without timeout or disconnect!")

if __name__ == "__main__":
    verify_fix2()
