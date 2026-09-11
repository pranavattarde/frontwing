import fastf1

print("Testing 2025 Australia laps loading...")
try:
    s25 = fastf1.get_session(2025, "Australia", "R")
    s25.load(laps=True, telemetry=False, weather=False)
    print("2025 Australia laps loaded successfully! Total laps:", len(s25.laps))
except Exception as e:
    print("2025 Australia laps error:", e)

print("\nTesting 2025 Monaco laps loading...")
try:
    s25_m = fastf1.get_session(2025, "Monaco", "R")
    s25_m.load(laps=True, telemetry=False, weather=False)
    print("2025 Monaco laps loaded successfully! Total laps:", len(s25_m.laps))
except Exception as e:
    print("2025 Monaco laps error:", e)
