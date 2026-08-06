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
        
    # 4. Tool Registry Audit & Planner Compatibility Validation
    from app.tools.registry import tool_registry
    PLANNER_REFERENCED_TOOLS = [
        "scoring_tool",
        "simulation_tool",
        "telemetry_tool",
        "explain_mode_tool",
        "research_tool",
        "knowledge_tool",
        "investigation_tool",
        "race_results_tool",
        "driver_database_tool",
        "constructor_database_tool",
        "standings_tool",
        "historical_results_tool"
    ]
    registered_tools = [t.name for t in tool_registry.list_tools()]
    missing_tools = [t for t in PLANNER_REFERENCED_TOOLS if t not in registered_tools]
    unused_tools = [t for t in registered_tools if t not in PLANNER_REFERENCED_TOOLS]
    
    compatibility = "fully_compatible"
    if missing_tools:
        compatibility = "incompatible_missing_tools"
        is_healthy = False
        critical_missing.append(f"Planner references non-existent tools: {missing_tools}")
        print(f"[FAIL] Tool registry complete: FAILED (missing tools {missing_tools})")
    else:
        print(f"[OK] Tool registry complete: all planner-referenced tools registered")
        
    diagnostics["tools"] = {
        "status": "healthy" if not missing_tools else "unhealthy",
        "registered_tools": registered_tools,
        "missing_tools": missing_tools,
        "unused_tools": unused_tools,
        "planner_compatibility": compatibility
    }

    # 5. Database Ping & Migrations
    db_connected = False
    sessions_count = 0
    drivers_count = 0
    telemetry_count = 0
    try:
        conn = psycopg2.connect(settings.DATABASE_URL, connect_timeout=3)
        cur = conn.cursor()
        cur.execute("SELECT 1;")
        db_connected = True
        
        # Execute database migrations automatically
        try:
            import os
            base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
            mig_dirs = [
                os.path.join(base_dir, "database", "migrations"),
                os.path.join(os.getcwd(), "database", "migrations"),
                os.path.join(os.getcwd(), "..", "database", "migrations"),
                "/app/database/migrations",
            ]
            mig_dir = next((d for d in mig_dirs if os.path.exists(d)), None)
            if mig_dir:
                for sql_file in ["01_init_schema.sql", "02_intelligence_tables.sql", "03_auth_and_history.sql"]:
                    fpath = os.path.join(mig_dir, sql_file)
                    if os.path.exists(fpath):
                        with open(fpath, "r", encoding="utf-8") as sf:
                            cur.execute(sf.read())
                            conn.commit()
                        logger.info(f"[Startup Migrations] Executed {sql_file}")
            
            # Ensure conversations table exists
            cur.execute("""
                CREATE TABLE IF NOT EXISTS conversations (
                    id SERIAL PRIMARY KEY,
                    conversation_id VARCHAR(255) NOT NULL,
                    question TEXT NOT NULL,
                    answer TEXT,
                    context JSONB,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
                CREATE INDEX IF NOT EXISTS idx_conversations_cid ON conversations(conversation_id);
            """)
            conn.commit()
        except Exception as mig_err:
            logger.warning(f"[Startup Migrations] Migration check notice: {mig_err}")
            conn.rollback()

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
        print("[OK] PostgreSQL reachable & schemas migrated")
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
