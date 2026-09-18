import os
import re

frontend_src = r'c:\VS-Code_C_drive\Projects\FrontWing\frontend\src'

results = []
for root, dirs, files in os.walk(frontend_src):
    for file in files:
        if file.endswith(('.jsx', '.js')):
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8', errors='ignore') as f:
                lines = f.readlines()
            for idx, line in enumerate(lines, 1):
                if 'uppercase' in line and ('<h' in line or '<span' in line or '<div' in line or '<button' in line or '<p' in line):
                    results.append(f"{file}:{idx} -> {line.strip()[:110]}")

print(f"Found {len(results)} occurrences:")
for r in results:
    print(r)
