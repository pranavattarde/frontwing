import os
import sys
sys.path.insert(0, os.path.abspath("."))
from app.core.config import Settings
_settings = Settings()
from groq import Groq

client = Groq(api_key=_settings.GROQ_API_KEY)

print("--- Testing llama-3.3-70b-versatile with json_object ---")
try:
    res = client.chat.completions.create(
        messages=[
            {"role": "system", "content": "You are an F1 engineer. Return JSON object only: {\"status\": \"ok\"}"},
            {"role": "user", "content": "Ping"}
        ],
        model="llama-3.3-70b-versatile",
        response_format={"type": "json_object"},
        temperature=0.0
    )
    print("llama-3.3-70b-versatile SUCCESS:", res.choices[0].message.content)
except Exception as e:
    print("llama-3.3-70b-versatile FAILED:", e)

test_instruction = "You are an F1 race engineer. Output valid JSON only: {\"answer\": \"string\"}"
test_content = "Unique Test Content: What is tire degradation in Bahrain?"

print("\n--- Testing verify_fix4 prompt with qwen/qwen3.6-27b ---")
try:
    res2 = client.chat.completions.create(
        messages=[
            {"role": "system", "content": test_instruction},
            {"role": "user", "content": test_content}
        ],
        model="qwen/qwen3.6-27b",
        response_format={"type": "json_object"},
        temperature=0.0
    )
    print("qwen/qwen3.6-27b SUCCESS:", res2.choices[0].message.content)
except Exception as e:
    print("qwen/qwen3.6-27b FAILED:", e)
