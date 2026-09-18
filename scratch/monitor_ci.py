import urllib.request
import json
import time
import sys

url = "https://api.github.com/repos/Pranav722/frontwing/actions/runs"
headers = {"User-Agent": "CI-Monitor"}

print("Querying GitHub Actions for workflow runs...")
max_attempts = 30
for attempt in range(max_attempts):
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode())
            runs = data.get("workflow_runs", [])
            if runs:
                run = runs[0]
                run_id = run["id"]
                name = run["name"]
                status = run["status"]
                conclusion = run["conclusion"]
                html_url = run["html_url"]
                event = run["event"]
                head_branch = run["head_branch"]
                head_sha = run["head_sha"][:7]

                print(f"[{attempt+1}/{max_attempts}] Run #{run_id} ('{name}') on {head_branch} ({head_sha}) -> status: {status}, conclusion: {conclusion}", flush=True)
                
                # Query job details
                jobs_url = run["jobs_url"]
                j_req = urllib.request.Request(jobs_url, headers=headers)
                with urllib.request.urlopen(j_req, timeout=30) as j_resp:
                    j_data = json.loads(j_resp.read().decode())
                    for job in j_data.get("jobs", []):
                        j_name = job["name"]
                        j_status = job["status"]
                        j_conc = job["conclusion"]
                        print(f"    - Job '{j_name}': status={j_status}, conclusion={j_conc}", flush=True)

                if status == "completed":
                    print("\n=======================================================", flush=True)
                    print(f"FINAL WORKFLOW RESULT: {conclusion.upper()}!", flush=True)
                    print(f"Run URL: {html_url}", flush=True)
                    print("=======================================================", flush=True)
                    sys.exit(0 if conclusion == "success" else 1)
            else:
                print(f"[{attempt+1}/{max_attempts}] Waiting for workflow run to appear...", flush=True)
    except Exception as e:
        print(f"[{attempt+1}/{max_attempts}] Error fetching status: {e}", flush=True)
    time.sleep(15)
