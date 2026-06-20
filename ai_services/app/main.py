import os
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, Optional, List

from app.scoring.aggregator import calculate_race_scores
from app.simulation.simulation_engine import run_strategy_simulation
from app.core.logger import logger

app = FastAPI(
    title="FrontWing AI Service",
    description="FastAPI service for Formula 1 telemetry scoring and strategy simulations",
    version="1.0.0"
)

class ScoreRequest(BaseModel):
    session_id: str
    driver_id: str
    data: Dict[str, Any] # Contains metrics needed for calculations

class SimulationRequest(BaseModel):
    session_id: str
    driver_id: str
    simulated_pit_lap: int
    target_compound: Optional[str] = None
    save_to_db: Optional[bool] = True

@app.get("/health")
def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "frontwing-ai-services"}

@app.post("/score")
def score_driver(req: ScoreRequest):
    """Calculates and aggregates race performance scores for a driver."""
    try:
        # Inject session_id and driver_id into data dictionary
        payload = dict(req.data)
        payload["session_id"] = req.session_id
        payload["driver_id"] = req.driver_id
        
        # Save to DB defaults to True, but can be controlled via parameter
        results = calculate_race_scores(payload, save_to_db=True)
        return {
            "status": "success",
            "results": results
        }
    except Exception as e:
        logger.error(f"Error calculating race scores: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/simulate")
def simulate_strategy(req: SimulationRequest):
    """Runs a 'What-If' strategy simulation for a pit stop on a given lap."""
    try:
        results = run_strategy_simulation(
            session_id=req.session_id,
            driver_id=req.driver_id,
            simulated_pit_lap=req.simulated_pit_lap,
            target_compound=req.target_compound,
            save_to_db=req.save_to_db
        )
        return {
            "status": "success",
            "results": results
        }
    except ValueError as ve:
        logger.warning(f"Validation failure during simulation: {ve}")
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logger.error(f"Error running strategy simulation: {e}")
        raise HTTPException(status_code=500, detail=str(e))
