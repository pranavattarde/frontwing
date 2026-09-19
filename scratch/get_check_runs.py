import urllib.request
import json

url = 'https://api.github.com/repos/Pranav722/frontwing/commits/9a56569/check-runs'
req = urllib.request.Request(url, headers={'User-Agent': 'CI-Monitor'})
with urllib.request.urlopen(req) as resp:
    data = json.loads(resp.read().decode())
    for cr in data.get('check_runs', []):
        print(f"Check Run: {cr['name']} | Status: {cr['status']} | Conclusion: {cr['conclusion']}")
        print(f"  Title: {cr.get('output', {}).get('title')}")
        print(f"  Summary: {cr.get('output', {}).get('summary')}")
        ann_url = cr.get('output', {}).get('annotations_url')
        if ann_url:
            ann_req = urllib.request.Request(ann_url, headers={'User-Agent': 'CI-Monitor'})
            try:
                with urllib.request.urlopen(ann_req) as a_resp:
                    annotations = json.loads(a_resp.read().decode())
                    for a in annotations:
                        print(f"    Annotation: {a.get('annotation_level')} in {a.get('path')}:{a.get('start_line')}")
                        print(f"      Message: {a.get('message')}")
            except Exception as e:
                print(f"    Error fetching annotations: {e}")
