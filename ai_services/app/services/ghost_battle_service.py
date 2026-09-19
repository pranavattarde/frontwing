"""
ghost_battle_service.py - FastF1 3D Telemetry and Position Data Service for Ghost Battle

Provides authentic F1 position coordinates (X, Y, Z), circuit 3D centerline geometry,
and driver flying lap telemetry for multi-driver ghost battle visualizations.
"""

import sys
import os
import json
import time
import datetime
import logging
from pathlib import Path
import numpy as np
import fastf1

logger = logging.getLogger(__name__)

# Force UTF-8 stdout encoding on Windows
if sys.platform == 'win32':
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

try:
    from langsmith import traceable
except ImportError:
    def traceable(*args, **kwargs):
        def decorator(f):
            return f
        return decorator

# Safe cache directory resolution in both host and container environments
current_file = Path(__file__).resolve()
if (current_file.parents[2] / "cache").exists() or current_file.parents[2].name == "app":
    CACHE_DIR_PATH = current_file.parents[2] / "cache"
elif len(current_file.parents) > 3 and (current_file.parents[3] / "ai_services" / "cache").exists():
    CACHE_DIR_PATH = current_file.parents[3] / "ai_services" / "cache"
else:
    CACHE_DIR_PATH = current_file.parents[2] / "cache"

CACHE_DIR = str(CACHE_DIR_PATH)
os.makedirs(CACHE_DIR, exist_ok=True)
try:
    fastf1.Cache.enable_cache(CACHE_DIR)
except Exception as e:
    pass

CIRCUITS_CACHE_DIR = CACHE_DIR_PATH / "circuits"
CIRCUITS_CACHE_DIR.mkdir(parents=True, exist_ok=True)

# Official Team Color Fallbacks
TEAM_COLORS = {
    'red bull': '#3671C6',
    'red bull racing': '#3671C6',
    'ferrari': '#E80020',
    'scuderia ferrari': '#E80020',
    'mercedes': '#27F4D2',
    'mclaren': '#FF8000',
    'aston martin': '#229971',
    'alpine': '#0093CC',
    'williams': '#64C4FF',
    'rb': '#6692FF',
    'racing bulls': '#6692FF',
    'alpha tauri': '#5E8FAA',
    'alphatauri': '#5E8FAA',
    'sauber': '#52E252',
    'kick sauber': '#52E252',
    'alfa romeo': '#C92D4B',
    'haas': '#B6BABD',
    'haas f1 team': '#B6BABD',
    'audi': '#F50537',
    'cadillac': '#909090'
}

def get_team_color(team_name: str, raw_color: str = None) -> str:
    if raw_color and str(raw_color).strip():
        c = str(raw_color).strip()
        if not c.startswith('#'):
            c = f"#{c}"
        if len(c) == 7:
            return c.upper()
    if not team_name:
        return '#00E5FF'
    lower = team_name.lower().strip()
    for k, v in TEAM_COLORS.items():
        if k in lower:
            return v
    return '#00E5FF'


def get_available_years():
    """
    Returns list of seasons with completed race data.
    FastF1 supports rich telemetry for 2018 through current season.
    """
    now = datetime.datetime.now(datetime.timezone.utc)
    now_naive = now.replace(tzinfo=None)
    current_year = now.year
    
    # Check current season: does it have at least one completed event?
    years = []
    for y in range(current_year, 2017, -1):
        try:
            schedule = fastf1.get_event_schedule(y, include_testing=False)
            if schedule is not None and not schedule.empty:
                # Check if at least one event has passed
                # Use timezone-naive datetime for pandas EventDate compatibility
                past_events = schedule[schedule['EventDate'] <= now_naive]
                if not past_events.empty:
                    years.append(y)
        except Exception:
            # If current year schedule fails, fallback to standard verified years
            if y <= 2026:
                years.append(y)
    
    if not years:
        years = [2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018]
    
    return sorted(list(set(years)), reverse=True)


def get_available_gps(year: int):
    """
    Returns only completed Grand Prix from the specified year with results available.
    """
    now = datetime.datetime.now(datetime.timezone.utc)
    schedule = fastf1.get_event_schedule(year, include_testing=False)
    
    completed_events = []
    if schedule is not None and not schedule.empty:
        for _, row in schedule.iterrows():
            event_date = row['EventDate']
            # Convert to timezone-aware if needed
            if hasattr(event_date, 'tzinfo') and event_date.tzinfo is None:
                event_date = event_date.replace(tzinfo=datetime.timezone.utc)
            
            # Race is completed if date + 1 day is past now
            is_past = event_date < (now + datetime.timedelta(days=1))
            round_num = int(row['RoundNumber']) if 'RoundNumber' in row and str(row['RoundNumber']).isdigit() else 0
            
            if round_num > 0 and is_past:
                event_name = str(row.get('EventName', ''))
                location = str(row.get('Location', ''))
                country = str(row.get('Country', ''))
                
                # Format a canonical session_id: e.g. "2024_british_gp_race"
                clean_name = event_name.lower().replace(' grand prix', '').replace(' gp', '').strip().replace(' ', '_')
                session_id = f"{year}_{clean_name}_gp_race"
                
                completed_events.append({
                    'round': round_num,
                    'year': year,
                    'name': event_name,
                    'location': location,
                    'country': country,
                    'session_id': session_id,
                    'event_date': event_date.strftime('%Y-%m-%d'),
                    'status': 'completed'
                })
                
    return sorted(completed_events, key=lambda x: x['round'])


def parse_session_identifier(session_id: str):
    """
    Parses year and grand prix query name from session_id or identifier.
    e.g. "2024_british_gp_race" -> (2024, "British")
    """
    parts = session_id.split('_')
    if parts[0].isdigit():
        year = int(parts[0])
        # middle parts form GP name
        gp_tokens = [p for p in parts[1:] if p not in ('gp', 'race', 'session')]
        gp_name = ' '.join(gp_tokens).title()
        return year, gp_name
    return 2024, "British"


def get_drivers_teams(session_id: str):
    """
    Returns authentic driver/team roster who actually competed in that specific session.
    Accounts for real-world driver substitutions (e.g. Bearman, Colapinto, Lawson).
    """
    year, gp_name = parse_session_identifier(session_id)
    
    results = None
    event_name = f"{gp_name} Grand Prix"
    official_event_name = f"Formula 1 {gp_name} Grand Prix {year}"
    
    try:
        session = fastf1.get_session(year, gp_name, 'R')
        session.load(telemetry=False, laps=False, weather=False)
        results = session.results
        if session.event is not None and 'EventName' in session.event:
            event_name = session.event['EventName']
            official_event_name = getattr(session.event, 'OfficialEventName', event_name)
    except Exception as e:
        logger.warning(f"FastF1 session load failed for {session_id} ({e}), falling back to database")

    teams_dict = {}
    drivers_list = []
    
    if results is not None and not results.empty:
        for _, row in results.iterrows():
            driver_code = str(row.get('Abbreviation', '')).strip().upper()
            if not driver_code:
                continue
                
            driver_num = int(row['DriverNumber']) if 'DriverNumber' in row and str(row['DriverNumber']).isdigit() else 0
            first_name = str(row.get('FirstName', '')).strip()
            last_name = str(row.get('LastName', '')).strip()
            full_name = f"{first_name} {last_name}".strip() or str(row.get('FullName', driver_code))
            
            team_name = str(row.get('TeamName', 'Unknown Team')).strip()
            raw_color = str(row.get('TeamColor', '')).strip()
            team_color = get_team_color(team_name, raw_color)
            
            team_id = team_name.lower().replace(' ', '_').replace('-', '_')
            driver_id = driver_code.lower()
            
            driver_obj = {
                'id': driver_id,
                'code': driver_code,
                'number': driver_num,
                'first_name': first_name,
                'last_name': last_name,
                'name': full_name,
                'team_id': team_id,
                'team_name': team_name,
                'team_color': team_color,
                'grid_position': int(row.get('GridPosition', 0)) if str(row.get('GridPosition', '')).isdigit() else 0,
                'position': int(row.get('Position', 0)) if str(row.get('Position', '')).isdigit() else 0
            }
            
            drivers_list.append(driver_obj)
            
            if team_id not in teams_dict:
                teams_dict[team_id] = {
                    'id': team_id,
                    'name': team_name,
                    'team_name': team_name,
                    'color': team_color,
                    'team_color': team_color,
                    'drivers': []
                }
            teams_dict[team_id]['drivers'].append(driver_obj)
    else:
        # Fallback to database race_results + drivers + constructors
        from app.core.db import execute_query
        db_rows = execute_query('''
            SELECT rr.driver_id, d.code as driver_code, d.driver_number as driver_num, 
                   d.first_name, d.last_name, 
                   COALESCE(c.name, rr.constructor_id) as team_name,
                   rr.constructor_id, rr.grid_position, rr.position
            FROM race_results rr
            LEFT JOIN drivers d ON (d.id = rr.driver_id OR d.code = UPPER(rr.driver_id))
            LEFT JOIN constructors c ON (c.id = rr.constructor_id)
            WHERE rr.session_id = %s
            ORDER BY rr.position ASC NULLS LAST
        ''', (session_id,), fetch=True)
        
        if not db_rows:
            raise ValueError(f"No results found for session {session_id}")
            
        for row in db_rows:
            driver_code = str(row.get('driver_code') or '').strip().upper()
            if not driver_code:
                driver_code = str(row.get('driver_id', ''))[:3].upper()
            
            first_name = str(row.get('first_name') or '').strip()
            last_name = str(row.get('last_name') or '').strip()
            full_name = f"{first_name} {last_name}".strip() or driver_code
            team_name = str(row.get('team_name') or 'Unknown Team').strip()
            team_color = get_team_color(team_name)
            team_id = str(row.get('constructor_id') or team_name).lower().replace(' ', '_').replace('-', '_')
            driver_id = str(row.get('driver_id') or driver_code).lower()
            driver_num = int(row.get('driver_num') or 0)
            
            driver_obj = {
                'id': driver_id,
                'code': driver_code,
                'number': driver_num,
                'first_name': first_name,
                'last_name': last_name,
                'name': full_name,
                'team_id': team_id,
                'team_name': team_name,
                'team_color': team_color,
                'grid_position': int(row.get('grid_position') or 0),
                'position': int(row.get('position') or 0)
            }
            drivers_list.append(driver_obj)
            
            if team_id not in teams_dict:
                teams_dict[team_id] = {
                    'id': team_id,
                    'name': team_name,
                    'team_name': team_name,
                    'color': team_color,
                    'team_color': team_color,
                    'drivers': []
                }
            teams_dict[team_id]['drivers'].append(driver_obj)
        
    teams_list = list(teams_dict.values())
    
    return {
        'status': 'success',
        'session_id': session_id,
        'year': year,
        'grand_prix': event_name,
        'official_name': official_event_name,
        'total_drivers': len(drivers_list),
        'teams': teams_list,
        'drivers': sorted(drivers_list, key=lambda d: (d['position'] if d['position'] > 0 else 99))
    }


def normalize_and_center_3d(points, target_radius=100.0):
    """
    Centers 3D coordinates around (0,0,0) and scales to a uniform viewport bounding size.
    In FastF1, coordinates are typically X (lateral), Y (longitudinal), Z (elevation) in decimeters.
    For Three.js, we map:
      ThreeX = X_norm
      ThreeY = Z_norm (elevation up)
      ThreeZ = Y_norm (depth)
    """
    if not points:
        return [], 1.0, [0, 0, 0]
        
    pts = np.array(points, dtype=np.float64)
    min_coords = pts.min(axis=0)
    max_coords = pts.max(axis=0)
    center = (min_coords + max_coords) / 2.0
    
    # Centered points
    centered = pts - center
    
    # Calculate scale so max lateral/depth span is target_radius * 2
    span_x = max_coords[0] - min_coords[0]
    span_y = max_coords[1] - min_coords[1]
    max_span = max(span_x, span_y, 1.0)
    
    scale = (target_radius * 2.0) / max_span
    
    # Map to Three.js coordinates: [X, Z, Y] * scale
    # where Y in FastF1 becomes Z in Three.js, and Z (elevation) in FastF1 becomes Y in Three.js
    transformed = []
    for p in centered:
        tx = float(round(p[0] * scale, 3))
        ty = float(round(p[2] * scale * 1.5, 3))  # Elevation slight exaggeration for 3D visibility
        tz = float(round(p[1] * scale, 3))
        transformed.append([tx, ty, tz])
        
    return transformed, float(scale), [float(center[0]), float(center[1]), float(center[2])]


@traceable(name="ghost_battle_3d_pipeline", run_type="chain", tags=["ghost-battle"])
def get_ghost_battle_data(session_id: str, driver_ids: list):
    """
    Fetches fastest valid lap telemetry (including X/Y/Z) for selected drivers,
    plus the authentic 3D circuit track centerline.
    Enforces min 2 / max 22 driver selection.
    """
    if not isinstance(driver_ids, list) or len(driver_ids) < 2 or len(driver_ids) > 22:
        raise ValueError(f"Invalid driver selection: minimum 2 and maximum 22 drivers required (received {len(driver_ids) if isinstance(driver_ids, list) else 0}).")
        
    year, gp_name = parse_session_identifier(session_id)
    
    session = fastf1.get_session(year, gp_name, 'R')
    session.load(telemetry=True, laps=True, weather=False)
    
    circuit_name = session.event.get('Location', gp_name)
    circuit_key = gp_name.lower().replace(' ', '_')
    
    # Normalize requested driver codes
    target_drivers = [str(d).strip().upper() for d in driver_ids]
    
    processed_drivers = []
    raw_centerline_points = None
    
    # Find quickest overall lap across the session to identify circuit centerline
    overall_fastest = session.laps.pick_fastest()
    if overall_fastest is not None and not overall_fastest.empty:
        try:
            overall_telem = overall_fastest.get_telemetry()
            if 'X' in overall_telem.columns and 'Y' in overall_telem.columns and 'Z' in overall_telem.columns:
                step = max(1, len(overall_telem) // 600)
                sub_telem = overall_telem.iloc[::step]
                raw_centerline_points = [[float(r['X']), float(r['Y']), float(r['Z'])] for _, r in sub_telem.iterrows()]
        except Exception as e:
            pass

    # Extract for each target driver
    for code in target_drivers:
        # Find driver in results for metadata
        drv_result = session.results[session.results['Abbreviation'] == code]
        driver_name = code
        team_name = "Formula 1 Team"
        raw_color = ""
        if not drv_result.empty:
            row = drv_result.iloc[0]
            first_name = str(row.get('FirstName', ''))
            last_name = str(row.get('LastName', ''))
            driver_name = f"{first_name} {last_name}".strip() or str(row.get('FullName', code))
            team_name = str(row.get('TeamName', 'Formula 1 Team'))
            raw_color = str(row.get('TeamColor', ''))
            
        team_color = get_team_color(team_name, raw_color)
        
        # Pick driver fastest lap
        try:
            drv_laps = session.laps.pick_driver(code).pick_quicklaps()
            if drv_laps.empty:
                drv_laps = session.laps.pick_driver(code)
        except Exception:
            drv_laps = session.laps[session.laps['Driver'] == code]
            
        if drv_laps.empty:
            continue
            
        fastest_lap = drv_laps.pick_fastest()
        if fastest_lap is None or fastest_lap.empty:
            continue
            
        lap_time_s = float(fastest_lap['LapTime'].total_seconds())
        lap_num = int(fastest_lap['LapNumber'])
        
        # Sector times
        def fmt_sec(val):
            if val is None or (hasattr(val, 'total_seconds') and np.isnan(val.total_seconds())):
                return "—"
            return f"{val.total_seconds():.3f}s"
            
        s1_str = fmt_sec(fastest_lap.get('Sector1Time'))
        s2_str = fmt_sec(fastest_lap.get('Sector2Time'))
        s3_str = fmt_sec(fastest_lap.get('Sector3Time'))
        
        # Format mm:ss.sss
        mins = int(lap_time_s // 60)
        secs = lap_time_s % 60
        lap_time_str = f"{mins}:{secs:06.3f}"
        
        # Telemetry
        telem = fastest_lap.get_telemetry()
        top_speed = float(telem['Speed'].max()) if 'Speed' in telem.columns else 300.0
        avg_speed = float(telem['Speed'].mean()) if 'Speed' in telem.columns else 220.0
        
        if raw_centerline_points is None and 'X' in telem.columns and 'Y' in telem.columns and 'Z' in telem.columns:
            step = max(1, len(telem) // 600)
            sub_telem = telem.iloc[::step]
            raw_centerline_points = [[float(r['X']), float(r['Y']), float(r['Z'])] for _, r in sub_telem.iterrows()]

        # Downsample telemetry for 3D transmission (~600 points per lap)
        step = max(1, len(telem) // 600)
        sampled = telem.iloc[::step]
        
        points = []
        for _, pt in sampled.iterrows():
            t_sec = pt['Time'].total_seconds() if hasattr(pt['Time'], 'total_seconds') else 0.0
            points.append({
                't': round(float(t_sec), 3),
                'd': round(float(pt.get('Distance', 0)), 1),
                's': round(float(pt.get('Speed', 0)), 1),
                'th': int(pt.get('Throttle', 0)),
                'br': 1 if pt.get('Brake', False) else 0,
                'g': int(pt.get('nGear', 0)) if str(pt.get('nGear', '')).isdigit() else 0,
                'raw_x': float(pt.get('X', 0)),
                'raw_y': float(pt.get('Y', 0)),
                'raw_z': float(pt.get('Z', 0))
            })
            
        processed_drivers.append({
            'driver_id': code.lower(),
            'code': code,
            'name': driver_name,
            'team_name': team_name,
            'team_color': team_color,
            'lap_time_s': round(lap_time_s, 3),
            'lap_time_str': lap_time_str,
            'lap_number': lap_num,
            'sector_1': s1_str,
            'sector_2': s2_str,
            'sector_3': s3_str,
            'top_speed': round(top_speed, 1),
            'avg_speed': round(avg_speed, 1),
            'telemetry': points
        })
        
    if len(processed_drivers) < 2:
        raise ValueError(f"Only found valid telemetry for {len(processed_drivers)} of the selected drivers. Minimum 2 required.")
        
    # Sort drivers by lap time ascending (P1 first)
    processed_drivers = sorted(processed_drivers, key=lambda d: d['lap_time_s'])
    fastest_time = processed_drivers[0]['lap_time_s']
    for idx, d in enumerate(processed_drivers):
        delta = d['lap_time_s'] - fastest_time
        d['rank'] = idx + 1
        d['delta'] = f"+{delta:.3f}s" if delta > 0.0001 else "FASTEST"
        
    # Normalize 3D track centerline and driver position coordinates using uniform bounds
    normalized_centerline, scale_factor, center_offset = normalize_and_center_3d(raw_centerline_points, target_radius=120.0)
    
    # Apply identical transformation to each driver's telemetry points
    for drv in processed_drivers:
        for pt in drv['telemetry']:
            px = (pt['raw_x'] - center_offset[0]) * scale_factor
            py = (pt['raw_z'] - center_offset[2]) * scale_factor * 1.5
            pz = (pt['raw_y'] - center_offset[1]) * scale_factor
            pt['x'] = round(float(px), 3)
            pt['y'] = round(float(py), 3)
            pt['z'] = round(float(pz), 3)
            # Remove raw coordinates to keep payload compact
            del pt['raw_x']
            del pt['raw_y']
            del pt['raw_z']

    # Cache circuit centerline to disk if not exists
    circuit_cache_file = CIRCUITS_CACHE_DIR / f"{circuit_key}_centerline.json"
    if not circuit_cache_file.exists() and normalized_centerline:
        try:
            with open(circuit_cache_file, 'w', encoding='utf-8') as f:
                json.dump({
                    'circuit_key': circuit_key,
                    'circuit_name': circuit_name,
                    'points': normalized_centerline
                }, f)
        except Exception:
            pass

    return {
        'status': 'success',
        'session_id': session_id,
        'year': year,
        'grand_prix': session.event['EventName'],
        'circuit': {
            'name': session.event.get('Location', gp_name),
            'key': circuit_key,
            'centerline': normalized_centerline,
            'total_points': len(normalized_centerline)
        },
        'fastest_lap_time_s': fastest_time,
        'drivers': processed_drivers
    }


def main():
    if len(sys.argv) < 2:
        print(json.dumps({'error': 'No action specified'}))
        sys.exit(1)
        
    action = sys.argv[1]
    
    try:
        if action == 'available_years':
            years = get_available_years()
            print(json.dumps({'status': 'success', 'years': years}))
            
        elif action == 'available_gps':
            year = int(sys.argv[2]) if len(sys.argv) > 2 else 2024
            gps = get_available_gps(year)
            print(json.dumps({'status': 'success', 'year': year, 'gps': gps}))
            
        elif action == 'drivers_teams':
            session_id = sys.argv[2] if len(sys.argv) > 2 else "2024_british_gp_race"
            roster = get_drivers_teams(session_id)
            print(json.dumps(roster))
            
        elif action == 'ghost_battle_data':
            if len(sys.argv) > 3:
                session_id = sys.argv[2]
                driver_ids = [d.strip() for d in sys.argv[3].split(',') if d.strip()]
            else:
                try:
                    payload = json.loads(sys.argv[2])
                    session_id = payload.get('session_id')
                    driver_ids = payload.get('driver_ids', [])
                except Exception:
                    session_id = sys.argv[2]
                    driver_ids = []
            data = get_ghost_battle_data(session_id, driver_ids)
            print(json.dumps(data))
            
        else:
            print(json.dumps({'error': f'Unknown action: {action}'}))
            sys.exit(1)
            
    except Exception as e:
        print(json.dumps({'status': 'error', 'message': str(e)}))
        sys.exit(1)

if __name__ == '__main__':
    main()
