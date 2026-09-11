import fastf1

print("--- Testing 2025 Sessions in FastF1 ---")
for r in [1, 2, 3, 7, 8]:
    try:
        session = fastf1.get_session(2025, r, 'R')
        session.load(laps=False, telemetry=False, weather=False, messages=False)
        results = session.results
        print(f"2025 Round {r} ({session.event['EventName']}): Loaded successfully! Total classified drivers: {len(results)}")
        if not results.empty and 'FullName' in results.columns:
            winner = results.iloc[0]['FullName']
            team = results.iloc[0]['TeamName']
            print(f"   Winner: P1 {winner} ({team})")
    except Exception as e:
        print(f"2025 Round {r}: Failed to load: {e}")

print("\n--- Testing 2026 Sessions in FastF1 ---")
for r in [1, 2, 4, 5, 8]:
    try:
        session = fastf1.get_session(2026, r, 'R')
        session.load(laps=False, telemetry=False, weather=False, messages=False)
        results = session.results
        print(f"2026 Round {r} ({session.event['EventName']}): Loaded successfully! Total classified drivers: {len(results)}")
        if not results.empty and 'FullName' in results.columns:
            winner = results.iloc[0]['FullName']
            team = results.iloc[0]['TeamName']
            print(f"   Winner: P1 {winner} ({team})")
    except Exception as e:
        print(f"2026 Round {r}: Failed to load: {e}")
