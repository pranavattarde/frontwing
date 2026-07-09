import os
import psycopg2
import redis
from typing import Dict, Any
from app.core.config import settings
from app.prompts.loader import load_prompt
from app.agents.knowledge import rag_knowledge
from app.core.logger import logger

def run_startup_health_checks() -> Dict[str, Any]:
    """Runs enterprise-grade diagnostics validating system environments and services on boot."""
    diagnostics = {}
    is_healthy = True
    
    # 1. Validate environment configuration variables
    try:
        settings.validate_or_raise()
        diagnostics["environment"] = {
            "status": "healthy",
            "log_level": settings.LOG_LEVEL,
            "default_provider": settings.MODEL_PROVIDER
        }
    except Exception as e:
        is_healthy = False
        diagnostics["environment"] = {
            "status": "unhealthy",
            "error": str(e)
        }
        
    # 2. Validate Prompt files
    required_prompts = ["planning", "reflection", "judge", "investigation", "research", "explain"]
    prompt_status = {}
    for p in required_prompts:
        content = load_prompt(p)
        if content and "fallback" not in content.lower():
            prompt_status[p] = "loaded"
        else:
            prompt_status[p] = "fallback_active"
            
    diagnostics["prompts"] = {
        "status": "healthy" if "fallback_active" not in prompt_status.values() else "degraded",
        "details": prompt_status
    }
    
    # 3. Validate RAG Knowledge index
    try:
        doc_count = len(rag_knowledge.documents)
        diagnostics["knowledge"] = {
            "status": "healthy" if doc_count > 0 else "unhealthy",
            "documents_count": doc_count
        }
    except Exception as e:
        is_healthy = False
        diagnostics["knowledge"] = {
            "status": "unhealthy",
            "error": str(e)
        }
        
    # 4. Database Ping
    try:
        conn = psycopg2.connect(settings.DATABASE_URL, connect_timeout=3)
        cur = conn.cursor()
        cur.execute("SELECT 1;")
        cur.close()
        conn.close()
        diagnostics["database"] = {
            "status": "healthy"
        }
    except Exception as e:
        # Note: We support degraded mode if offline during unittest/local runs
        diagnostics["database"] = {
            "status": "degraded (unreachable)",
            "error": str(e)
        }
        
    # 5. Redis Ping
    try:
        client = redis.Redis.from_url(settings.REDIS_URL, socket_timeout=3.0)
        client.ping()
        diagnostics["redis"] = {
            "status": "healthy"
        }
    except Exception as e:
        diagnostics["redis"] = {
            "status": "degraded (unreachable)",
            "error": str(e)
        }
        
    # 6. LLM Providers availability check (keys presence check)
    gemini_key = settings.GEMINI_API_KEY
    groq_key = settings.GROQ_API_KEY
    providers_status = {
        "gemini": "configured" if gemini_key else "missing",
        "groq": "configured" if groq_key else "missing"
    }
    diagnostics["providers"] = {
        "status": "healthy" if (gemini_key or groq_key) else "degraded",
        "details": providers_status
    }
    
    diagnostics["healthy"] = is_healthy
    
    if is_healthy:
        logger.info(f"Startup check complete. System Status: HEALTHY. Diagnostic summaries: {diagnostics}")
    else:
        logger.warning(f"Startup check complete. System Status: DEGRADED. Diagnostics: {diagnostics}")
        
    return diagnostics
