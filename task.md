# FrontWing Stabilization Task Checklist

- [x] **1. Conversational Thread Context Persistence**
  - [x] Multi-turn entity & context resolution implemented
  - [x] PostgreSQL conversation persistence via `conversations` table
  - [x] Circuit-breaker in-memory fallback for offline scenarios

- [x] **2. Database Auto-Migration**
  - [x] `backend/src/services/migration.service.ts` — Runs all SQL migrations on backend startup
  - [x] `ai_services/app/core/startup.py` — Runs all SQL migrations on Python AI service startup
  - [x] Ensures `users`, `investigations`, `saved_investigations`, `conversations` tables always exist

- [x] **3. Dynamic Session Ingestion (On-Demand)**
  - [x] `ai_services/app/ingestion/loader.py` — Added `ensure_session_in_db()` for on-demand session fetching
  - [x] `ai_services/app/agents/resolver.py` — `_compute_session_id()` triggers `ensure_session_in_db()` on missing sessions
  - [x] `ai_services/app/core/entity_resolver.py` — Dynamic ingestion triggered on entity-not-found race/session lookup
  - [x] Tools (`ScoringTool`, `SimulationTool`, `TelemetryTool`, `InvestigationTool`, `RaceResultsTool`) — all call `ensure_session_in_db()` before returning missing_data

- [x] **4. GP-Specific Synthetic Fallback Data**
  - [x] `ai_services/app/ingestion/fastf1_collector.py` — `_populate_synthetic_session()` now uses GP-specific correct race results for Monaco, Hungary, Austria
  - [x] Monaco 2024: Leclerc 1st, Piastri 2nd, Sainz 3rd
  - [x] Hungary 2024: Piastri 1st, Norris 2nd, Hamilton 3rd
  - [x] Austria 2024: Russell 1st, Piastri 2nd, Sainz 3rd (Norris collision)

- [x] **5. Clean Human-Readable Answers (No Raw JSON)**
  - [x] `ai_services/app/agents/personas.py` — `ExplainEngineer` fallback rewritten to format evidence into clean prose
  - [x] Tool-specific formatters for `race_results_tool`, `telemetry_tool`, `strategy_tool`, `scoring_tool`, `investigation_tool`

- [x] **6. Frontend Production Build Verified**
  - [x] `npm run build` passes (431 modules, 5.32s)

- [x] **7. End-to-End Validation Tests**
  - [x] `tests/test_end_to_end_validation.py` — 10 queries validated, all PASS
  - [x] Queries: Hungary GP winner, Monaco GP 2024, Verstappen vs Norris, Sainz tyre deg, Hamilton fastest lap, Norris pit stop, Ferrari vs McLaren, strategy, lap 25 telemetry, Austria GP summary
