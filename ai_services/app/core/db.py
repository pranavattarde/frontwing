import psycopg2
from psycopg2.extras import RealDictCursor
import redis
from app.core.config import settings
from .logger import logger

DATABASE_URL = settings.DATABASE_URL
REDIS_URL = settings.REDIS_URL

import time

_db_last_fail = 0.0
_DB_FAIL_COOLDOWN = 0.5 # Seconds to skip reconnection attempts if DB is offline

def get_db_connection():
    """Returns a new connection to the PostgreSQL database."""
    global _db_last_fail
    if time.time() - _db_last_fail < _DB_FAIL_COOLDOWN:
        raise ConnectionError("PostgreSQL connection circuit-breaker active (offline fallback)")
    try:
        conn = psycopg2.connect(DATABASE_URL, connect_timeout=5)
        return conn
    except Exception as e:
        _db_last_fail = time.time()
        logger.error(f"PostgreSQL connection failure: {e}")
        raise e

def execute_query(query: str, params: tuple = None, fetch: bool = False):
    """Utility method to execute a query, handle transactions, and close client resources cleanly."""
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    try:
        cur.execute(query, params)
        if fetch:
            results = cur.fetchall()
        else:
            results = None
        conn.commit()
        return results
    except Exception as e:
        conn.rollback()
        logger.error(f"SQL Execution Error running: '{query[:100]}': {e}")
        raise e
    finally:
        cur.close()
        conn.close()

# 2. Redis connection pool
try:
    redis_pool = redis.ConnectionPool.from_url(REDIS_URL, decode_responses=True)
    redis_client = redis.Redis(connection_pool=redis_pool)
    logger.info("Successfully established Redis pool connection")
except Exception as e:
    logger.error(f"Failed establishing Redis connection pool: {e}")
    redis_client = None
