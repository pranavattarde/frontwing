import urllib.request
import urllib.parse
import json
import time

BASE_URL = "http://localhost:5000/api"

def make_request(url, method="GET", headers=None, data=None):
    if headers is None:
        headers = {}
    if data is not None:
        if isinstance(data, dict):
            data_bytes = json.dumps(data).encode("utf-8")
            headers["Content-Type"] = "application/json"
        else:
            data_bytes = data
    else:
        data_bytes = None

    req = urllib.request.Request(url, data=data_bytes, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as resp:
            body = resp.read().decode("utf-8")
            return resp.status, json.loads(body) if body else {}
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        try:
            return e.code, json.loads(body)
        except Exception:
            return e.code, {"error": body}

def run_e2e_test():
    print("==================================================")
    print("FRONTWING E2E MVP REGRESSION TEST SUITE")
    print("==================================================")

    # 1. Health check
    status, body = make_request("http://localhost:5000/health")
    print(f"1. Express Gateway Health: Status {status} -> {body}")
    assert status == 200, "Express Gateway unhealthy"

    # 2. Registration
    email = f"e2e_user_{int(time.time())}@frontwing.com"
    reg_payload = {"email": email, "name": "E2E User", "password": "TestPassword123!"}
    status, reg_res = make_request(f"{BASE_URL}/auth/register", method="POST", data=reg_payload)
    print(f"2. Auth Registration: Status {status}")
    assert status in (200, 201), f"Registration failed: {reg_res}"
    token = reg_res.get("token")
    user_id = reg_res.get("user", {}).get("id")
    print(f"   User registered with ID: {user_id}, Token received: {'YES' if token else 'NO'}")

    # 3. Protected Route without Token (Should reject 401)
    status, err_res = make_request(f"{BASE_URL}/history", method="GET")
    print(f"3. Unauthenticated History Access: Status {status} (Expected 401)")
    assert status == 401, f"Expected 401, got {status}"

    # 4. Authenticated /me
    auth_headers = {"Authorization": f"Bearer {token}"}
    status, me_res = make_request(f"{BASE_URL}/auth/me", method="GET", headers=auth_headers)
    print(f"4. Authenticated /me: Status {status} -> Email: {me_res.get('user', {}).get('email')}")
    assert status == 200, f"/me failed: {me_res}"

    # 5. Race Questions Verification Suite (Phase 4)
    questions = [
        "Who won Monaco GP?",
        "Who won British GP?",
        "Who won Hungarian GP?",
        "Who won Austrian GP?",
        "Who finished P3 in Monaco GP?"
    ]

    investigation_ids = []
    print("\n--- PHASE 4: RACE QUESTIONS VERIFICATION ---")
    for idx, q in enumerate(questions, 1):
        payload = {"question": q}
        t0 = time.time()
        status, q_res = make_request(f"{BASE_URL}/engineer/query", method="POST", headers=auth_headers, data=payload)
        latency = int((time.time() - t0) * 1000)
        print(f"Query #{idx}: '{q}' (Latency: {latency}ms)")
        assert status == 200, f"Query failed: {q_res}"
        
        answer = q_res.get("final_answer", "")
        inv_id = q_res.get("id")
        cached = q_res.get("cached", False)
        print(f"   Answer: {answer}")
        print(f"   Investigation ID: {inv_id} | Cached: {cached}")
        assert answer and "won" in answer or "finished" in answer or "P3" in answer, f"Invalid answer text: {answer}"
        assert inv_id, "Missing backend UUID investigation ID"
        investigation_ids.append(inv_id)

    # 6. Cache Test (Phase 5)
    print("\n--- PHASE 5: REDIS CACHE TEST ---")
    q_cache = "Who won Monaco GP?"
    t0 = time.time()
    status, cache_res = make_request(f"{BASE_URL}/engineer/query", method="POST", headers=auth_headers, data={"question": q_cache})
    cache_latency = int((time.time() - t0) * 1000)
    print(f"Cache Query: '{q_cache}' (Latency: {cache_latency}ms)")
    print(f"   Cached Flag: {cache_res.get('cached')} | Answer: {cache_res.get('final_answer')}")
    assert status == 200 and cache_res.get("cached") == True, "Redis cache lookup failed"
    assert cache_latency < 500, f"Cache latency too high: {cache_latency}ms"

    # 7. History Test (Phase 6)
    print("\n--- PHASE 6: HISTORY TEST ---")
    status, hist_res = make_request(f"{BASE_URL}/history", method="GET", headers=auth_headers)
    print(f"History Fetch: Status {status}")
    assert status == 200, f"History fetch failed: {hist_res}"
    history_items = hist_res.get("investigations") or hist_res.get("history", [])
    print(f"   Total History Items Found: {len(history_items)}")
    assert len(history_items) >= 5, f"Expected at least 5 history items, got {len(history_items)}"

    # Verify each history item restores correctly
    target_id = investigation_ids[0]
    status, thread_res = make_request(f"{BASE_URL}/history/{target_id}", method="GET", headers=auth_headers)
    print(f"   Restoring Thread {target_id}: Status {status}")
    assert status == 200, f"Thread restore failed: {thread_res}"
    restored_q = thread_res.get("question") or thread_res.get("investigation", {}).get("question")
    print(f"   Restored Question: {restored_q}")
    assert "Monaco" in str(restored_q), f"Thread question mismatch: {restored_q}"

    # 8. Save / Bookmark Test (Phase 7)
    print("\n--- PHASE 7: SAVE / BOOKMARK TEST ---")
    status, save_res = make_request(f"{BASE_URL}/history/save/{target_id}", method="POST", headers=auth_headers)
    print(f"Save Investigation {target_id}: Status {status} -> {save_res}")
    assert status == 200, f"Save failed: {save_res}"

    # Check bookmarks / saved list
    status, bm_res = make_request(f"{BASE_URL}/history?bookmarked=true", method="GET", headers=auth_headers)
    print(f"Fetch Saved Investigations: Status {status}")
    bookmarked_list = bm_res.get("investigations") or bm_res.get("history", [])
    assert any(item.get("id") == target_id for item in bookmarked_list), "Saved item missing from bookmarks"
    print(f"   Saved Investigation confirmed in bookmarked list!")

    # 9. Delete History Test
    del_id = investigation_ids[-1]
    status, del_res = make_request(f"{BASE_URL}/history/{del_id}", method="DELETE", headers=auth_headers)
    print(f"\n9. Delete History Item {del_id}: Status {status}")
    assert status == 200, f"Delete failed: {del_res}"

    # Verify deleted item is no longer in history
    status, hist_after = make_request(f"{BASE_URL}/history", method="GET", headers=auth_headers)
    after_items = hist_after.get("investigations") or hist_after.get("history", [])
    after_ids = [item.get("id") for item in after_items]
    assert del_id not in after_ids, "Deleted item still present in history"
    print("   Deleted item confirmed removed from history!")

    print("\n==================================================")
    print("ALL MVP BACKEND & END-TO-END CONTRACT TESTS PASSED!")
    print("==================================================")

if __name__ == "__main__":
    run_e2e_test()
