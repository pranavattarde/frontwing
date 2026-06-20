import unittest
from app.simulation.simulation_engine import run_strategy_simulation

class TestStrategySimulationEngine(unittest.TestCase):
    def setUp(self):
        # 1. Setup 2024 Austrian GP Constants
        self.total_laps = 71
        self.pit_loss = 22.0
        self.overtake_difficulty = 0.4

        # Helper to generate realistic 71-lap timing data based on stints
        def generate_laps(stints_def, base_alpha, deg_rates) -> list:
            laps = []
            current_lap = 1
            for stint_idx, stint in enumerate(stints_def):
                comp = stint["compound"]
                start = stint["start_lap"]
                end = stint["end_lap"]
                beta = deg_rates.get(comp, 0.08)
                
                tire_age = 1
                for lap_num in range(start, end + 1):
                    # Natural lap time model: L = alpha + beta * age - 0.06 * lap_number
                    lap_time = base_alpha + beta * tire_age - 0.06 * lap_num
                    
                    is_pit_out = (lap_num == start and stint_idx > 0)
                    if is_pit_out:
                        lap_time += self.pit_loss
                        
                    laps.append({
                        "lap_number": lap_num,
                        "lap_time": round(lap_time, 3),
                        "compound": comp,
                        "is_pit_out_lap": is_pit_out,
                        "tire_age": tire_age
                    })
                    tire_age += 1
            return laps

        # Stint profiles for mock drivers
        deg_rates = {"SOFT": 0.12, "MEDIUM": 0.08, "HARD": 0.05}
        
        # Verstappen stints: pits lap 23 and 51
        ver_stints = [
            {"compound": "MEDIUM", "start_lap": 1, "end_lap": 23},
            {"compound": "HARD", "start_lap": 24, "end_lap": 51},
            {"compound": "MEDIUM", "start_lap": 52, "end_lap": 71}
        ]
        self.verstappen_laps = generate_laps(ver_stints, 70.80, deg_rates)
        
        # Piastri stints: pits lap 21 and 52
        pia_stints = [
            {"compound": "MEDIUM", "start_lap": 1, "end_lap": 21},
            {"compound": "HARD", "start_lap": 22, "end_lap": 52},
            {"compound": "MEDIUM", "start_lap": 53, "end_lap": 71}
        ]
        self.piastri_laps = generate_laps(pia_stints, 71.10, deg_rates)

        # Sainz stints: pits lap 22 and 47
        sainz_stints = [
            {"compound": "MEDIUM", "start_lap": 1, "end_lap": 22},
            {"compound": "HARD", "start_lap": 23, "end_lap": 47},
            {"compound": "MEDIUM", "start_lap": 48, "end_lap": 71}
        ]
        self.sainz_laps = generate_laps(sainz_stints, 71.45, deg_rates)
        self.sainz_actual_stints = [
            {"compound": "MEDIUM", "start_lap": 1, "end_lap": 22, "stint_number": 1},
            {"compound": "HARD", "start_lap": 23, "end_lap": 47, "stint_number": 2},
            {"compound": "MEDIUM", "start_lap": 48, "end_lap": 71, "stint_number": 3}
        ]

        # Convert list of dicts to raw float lap lists for rivals mapping
        self.rivals_laps = {
            "verstappen": [lap["lap_time"] for lap in self.verstappen_laps],
            "piastri": [lap["lap_time"] for lap in self.piastri_laps],
            "hamilton": [round(72.0 + 0.06 * (i % 10) - 0.05 * i, 3) for i in range(1, 72)]
        }

    def test_sainz_earlier_pitstop(self):
        """Ferrari (Sainz) pits on lap 19 instead of actual lap 22 (3 laps earlier)."""
        res = run_strategy_simulation(
            session_id="2024_austria_gp_race",
            driver_id="sainz",
            simulated_pit_lap=19,
            target_compound="HARD",
            actual_laps_cache=self.sainz_laps,
            rivals_laps_cache=self.rivals_laps,
            actual_stints_cache=self.sainz_actual_stints,
            actual_position_cache=3,
            total_laps_cache=self.total_laps,
            save_to_db=False
        )

        self.assertEqual(res["driver_id"], "sainz")
        self.assertEqual(res["simulated_pit_lap"], 19)
        self.assertEqual(res["actual_pit_lap"], 22)
        self.assertEqual(res["target_compound"], "HARD")
        
        # Verify structure
        self.assertIn("projected_finishing_position", res)
        self.assertIn("position_change", res)
        self.assertIn("simulated_net_time_gain_ms", res)
        self.assertEqual(len(res["simulated_lap_times"]), 71)

    def test_sainz_later_pitstop(self):
        """Ferrari (Sainz) pits on lap 25 instead of actual lap 22 (3 laps later)."""
        res = run_strategy_simulation(
            session_id="2024_austria_gp_race",
            driver_id="sainz",
            simulated_pit_lap=25,
            target_compound="HARD",
            actual_laps_cache=self.sainz_laps,
            rivals_laps_cache=self.rivals_laps,
            actual_stints_cache=self.sainz_actual_stints,
            actual_position_cache=3,
            total_laps_cache=self.total_laps,
            save_to_db=False
        )

        self.assertEqual(res["driver_id"], "sainz")
        self.assertEqual(res["simulated_pit_lap"], 25)
        self.assertEqual(res["actual_pit_lap"], 22)
        
        self.assertIn("projected_total_time_seconds", res)
        self.assertIn("simulated_net_time_gain_ms", res)

    def test_verstappen_alternative_strategy(self):
        """Red Bull (Verstappen) shifts first pit stop to lap 26 instead of 23."""
        ver_stints_actual = [
            {"compound": "MEDIUM", "start_lap": 1, "end_lap": 23, "stint_number": 1},
            {"compound": "HARD", "start_lap": 24, "end_lap": 51, "stint_number": 2},
            {"compound": "MEDIUM", "start_lap": 52, "end_lap": 71, "stint_number": 3}
        ]
        
        rivals = {
            "sainz": [lap["lap_time"] for lap in self.sainz_laps],
            "piastri": [lap["lap_time"] for lap in self.piastri_laps],
            "hamilton": [round(72.0 + 0.06 * (i % 10) - 0.05 * i, 3) for i in range(1, 72)]
        }

        res = run_strategy_simulation(
            session_id="2024_austria_gp_race",
            driver_id="verstappen",
            simulated_pit_lap=26,
            target_compound="HARD",
            actual_laps_cache=self.verstappen_laps,
            rivals_laps_cache=rivals,
            actual_stints_cache=ver_stints_actual,
            actual_position_cache=5,
            total_laps_cache=self.total_laps,
            save_to_db=False
        )

        self.assertEqual(res["driver_id"], "verstappen")
        self.assertEqual(res["simulated_pit_lap"], 26)
        self.assertEqual(res["actual_pit_lap"], 23)
        self.assertIn("projected_finishing_position", res)
        self.assertEqual(len(res["simulated_lap_times"]), 71)

if __name__ == "__main__":
    unittest.main()
