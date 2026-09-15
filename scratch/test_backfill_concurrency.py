import sys
import os
import time
import threading
from concurrent.futures import ThreadPoolExecutor

sys.path.insert(0, os.path.abspath("ai_services"))

from app.ingestion.fastf1_collector import start_async_backfill, get_backfill_job, _backfill_jobs

def test_concurrent_backfill():
    test_session = f"test_concurrent_session_{int(time.time())}"
    print(f"Testing concurrent backfill requests for: {test_session}")
    
    caller_results = []
    latencies = []
    
    def call_backfill(caller_id):
        t0 = time.perf_counter()
        job = start_async_backfill(test_session)
        elapsed_ms = (time.perf_counter() - t0) * 1000.0
        caller_results.append((caller_id, job, elapsed_ms))
        print(f"Caller {caller_id}: returned in {elapsed_ms:.2f}ms with status: {job.get('status')}")
    
    # Launch 3 concurrent requests simultaneously using ThreadPoolExecutor
    t_start = time.perf_counter()
    with ThreadPoolExecutor(max_workers=3) as executor:
        futures = [executor.submit(call_backfill, i) for i in range(1, 4)]
        for f in futures:
            f.result()
    total_time_ms = (time.perf_counter() - t_start) * 1000.0
    
    print(f"\nAll 3 callers returned in {total_time_ms:.2f}ms total.")
    
    # Assertions
    assert len(caller_results) == 3, "Expected 3 caller results"
    for cid, job, lat in caller_results:
        assert lat < 500, f"Caller {cid} took {lat}ms (>500ms synchronous blocking detected!)"
        assert job.get("status") == "in_progress", f"Expected in_progress, got {job.get('status')}"
        assert job.get("session_id") == test_session
    
    # Verify exactly 1 job exists in _backfill_jobs for this session
    job_in_registry = get_backfill_job(test_session)
    assert job_in_registry is not None
    assert job_in_registry["session_id"] == test_session
    
    # Check all 3 callers got the exact same job reference or ID
    job_ids = [id(r[1]) for r in caller_results]
    print(f"Job object IDs for the 3 callers: {job_ids}")
    assert len(set(job_ids)) == 1, "Expected all 3 callers to receive the identical job instance"
    
    print("\n✓ SUCCESS: Fix O is holding! Zero synchronous blocking, exactly 1 job instance, zero duplicate worker spawning.")

if __name__ == "__main__":
    test_concurrent_backfill()
