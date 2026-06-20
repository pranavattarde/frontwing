import asyncio
import traceback
from datetime import datetime
from ..core.logger import logger
from .ergast_collector import ErgastCollector
from .openf1_collector import OpenF1Collector
from .fastf1_collector import FastF1Collector

class IngestionScheduler:
    def __init__(self):
        self.ergast = ErgastCollector()
        self.openf1 = OpenF1Collector()
        self.fastf1 = FastF1Collector()
        self.is_running = False

    async def start(self):
        """Starts the main ingestion scheduler orchestration loop."""
        logger.info("[Scheduler] Ingestion scheduling engine started")
        self.is_running = True
        
        # Trigger an initial static data sync on start to populate base tables
        try:
            self.ergast.fetch_and_sync_all_static_data()
        except Exception as e:
            logger.error(f"[Scheduler] Initial static sync failed: {e}")

        # Run scheduled loops in parallel
        await asyncio.gather(
            self.run_historical_sync_loop(),
            self.run_realtime_polling_loop()
        )

    async def run_historical_sync_loop(self):
        """Historical synchronizer running daily (every 86400 seconds)."""
        while self.is_running:
            logger.info("[Scheduler] Executing scheduled daily historical metadata sync...")
            try:
                self.ergast.fetch_and_sync_all_static_data()
            except Exception as e:
                logger.error(f"[Scheduler] Daily historical sync failed: {e}\n{traceback.format_exc()}")
            
            await asyncio.sleep(86400) # Wait 24 hours

    async def run_realtime_polling_loop(self):
        """Active session manager checking and streaming live OpenF1 data every 15 seconds."""
        # For testing, we mock an active session key (e.g. 9158 for Spa 2023 session)
        test_session_key = 9158
        test_race_id = "2023_12"
        test_driver_number = 33 # Max Verstappen (or relevant active driver key)

        while self.is_running:
            logger.info("[Scheduler] Checking for active live session data packages...")
            try:
                # 1. Sync active session state
                session_id = self.openf1.sync_active_session(test_session_key, test_race_id)
                
                if session_id:
                    logger.info(f"[Scheduler] Active session active: {session_id}. Instantiating live streams...")
                    
                    # 2. Sync weather logs
                    self.openf1.sync_weather(session_id, test_session_key)
                    
                    # 3. Stream coordinates to Redis
                    self.openf1.sync_live_car_coordinates(session_id, test_session_key, test_driver_number)
                else:
                    logger.info("[Scheduler] No live session timing active at this timestamp.")

            except Exception as e:
                logger.error(f"[Scheduler] Realtime ingestion step failed: {e}\n{traceback.format_exc()}")
            
            await asyncio.sleep(15) # Poll interval

    def stop(self):
        """Gracefully shuts down the background ingestion threads."""
        logger.info("[Scheduler] Stopping ingestion engine...")
        self.is_running = False

if __name__ == "__main__":
    scheduler = IngestionScheduler()
    try:
        asyncio.run(scheduler.start())
    except KeyboardInterrupt:
        scheduler.stop()
