import urllib.request
import json

url = 'https://api.github.com/repos/Pranav722/frontwing/actions/runs?per_page=10'
req = urllib.request.Request(url, headers={'User-Agent': 'CI-Monitor'})
with urllib.request.urlopen(req) as resp:
    data = json.loads(resp.read().decode())
    for r in data['workflow_runs']:
        print(f"ID: {r['id']} | Name: {r['name']} | Branch: {r['head_branch']} | SHA: {r['head_sha'][:7]} | Event: {r['event']} | Status: {r['status']} | Conclusion: {r['conclusion']}")
        print(f"   URL: {r['html_url']}")
