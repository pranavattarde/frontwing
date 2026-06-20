-- Database Migration: 02_intelligence_tables
-- Defines tables to store deterministic scoring results, what-if simulations, and telemetry race insights.

-- Scoring Results Table
CREATE TABLE IF NOT EXISTS scoring_results (
    id BIGSERIAL PRIMARY KEY,
    session_id VARCHAR(100) NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    driver_id VARCHAR(50) NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
    strategy_score DECIMAL(5, 2) NOT NULL CHECK (strategy_score >= 0.00 AND strategy_score <= 100.00),
    tire_management_score DECIMAL(5, 2) NOT NULL CHECK (tire_management_score >= 0.00 AND tire_management_score <= 100.00),
    pace_efficiency_score DECIMAL(5, 2) NOT NULL CHECK (pace_efficiency_score >= 0.00 AND pace_efficiency_score <= 100.00),
    pit_stop_efficiency_score DECIMAL(5, 2) NOT NULL CHECK (pit_stop_efficiency_score >= 0.00 AND pit_stop_efficiency_score <= 100.00),
    race_execution_score DECIMAL(5, 2) NOT NULL CHECK (race_execution_score >= 0.00 AND race_execution_score <= 100.00),
    composite_score DECIMAL(5, 2) NOT NULL CHECK (composite_score >= 0.00 AND composite_score <= 100.00),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_session_driver_score UNIQUE (session_id, driver_id)
);

-- Simulation Runs Table
CREATE TABLE IF NOT EXISTS simulation_runs (
    id BIGSERIAL PRIMARY KEY,
    session_id VARCHAR(100) NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    driver_id VARCHAR(50) NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
    simulated_pit_lap INTEGER NOT NULL,
    actual_pit_lap INTEGER,
    simulated_net_time_gain_ms INTEGER NOT NULL, -- positive means faster, negative slower
    simulated_position_change INTEGER NOT NULL, -- e.g., +2 (gained two positions), -1 (lost one)
    run_parameters JSONB DEFAULT '{}'::jsonb, -- stores T_loss, compound selection, wear slopes, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Telemetry Race Insights Table
CREATE TABLE IF NOT EXISTS race_insights (
    id BIGSERIAL PRIMARY KEY,
    session_id VARCHAR(100) NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    driver_id VARCHAR(50) REFERENCES drivers(id) ON DELETE CASCADE,
    insight_type VARCHAR(50) NOT NULL, -- 'strategy', 'tire', 'pace', 'pit', 'execution'
    severity VARCHAR(20) DEFAULT 'info', -- 'info', 'warning', 'critical'
    summary TEXT NOT NULL, -- e.g., "Leclerc lost 3.8s in traffic behind Albon between laps 23-26."
    supporting_metrics JSONB DEFAULT '{}'::jsonb, -- raw lap delta arrays, etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexing for performance queries
CREATE INDEX IF NOT EXISTS idx_scores_session_driver ON scoring_results (session_id, driver_id);
CREATE INDEX IF NOT EXISTS idx_sims_session_driver ON simulation_runs (session_id, driver_id);
CREATE INDEX IF NOT EXISTS idx_insights_session ON race_insights (session_id);
