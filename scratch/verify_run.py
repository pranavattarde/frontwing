import urllib.request
import subprocess
import json

proc = subprocess.run(['git', 'credential', 'fill'], input='protocol=https\nhost=github.com\n', text=True, capture_output=True)
token = [l.split('=', 1)[1].strip() for l in proc.stdout.splitlines() if l.startswith('password=')][0]

run_id = '35423348988'
req = urllib.request.Request(f'https://api.github.com/repos/pranavattarde/frontwing/actions/runs/{run_id}', headers={'Authorization': f'Bearer {token}', 'Accept': 'application/vnd.github+json'})
with urllib.request.urlopen(req) as resp:
    data = json.loads(resp.read().decode())
    print('Run ID:', data['id'])
    print('Run Status:', data['status'])
    print('Run Conclusion:', data['conclusion'])
    print('Run URL:', data['html_url'])

jobs_req = urllib.request.Request(f'https://api.github.com/repos/pranavattarde/frontwing/actions/runs/{run_id}/jobs', headers={'Authorization': f'Bearer {token}', 'Accept': 'application/vnd.github+json'})
with urllib.request.urlopen(jobs_req) as resp:
    j_data = json.loads(resp.read().decode())
    print('\nJob Details:')
    for j in j_data['jobs']:
        print(f"  - {j['name']}: {j['status']} -> {j['conclusion']}")
