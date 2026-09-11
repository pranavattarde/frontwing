import fastf1
import datetime

# Check what sessions can be loaded for 2025 and 2026
print("Testing FastF1 session loading for 2025 and 2026...")

tests = [
    (2025, "Australia", "R"),
    (2025, "Monaco", "R"),
    (2026, "Australia", "R"),
    (2026, "Monaco", "R"),
    (2026, "Silverstone", "R"),
]

for year, gp, stype in tests:
    print(f"\nAttempting to get session: {year} {gp} {stype}")
    try:
        sess = fastf1.get_session(year, gp, stype)
        print("  Session event name:", sess.event.get('EventName'))
        print("  Session event date:", sess.event.get('EventDate'))
        # Try loading race results only (lightweight, no full telemetry)
        try:
            sess.load(laps=False, telemetry=False, weather=False, messages=False)
            results = sess.results
            print(f"  Results loaded: {len(results)} rows")
            if len(results) > 0:
                print("  Top 3:", results[['Position', 'Abbreviation', 'TeamName']].head(3).to_dict(orient='records'))
        except Exception as e:
            print("  Failed to load results:", e)
    except Exception as e:
        print("  Failed to get session:", e)
