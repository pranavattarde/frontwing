import fastf1
import datetime

print("=== FASTF1 VERSION ===")
print(fastf1.__version__)

print("\n=== FASTF1 2025 SCHEDULE ===")
s25 = fastf1.get_event_schedule(2025)
print(f"Total events in 2025: {len(s25)}")
for _, row in s25.iterrows():
    print(f"Round {row['RoundNumber']:2d} | {row['EventDate'].strftime('%Y-%m-%d')} | {row['EventName']} | {row['Location']} | {row['Country']}")

print("\n=== FASTF1 2026 SCHEDULE ===")
s26 = fastf1.get_event_schedule(2026)
print(f"Total events in 2026: {len(s26)}")
for _, row in s26.iterrows():
    print(f"Round {row['RoundNumber']:2d} | {row['EventDate'].strftime('%Y-%m-%d')} | {row['EventName']} | {row['Location']} | {row['Country']}")
