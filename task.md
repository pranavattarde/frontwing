# PostgreSQL Investigation Tools Migration Checklist

- [x] **1. RaceResultsTool (`ai_services/app/tools/adapters.py` - `RaceResultsTool`)**
  - [x] Query PostgreSQL `sessions`, `race_results`, `drivers`, `constructors` tables
  - [x] If required session/data does not exist in DB, return `{"status": "missing_data", "required_session": session_id}`
  - [x] Do NOT call FastF1 directly or fabricate mock responses

- [x] **2. TelemetryTool (`ai_services/app/tools/adapters.py` - `TelemetryTool`)**
  - [x] Query PostgreSQL `laps`, `telemetry_metadata`, `sessions` tables
  - [x] If required session/driver data does not exist in DB, return `{"status": "missing_data", "required_session": session_id}`
  - [x] Do NOT call FastF1 directly or fabricate mock responses

- [x] **3. StrategyTool / SimulationTool (`ai_services/app/tools/adapters.py` - `StrategyTool` & `SimulationTool`)**
  - [x] Query PostgreSQL `stints`, `laps`, `sessions` tables via simulation engine
  - [x] If required session/driver data does not exist in DB, return `{"status": "missing_data", "required_session": session_id}`
  - [x] Do NOT call FastF1 directly or fabricate mock responses

- [x] **4. InvestigationTool (`ai_services/app/tools/adapters.py` - `InvestigationTool`)**
  - [x] Query PostgreSQL `sessions`, `race_results`, `race_insights`, `drivers` tables
  - [x] If required session/driver data does not exist in DB, return `{"status": "missing_data", "required_session": session_id}`
  - [x] Do NOT call FastF1 directly or fabricate mock responses

- [x] **5. ScoringTool (`ai_services/app/tools/adapters.py` - `ScoringTool`)**
  - [x] Query PostgreSQL `scoring_results` or calculate scores from `laps`/`stints`/`race_results` tables in PostgreSQL
  - [x] If required session/driver data does not exist in DB, return `{"status": "missing_data", "required_session": session_id}`
  - [x] Do NOT call FastF1 directly or fabricate mock responses

- [x] **6. Verification & Documentation**
  - [x] Run python unittest suite & frontend build
  - [x] Update `task.md`, `walkthrough.md`, `docs/project_context.md`, `docs/learning.md`
  - [x] Commit after verification
