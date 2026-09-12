import sys
import os
import json
import fastf1
import numpy as np

# Enable cache
fastf1.Cache.enable_cache(os.path.expanduser('~/AppData/Local/Temp/fastf1'))

def test_session(year, gp, session_type='R', drivers=['HAM', 'VER', 'NOR']):
    print(f"Loading session {year} {gp} {session_type}...")
    session = fastf1.get_session(year, gp, session_type)
    session.load(telemetry=True, laps=True, weather=False)
    
    # 1. Roster test
    results = session.results
    print(f"Total drivers in results: {len(results)}")
    roster = []
    for _, row in results.iterrows():
        driver_code = str(row['Abbreviation']) if 'Abbreviation' in row else ''
        driver_num = int(row['DriverNumber']) if 'DriverNumber' in row and str(row['DriverNumber']).isdigit() else 0
        driver_name = f"{row.get('FirstName', '')} {row.get('LastName', '')}".strip() or row.get('FullName', driver_code)
        team_name = str(row.get('TeamName', ''))
        team_color = str(row.get('TeamColor', ''))
        if team_color and not team_color.startswith('#'):
            team_color = f"#{team_color}"
        roster.append({
            'code': driver_code,
            'number': driver_num,
            'name': driver_name,
            'team_name': team_name,
            'team_color': team_color or '#00E5FF'
        })
    print(f"Sample roster (first 3): {roster[:3]}")

    # 2. Fastest lap & telemetry for target drivers
    output_drivers = []
    track_centerline = None

    for code in drivers:
        drv_laps = session.laps.pick_driver(code).pick_quicklaps()
        if drv_laps.empty:
            drv_laps = session.laps.pick_driver(code)
        if drv_laps.empty:
            print(f"No laps found for {code}")
            continue
        
        fastest = drv_laps.pick_fastest()
        if fastest is None or fastest.empty:
            print(f"No fastest lap for {code}")
            continue
            
        lap_time_s = fastest['LapTime'].total_seconds()
        lap_num = int(fastest['LapNumber'])
        s1 = fastest['Sector1Time'].total_seconds() if fastest['Sector1Time'] is not None and not np.isnan(fastest['Sector1Time'].total_seconds()) else None
        s2 = fastest['Sector2Time'].total_seconds() if fastest['Sector2Time'] is not None and not np.isnan(fastest['Sector2Time'].total_seconds()) else None
        s3 = fastest['Sector3Time'].total_seconds() if fastest['Sector3Time'] is not None and not np.isnan(fastest['Sector3Time'].total_seconds()) else None
        
        telem = fastest.get_telemetry()
        # telem has Time, Distance, Speed, Throttle, Brake, nGear, X, Y, Z
        print(f"Driver {code}: lap {lap_num}, time {lap_time_s:.3f}s, telem points: {len(telem)}")
        
        # Extract and downsample points if needed (e.g. ~400-600 points)
        step = max(1, len(telem) // 500)
        downsampled = telem.iloc[::step]
        
        points = []
        for _, pt in downsampled.iterrows():
            t_sec = pt['Time'].total_seconds() if hasattr(pt['Time'], 'total_seconds') else 0.0
            points.append({
                't': round(t_sec, 3),
                'd': round(float(pt['Distance']), 1),
                's': round(float(pt['Speed']), 1),
                'th': int(pt['Throttle']),
                'br': 1 if pt['Brake'] else 0,
                'g': int(pt['nGear']) if str(pt['nGear']).isdigit() else 0,
                'x': round(float(pt['X']), 2),
                'y': round(float(pt['Y']), 2),
                'z': round(float(pt['Z']), 2)
            })
            
        output_drivers.append({
            'code': code,
            'lap_time_s': round(lap_time_s, 3),
            'lap_number': lap_num,
            'top_speed': round(float(telem['Speed'].max()), 1),
            'points_count': len(points)
        })
        
        if track_centerline is None:
            # Use fastest lap for centerline
            track_centerline = [[p['x'], p['y'], p['z']] for p in points]

    print(f"Processed {len(output_drivers)} drivers. Track centerline points: {len(track_centerline) if track_centerline else 0}")
    print("Test passed successfully!")

if __name__ == '__main__':
    test_session(2024, 'British', 'R')
