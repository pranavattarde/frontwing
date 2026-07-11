import os
import psycopg2
import redis
from typing import Dict, Any
from app.core.config import settings
from app.prompts.loader import load_prompt, is_prompt_fallback
from app.agents.knowledge import rag_knowledge
from app.core.logger import logger

def run_startup_health_checks() -> Dict[str, Any]:
    """Runs enterprise-grade diagnostics validating system environments and services on boot."""
    diagnostics = {}
    is_healthy = True
    critical_missing = []

    # 0. Trigger side-effect tool registrations
    try:
        import app.tools.adapters
    except Exception as e:
        logger.error(f"Failed to load tools adapters module: {e}")

    print("\n--- FRONTWING SYSTEM STARTUP DIAGNOSTICS ---")

    # 1. Validate environment configuration variables
    try:
        settings.validate_or_raise()
        print("[OK] Environment configuration valid")
        diagnostics["environment"] = {
            "status": "healthy",
            "log_level": settings.LOG_LEVEL,
            "default_provider": settings.MODEL_PROVIDER
        }
    except Exception as e:
        is_healthy = False
        critical_missing.append("Environment validation failed")
        print(f"[FAIL] Environment configuration invalid: {e}")
        diagnostics["environment"] = {
            "status": "unhealthy",
            "error": str(e)
        }
        
    # 2. Validate Prompt files
    required_prompts = ["planning", "reflection", "judge", "investigation", "research", "explain"]
    prompt_status = {}
    fallback_active = False
    for p in required_prompts:
        load_prompt(p)
        if not is_prompt_fallback(p):
            prompt_status[p] = "loaded"
        else:
            prompt_status[p] = "fallback_active"
            fallback_active = True
            
    if fallback_active:
        is_healthy = False
        critical_missing.append("Prompt files fallbacks active")
        print("[FAIL] Prompt files loaded: FAILED (one or more markdown files missing)")
    else:
        print("[OK] Prompt files loaded")
        
    diagnostics["prompts"] = {
        "status": "healthy" if not fallback_active else "unhealthy",
        "details": prompt_status
    }
    
    # 3. Validate RAG Knowledge index
    try:
        doc_count = len(rag_knowledge.documents)
        if doc_count > 0:
            print(f"[OK] Knowledge loaded: {doc_count} documents indexed")
            diagnostics["knowledge"] = {
                "status": "healthy",
                "documents_count": doc_count
            }
        else:
            is_healthy = False
            critical_missing.append("Knowledge index empty")
            print("[FAIL] Knowledge loaded: FAILED (index contains 0 documents)")
            diagnostics["knowledge"] = {
                "status": "unhealthy",
                "documents_count": 0
            }
    except Exception as e:
        is_healthy = False
        critical_missing.append(f"Knowledge index loading error: {e}")
        print(f"[FAIL] Knowledge loaded: FAILED ({e})")
        diagnostics["knowledge"] = {
            "status": "unhealthy",
            "error": str(e)
        }
        
    # 4. Tool Registry Audit
    from app.tools.registry import tool_registry
    required_tools = ["scoring_tool", "simulation_tool", "explain_mode_tool", "research_tool", "investigation_tool", "knowledge_tool"]
    missing_tools = []
    for t_name in required_tools:
        try:
            tool_registry.get_tool(t_name)
        except KeyError:
            missing_tools.append(t_name)
            
    if missing_tools:
        is_healthy = False
        critical_missing.append(f"Missing registered tools: {missing_tools}")
        print(f"[FAIL] Tool registry complete: FAILED (missing {missing_tools})")
        diagnostics["tools"] = {
            "status": "unhealthy",
            "missing": missing_tools
        }
    else:
        print(f"[OK] Tool registry complete: all {len(required_tools)} required tools registered")
        diagnostics["tools"] = {
            "status": "healthy",
            "registered_count": len(required_tools)
        }

    # 5. Database Ping & Session/Driver Counts
    db_connected = False
    sessions_count = 0
    drivers_count = 0
    telemetry_count = 0
    try:
        conn = psycopg2.connect(settings.DATABASE_URL, connect_timeout=3)
        cur = conn.cursor()
        cur.execute("SELECT 1;")
        db_connected = True
        
        # Query counts
        try:
            cur.execute("SELECT COUNT(*) FROM sessions;")
            sessions_count = cur.fetchone()[0]
            cur.execute("SELECT COUNT(*) FROM drivers;")
            drivers_count = cur.fetchone()[0]
            cur.execute("SELECT COUNT(*) FROM telemetry_metadata;")
            telemetry_count = cur.fetchone()[0]
        except Exception:
            pass # ignore count lookup errors on fresh/empty schema
            
        cur.close()
        conn.close()
        print("[OK] PostgreSQL reachable")
        print(f"[OK] Sessions loaded: {sessions_count} in database")
        print(f"[OK] Drivers loaded: {drivers_count} in database")
        print(f"[OK] Telemetry dataset count: {telemetry_count} metadata cache records")
        diagnostics["database"] = {
            "status": "healthy",
            "sessions_count": sessions_count,
            "drivers_count": drivers_count,
            "telemetry_count": telemetry_count
        }
    except Exception as e:
        print(f"[FAIL] PostgreSQL reachable: FAILED ({e})")
        diagnostics["database"] = {
            "status": "unhealthy (unreachable)",
            "error": str(e)
        }
        
    # 6. Redis Ping
    redis_connected = False
    try:
        client = redis.Redis.from_url(settings.REDIS_URL, socket_timeout=3.0)
        client.ping()
        redis_connected = True
        print("[OK] Redis reachable")
        diagnostics["redis"] = {
            "status": "healthy"
        }
    except Exception as e:
        print(f"[FAIL] Redis reachable: FAILED ({e})")
        diagnostics["redis"] = {
            "status": "unhealthy (unreachable)",
            "error": str(e)
        }

    # 7. LLM Providers reachability check
    gemini_key = settings.GEMINI_API_KEY
    groq_key = settings.GROQ_API_KEY
    gemini_reachable = False
    groq_reachable = False
    
    # We test client initialization and reachability
    if gemini_key:
        try:
            # Try a lightweight API lookup to verify key validity
            from google import genai
            client = genai.Client(api_key=gemini_key)
            # Just listing models is a zero-cost API check
            client.models.list()
            gemini_reachable = True
            print("[OK] Gemini reachable")
        except Exception as e:
            print(f"[FAIL] Gemini reachable: FAILED ({e})")
    else:
        print("[FAIL] Gemini reachable: FAILED (GEMINI_API_KEY is not configured)")

    if groq_key:
        try:
            from groq import Groq
            client = Groq(api_key=groq_key)
            client.models.list()
            groq_reachable = True
            print("[OK] Groq reachable")
        except Exception as e:
            print(f"[FAIL] Groq reachable: FAILED ({e})")
    else:
        print("[FAIL] Groq reachable: FAILED (GROQ_API_KEY is not configured)")

    diagnostics["providers"] = {
        "gemini_reachable": gemini_reachable,
        "groq_reachable": groq_reachable,
        "status": "healthy" if (gemini_reachable or groq_reachable) else "degraded"
    }

    # 8. Simulation operational check
    try:
        from app.simulation.tire_model import project_natural_lap_time
        project_natural_lap_time(70.0, 0.08, 1, 1)
        print("[OK] Simulation ready")
        diagnostics["simulation"] = {
            "status": "healthy"
        }
    except Exception as e:
        is_healthy = False
        critical_missing.append(f"Simulation engine error: {e}")
        print(f"[FAIL] Simulation ready: FAILED ({e})")
        diagnostics["simulation"] = {
            "status": "unhealthy",
            "error": str(e)
        }

    print("-------------------------------------------\n")

    diagnostics["healthy"] = is_healthy

    # Fail startup if any critical dependency is missing
    if critical_missing:
        error_msg = f"Critical startup diagnostics failed: {critical_missing}"
        logger.error(error_msg)
        raise RuntimeError(error_msg)

    if is_healthy:
        logger.info(f"Startup check complete. System Status: HEALTHY. Diagnostics: {diagnostics}")
    else:
        logger.warning(f"Startup check complete. System Status: DEGRADED. Diagnostics: {diagnostics}")
        
    return diagnostics
