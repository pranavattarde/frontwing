# PROJECT STATE -- FrontWing
> This file is OVERWRITTEN at the start of every agent session. It is NOT a history log.
> Last updated: 2026-09-01 by Antigravity (Session 019 - Simulation Parameter Normalization, Honest Simulation/Scoring Fallbacks, & Elimination of Fake Root-Cause Boilerplate)
> Audit method: Comprehensive test suites (`test_fixes_e_f_g.py` 10/10 passed, `test_fixes_verification.py` 13/13 passed, `test_execution_pipeline.py` 20/20 passed).

---

## 1. What Works Right Now

### Simulation Parameter Canonicalization & Alias Normalization (FIX E VERIFIED LIVE)
- **`simulated_pit_lap` Canonical Handling (`adapters.py`, `registry.py`, `simulation_engine.py`, `planner.py`)**:
  - `SimulationTool` and `StrategyTool` accept `simulated_pit_lap` canonically, resolving all legacy aliases (`pit_lap`, `lap`, `pit_stop_lap`).
  - Regex lap parsing in `registry.py` extracts numeric pit laps from what-if simulation questions.
  - Driver entity resolution in `simulation_engine.py` supports full driver names (`"Oscar Piastri"`, `"Charles Leclerc"`) and resolves database IDs and 3-letter codes (`"PIA"`, `"LEC"`), allowing strategy simulations to run smoothly and return projected positions, net time deltas, and tire degradation curves.

### Position Disambiguation & Honest Fallbacks for Simulation/Scoring (FIX F VERIFIED LIVE)
- **Lap vs Finishing Position Disambiguation (`nlp_parser.py`, `planner.py`)**:
  - Guarded position regex matching (`pos_match`) in `nlp_parser.py` so integer values in simulation questions (e.g. lap numbers) are never misinterpreted as finishing positions (e.g. `P27`, `P14`).
  - Cleared `requested_position` for all simulation queries.
  - In `planner.py` (`_humanize_errors`), when `simulation_tool` or `scoring_tool` encounters missing data, the system returns an honest analyst response (`"I wasn't able to run that simulation for {driver}."`, `"No verified scoring data is available for {driver}."`) instead of substituting unrelated race classifications or winners.

### Fake Root-Cause Boilerplate Removal & Diagnostic Tool Routing (FIX G VERIFIED LIVE)
- **Zero Static PostgreSQL Boilerplate (`investigation_correlator.py`, `personas.py`)**:
  - Completely excised all instances of `"Verified race classification retrieved from PostgreSQL"` and fake `"Root Cause Chain:"` boilerplate.
  - `RaceResultsTool` returns clean race classification and incident data without fabricated root-cause text.
  - `InvestigationCorrelator` generates dynamic causal DAG graphs from live telemetry and scoring metrics, returning `"Insufficient data for root cause analysis."` when telemetry/scoring evidence is unavailable.
  - Follow-up diagnostic queries (e.g. *"what went wrong with X's strategy/pace"*, *"why did X struggle"*) route to `scoring_tool`, `strategy_tool`, and `race_results_tool` and cite computed scores (Pace Score, Tire Management Score, Strategy Score) and pit stop timings.

### Async FastF1 Telemetry Backfill & Live Progress Polling (FIX A VERIFIED LIVE)
- **Non-Blocking Background Worker (`fastf1_collector.py`)**:
  - `start_async_backfill(session_id)` kicks off FastF1 telemetry download in a background thread and returns immediate status: `"backfilling"` (<200ms) with `progress_pct`, `stage`, and `job` metadata instead of blocking HTTP requests for 4+ minutes.
  - Granular progress reporting (`progress_callback(pct, stage_desc)`) updates status in real-time.
- **REST Endpoints & Frontend Polling (`session.controller.js`, `InvestigationThread.jsx`)**:
  - Express `/sessions/backfill-status/:sessionId` and FastAPI `/sessions/backfill-status/{session_id}` expose live status.
  - Frontend `InvestigationThread.jsx` polls every 2.5s displaying honest progress and auto-retries the query upon 100% completion.

### Dual-Driver Comparative Telemetry Preservation (FIX B VERIFIED LIVE)
- **Full Comparative Telemetry Shape (`adapters.py`)**:
  - `TelemetryTool.execute()` resolves both drivers via `_resolve_driver_candidates` against both `drivers` and `telemetry_metadata` tables.
  - Correctly populates and returns `comparative_driver_id`, `comparative_lap_number`, `comparative_lap_time_s`, `comparative_sector1_s`, `comparative_sector2_s`, `comparative_sector3_s`, `comparative_telemetry`, `comparative_speed_trace`, `sector_times`, and `delta_lap_time_s`.
- **Fastest Lap Telemetry Retention (`fastf1_collector.py`)**:
  - Guaranteed every driver's fastest lap (`drv_laps.pick_fastest()`) is always included in telemetry extraction.

### Single-Driver Telemetry & Unified Context Merging (FIX C VERIFIED LIVE)
- **Deterministic Single vs Multi-Driver Intent Classification (`nlp_parser.py`, `planner.py`)**:
  - Single-driver queries (e.g. *"give verstappen's lap timing telemetry at japan"*) are classified as `intent = "telemetry"` / `requested_metric = "lap_telemetry"`, executing without clarification blocks.
  - Multi-driver queries (e.g. *"compare verstappen and norris"*) are classified as `intent = "telemetry_comparison"` / `requested_metric = "telemetry_comparison"`.
  - Context drivers merge seamlessly for pronoun/follow-up questions.

### Pit Stop Timing Wiring & Honest Unsupported Metric Responses (FIX D VERIFIED LIVE)
- **Real Pit Stop Timing from `stints` Table (`adapters.py`, `planner.py`)**:
  - `StrategyTool.execute()` queries actual stint laps and compounds to compute exact pit stop numbers, pit laps, compound in, and compound out.
  - `synthesize_node` reports exact pit stops (e.g. *"At the 2024 Japanese GP, Max Verstappen pitted on Lap 16 (MEDIUM -> HARD), Lap 34 (HARD -> HARD)."*).
- **Honest Unsupported Metric Handling (`nlp_parser.py`, `planner.py`)**:
  - Unsupported metric queries (e.g. brake PSI, tyre carcass temperature, steering wheel angle, pit crew headcounts) are mapped to `intent = "unsupported_metric"`.
  - `synthesize_node` explicitly replies *"I do not currently have verified data for this metric in the database. FrontWing tracks verified race classifications, lap timings, sector deltas, tire compound stints, pit stop laps, weather conditions, and high-frequency telemetry"* with low confidence (15.0%) instead of silently substituting unrelated race winners.

### LLM Provider Modernization & Quota Architecture (VERIFIED LIVE)
- **Groq Model Modernization to `openai/gpt-oss-120b`**:
  - Replaced decommissioned `llama-3.3-70b-versatile` and `qwen3.6-27b` with `openai/gpt-oss-120b` across `config.py`, `.env`, `providers.py`, and `planner.py`.
- **Single-LLM-Call Planning Pipeline**:
  - Streamlined `parse_semantic_query` to use deterministic keyword parsing and merged intent/tool planning into the downstream Planning LLM call, reducing LLM quota usage by 33–66% (from 3 calls down to 1–2 per query).
- **LLM Synthesis Prompt Payload Compression**:
  - Automatically compressed dense FastF1 telemetry arrays in `context_builder.py`, cutting synthesis prompt token size from ~16,500 tokens to <500 tokens (97% token reduction), eliminating Groq 8,000 TPM rate limit overflows.

### Live AI Race Engineer Pipeline & Observability Audit (VERIFIED END-TO-END)
- **Granular UTC Timestamp Auditing Across All Stages**:
  - `[REQUEST_RECEIVED]`, `[PLANNER_LLM_CALL_START / END]`, `[ENTITY_RESOLUTION_START / END]`, `[SCORING_TOOL_START / DB / MATH / END]`, `[SYNTHESIS_LLM_CALL_START / END]`, and `[RESPONSE_SENT]`.
- **Elimination of Artificial In-Memory Plan Cache**:
  - Deleted `self._plan_cache` in `ReliableLLMProvider`. Every planning request now executes 100% live.
- **Zero Mock Answers in Codebase**:
  - Full codebase grep audit confirms 0 hardcoded/canned mock responses. All data originates dynamically from PostgreSQL `laps`, `stints`, `race_results`, and live LLM planners.

### Simulation & Strategy Sub-System (SimulationTool & StrategyTool) (VERIFIED)
- **Elimination of All Hardcoded Constants, Ghost Pit Stops & Pace Calibration**:
  - Full 1..N timeline reconstruction, clean flying lap pace calibration, ghost multi-pit-stop elimination, independent traffic loss computation, dynamic pit lap defaulting, and dynamic grid median degradation.
- **Unit & System Tests**:
  - `ai_services/tests/test_simulation.py`: 3/3 passed (100%).

### Scoring Sub-System (ScoringTool & App Scoring Modules) (VERIFIED)
- **Elimination of All Hardcoded Constants in Scoring**:
  - Dynamically computed `sc_laps`, `teammate_optimal_lap`, `clean_air_laps`, and `grid_median_deg`. Missing data guard returns explicit `missing_data` for DNF/absent data.
- **Unit & System Tests**:
  - `ai_services/tests/test_scoring.py`: 3/3 passed (100%).

### Explain Mode & Technical Knowledge Sub-System (ExplainModeTool & Knowledge Layer) (VERIFIED)
- **Elimination of Fake/Placeholder Responses & Multi-Tier Concept Explanations**:
  - Isolated knowledge routing exclusively executing `explain_mode_tool` / `knowledge_tool`, returning dynamic progressive disclosure (`novice`, `intermediate`, `expert`).

### Frontend Telemetry & Performance Visualization (TelemetryCard, ScoreCard, SimulationCard) (VERIFIED END-TO-END)
- Production 5-chart matrix (Lap Time Graph, Tyre Degradation Graph, Sector Comparison Graph, Speed Trace Canvas, Pit Window Visualizer), ScoreCard, and SimulationCard rendering verified live in browser.
- Canvas rendering engine with crisp miter lines, 250m grid lines, neon cyan/yellow driver contrast, red brake active overlays, multi-channel toggles, crosshair, and HUD inspector.

---

## 2. What Is Broken Right Now

### HIGH -- Wrong Behavior
- **Ergast API is dead**: `ergast_collector.py` still calls `https://ergast.com/api/f1`.

### MEDIUM -- Data Quality
- **Tyre wear model in TelemetryTool still hardcoded** (`adapters.py` lines ~384-386).

### LOW -- Code Debt
- `aggregator.py` line 69: scoring persist failures swallowed at WARNING.
- `startup.py` line 174: migration errors at WARNING.
- `openf1_collector.py`: implemented but not wired into active ingestion.
- FastAPI `on_event` deprecation warnings (lifespan handlers recommended).

---

## 3. What Is NOT Yet Started (Frontend & Backend Backlog)

### Frontend Features NOT Yet Started / Prototype Only
- **Ghost Battle UI (`/ghost-battle/:raceId` / `GhostBattle.jsx`)**: Prototype wired to mock data; needs backend endpoint wiring for corner-by-corner micro-sector comparison.
- **Interactive Strategy Playground (`/strategy/:raceId` / `StrategyPlayground.jsx`)**: Needs live what-if simulation backend wiring for dynamic pit lap / compound sliders.
- **Driver Scorecards & Championship Standings UI**: Needs dedicated scorecard view connected to DB scoring tables.
- **Live Race Monitor / Real-Time WebSocket Telemetry**: WebSocket server is echo-only; no live stream telemetry dashboard.

---

## 4. Season / Data Coverage Status

| Season | Grand Prix | Session ID | Real Data? | Telemetry JSON? | Notes |
|--------|-----------|------------|------------|-----------------|-------|
| 2024 | Qatar GP | 2024_qatar_gp_race | YES | YES | Ingested & verified end-to-end (317 telemetry rows) |
| 2024 | British GP | 2024_silverstone_gp_race | YES | YES | Ingested & verified with distanceM (329 files) |
| 2024 | Sao Paulo | 2024_são_paulo_gp_race | YES | YES | Ingested & verified with distanceM (378 files) |
| 2024 | Hungarian GP | 2024_13_race | YES | YES | Ingested & verified with distanceM (458 files) |
| 2024 | Monaco GP | 2024_monaco_gp_race | YES | YES | Ingested & auto-backfilled with distanceM (Session 017) |
| 2024 | Dutch GP | 2024_dutch_gp_race | YES | YES | Ingested & auto-backfilled with distanceM (Session 017) |
| 2024 | Bahrain GP | 2024_bahrain_gp_race | YES | YES | Ingested & auto-backfilled with distanceM (Session 017) |
| 2024 | Saudi Arabian GP | 2024_saudi_arabian_gp_race | YES | YES | Ingested & auto-backfilled with distanceM (Session 017) |
| 2024 | Australian GP | 2024_australian_gp_race | YES | YES | Ingested & verified (Session 017) |
| 2023 | Monaco GP | 2023_monaco_gp_race | YES | YES | Ingested & verified with distanceM (510 rows/files) |
| 2022 | British GP | 2022_british_gp_race | YES | YES | Ingested & verified with distanceM (284 rows/files) |
| 2024 | Austrian GP | 2024_austria_gp_race | YES | YES | Ingested & verified (Session 017) |
