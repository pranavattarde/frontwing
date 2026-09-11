"""
test_infrastructure_and_api.py
Tests FastAPI server endpoints, configuration validation, prompt loading & disk caching,
startup diagnostics, and the asynchronous backfill job registry & timeout mechanism.
"""
import os
import time
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.config import settings
from app.prompts.loader import load_prompt, _PROMPT_CACHE
from app.core.startup import run_startup_health_checks
from app.ingestion.fastf1_collector import (
    start_async_backfill,
    get_backfill_job,
    _backfill_jobs,
    _backfill_lock
)


@pytest.fixture(scope="module")
def client():
    return TestClient(app)


def test_api_health_endpoint(client):
    """Verifies GET /health returns 200 with service metadata."""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "healthy", "service": "frontwing-ai-services"}


def test_api_simulate_missing_data_error(client):
    """Verifies POST /simulate validates session existence and returns 400 for non-existent session."""
    response = client.post("/simulate", json={
        "session_id": "non_existent_session_99",
        "driver_id": "leclerc",
        "simulated_pit_lap": 20,
        "save_to_db": False
    })
    assert response.status_code == 400
    assert "No timing data found in database" in response.json()["detail"]


def test_settings_validation():
    """Verifies environment variables load and validate correctly."""
    assert settings.DATABASE_URL is not None
    assert settings.REDIS_URL is not None
    settings.validate_or_raise()


def test_prompt_loader_caching_and_fallbacks():
    """Verifies prompt loader reads templates, caches in memory, and falls back gracefully."""
    _PROMPT_CACHE.clear()
    content = load_prompt("planning")
    assert len(content) > 0
    assert "planning" in _PROMPT_CACHE

    # Non-existent template fallback
    fallback = load_prompt("non_existent_prompt_99")
    assert "F1 AI Engineer" in fallback


def test_startup_health_diagnostics():
    """Verifies startup diagnostics inspects database, redis, prompts, and tools."""
    diagnostics = run_startup_health_checks()
    assert "environment" in diagnostics
    assert "prompts" in diagnostics
    assert "knowledge" in diagnostics
    assert "database" in diagnostics
    assert "redis" in diagnostics
    assert "providers" in diagnostics
    assert "healthy" in diagnostics


def test_async_backfill_deduplication():
    """Verifies that multiple calls for the same session attach to the existing job without duplicates."""
    test_session = "test_backfill_session_dedup_001"
    with _backfill_lock:
        _backfill_jobs.pop(test_session, None)

    job1 = start_async_backfill(test_session)
    assert job1.get("status") == "in_progress"

    job2 = start_async_backfill(test_session)
    assert job2.get("status") == "in_progress"
    assert job1 is job2

    retrieved = get_backfill_job(test_session)
    assert retrieved is not None
    assert retrieved.get("session_id") == test_session


def test_async_backfill_server_side_timeout():
    """Verifies that stuck in-progress backfill jobs automatically transition to 'failed' after 180s."""
    test_session = "test_backfill_session_timeout_002"
    with _backfill_lock:
        _backfill_jobs[test_session] = {
            "session_id": test_session,
            "status": "in_progress",
            "progress_pct": 25,
            "stage": "Stuck in test stage...",
            "started_at": time.time() - 200,  # > 180s ago
            "updated_at": time.time() - 200,
            "error": None
        }

    job = get_backfill_job(test_session)
    assert job is not None
    assert job.get("status") == "failed"
    assert "timed out after 3 minutes" in job.get("stage", "").lower()
