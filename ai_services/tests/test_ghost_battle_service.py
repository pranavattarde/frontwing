import pytest
from app.services.ghost_battle_service import (
    get_available_years,
    get_available_gps,
    get_drivers_teams,
    get_team_color
)

def test_available_years_includes_2026_and_past_seasons():
    years = get_available_years()
    assert isinstance(years, list)
    assert len(years) >= 5
    assert 2026 in years
    assert 2024 in years
    # Verify sorted descending
    assert years == sorted(years, reverse=True)

def test_available_gps_for_2026():
    gps_2026 = get_available_gps(2026)
    assert isinstance(gps_2026, list)
    assert len(gps_2026) > 0
    # First race should be Australian GP
    first_round = gps_2026[0]
    assert first_round['year'] == 2026
    assert first_round['round'] == 1
    assert 'australian' in first_round['session_id'].lower()

def test_drivers_teams_for_2026_grid():
    roster = get_drivers_teams("2026_australian_gp_race")
    assert roster['status'] == 'success'
    assert roster['year'] == 2026
    assert len(roster['teams']) >= 10
    assert len(roster['drivers']) >= 20

    team_names = [t['name'].lower() for t in roster['teams']]
    # Verify 2026 new teams are present
    assert any('audi' in name for name in team_names)
    assert any('cadillac' in name for name in team_names)

    # Verify 2026 driver moves (Hamilton at Ferrari, Antonelli at Mercedes)
    driver_map = {d['code']: d for d in roster['drivers']}
    assert 'HAM' in driver_map
    assert 'ferrari' in driver_map['HAM']['team_name'].lower()
    assert 'ANT' in driver_map
    assert 'mercedes' in driver_map['ANT']['team_name'].lower()

def test_team_colors_fallback():
    assert get_team_color("Audi") == "#F50537"
    assert get_team_color("Cadillac") == "#909090"
    assert get_team_color("Ferrari") == "#E80020"
    assert get_team_color("Mercedes") == "#27F4D2"
