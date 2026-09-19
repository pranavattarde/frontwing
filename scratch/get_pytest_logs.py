import urllib.request
import json
import sys

run_id = sys.argv[1] if len(sys.argv) > 1 else "35370977792"
url = f"https://api.github.com/repos/Pranav722/frontwing/actions/runs/{run_id}/jobs"
req = urllib.request.Request(url, headers={"User-Agent": "CI-Checker"})

with urllib.request.urlopen(req) as resp:
    data = json.loads(resp.read())
    for j in data.get("jobs", []):
        if "Pytest" in j["name"]:
            job_id = j["id"]
            print(f"Found Pytest Job ID: {job_id}")
            log_url = f"https://api.github.com/repos/Pranav722/frontwing/actions/jobs/{job_id}/logs"
            log_req = urllib.request.Request(log_url, headers={"User-Agent": "CI-Checker"})
            try:
                with urllib.request.urlopen(log_req) as log_resp:
                    log_text = log_resp.read().decode('utf-8', errors='replace')
                    print(f"--- LOG START (last 100 lines) ---")
                    lines = log_text.splitlines()
                    for line in lines[-100:]:
                        print(line)
            except Exception as e:
                print(f"Error fetching logs: {e}")
