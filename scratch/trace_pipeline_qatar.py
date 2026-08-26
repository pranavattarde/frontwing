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

from app.agents.planner import run_ai_race_engineer

query = "Compare lap timings of Verstappen and Hamilton at Qatar GP"
print(f"=== RUNNING FULL PIPELINE FOR: '{query}' ===")
res = run_ai_race_engineer(query)

print("\n=== FULL RESPONSE OBJECT ===")
print(f"Final Answer: {res.get('final_answer')}")
print(f"Provider: {res.get('provider')}")
print(f"Model: {res.get('model')}")
print(f"Tools Used: {res.get('tools_used')}")
print(f"Evidence Keys: {list((res.get('evidence') or {}).keys())}")
print("\n--- Telemetry Tool Evidence in Response ---")
print(json.dumps((res.get('evidence') or {}).get('telemetry_tool'), indent=2))
