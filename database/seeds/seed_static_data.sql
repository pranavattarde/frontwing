-- Seed Constructors
INSERT INTO constructors (id, name, nationality, base_location) VALUES
('red_bull', 'Red Bull Racing', 'Austrian', 'Milton Keynes, UK'),
('mercedes', 'Mercedes-AMG Petronas F1 Team', 'German', 'Brackley, UK'),
('ferrari', 'Scuderia Ferrari', 'Italian', 'Maranello, Italy'),
('mclaren', 'McLaren Formula 1 Team', 'British', 'Woking, UK')
ON CONFLICT (id) DO NOTHING;

-- Seed Drivers
INSERT INTO drivers (id, constructor_id, first_name, last_name, code, driver_number, nationality, dob) VALUES
('verstappen', 'red_bull', 'Max', 'Verstappen', 'VER', 1, 'Dutch', '1997-09-30'),
('hamilton', 'mercedes', 'Lewis', 'Hamilton', 'HAM', 44, 'British', '1985-01-07'),
('leclerc', 'ferrari', 'Charles', 'Leclerc', 'LEC', 16, 'Monégasque', '1997-10-16'),
('norris', 'mclaren', 'Lando', 'Norris', 'NOR', 4, 'British', '1999-11-13')
ON CONFLICT (id) DO NOTHING;

-- Seed Circuits
INSERT INTO circuits (id, name, location, country, length_km, turns) VALUES
('monaco', 'Circuit de Monaco', 'Monte Carlo', 'Monaco', 3.337, 19),
('monza', 'Autodromo Nazionale Monza', 'Monza', 'Italy', 5.793, 11),
('silverstone', 'Silverstone Circuit', 'Silverstone', 'UK', 5.891, 18)
ON CONFLICT (id) DO NOTHING;

-- Seed Races
INSERT INTO races (id, circuit_id, year, round, name, date) VALUES
('2026_monaco_gp', 'monaco', 2026, 6, 'Monaco Grand Prix', '2026-05-24'),
('2026_silverstone_gp', 'silverstone', 2026, 10, 'British Grand Prix', '2026-07-05')
ON CONFLICT (id) DO NOTHING;

-- Seed Sessions
INSERT INTO sessions (id, race_id, type, date, start_time, status) VALUES
('2026_monaco_gp_q', '2026_monaco_gp', 'Qualifying', '2026-05-23', '15:00:00', 'completed'),
('2026_monaco_gp_race', '2026_monaco_gp', 'Race', '2026-05-24', '15:00:00', 'completed')
ON CONFLICT (id) DO NOTHING;

-- Seed Race Results
INSERT INTO race_results (session_id, driver_id, constructor_id, grid_position, position, points, status, laps_completed, fastest_lap_number, fastest_lap_time) VALUES
('2026_monaco_gp_race', 'leclerc', 'ferrari', 1, 1, 25.0, 'Finished', 78, 42, '1:14.281'),
('2026_monaco_gp_race', 'verstappen', 'red_bull', 2, 2, 18.0, 'Finished', 78, 38, '1:14.412'),
('2026_monaco_gp_race', 'hamilton', 'mercedes', 4, 3, 15.0, 'Finished', 78, 55, '1:14.390'),
('2026_monaco_gp_race', 'norris', 'mclaren', 3, 4, 12.0, 'Finished', 78, 12, '1:14.882')
ON CONFLICT (session_id, driver_id) DO NOTHING;

-- Seed Sample Laps
INSERT INTO laps (session_id, driver_id, lap_number, lap_time_ms, sector_1_ms, sector_2_ms, sector_3_ms, speed_i1, speed_i2, speed_fl, speed_st, compound, is_pit_out_lap, is_valid) VALUES
('2026_monaco_gp_race', 'leclerc', 1, 82400, 21200, 38100, 23100, 245, 210, 250, 280, 'MEDIUM', TRUE, TRUE),
('2026_monaco_gp_race', 'leclerc', 2, 75200, 19400, 34200, 21600, 250, 218, 260, 290, 'MEDIUM', FALSE, TRUE),
('2026_monaco_gp_race', 'verstappen', 1, 83100, 21600, 38300, 23200, 243, 208, 248, 278, 'MEDIUM', TRUE, TRUE),
('2026_monaco_gp_race', 'verstappen', 2, 75500, 19500, 34400, 21600, 252, 219, 262, 292, 'MEDIUM', FALSE, TRUE)
ON CONFLICT (session_id, driver_id, lap_number) DO NOTHING;

-- Seed Stints
INSERT INTO stints (session_id, driver_id, stint_number, compound, start_lap, end_lap, stint_length, is_new) VALUES
('2026_monaco_gp_race', 'leclerc', 1, 'MEDIUM', 1, 45, 45, TRUE),
('2026_monaco_gp_race', 'verstappen', 1, 'MEDIUM', 1, 46, 46, TRUE)
ON CONFLICT (session_id, driver_id, stint_number) DO NOTHING;
