from .strategy_score import calculate_strategy_score
from .tire_score import calculate_tire_score
from .pace_score import calculate_pace_score
from .pitstop_score import calculate_pitstop_score
from .execution_score import calculate_execution_score
from ..core.logger import logger
from ..core.db import execute_query

def calculate_race_scores(data: dict, save_to_db: bool = True) -> dict:
    """Aggregates all F1 metrics scores, computes the composite score,

    and optionally persists the outputs to the PostgreSQL database.
    """
    session_id = data.get("session_id", "mock_session")
    driver_id = data.get("driver_id", "mock_driver")

    logger.info(f"[Aggregator] Running score computations for session: {session_id}, driver: {driver_id}")

    strategy = calculate_strategy_score(data)
    tire = calculate_tire_score(data)
    pace = calculate_pace_score(data)
    pitstop = calculate_pitstop_score(data)
    execution = calculate_execution_score(data)

    # Average of all five scores is the composite score
    composite = round((strategy + tire + pace + pitstop + execution) / 5.0, 2)

    results = {
        "strategy_score": strategy,
        "tire_score": tire,
        "pace_score": pace,
        "pitstop_score": pitstop,
        "execution_score": execution,
        "composite_score": composite
    }

    logger.info(f"[Aggregator] Calculation outcomes: {results}")

    if save_to_db:
        try:
            execute_query(
                """
                INSERT INTO scoring_results (
                    session_id, driver_id, strategy_score, tire_management_score,
                    pace_efficiency_score, pit_stop_efficiency_score, race_execution_score,
                    composite_score
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (session_id, driver_id) DO UPDATE SET
                    strategy_score = EXCLUDED.strategy_score,
                    tire_management_score = EXCLUDED.tire_management_score,
                    pace_efficiency_score = EXCLUDED.pace_efficiency_score,
                    pit_stop_efficiency_score = EXCLUDED.pit_stop_efficiency_score,
                    race_execution_score = EXCLUDED.race_execution_score,
                    composite_score = EXCLUDED.composite_score
                """,
                (
                    session_id,
                    driver_id,
                    strategy,
                    tire,
                    pace,
                    pitstop,
                    execution,
                    composite
                )
            )
            logger.info(f"[Aggregator] Successfully saved scoring results to database for driver: {driver_id}")
        except Exception as e:
            logger.warning(f"[Aggregator] Database persist failed or skipped: {e}")

    return results
