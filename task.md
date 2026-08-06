# FrontWing MVP Stabilization Sprint Task Checklist

- [x] **1. Planner as Single Source of Truth**
  - [x] Planner parameters (`season`, `grand_prix`, `driver_id`, `session_type`, `lap`) strictly preserved downstream
  - [x] Zero downstream overrides or silent parameter replacements

- [x] **2. Entity Resolver Parameter Preservation**
  - [x] EntityResolver converts NL names to DB IDs (`race_id`, `session_id`, `driver_id`) without altering requested season/year
  - [x] Removed `return 2026` defaults; explicitly targets requested season (e.g. 2024)

- [x] **3. Removal of All Hardcoded Fallbacks**
  - [x] Removed `2026_monaco_gp_race`, `2024_austria_gp_race`, `ORDER BY date DESC LIMIT 1` from `loader.py`
  - [x] Removed hardcoded fake drivers, constructors, and 2026 Monaco GP arrays from tool adapters
  - [x] Removed static `TELEMETRY_PIA_LAP42` / `TELEMETRY_SAI_LAP42` fallbacks from frontend

- [x] **4. Automatic FastF1 Ingestion**
  - [x] `ensure_session_in_db()` automatically fetches missing sessions via `FastF1Collector.load_session()`
  - [x] Auto-populates and caches session data in PostgreSQL without requiring user intervention
  - [x] Removed error message instructing user to POST `/sessions/load`

- [x] **5. Execution Tools Argument Integrity**
  - [x] Tools consume planner parameters strictly as received
  - [x] Return honest `missing_data` responses when session data is missing, never substituted races

- [x] **6. Intent-Driven Response Formatting**
  - [x] Factual queries ("Who won Monaco GP?") return concise answer + standings + evidence (no reasoning graph or telemetry findings)
  - [x] Analytical queries ("Why did Ferrari fail?") return full reasoning graph + telemetry findings + evidence + recommendations

- [x] **7. Evidence-Driven Telemetry Charts**
  - [x] Telemetry chart section renders ONLY when valid backend telemetry data exists
  - [x] Completely hidden when telemetry is unavailable; zero placeholder/fake charts

- [x] **8. Authentication Enforcement**
  - [x] Enforced `authenticateToken` on `/history`, `/save`, `/delete`, `/me`, `/bookmarks` (returns 401 Unauthorized without JWT)
  - [x] `/engineer/query` investigation endpoint remains public

- [x] **9. History UUID Bug Resolution**
  - [x] Backend attaches generated PostgreSQL UUID `id` to `/engineer/query` response
  - [x] Frontend stores and reuses backend UUID for all history/save/delete actions
  - [x] Backend validates UUID format (`isUUID`) and returns 400 Bad Request on invalid format

- [x] **10. Frontend Structure Optimization**
  - [x] Exactly 1 Question, 1 Verdict, 1 Reasoning, 1 Evidence section, 1 Chart section (if data exists), 1 Follow-up section per turn
  - [x] Zero duplicate renders

- [x] **11. Validation Suite**
  - [x] Express Backend build (`npm run build`) — PASS
  - [x] React Frontend build (`npm run build`) — PASS (431 modules, 21.35s)
  - [x] Python Unit Test Suite (`python -m unittest discover tests/`) — PASS
  - [x] 5 Target Query Validations (`test_sprint_validation.py`) — PASS
