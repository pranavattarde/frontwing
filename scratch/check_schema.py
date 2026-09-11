import sys
sys.path.insert(0, "ai_services")
from app.core.db import execute_query

cols = execute_query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'drivers'", fetch=True)
for c in cols:
    print(c["column_name"], c["data_type"])

drv = execute_query("SELECT id, code, permanent_number, first_name, last_name FROM drivers LIMIT 5", fetch=True)
for d in drv:
    print(d)
