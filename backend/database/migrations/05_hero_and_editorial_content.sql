-- Migration 05: Hero & Editorial Content Pipelines
-- Stores live FastF1 weekend schedule, circuit geometries, and real F1 journalism/tactical news

CREATE TABLE IF NOT EXISTS hero_content (
    id VARCHAR(50) PRIMARY KEY DEFAULT 'current',
    event_name VARCHAR(255) NOT NULL,
    official_event_name VARCHAR(255),
    location VARCHAR(255),
    country VARCHAR(255),
    round_number INT,
    season INT,
    circuit_name VARCHAR(255),
    circuit_key VARCHAR(100),
    track_length_km NUMERIC(6,3),
    turns INT,
    drs_zones INT,
    lap_record VARCHAR(50),
    hero_headline TEXT,
    hero_subheadline TEXT,
    sessions JSONB NOT NULL DEFAULT '[]'::jsonb,
    suggested_questions JSONB NOT NULL DEFAULT '[]'::jsonb,
    source VARCHAR(100) DEFAULT 'fastf1_official',
    last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS editorial_content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category VARCHAR(50) NOT NULL, -- 'featured_debrief' | 'trending_insight'
    title TEXT NOT NULL,
    summary TEXT NOT NULL,
    source_outlet VARCHAR(100) NOT NULL,
    source_url TEXT NOT NULL,
    published_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metrics JSONB DEFAULT '{}'::jsonb,
    last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_editorial_category ON editorial_content(category);
CREATE INDEX IF NOT EXISTS idx_editorial_published ON editorial_content(published_at DESC);
