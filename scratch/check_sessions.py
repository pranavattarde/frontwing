import os
import sys

sys.path.insert(0, os.path.abspath("ai_services"))

from app.core.db import execute_query

rows = execute_query("SELECT id, race_id, type FROM sessions ORDER BY id DESC LIMIT 30", fetch=True)
for r in rows:
    print(r)
