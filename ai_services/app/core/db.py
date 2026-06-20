import os
import psycopg2
from psycopg2.extras import RealDictCursor
import redis
from dotenv import load_dotenv
from .logger import logger

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/frontwing")
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

# 1. PostgreSQL connection helpers
def get_db_connection():
    """Returns a new connection to the PostgreSQL database."""
    try:
        conn = psycopg2.connect(DATABASE_URL)
        return conn
    except Exception as e:
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
