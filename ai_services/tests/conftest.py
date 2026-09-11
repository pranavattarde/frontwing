import os
import sys
from dotenv import load_dotenv

# Automatically ensure ai_services root is on sys.path
ai_services_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if ai_services_root not in sys.path:
    sys.path.insert(0, ai_services_root)

# Load environment variables
env_path = os.path.join(ai_services_root, ".env")
if os.path.exists(env_path):
    load_dotenv(env_path)
