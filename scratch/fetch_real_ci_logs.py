import urllib.request
import subprocess
import json

proc = subprocess.run(
    ["git", "credential", "fill"],
    input="protocol=https\nhost=github.com\n",
    text=True,
    capture_output=True,
    cwd=r"C:\VS-Code_C_drive\Projects\FrontWing"
)

token = None
for line in proc.stdout.splitlines():
    if line.startswith("password="):
        token = line.split("=", 1)[1].strip()

job_id = "105684599473"
url = f"https://api.github.com/repos/Pranav722/frontwing/actions/jobs/{job_id}/logs"

class NoRedirectHandler(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None

opener = urllib.request.build_opener(NoRedirectHandler)
req = urllib.request.Request(
    url,
    headers={
        "Authorization": f"Bearer {token}",
        "User-Agent": "CI-Log-Fetcher",
        "Accept": "application/vnd.github+json"
    }
)

try:
    resp = opener.open(req)
    log_content = resp.read().decode('utf-8', errors='replace')
except urllib.error.HTTPError as e:
    if e.code in (301, 302, 303, 307):
        redirect_url = e.headers['Location']
        # Fetch redirected URL without Authorization header
        blob_req = urllib.request.Request(redirect_url, headers={"User-Agent": "CI-Log-Fetcher"})
        with urllib.request.urlopen(blob_req) as b_resp:
            log_content = b_resp.read().decode('utf-8', errors='replace')
    else:
        print(f"HTTP Error: {e}")
        exit(1)

with open(r"c:\VS-Code_C_drive\Projects\FrontWing\scratch\ci_pytest_run.log", "w", encoding="utf-8") as f:
    f.write(log_content)

print(f"Log saved successfully! Total length: {len(log_content)} chars.")
lines = log_content.splitlines()
print(f"Total lines: {len(lines)}")

# Search for failed tests and summaries
for i, line in enumerate(lines):
    if "FAILED " in line or "FAILURES" in line or "short test summary info" in line:
        print(f"\n--- MATCH AT LINE {i} ---")
        for x in range(max(0, i-5), min(len(lines), i+35)):
            print(lines[x])
        break
