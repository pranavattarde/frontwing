import urllib.request
import subprocess
import json
import time

proc = subprocess.run(['git', 'credential', 'fill'], input='protocol=https\nhost=github.com\n', text=True, capture_output=True)
token = [l.split('=', 1)[1].strip() for l in proc.stdout.splitlines() if l.startswith('password=')][0]

def check_runs():
    req = urllib.request.Request('https://api.github.com/repos/pranavattarde/frontwing/actions/runs?per_page=6', headers={'Authorization': f'Bearer {token}', 'Accept': 'application/vnd.github+json'})
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode())
    return data['workflow_runs']

runs = check_runs()
print(f"Latest runs ({len(runs)}):")
for r in runs:
    print(f"Run {r['id']} | {r['name']} | Event: {r['event']} | Branch: {r['head_branch']} | SHA: {r['head_sha'][:7]} | Status: {r['status']} | Conclusion: {r['conclusion']} | URL: {r['html_url']}")

# Find CD run for the latest commit fd7d44c
cd_runs = [r for r in runs if 'CD' in r['name'] and r['head_sha'].startswith('fd7d44c')]
if cd_runs:
    cd_run = cd_runs[0]
    print(f"\nMonitoring CD Run {cd_run['id']}...")
    jobs_req = urllib.request.Request(f"https://api.github.com/repos/pranavattarde/frontwing/actions/runs/{cd_run['id']}/jobs", headers={'Authorization': f'Bearer {token}', 'Accept': 'application/vnd.github+json'})
    with urllib.request.urlopen(jobs_req) as resp:
        j_data = json.loads(resp.read().decode())
        for j in j_data['jobs']:
            print(f"  Job: {j['name']} | Status: {j['status']} | Conclusion: {j['conclusion']}")
            for step in j.get('steps', []):
                print(f"    - {step['name']}: {step['status']} ({step.get('conclusion')})")

