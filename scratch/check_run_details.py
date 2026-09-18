import urllib.request
import json
import sys

run_id = sys.argv[1] if len(sys.argv) > 1 else "35370270860"
url = f"https://api.github.com/repos/Pranav722/frontwing/actions/runs/{run_id}/jobs"
req = urllib.request.Request(url, headers={"User-Agent": "CI-Checker"})

with urllib.request.urlopen(req) as resp:
    data = json.loads(resp.read())
    for j in data.get("jobs", []):
        name = j["name"]
        conc = j["conclusion"]
        status = j["status"]
        print(f"=== JOB: {name} (status: {status}, conclusion: {conc}) ===")
        for s in j.get("steps", []):
            s_name = s["name"]
            s_conc = s.get("conclusion")
            if s_conc != "success":
                print(f"    Step: {s_name} -> {s_conc}")
