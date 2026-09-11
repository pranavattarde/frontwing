import sys
import os

sys.path.insert(0, "ai_services")

from app.ingestion.openf1_collector import openf1_collector

print("Testing OpenF1Collector...")

# Test 1: Driver number resolution
ver_num = openf1_collector.get_driver_number("verstappen")
lec_num = openf1_collector.get_driver_number("leclerc")
ham_num = openf1_collector.get_driver_number("hamilton")
print(f"Driver numbers: VER={ver_num}, LEC={lec_num}, HAM={ham_num}")
assert ver_num == 1
assert lec_num == 16
assert ham_num == 44

# Test 2: Session key resolution
dutch_key = openf1_collector.get_session_key(2024, "dutch")
silverstone_key = openf1_collector.get_session_key(2024, "silverstone")
pre2023_key = openf1_collector.get_session_key(2022, "silverstone")
print(f"Session keys: 2024 Dutch={dutch_key}, 2024 Silverstone={silverstone_key}, 2022 British={pre2023_key}")
assert dutch_key == 9599
assert silverstone_key == 9558
assert pre2023_key is None

# Test 3: Pit stops retrieval
dutch_pits_ver = openf1_collector.get_pit_stops(session_id="2024_dutch_gp_race", driver_id="verstappen")
print(f"2024 Dutch GP Verstappen OpenF1 pit stops: {dutch_pits_ver}")
assert len(dutch_pits_ver) == 1
assert dutch_pits_ver[0]["lap_number"] == 27

# Test 4: Cross-check agreement (2024 Dutch GP - Verstappen)
fastf1_pits_ver = [{"pit_stop_number": 1, "lap": 27, "compound_in": "MEDIUM", "compound_out": "HARD"}]
check_ver = openf1_collector.cross_check_pit_stops("2024_dutch_gp_race", "verstappen", fastf1_pits_ver)
print(f"Cross-check 2024 Dutch VER status: {check_ver['status']}, narrative_note: '{check_ver['narrative_note']}'")
assert check_ver["status"] == "verified"
assert check_ver["narrative_note"] == ""
assert check_ver["comparisons"][0]["agrees"] is True

# Test 5: Cross-check discrepancy (2024 British GP - Hamilton)
# FastF1 stint ended on lap 27, OpenF1 logs pit entry on lap 28
fastf1_pits_ham = [
    {"pit_stop_number": 1, "lap": 27, "compound_in": "MEDIUM", "compound_out": "INTERMEDIATE"},
    {"pit_stop_number": 2, "lap": 38, "compound_in": "INTERMEDIATE", "compound_out": "SOFT"}
]
check_ham = openf1_collector.cross_check_pit_stops("2024_british_gp_race", "hamilton", fastf1_pits_ham)
print(f"Cross-check 2024 British HAM status: {check_ham['status']}, narrative_note: '{check_ham['narrative_note']}'")
assert check_ham["status"] == "discrepancy"
assert "FastF1 and OpenF1 pit lap data disagree" in check_ham["narrative_note"]
assert check_ham["comparisons"][0]["agrees"] is False
assert check_ham["comparisons"][1]["agrees"] is True

# Test 6: Pre-2023 session fallback (2022 British GP)
fastf1_pits_2022 = [{"pit_stop_number": 1, "lap": 1, "compound_in": "SOFT", "compound_out": "MEDIUM"}]
check_2022 = openf1_collector.cross_check_pit_stops("2022_british_gp_race", "verstappen", fastf1_pits_2022)
print(f"Cross-check 2022 British status: {check_2022['status']}, message: '{check_2022['message']}'")
assert check_2022["status"] == "unavailable"
assert "pre-2023 event" in check_2022["message"]

print("All OpenF1Collector standalone tests passed 100%!")
