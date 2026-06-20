import unittest
from app.scoring.strategy_score import calculate_strategy_score
from app.scoring.tire_score import calculate_tire_score
from app.scoring.pace_score import calculate_pace_score
from app.scoring.pitstop_score import calculate_pitstop_score
from app.scoring.execution_score import calculate_execution_score
from app.scoring.aggregator import calculate_race_scores

class TestF1IntelligenceScoring(unittest.TestCase):
    def setUp(self):
        # 1. Mock Verstappen (Red Bull) 2024 Austrian GP
        self.verstappen_data = {
            "session_id": "2024_austria_gp_race",
            "driver_id": "verstappen",
            "total_laps": 71,
            "sc_laps": 4,
            "clean_air_laps": 62,
            "pit_stops": [
                {"lap": 23, "position_before": 1, "position_after": 1, "t_stationary": 2.2, "t_pit_lane": 21.0, "is_forced_stop": False},
                {"lap": 51, "position_before": 1, "position_after": 1, "t_stationary": 6.5, "t_pit_lane": 25.4, "is_forced_stop": False},
                {"lap": 65, "position_before": 1, "position_after": 5, "t_stationary": 2.2, "t_pit_lane": 21.0, "is_forced_stop": True} # forced puncture
            ],
            "stints": [
                {"compound": "MEDIUM", "length": 23, "optimal_length": 26, "clean_laps_times": [70.5, 70.4, 70.3], "is_forced": False},
                {"compound": "HARD", "length": 28, "optimal_length": 34, "clean_laps_times": [69.995, 69.990, 69.985], "is_forced": False}, # custom slope 0.055
                {"compound": "MEDIUM", "length": 14, "optimal_length": 26, "clean_laps_times": [70.5, 70.5, 70.5], "is_forced": True} # forced stint
            ],
            "grid_median_deg": {
                "MEDIUM": 0.080,
                "HARD": 0.050
            },
            "driver_clean_laps_mean": 70.800,
            "driver_clean_laps_std": 0.350,
            "driver_optimal_lap": 69.950,
            "teammate_optimal_lap": 71.950,
            "t_pit_lane_opt": 20.80,
            "penalties_count": 1,
            "warnings_count": 1,
            "lockups_count": 1,
            "p_start": 1,
            "p_finish": 5
        }

        # 2. Mock Piastri (McLaren) 2024 Austrian GP
        self.piastri_data = {
            "session_id": "2024_austria_gp_race",
            "driver_id": "piastri",
            "total_laps": 71,
            "sc_laps": 4,
            "clean_air_laps": 50,
            "pit_stops": [
                {"lap": 21, "position_before": 5, "position_after": 6, "t_stationary": 2.4, "t_pit_lane": 21.2, "is_forced_stop": False},
                {"lap": 52, "position_before": 2, "position_after": 3, "t_stationary": 2.3, "t_pit_lane": 21.1, "is_forced_stop": False}
            ],
            "stints": [
                {"compound": "MEDIUM", "length": 21, "optimal_length": 26, "clean_laps_times": [70.025, 70.050, 70.075], "is_forced": False}, # slope 0.085
                {"compound": "HARD", "length": 31, "optimal_length": 34, "clean_laps_times": [70.5, 70.4, 70.3], "is_forced": False}, # slope negative/neutral
                {"compound": "MEDIUM", "length": 19, "optimal_length": 26, "clean_laps_times": [70.5, 70.4, 70.3], "is_forced": False} # slope negative/neutral
            ],
            "grid_median_deg": {
                "MEDIUM": 0.080,
                "HARD": 0.050
            },
            "driver_clean_laps_mean": 71.100,
            "driver_clean_laps_std": 0.410,
            "driver_optimal_lap": 70.100,
            "teammate_optimal_lap": 69.880,
            "t_pit_lane_opt": 20.80,
            "penalties_count": 0,
            "warnings_count": 0,
            "lockups_count": 0,
            "p_start": 7,
            "p_finish": 2
        }

        # 3. Mock Sainz (Ferrari) 2024 Austrian GP
        self.sainz_data = {
            "session_id": "2024_austria_gp_race",
            "driver_id": "sainz",
            "total_laps": 71,
            "sc_laps": 4,
            "clean_air_laps": 58,
            "pit_stops": [
                {"lap": 22, "position_before": 3, "position_after": 4, "t_stationary": 2.5, "t_pit_lane": 21.3, "is_forced_stop": False},
                {"lap": 47, "position_before": 3, "position_after": 3, "t_stationary": 2.4, "t_pit_lane": 21.2, "is_forced_stop": False}
            ],
            "stints": [
                {"compound": "MEDIUM", "length": 22, "optimal_length": 26, "clean_laps_times": [70.5, 70.4, 70.3], "is_forced": False}, # negative/neutral
                {"compound": "HARD", "length": 25, "optimal_length": 34, "clean_laps_times": [69.992, 69.984, 69.976], "is_forced": False}, # slope 0.052
                {"compound": "MEDIUM", "length": 24, "optimal_length": 26, "clean_laps_times": [70.5, 70.4, 70.3], "is_forced": False} # negative/neutral
            ],
            "grid_median_deg": {
                "MEDIUM": 0.080,
                "HARD": 0.050
            },
            "driver_clean_laps_mean": 71.450,
            "driver_clean_laps_std": 0.380,
            "driver_optimal_lap": 70.420,
            "teammate_optimal_lap": 72.100,
            "t_pit_lane_opt": 20.80,
            "penalties_count": 0,
            "warnings_count": 0,
            "lockups_count": 0,
            "p_start": 4,
            "p_finish": 3
        }

    def test_verstappen_scores(self):
        strategy = calculate_strategy_score(self.verstappen_data)
        tire = calculate_tire_score(self.verstappen_data)
        pace = calculate_pace_score(self.verstappen_data)
        pitstop = calculate_pitstop_score(self.verstappen_data)
        execution = calculate_execution_score(self.verstappen_data)

        self.assertEqual(strategy, 74.1)
        self.assertEqual(tire, 95.00)
        self.assertEqual(pace, 67.08)
        self.assertEqual(pitstop, 66.73)
        self.assertEqual(execution, 55.0)

        agg = calculate_race_scores(self.verstappen_data, save_to_db=False)
        self.assertEqual(agg["composite_score"], 71.58)

    def test_piastri_scores(self):
        strategy = calculate_strategy_score(self.piastri_data)
        tire = calculate_tire_score(self.piastri_data)
        pace = calculate_pace_score(self.piastri_data)
        pitstop = calculate_pitstop_score(self.piastri_data)
        execution = calculate_execution_score(self.piastri_data)

        self.assertEqual(strategy, 58.19)
        self.assertEqual(tire, 97.92)
        self.assertEqual(pace, 55.83)
        self.assertEqual(pitstop, 90.41)
        self.assertEqual(execution, 100.0)

        agg = calculate_race_scores(self.piastri_data, save_to_db=False)
        self.assertEqual(agg["composite_score"], 80.47)

    def test_sainz_scores(self):
        strategy = calculate_strategy_score(self.sainz_data)
        tire = calculate_tire_score(self.sainz_data)
        pace = calculate_pace_score(self.sainz_data)
        pitstop = calculate_pitstop_score(self.sainz_data)
        execution = calculate_execution_score(self.sainz_data)

        self.assertEqual(strategy, 67.32)
        self.assertEqual(tire, 98.67)
        self.assertEqual(pace, 61.58)
        self.assertEqual(pitstop, 87.67)
        self.assertEqual(execution, 98.0)

        agg = calculate_race_scores(self.sainz_data, save_to_db=False)
        self.assertEqual(agg["composite_score"], 82.65)

if __name__ == "__main__":
    unittest.main()
