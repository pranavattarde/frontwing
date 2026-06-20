-- Enable timescaledb if high-performance live time-series telemetry storage is desired
-- CREATE EXTENSION IF NOT EXISTS timescaledb;

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
    code VARCHAR(3), -- e.g., 'HAM', 'VER'
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

-- Races / Sessions
CREATE TABLE IF NOT EXISTS races (
    id VARCHAR(50) PRIMARY KEY, -- e.g. '2026_monaco_gp'
    circuit_id VARCHAR(50) REFERENCES circuits(id) ON DELETE RESTRICT,
    year INTEGER NOT NULL,
    round INTEGER NOT NULL,
    name VARCHAR(150) NOT NULL,
    date DATE NOT NULL,
    time TIME,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Historical Lap Timings metadata (raw telemetry kept in Redis or FastF1 cache)
CREATE TABLE IF NOT EXISTS lap_times (
    id BIGSERIAL PRIMARY KEY,
    race_id VARCHAR(50) REFERENCES races(id) ON DELETE CASCADE,
    driver_id VARCHAR(50) REFERENCES drivers(id) ON DELETE CASCADE,
    lap_number INTEGER NOT NULL,
    position INTEGER,
    lap_time_ms INTEGER NOT NULL,
    sector_1_ms INTEGER,
    sector_2_ms INTEGER,
    sector_3_ms INTEGER,
    compound VARCHAR(20), -- Soft, Medium, Hard, Inter, Wet
    tyre_age_laps INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_driver_race_lap UNIQUE (race_id, driver_id, lap_number)
);

-- AI Chat Sessions
CREATE TABLE IF NOT EXISTS chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(100), -- for auth integration
    title VARCHAR(255) DEFAULT 'New Conversation',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Chat Messages (LangGraph states will be synchronized or referenced here)
CREATE TABLE IF NOT EXISTS chat_messages (
    id BIGSERIAL PRIMARY KEY,
    session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL, -- 'user', 'assistant', 'system'
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for Query Telemetry Optimization
CREATE INDEX IF NOT EXISTS idx_lap_times_lookup ON lap_times (race_id, driver_id, lap_number);
