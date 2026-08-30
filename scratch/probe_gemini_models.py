import os
import sys
sys.path.insert(0, os.path.abspath("."))
from app.core.config import Settings
_settings = Settings()
from google import genai

client = genai.Client(api_key=_settings.GEMINI_API_KEY)
models_to_test = ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-flash-8b", "gemini-2.0-flash-exp", "gemini-3.6-flash"]

for m in models_to_test:
    try:
        res = client.models.generate_content(
            model=m,
            contents="Say 'OK'",
        )
        print(f"Model '{m}': SUCCESS -> {res.text.strip()}")
    except Exception as e:
        print(f"Model '{m}': FAILED -> {e}")
