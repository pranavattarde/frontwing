-- Migration 06: Performance Composite Indexes for High-Frequency Lookups
-- Adds composite indexes on (session_id, driver_id) for laps, telemetry_metadata, and stints.

CREATE INDEX IF NOT EXISTS idx_laps_session_driver 
    ON laps(session_id, driver_id);

CREATE INDEX IF NOT EXISTS idx_telemetry_meta_session_driver 
    ON telemetry_metadata(session_id, driver_id);

CREATE INDEX IF NOT EXISTS idx_stints_session_driver 
    ON stints(session_id, driver_id);
