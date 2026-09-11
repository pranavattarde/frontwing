import fastf1
import datetime
from datetime import timezone

def get_real_world_current_season() -> int:
    """
    Returns the actual current F1 season (e.g. 2026 or latest available from fastf1).
    """
    now_year = datetime.datetime.now(timezone.utc).year
    # Try current year schedule, or step back if current year has no schedule
    for y in [now_year, now_year - 1, now_year - 2]:
        try:
            sched = fastf1.get_event_schedule(y)
            if sched is not None and len(sched) > 0:
                return y
        except Exception:
            continue
    return now_year

print("Real world current season:", get_real_world_current_season())

# Test checking schedule for an event in 2026
sched_2026 = fastf1.get_event_schedule(2026)
print("\n2026 Events and dates:")
now_utc = datetime.datetime.now(timezone.utc)
for idx, row in sched_2026.iterrows():
    ev_date = row.get("EventDate")
    ev_name = row.get("EventName")
    ev_loc = row.get("Location")
    ev_round = row.get("RoundNumber")
    if ev_date is not None:
        # Check if past
        is_past = ev_date.replace(tzinfo=timezone.utc) <= now_utc
        if is_past:
            print(f"  PAST: Round {ev_round}: {ev_name} ({ev_loc}) on {ev_date}")
        else:
            print(f"  FUTURE: Round {ev_round}: {ev_name} ({ev_loc}) on {ev_date}")
            break
