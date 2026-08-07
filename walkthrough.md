# FrontWing MVP Stabilization Sprint Walkthrough

## Production Stabilization Sprint — Core Pipeline Rebuild

### 1. Unified `SessionResolver` (`ai_services/app/core/session_resolver.py`)
- Single deterministic resolver handling GP normalization ("monaco", "austria", "hungary", "silverstone"), querying PostgreSQL `sessions` and `race_results` tables.
- Triggers dynamic FastF1 auto-ingestion (`FastF1Collector.load_session()`) when sessions or race results are unpopulated, persists records across `circuits`, `races`, `sessions`, `constructors`, `drivers`, `race_results`, `laps`, and `stints`, and retries the database query.

### 2. EntityResolver Rebuilt (`ai_services/app/core/entity_resolver.py`)
- Removed legacy question re-parsing. Consumes `state["entities"]` directly from Planner output.
- Resolves GP names to DB IDs via `SessionResolver`.

### 3. Purged All Fake Fallbacks & Hallucinations
- Removed hardcoded `default_session` (`2024_austria_gp_race`), fake root-cause strings ("Tyre degradation leading to Late pit stop"), and fallback driver arrays.
- Factual queries (*"Who won Monaco GP?"*) now produce direct factual answers without generating fake reasoning graphs or synthetic root cause chains.
- Errors for missing data cleanly return `"No verified race data exists for this request."` without hallucinating.

## Goal
Stabilize the complete FrontWing pipeline (Planner → Entity Resolver → Dispatcher → Tools → Synthesizer → Frontend) into a deterministic, production-ready MVP.

---

## Key Changes Made

### 1. Planner as Single Source of Truth (`ai_services/app/agents/planner.py`)
- Expanded `gp_map` in `extract_entities()` to support all 24 Formula 1 Grands Prix (Spanish GP, Hungarian GP, Japanese GP, Italian GP, etc.)
- Set default season extraction to `2024` instead of `"latest"` string
- Ensured planner extracted entities (`season`, `grand_prix`, `driver_id`, `session_type`, `lap`) flow unchanged into tools and resolvers without downstream overrides
- Removed error prompt telling users to manually POST to `/sessions/load`

### 2. Entity Resolver Parameter Preservation (`ai_services/app/agents/resolver.py` & `ai_services/app/core/entity_resolver.py`)
- Removed `return 2026` hardcoded default from `get_latest_f1_season()`, replacing with `return 2024`
- Updated `EntityResolver` race re-queries to filter strictly by `r.year = target_year` when season is specified, preserving requested year throughout resolution

### 3. Hardcoded Fallback Purge (`ai_services/app/ingestion/loader.py` & `ai_services/app/tools/adapters.py`)
- Removed `ORDER BY date DESC LIMIT 1` session fallback from `loader.py`
- Removed `2026_monaco_gp_race` and `hamilton` hardcoded string defaults from `InvestigationTool` and `RaceResultsTool`
- Removed fake hardcoded driver, constructor, and 2026 Monaco historical results arrays from `DriverDatabaseTool`, `ConstructorDatabaseTool`, `StandingsTool`, and `HistoricalResultsTool`
- Replaced fake array fallbacks with clean `missing_data` or empty list responses

### 4. Automatic On-Demand FastF1 Ingestion (`ai_services/app/ingestion/loader.py`)
- `ensure_session_in_db()` dynamically triggers `FastF1Collector.load_session()` when PostgreSQL lacks a requested GP session
- Downloads, processes, and persists session data directly into PostgreSQL tables and cache without user intervention

### 5. Response Types Differentiation (`ai_services/app/agents/planner.py`)
- Factual queries (`race_result` intent: e.g. *"Who won Monaco GP?"*, *"Who finished P3?"*): synthesize direct concise answer + classification/standings + evidence summary, omitting strategy findings, telemetry findings, and root-cause reasoning graphs
- Analytical queries (`investigation`, `comparison`, `telemetry`, `strategy`, `simulation`, `scoring`): synthesize full reasoning graph + telemetry findings + evidence + recommendations

### 6. Telemetry Chart Rendering (`frontend/src/pages/InvestigationThread.tsx`)
- Updated `mapResponseToMessages()` to push `production-visualizations` ONLY when real telemetry evidence (`telemetry_tool`) exists
- Completely hides telemetry chart section when telemetry is unavailable
- Removed static `TELEMETRY_PIA_LAP42` and `TELEMETRY_SAI_LAP42` fallback datasets

### 7. Authentication Enforcement (`backend/src/routes/history.routes.ts` & `backend/src/index.ts`)
- Enforced `authenticateToken` JWT middleware on `/history`, `/history/:id`, `/save/:id`, `/delete/:id`, `/me`, `/bookmarks`
- Requests without a valid Bearer JWT token return `401 Unauthorized`
- `/engineer/query` investigation endpoint remains public

### 8. History UUID Bug Fix (`backend/src/controllers/engineer.controller.ts`, `history.controller.ts`, `frontend/src/pages/InvestigationThread.tsx`)
- `EngineerController.query` attaches the generated PostgreSQL UUID `id` to the response payload
- Frontend stores and reuses backend UUID `id` for URL routing, local caching, bookmarking, and deletion
- `HistoryController` validates UUID format via `isUUID` helper and returns `400 Bad Request` if invalid UUID string is passed

---

## Verification Summary

- **Backend Express Build**: `npm run build` — PASS (0 errors)
- **Frontend React Build**: `npm run build` — PASS (431 modules transformed, 21.35s)
- **Python Unit Test Suite**: `python -m unittest discover tests/` — PASS (84 tests)
- **5 Target Query Validations**: `test_sprint_validation.py` — PASS
