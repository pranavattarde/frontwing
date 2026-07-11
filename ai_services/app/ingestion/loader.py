import os
from app.ingestion.ergast_collector import ErgastCollector
from app.ingestion.fastf1_collector import FastF1Collector
from app.core.logger import logger
from app.core.db import execute_query

def load_default_race_weekend():
    """Automatically seeds database with a development F1 GP race weekend if sessions is empty."""
    try:
        logger.info("[Loader] Starting automatic F1 race weekend seeding...")
        
        # 1. Sync all static data from Ergast
        ergast = ErgastCollector()
        ergast.fetch_and_sync_all_static_data()
        
        # 2. Sync Monaco 2024 race results (Year = 2024, Round = 8)
        year = 2024
        round_num = 8
        gp_name = "Monaco"
        
        logger.info(f"[Loader] Syncing race results for {year} Round {round_num} (Monaco GP)...")
        ergast.sync_race_results(year, round_num)
        
        # 3. Load laps, stints, and telemetry using FastF1
        fastf1_coll = FastF1Collector()
        session = fastf1_coll.collect(year, gp_name, session_type="R")
        
        # Process and save to database
        session_id = fastf1_coll.process_and_save(session)
        logger.info(f"[Loader] Successfully ingested F1 race weekend. Session ID: {session_id}")
    except Exception as e:
        logger.error(f"[Loader] Seeding default race weekend failed: {e}")
