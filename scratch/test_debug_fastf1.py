import logging
import fastf1

logging.basicConfig(level=logging.DEBUG)
fastf1.set_log_level('DEBUG')

print("Fetching session for 2026 British GP...")
s = fastf1.get_session(2026, 'Silverstone', 'R')
print("Session got:", s)
print("Now loading with laps=False, telemetry=False...")
s.load(laps=False, telemetry=False, weather=False)
print("Results loaded! Len:", len(s.results))
print("Drivers:", s.results['Abbreviation'].tolist())
