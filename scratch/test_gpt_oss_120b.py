import os
import sys
sys.path.insert(0, os.path.abspath("."))
from app.core.config import Settings
_settings = Settings()
from groq import Groq

client = Groq(api_key=_settings.GROQ_API_KEY)

model_name = "openai/gpt-oss-120b"
print(f"--- Testing {model_name} on Groq ---")

try:
    res = client.chat.completions.create(
        messages=[
            {"role": "system", "content": "You are an F1 race engineer. Output valid JSON: {\"status\": \"ok\", \"insight\": \"string\"}"},
            {"role": "user", "content": "Assess track conditions at Bahrain."}
        ],
        model=model_name,
        response_format={"type": "json_object"},
        temperature=0.0,
        max_tokens=512
    )
    content = res.choices[0].message.content
    print("SUCCESS ->", content.encode("ascii", "replace").decode("ascii"))
except Exception as e:
    print("FAILED ->", str(e).encode("ascii", "replace").decode("ascii"))
