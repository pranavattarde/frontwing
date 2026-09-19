import psycopg2

sql_bad = "SELECT 1 WHERE 1=%s AND 'abc' NOT ILIKE '%australia%'"
sql_good = "SELECT 1 WHERE 1=%s AND 'abc' NOT ILIKE '%%australia%%'"

# Test with string formatting which psycopg2 internally does
from psycopg2.extensions import adapt
try:
    # psycopg2 Mogrify simulates exact SQL formatting
    class DummyConn:
        encoding = 'utf-8'
    print("Mogrify good:", psycopg2.extensions.mogrify(sql_good, (1,)))
    print("Mogrify bad:", psycopg2.extensions.mogrify(sql_bad, (1,)))
except Exception as e:
    print("Caught exception:", type(e), e)
