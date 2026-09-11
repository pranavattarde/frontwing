import urllib.request
import json

urls = [
    "https://livetiming.formula1.com/static/2026/2026-07-05_British_Grand_Prix/2026-07-05_Race/TimingData.jsonStream",
    "https://livetiming.formula1.com/static/2025/2025-03-16_Australian_Grand_Prix/2025-03-16_Race/TimingData.jsonStream",
    "https://livetiming.formula1.com/static/2024/2024-07-07_British_Grand_Prix/2024-07-07_Race/TimingData.jsonStream",
]

for url in urls:
    print(f"\nChecking: {url}")
    req = urllib.request.Request(url, headers={"User-Agent": "FastF1/3.8.3"})
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            print("  Status:", resp.status)
            first_bytes = resp.read(100)
            print("  First 100 bytes:", first_bytes)
    except Exception as e:
        print("  Error:", e)
