import os
import sys
import subprocess

# Set environment variables to emulate GitHub Actions CI without secrets
os.environ["GEMINI_API_KEY"] = ""
os.environ["GROQ_API_KEY"] = ""
os.environ["MODEL_PROVIDER"] = "gemini"
os.environ["DATABASE_URL"] = "postgresql://postgres:postgres@localhost:5433/frontwing"
os.environ["REDIS_URL"] = "redis://localhost:6379/0"

pytest_exe = r"C:\VS-Code_C_drive\Projects\FrontWing\ai_services\venv\Scripts\pytest.exe"
args = [pytest_exe, "ai_services/tests", "-v", "--tb=short"]
if len(sys.argv) > 1:
    args.extend(sys.argv[1:])

print(f"Running: {' '.join(args)}")
result = subprocess.run(args, cwd=r"C:\VS-Code_C_drive\Projects\FrontWing")
sys.exit(result.returncode)
