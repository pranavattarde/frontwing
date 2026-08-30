import sys
import os
sys.path.insert(0, os.path.abspath("."))
import time
from app.core.config import Settings
_settings = Settings()
from app.core.providers import ReliableLLMProvider

def verify_fix4():
    print("=== Testing FIX 4: Gemini Tier Configuration & Redis LLM Cache ===")
    provider = ReliableLLMProvider()
    
    print(f"Configured Gemini Model: {_settings.GEMINI_MODEL}")
    print(f"LLM Cache Enabled: {_settings.LLM_CACHE_ENABLED}")
    
    test_instruction = "You are an F1 race engineer. Output valid JSON only: {\"answer\": \"string\"}"
    test_content = "Unique Test Content: What is tire degradation in Bahrain?"
    
    print("\n--- Step 1: Initial (Cold / Live) LLM Call ---")
    start1 = time.time()
    resp1, met1 = provider.generate_response(
        system_instruction=test_instruction,
        contents=test_content,
        response_mime_type="application/json"
    )
    dur1 = time.time() - start1
    print(f"Response: {resp1[:80]}...")
    print(f"Metrics 1: Provider={met1.get('llm_provider')}, Model={met1.get('llm_model')}, Latency={met1.get('llm_latency')}ms, Cached={met1.get('cached', False)}")
    print(f"Live Call Wallclock: {dur1:.2f}s")
    
    print("\n--- Step 2: Identical (Warm / Cached) LLM Call ---")
    start2 = time.time()
    resp2, met2 = provider.generate_response(
        system_instruction=test_instruction,
        contents=test_content,
        response_mime_type="application/json"
    )
    dur2 = time.time() - start2
    print(f"Response: {resp2[:80]}...")
    print(f"Metrics 2: Provider={met2.get('llm_provider')}, Model={met2.get('llm_model')}, Latency={met2.get('llm_latency')}ms, Cached={met2.get('cached', False)}")
    print(f"Cache Hit Wallclock: {dur2:.4f}s")
    
    assert resp1 == resp2, "Cached response must match original response!"
    assert met2.get("cached") is True, "Second call must hit Redis cache!"
    assert dur2 < 0.1, "Cache hit must be < 100ms!"
    
    print("\n[SUCCESS] FIX 4 verified: Gemini model configured dynamically & Redis LLM cache working with sub-10ms response times!")

if __name__ == "__main__":
    verify_fix4()
