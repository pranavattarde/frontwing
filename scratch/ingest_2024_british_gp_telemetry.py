import sys
import os
sys.path.insert(0, os.path.abspath("ai_services"))

from app.core.db import execute_query
from app.ingestion.fastf1_collector import FastF1Collector

def check_and_ingest_telemetry():
    session_id = "2024_british_gp_race"
    print(f"Checking telemetry status for session: '{session_id}'...")
    
    # 1. Check existing laps in PostgreSQL
    ver_laps = execute_query(
        "SELECT COUNT(*) as cnt FROM laps WHERE session_id = %s AND driver_id ILIKE %s",
        (session_id, "%verstappen%"), fetch=True
    )
    nor_laps = execute_query(
        "SELECT COUNT(*) as cnt FROM laps WHERE session_id = %s AND driver_id ILIKE %s",
        (session_id, "%norris%"), fetch=True
    )
    
    # 2. Check existing telemetry metadata
    ver_meta = execute_query(
        "SELECT COUNT(*) as cnt FROM telemetry_metadata WHERE session_id = %s AND driver_id ILIKE %s",
        (session_id, "%verstappen%"), fetch=True
    )
    nor_meta = execute_query(
        "SELECT COUNT(*) as cnt FROM telemetry_metadata WHERE session_id = %s AND driver_id ILIKE %s",
        (session_id, "%norris%"), fetch=True
    )
    
    print(f"Verstappen laps in DB: {ver_laps[0]['cnt'] if ver_laps else 0}, telemetry rows: {ver_meta[0]['cnt'] if ver_meta else 0}")
    print(f"Norris laps in DB: {nor_laps[0]['cnt'] if nor_laps else 0}, telemetry rows: {nor_meta[0]['cnt'] if nor_meta else 0}")
    
    need_ingestion = not ver_meta or ver_meta[0]['cnt'] == 0 or not nor_meta or nor_meta[0]['cnt'] == 0
    if need_ingestion:
        print("\nTargeted FastF1 telemetry ingestion required for 2024 British GP...")
        collector = FastF1Collector()
        session = collector.collect(2024, "British GP", "R")
        if collector.validate(session):
            saved_id = collector.process_and_save(session)
            print(f"Successfully processed and saved FastF1 session: {saved_id}")
        else:
            print("Failed to validate FastF1 session structure.")
    else:
        print("Telemetry data already present in database.")

if __name__ == "__main__":
    check_and_ingest_telemetry()
