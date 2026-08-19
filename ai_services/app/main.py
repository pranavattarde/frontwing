import os
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, Optional, List

from app.scoring.aggregator import calculate_race_scores
from app.simulation.simulation_engine import run_strategy_simulation
from app.agents.planner import run_ai_race_engineer
from app.agents.memory import conversation_memory
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

class SessionLoadRequest(BaseModel):
    year: int
    gp: str
    session: str = "R"

from app.core.startup import run_startup_health_checks

# Run validation checks on FastAPI boot
@app.on_event("startup")
def startup_event():
    logger.info("[Startup] Running FrontWing AI service initialization checks.")
    # Run checks, this will raise RuntimeError if any critical dependency is missing
    diagnostics = run_startup_health_checks()
    
    # Trigger background seeding if DB is empty
    from app.core.db import execute_query
    try:
        res = execute_query("SELECT COUNT(*) as count FROM sessions", fetch=True)
        if res and res[0]["count"] == 0:
            logger.info("[Startup] Database sessions table is empty. Seeding F1 GP race weekend in background...")
            import threading
            from app.ingestion.loader import load_default_race_weekend
            threading.Thread(target=load_default_race_weekend, daemon=True).start()
    except Exception as e:
        logger.warning(f"[Startup] Failed to check sessions or trigger background ingestion: {e}")

@app.get("/health")
def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "frontwing-ai-services"}

@app.get("/health/diagnostics")
def health_diagnostics():
    """Enterprise health and service diagnostics endpoint."""
    try:
        diagnostics = run_startup_health_checks()
        status_code = 200 if diagnostics.get("healthy", True) else 200 # degraded status is 200 OK with degraded flags
        return diagnostics
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

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

@app.post("/sessions/load")
def load_session(req: SessionLoadRequest):
    """Downloads or loads an F1 session on demand via FastF1 and persists into PostgreSQL."""
    try:
        from app.ingestion.fastf1_collector import FastF1Collector
        collector = FastF1Collector()
        result = collector.load_session(req.year, req.gp, req.session)
        return result
    except Exception as e:
        logger.error(f"Error loading session: {e}")
        raise HTTPException(status_code=500, detail=str(e))

class QueryRequest(BaseModel):
    question: str
    session_id: Optional[str] = None
    driver_id: Optional[str] = None
    conversation_id: Optional[str] = None

@app.post("/engineer/query")
def engineer_query(req: QueryRequest):
    """Interacts with the AI Race Engineer StateGraph to execute queries and gather evidence."""
    try:
        session_id = req.session_id
        driver_id = req.driver_id
        history = []
        
        # Load and resolve memory context if conversation_id is supplied
        if req.conversation_id:
            resolved = conversation_memory.resolve_context(req.conversation_id, req.question)
            if not session_id:
                session_id = resolved.get("session_id")
            if not driver_id:
                driver_id = resolved.get("driver_id")
            history = conversation_memory.get_history(req.conversation_id)
            
        # Execute agent graph
        response = run_ai_race_engineer(
            question=req.question,
            session_id=session_id,
            driver_id=driver_id,
            history=history
        )
        
        # Save output exchange back to memory if conversation_id is supplied
        if req.conversation_id:
            context = {
                "session_id": session_id or (response.get("evidence") or {}).get("session_id"),
                "driver_id": driver_id or (response.get("evidence") or {}).get("driver_id")
            }
            conversation_memory.save_message(
                req.conversation_id,
                req.question,
                response.get("final_answer", ""),
                context
            )
            
        return response
    except Exception as e:
        logger.error(f"Error executing AI Race Engineer query: {e}")
        raise HTTPException(status_code=500, detail=str(e))


