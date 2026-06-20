-- F1 Constructors (Teams)
CREATE TABLE IF NOT EXISTS constructors (
    id VARCHAR(50) PRIMARY KEY, -- e.g. 'red_bull', 'mercedes'
    name VARCHAR(100) NOT NULL,
    nationality VARCHAR(100),
    base_location VARCHAR(150),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- F1 Drivers
CREATE TABLE IF NOT EXISTS drivers (
    id VARCHAR(50) PRIMARY KEY, -- e.g. 'hamilton', 'verstappen'
    constructor_id VARCHAR(50) REFERENCES constructors(id) ON DELETE SET NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    code VARCHAR(3), -- e.g. 'HAM', 'VER'
    driver_number INTEGER,
    nationality VARCHAR(100),
    dob DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Circuits
CREATE TABLE IF NOT EXISTS circuits (
    id VARCHAR(50) PRIMARY KEY, -- e.g. 'monza', 'silverstone'
    name VARCHAR(150) NOT NULL,
    location VARCHAR(150),
    country VARCHAR(150),
    length_km DECIMAL(5, 3),
    turns INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Races / Grand Prix events
CREATE TABLE IF NOT EXISTS races (
    id VARCHAR(50) PRIMARY KEY, -- e.g. '2026_monaco_gp'
    circuit_id VARCHAR(50) REFERENCES circuits(id) ON DELETE RESTRICT,
    year INTEGER NOT NULL,
    round INTEGER NOT NULL,
    name VARCHAR(150) NOT NULL,
    date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_year_round UNIQUE (year, round)
);

-- Sessions (Qualifying, Practice 1-3, Sprint, Race) within a Race weekend
CREATE TABLE IF NOT EXISTS sessions (
    id VARCHAR(100) PRIMARY KEY, -- e.g. '2026_monaco_gp_race', '2026_monaco_gp_q'
    race_id VARCHAR(50) NOT NULL REFERENCES races(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- e.g., 'FP1', 'FP2', 'FP3', 'Qualifying', 'Sprint', 'Race'
    date DATE NOT NULL,
    start_time TIME,
    status VARCHAR(50) DEFAULT 'scheduled', -- 'scheduled', 'live', 'completed'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Race and Session Results (Final points and standings per session)
CREATE TABLE IF NOT EXISTS race_results (
    id BIGSERIAL PRIMARY KEY,
    session_id VARCHAR(100) NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    driver_id VARCHAR(50) NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
    constructor_id VARCHAR(50) REFERENCES constructors(id) ON DELETE SET NULL,
    grid_position INTEGER,
    position INTEGER,
    points DECIMAL(4, 1) DEFAULT 0.0,
    status VARCHAR(100), -- 'Finished', 'Retired', 'Spun off', 'Accident', etc.
    laps_completed INTEGER,
    fastest_lap_number INTEGER,
    fastest_lap_time VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_session_driver UNIQUE (session_id, driver_id)
);

-- Laps timings and metrics
CREATE TABLE IF NOT EXISTS laps (
    id BIGSERIAL PRIMARY KEY,
    session_id VARCHAR(100) NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    driver_id VARCHAR(50) NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
    lap_number INTEGER NOT NULL,
    lap_time_ms INTEGER,
    sector_1_ms INTEGER,
    sector_2_ms INTEGER,
    sector_3_ms INTEGER,
    speed_i1 INTEGER, -- speed trap 1
    speed_i2 INTEGER, -- speed trap 2
    speed_fl INTEGER, -- speed at finish line
    speed_st INTEGER, -- speed at longest straight
    compound VARCHAR(20), -- 'SOFT', 'MEDIUM', 'HARD', 'INTERMEDIATE', 'WET'
    is_pit_out_lap BOOLEAN DEFAULT FALSE,
    is_valid BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_session_driver_lap UNIQUE (session_id, driver_id, lap_number)
);

-- Tire Stints (tracking driver stints on a set of tires)
CREATE TABLE IF NOT EXISTS stints (
    id BIGSERIAL PRIMARY KEY,
    session_id VARCHAR(100) NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    driver_id VARCHAR(50) NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
    stint_number INTEGER NOT NULL,
    compound VARCHAR(20) NOT NULL, -- 'SOFT', 'MEDIUM', 'HARD', etc.
    start_lap INTEGER NOT NULL,
    end_lap INTEGER,
    stint_length INTEGER, -- end_lap - start_lap + 1
    is_new BOOLEAN DEFAULT TRUE, -- tyre age state
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_session_driver_stint UNIQUE (session_id, driver_id, stint_number)
);

-- Weather logs (tracked per session at regular timestamps)
CREATE TABLE IF NOT EXISTS weather (
    id BIGSERIAL PRIMARY KEY,
    session_id VARCHAR(100) NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    air_temperature DECIMAL(4, 1),
    track_temperature DECIMAL(4, 1),
    humidity DECIMAL(4, 1),
    rainfall BOOLEAN DEFAULT FALSE,
    wind_direction INTEGER, -- in degrees
    wind_speed DECIMAL(4, 1),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_session_weather_timestamp UNIQUE (session_id, timestamp)
);

-- Telemetry Metadata references (link to downsampled cached points or binary telemetry blobs)
CREATE TABLE IF NOT EXISTS telemetry_metadata (
    id BIGSERIAL PRIMARY KEY,
    session_id VARCHAR(100) NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    driver_id VARCHAR(50) NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
    lap_number INTEGER NOT NULL,
    data_points_count INTEGER,
    storage_path VARCHAR(255), -- local file system path / S3 bucket key for binary stream
    redis_cache_key VARCHAR(150),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_session_driver_lap_telemetry UNIQUE (session_id, driver_id, lap_number)
);

-- AI Chat Sessions
CREATE TABLE IF NOT EXISTS chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(100),
    title VARCHAR(255) DEFAULT 'New Conversation',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Chat Messages
CREATE TABLE IF NOT EXISTS chat_messages (
    id BIGSERIAL PRIMARY KEY,
    session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL, -- 'user', 'assistant', 'system'
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance optimizations
CREATE INDEX IF NOT EXISTS idx_laps_session_driver ON laps(session_id, driver_id);
CREATE INDEX IF NOT EXISTS idx_stints_session_driver ON stints(session_id, driver_id);
CREATE INDEX IF NOT EXISTS idx_weather_session_timestamp ON weather(session_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_results_session ON race_results(session_id);
