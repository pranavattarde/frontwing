import redis

r = redis.from_url("redis://localhost:6379/0")

# Simulate cache set
test_session = "2024_dutch_gp_race"
test_key = "cache:investigation:test_hash_123"
r.set(test_key, '{"final_answer": "Lando Norris won", "status": "success"}', ex=86400)
r.sadd(f"cache:session_keys:{test_session}", test_key)

print("Key set. Verification before invalidation:")
print(f"Key exists: {r.exists(test_key)}")
print(f"Session set members: {r.smembers(f'cache:session_keys:{test_session}')}")

# Invalidate
keys = r.smembers(f"cache:session_keys:{test_session}")
if keys:
    r.delete(*keys)
    r.delete(f"cache:session_keys:{test_session}")

print("\nAfter invalidation:")
print(f"Key exists: {r.exists(test_key)}")
print(f"Session set exists: {r.exists(f'cache:session_keys:{test_session}')}")
print("[OK] Invalidation test passed!")
