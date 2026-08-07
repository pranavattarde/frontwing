import os
import sys
sys.path.insert(0, os.path.abspath('.'))

from app.core.db import execute_query
from app.ingestion.fastf1_collector import FastF1Collector

print('Fixing 2024_monaco_gp in races table...')
execute_query("""
    UPDATE races
    SET name = 'Monaco Grand Prix', circuit_id = 'monaco', round = 8
    WHERE id = '2024_monaco_gp'
""")

# Make sure monaco circuit exists
execute_query("""
    INSERT INTO circuits (id, name, location, country, length_km, turns)
    VALUES ('monaco', 'Circuit de Monaco', 'Monte Carlo', 'Monaco', 3.337, 19)
    ON CONFLICT (id) DO NOTHING
""")

# Delete old mixed race results for 2024_monaco_gp_race
execute_query("DELETE FROM race_results WHERE session_id = '2024_monaco_gp_race'")
execute_query("DELETE FROM laps WHERE session_id = '2024_monaco_gp_race'")
execute_query("DELETE FROM stints WHERE session_id = '2024_monaco_gp_race'")
execute_query("DELETE FROM weather WHERE session_id = '2024_monaco_gp_race'")

# Re-load 2024 Monaco GP cleanly via FastF1
print('Ingesting clean 2024 Monaco GP session...')
collector = FastF1Collector()
collector.load_session(2024, 'Monaco', 'Race')

# Re-load 2024 British GP cleanly via FastF1
print('Ingesting clean 2024 British GP session...')
collector.load_session(2024, 'British', 'Race')

print('Database race records fixed successfully!')
