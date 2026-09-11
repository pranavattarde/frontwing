import fastf1
import datetime

print("FastF1 version:", fastf1.__version__)
now = datetime.datetime.now()
print("Current system date:", now)

for year in [2024, 2025, 2026]:
    try:
        schedule = fastf1.get_event_schedule(year)
        print(f"\n--- Schedule for {year} (Total events: {len(schedule)}) ---")
        completed = []
        for _, row in schedule.iterrows():
            event_name = row.get("EventName")
            event_date = row.get("EventDate")
            round_num = row.get("RoundNumber")
            # Check if event has happened
            if event_date is not None:
                # Pandas Timestamp or date
                completed.append((round_num, event_name, str(event_date)))
        print(f"Sample events in {year}:")
        for r in completed[:5]:
            print("  ", r)
        if len(completed) > 5:
            print("   ...")
            for r in completed[-3:]:
                print("  ", r)
    except Exception as e:
        print(f"Error getting schedule for {year}: {e}")
