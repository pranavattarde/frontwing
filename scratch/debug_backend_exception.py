import sys
import os
import traceback

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../ai_services'))

from app.core.config import settings
from app.agents.planner import run_ai_race_engineer

print(f"DATABASE_URL in settings: {settings.DATABASE_URL}")
print(f"REDIS_URL in settings: {settings.REDIS_URL}")
print(f"GEMINI_API_KEY set: {bool(settings.GEMINI_API_KEY)}")
print(f"GROQ_API_KEY set: {bool(settings.GROQ_API_KEY)}")

try:
    print("\n--- RUNNING run_ai_race_engineer ---")
    res = run_ai_race_engineer("Who was 3rd in Chinese GP?")
    print("RESULT KEYS:", list(res.keys()))
    print("FINAL ANSWER:", res.get("final_answer"))
    print("ERRORS:", res.get("errors"))
except Exception as e:
    print("\n!!! EXCEPTION CAUGHT !!!")
    traceback.print_exc()
