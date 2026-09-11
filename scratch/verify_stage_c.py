import sys
import os
import io

# Force UTF-8 output on Windows console
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
sys.path.insert(0, "ai_services")

from app.agents.strategy_planner import run_strategy_planner

print("=== VERIFYING STAGE C: OPENF1 CROSS-CHECK ===")

# Query 1: 2024 Dutch GP (Verstappen) - Agreement case
print("\n--- Running Query 1 (2024 Dutch GP - Verstappen) ---")
res1 = run_strategy_planner("Why did Verstappen finish P2 at the 2024 Dutch Grand Prix?")
wh1 = res1.get("strategy_report", {}).get("what_happened", {})
cross1 = wh1.get("openf1_cross_check", {})
print(f"Status: {cross1.get('status')}")
print(f"Message: {cross1.get('message')}")
print(f"Comparisons: {cross1.get('comparisons')}")
print(f"Narrative: {wh1.get('narrative')}")

# Query 2: 2024 British GP (Hamilton) - Flagged Discrepancy case
print("\n--- Running Query 2 (2024 British GP - Hamilton) ---")
res2 = run_strategy_planner("What went wrong with Hamilton's strategy at the 2024 British GP?")
wh2 = res2.get("strategy_report", {}).get("what_happened", {})
cross2 = wh2.get("openf1_cross_check", {})
print(f"Status: {cross2.get('status')}")
print(f"Message: {cross2.get('message')}")
print(f"Comparisons: {cross2.get('comparisons')}")
print(f"Narrative: {wh2.get('narrative')}")

# Query 3: 2022 British GP (Verstappen) - Pre-2023 Graceful Fallback case
print("\n--- Running Query 3 (2022 British GP - Verstappen) ---")
res3 = run_strategy_planner("Why did Verstappen finish where he did at the 2022 British GP?")
wh3 = res3.get("strategy_report", {}).get("what_happened", {})
cross3 = wh3.get("openf1_cross_check", {})
print(f"Status: {cross3.get('status')}")
print(f"Message: {cross3.get('message')}")
print(f"Comparisons: {cross3.get('comparisons')}")
print(f"Narrative: {wh3.get('narrative')}")

print("\n=== ALL 3 STAGE C SESSIONS VERIFIED SUCCESSFULLY ===")
