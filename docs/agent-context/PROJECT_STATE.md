# PROJECT STATE -- FrontWing
> This file is OVERWRITTEN at the start of every agent session. It is NOT a history log.
> Last updated: 2026-08-30 by Antigravity (Session 015 - LLM Provider & Planning Layer Upgrades: Execution Order Synthesis, Groq Timeouts, JSON Schema Compliance & Redis LLM Cache)
> Audit method: Direct FastAPI /engineer/query curl execution + granular UTC ISO timestamp logging + pytest suite (21/21 passed) + live LLM & Redis cache verification (100% verified live)

---

## 1. What Works Right Now

### LLM Provider & Planning Layer Resilience (VERIFIED LIVE)
- **Automatic `execution_order` Synthesis (FIX 1)**:
  - Planner synthesizes parameterized `execution_order` whenever the LLM returns `tools` / `entities` without an explicit `execution_order`. Queries no longer skip tool execution.
- **Extended Synthesis Timeout & Token Management (FIX 2)**:
  - Groq timeouts increased to 30.0s, with `max_tokens=1024` and `<think>...</think>` tag stripping for Qwen models.
- **Groq JSON Schema Compliance & Fallback (FIX 3)**:
  - `planning.md` prompt converted to valid JSON schema with few-shot telemetry comparison examples. Automatic fallback to unconstrained formatting with regex JSON extraction prevents `json_validate_failed` errors.
- **Dynamic Gemini Tier & Redis LLM Response Cache (FIX 4)**:
  - Configurable `GEMINI_MODEL=gemini-3.6-flash` and `LLM_CACHE_ENABLED=true`.
  - Redis LLM cache (`frontwing-redis:6379`) caches both planning and response generation. Repeated queries return in **<5ms**, protecting against 20 RPD free tier limits.

### Live AI Race Engineer Pipeline & Observability Audit (VERIFIED END-TO-END)
- **Granular UTC Timestamp Auditing Across All Stages**:
  - `[REQUEST_RECEIVED]`: Logs UTC timestamp, incoming question, session/driver/conversation IDs.
  - `[PLANNER_LLM_CALL_START / END]`: Logs exact live dispatch to Gemini `gemini-3.6-flash` (or Groq failover `llama-3.3-70b-versatile`), latency in ms, token usage, and structured plan payload.
  - `[ENTITY_RESOLUTION_START / END]`: Logs resolved season, driver_id, session_id, and race_id.
  - `[SCORING_TOOL_START / DB_START / DB_END / MATH_START / MATH_END / END]`: Logs exact database extraction latency, raw inputs (clean lap mean/std, optimal lap times, SC laps, clean air laps, stints, grid degradation slopes), and mathematical formulas computed.
  - `[SYNTHESIS_LLM_CALL_START / END]`: Logs synthesis LLM invocation latency and progressive explanation payloads.
  - `[RESPONSE_SENT]`: Logs total end-to-end latency in milliseconds.
- **Elimination of Artificial In-Memory Plan Cache**:
  - Deleted `self._plan_cache` in `ReliableLLMProvider`. Every planning request now executes 100% live.
- **Frontend & Backend Fast Render Clarification**:
  - Identified why frontend renders in <100ms on thread reload: browser `localStorage` caches completed investigation threads (`frontwing_investigation_${threadId}` in `InvestigationThread.jsx` lines 274–285), and Express backend has optional Redis caching in `cache.service.js`. Direct curl calls to FastAPI `/engineer/query` execute the full live ~23.4s pipeline with live LLM planning, database queries, and score math.
- **Zero Mock Answers in Codebase**:
  - Full codebase grep audit confirms 0 hardcoded/canned mock responses for `verstappen` or `qatar`. All data originates dynamically from PostgreSQL `laps`, `stints`, `race_results`, and live LLM planners.

### Simulation & Strategy Sub-System (SimulationTool & StrategyTool) (VERIFIED)
- **Elimination of All Hardcoded Constants, Ghost Pit Stops & Pace Calibration**:
  - **Full 1..N Timeline Reconstruction**: Reconstructs complete lap-by-lap race timelines ($1..\text{total\_laps}$) for both target driver and rivals, solving the downsampled (every 3rd lap) timeline discrepancy where 19 laps (~1,630s) were previously subtracted from 55 simulated laps (~5,170s).
  - **Clean Flying Lap Pace Calibration**: Clean air lap filtering in `tire_model.py` (excludes Lap 1 standing start outlier, in/out pit laps, and SC laps $\pm 15\%$ of median) calibrated fitted base pace `alpha` from $88.26\text{s}$ down to realistic $85.34\text{s}$ for Mediums, bringing natural simulated lap times within $\le 0.7\text{s}$ of real flying laps.
  - **Ghost Multi-Pit-Stop Elimination**: `adjust_stints_for_simulated_stop()` in `pitstop_simulator.py` now collapses consecutive identical compound micro-stints, ensuring shifting a pit lap creates exactly ONE pit stop event (e.g. Medium 1..33 $\to$ Hard 34..55) instead of 3 fake stops in 5 laps.
  - **Independent Traffic Loss Computation**: `traffic_loss` is computed as the actual cumulative time lost to dirty air and traffic bottlenecks ($\sum (\text{simulated\_time} - \text{natural\_time})$), completely decoupled from the fixed pit lane loss constant (`pit_loss: 23.3s`).
  - **Driver Alias Resolution**: Seamlessly matches driver IDs and codes across `drivers`, `stints`, `race_results`, and `laps` (e.g. `verstappen` vs `max_verstappen` vs `VER`), resolving real finishing positions ($P1$) and stint end laps.
  - **Dynamic Pit Lap Defaulting in `StrategyTool`**: Replaced hardcoded `simulated_pit_lap: 20` with dynamic query finding the driver's actual first stint end lap and computing an intelligent undercut target (`actual_pit_lap - 2`).
  - **Dynamic Grid Median Degradation**: `compute_grid_median_deg(session_id)` dynamically extracts real compound degradation slopes across the session grid via multi-stint linear regression, replacing static `None` default.
  - **Error Logging Upgrade**: Upgraded all `logger.warning` instances in simulation to `logger.error(..., exc_info=True)` per RULES_AND_GOTCHAS.md Entry 002.
- **Unit & System Tests**:
  - `ai_services/tests/test_simulation.py`: 3/3 passed (100%).
  - `scratch/verify_real_simulation.py`: Verified against `2024_qatar_gp_race` (Verstappen pit-30 $\Delta -12.5\text{s}$, Hamilton pit-25 $\Delta -2.5\text{s}$, Verstappen auto-window $\Delta -10.7\text{s}$) and `2023_monaco_gp_race` (Verstappen pit-50 $\Delta -12.6\text{s}$).

### Scoring Sub-System (ScoringTool & App Scoring Modules) (VERIFIED)
- **Elimination of All Hardcoded Constants in Scoring**:
  - **`sc_laps`**: Dynamically computed from session grid pace neutralization distribution in `laps` (identifies laps with average lap time $> 1.20 \times \text{median\_pace}$ across $\ge 3$ cars).
  - **`teammate_optimal_lap`**: Dynamically queries the real teammate's fastest clean lap in the same session by matching `constructor_id` across `race_results` and `drivers`. If no teammate or teammate lap exists, sets to `None` without guessing.
  - **`clean_air_laps`**: Computed directly from driver's valid laps, excluding in/out pit laps, SC laps, and pace outliers.
  - **`grid_median_deg`**: Dynamically computed across all valid stints in the session per compound via linear regression.
  - **Stints & Pit Stops**: Resolved `KeyError: 'end_lap'` bug by populating `start_lap` and `end_lap` in stint metadata.
  - **Missing Data Guard**: If a driver/session has no valid race data (e.g. Lap 1 DNF), returns explicit `{"status": "missing_data"}` with zero fabricated numbers.
- **Unit & System Tests**:
  - `ai_services/tests/test_scoring.py`: 3/3 passed (100%).
  - `scratch/verify_real_scoring.py`: Verified against `2024_qatar_gp_race` (Verstappen 72.26, Hamilton 57.32) and `2023_monaco_gp_race` (Verstappen 48.71).

### Explain Mode & Technical Knowledge Sub-System (ExplainModeTool & Knowledge Layer) (VERIFIED)
- **Elimination of Fake/Placeholder Responses & Multi-Tier Concept Explanations**:
  - **Isolated Knowledge Routing**: Conceptual and terminology questions (e.g. *"What is understeer?"*, *"Explain the difference between soft and hard tyres"*, *"What is DRS?"*) are routed exclusively through `explain_mode_tool` with zero forced session resolver, race results, or telemetry lookups.
  - **Dynamic Progressive Disclosure**: Returns real multi-tier technical explanations (`novice`, `intermediate`, `expert` / `engineer`) covering vehicle dynamics, formula calculations (CAR, SPG, TSE), tire compound degradation slopes, and FIA regulations (e.g. Article 3.6 for DRS).
  - **RAG Knowledge Layer Fallback**: Directly integrated with `rag_knowledge` (FIA Sporting Regulations, Technical Regulations, Circuit Notes, Tyre Strategy Articles) to retrieve verified documentation when queried with arbitrary technical terms.
  - **Persona & Tool Input Normalization**: `ExplainEngineer` and `ExplainModeTool` normalize term keys (`term`, `topic`, `concept`, `query`), cleanly extracting target topics from free-form user questions.
- **Verification Suite**:
  - `scratch/test_explain_mode.py`: Verified 3/3 conceptual queries with zero telemetry/session routing.

### Frontend Telemetry & Performance Visualization (TelemetryCard, ScoreCard, SimulationCard) (VERIFIED END-TO-END)
- **Live Browser Verification & Recording Proof**:
  - Validated via browser subagent sessions (recordings: `quick_canvas_verification_1787808823256.webp`, `quick_card_verify_1787818337356.webp`).
  - **Query 1**: *"How did Verstappen perform at Qatar GP?"*
    - **ScoreCard Component** ([ScoreCard.jsx](file:///c:/VS-Code_C_drive/Projects/FrontWing/frontend/src/components/ScoreCard.jsx)): Renders real `scoring_tool` metrics:
      - **Composite Index**: `72.3 / 100` (Verstappen 2024 Qatar GP)
      - **5 Score Dimensions**: Pace Index (`22.0`), Consistency (`93.1`), Racecraft (`83.3`), Strategy Execution (`50.3`), Tyre Management (`100.0`).
      - Interactive math parameter disclosure toggle (`[+ SHOW MATHEMATICAL PARAMETERS]`).
  - **Query 2**: *"What if Verstappen pitted on lap 30 at Qatar GP?"*
    - **SimulationCard Component** ([SimulationCard.jsx](file:///c:/VS-Code_C_drive/Projects/FrontWing/frontend/src/components/SimulationCard.jsx)): Renders real `simulation_tool` metrics:
      - **Pit Stop Shift**: Lap 35 $\to$ Lap 30 on HARD ($\Delta -5$ laps undercut).
      - **Track Position**: P1 $\to$ Projected P3 ($\Delta -2$ positions).
      - **Net Time Delta**: $-12.536\text{s}$ net race deficit.
      - **Diagnostics Grid**: Actual Race Time (`1:17:28.592`), Simulated Total Time (`1:17:41.129`), Traffic Loss (`2.139s`), Pit Loss Transit (`23.3s`).
      - Interactive simulation physics notes toggle (`[+ SHOW SIMULATION NOTES]`).
  - **Query 3**: *"Compare Verstappen and Hamilton at Qatar GP"* (2024).
    - Production 5-chart matrix loaded seamlessly in `InvestigationThread.jsx`:
      1. **Lap Time Graph**: Renders lap-by-lap timing evolution.
      2. **Tyre Degradation Graph**: Plots tire pace wear curves per stint.
      3. **Sector Comparison Graph**: Compares S1, S2, S3 delta bars between VER and HAM.
      4. **Speed Trace (TelemetryCard Canvas)**: HTML5 Canvas rendering real FastF1 speed traces.
      5. **Pit Window Visualizer**: Displays pit exit delta and rival traffic windows.
- **Canvas Rendering Engine ([TelemetryCard.jsx](file:///c:/VS-Code_C_drive/Projects/FrontWing/frontend/src/components/TelemetryCard.jsx))**:
  - **Zero Line-Smoothing**: `ctx.lineJoin = "miter"`, `ctx.lineWidth = 1.5`, crisp right-angle transitions for abrupt throttle/brake events per `docs/design_system.md`.
  - **Distance Alignment**: Mapped strictly to track distance (0m to 5358.9m for Qatar), featuring 250m interval slate grid lines (`#1C2025`) and distance tick labels.
  - **Driver Contrast**: Verstappen (Driver A / Chaser) rendered in `#00E5FF` (Neon Cyan); Hamilton (Driver B / Defender) rendered in `#FFD600` (Neon Yellow).
  - **Brake Active Overlay**: Rendered in `#FF1801` (Neon F1 Red) with `rgba(255, 24, 1, 0.08)` under-curve shading during active braking zones.
  - **Multi-Channel & Multi-Track**: Interactive toggles for `SPEED` (km/h), `THROTTLE` (%), `BRAKE` (bar / %), `GEAR` (1-8), `RPM`, and `MULTI` (stacked 3-channel view).
  - **Interactive Crosshair & HUD Inspector**: Moving cursor dynamically draws a cyan dashed vertical crosshair across the canvas with a floating HUD badge displaying distance bin, Driver A metric, Driver B metric, delta ($\Delta$), and sub-metrics with retina high-DPI scaling (`window.devicePixelRatio`).
  - **Split-Screen Analysis Overlay**: Clicking `[EXPAND]` opens the right-side analysis drawer with synchronized multi-channel traces.
  - **Deep-Dive Monospace Table**: Clicking `[DATA_TABLE]` displays the 10m-binned telemetry log table with synchronized active hover row highlighting.
  - **Zero Client-Side Mock Data**: 100% pure rendering of backend `telemetry` and `comparative_telemetry` arrays without sine-wave/dummy fallbacks.
- **Frontend Build**: Vite + React JSX builds cleanly with 0 compilation errors (`npm run build` completed in 8.45s).
- **Unit & Data Contract Tests**: `scratch/verify_frontend_canvas_telemetry.js` and `scratch/test_frontend_telemetry_formatter.js` pass 100%.

### Infrastructure & AI Backend Services
- **FastAPI AI service** (`ai_services/app/main.py`): Running live on http://127.0.0.1:8000 (10/10 components healthy).
- **Express backend** (`backend/src/index.js`): Running live on http://127.0.0.1:5000 with PostgreSQL, Redis, and WebSockets.
- **LangGraph pipeline**: Multi-step plan/execute/reflect/judge/synthesize engine verified end-to-end.
- **NLP parser**: Intent classification, entity resolution, and GP name normalization verified.
- **SessionResolver**: 30+ circuit alias map resolving DB sessions and FastF1 on demand.
- **Tool registry**: 11 tools registered at startup with planner compatibility.
- **DB migration auto-apply**: All 3 migration SQL files applied automatically on startup.

### Verified Real Ingested Sessions & Telemetry
- **Qatar GP 2024 (`2024_qatar_gp_race`)**: VERIFIED REAL (Session 006/008/009/010). 317 telemetry metadata rows, real JSON speed traces on disk with `distanceM`.
- **Monaco GP 2023 (`2023_monaco_gp_race`)**: VERIFIED REAL (Session 007/009/010). 510 telemetry metadata rows, real JSON speed traces on disk with `distanceM`.
- **British GP 2022 (`2022_british_gp_race` / Silverstone)**: VERIFIED REAL (Session 007). 284 telemetry metadata rows, real JSON speed traces on disk with `distanceM`.
- **British GP 2024 (`2024_silverstone_gp_race`)**: 329 telemetry files on disk with `distanceM`.
- **São Paulo GP 2024 (`2024_são_paulo_gp_race`)**: 378 telemetry files on disk with `distanceM`.
- **Hungarian GP 2024 (`2024_13_race`)**: 458 telemetry files on disk with `distanceM`.

### Ingestion & Tool Guardrails
- `_populate_synthetic_session()` completely deleted from `fastf1_collector.py`.
- `load_session()` returns `{"status": "error", "session_id": None}` on download/validation failure.
- `collect()` always loads telemetry (`telemetry=True, laps=True, weather=True`).
- `TelemetryTool._load_telemetry_from_db()` has no sine-wave synthetic generator.
- `load_default_race_weekend()` implemented and verified in `loader.py` (resolves startup `ImportError` on empty DB).
- `safe_execute_query()` in `fastf1_collector.py` logs all DB exceptions at `ERROR` level with `exc_info=True`.
- Groq API key prefix validation (`gsk_`) corrected in `planner.py` and `personas.py` (no longer falsely treated as offline/mock).
- Legacy synthetic purge executed: 2,242 fake JSON files removed from disk, 10 fake DB sessions purged.

---

## 2. What Is Broken Right Now

### HIGH -- Wrong Behavior
- **Ergast API is dead**: `ergast_collector.py` still calls `https://ergast.com/api/f1`.

### MEDIUM -- Data Quality
- **Tyre wear model in TelemetryTool still hardcoded** (`adapters.py` lines ~384-386).
- **Remaining sessions without telemetry**: 2024 Monaco, Spanish, Belgian, Canadian, etc. have real lap times and race results in PostgreSQL, but have not had full telemetry ingestion executed yet.

### LOW -- Code Debt
- `aggregator.py` line 69: scoring persist failures swallowed at WARNING.
- `startup.py` line 174: migration errors at WARNING.
- `openf1_collector.py`: implemented but not wired into active ingestion.
- FastAPI `on_event` deprecation warnings (lifespan handlers recommended).

---

## 3. What Is NOT Yet Started (Frontend & Backend Backlog)

### Frontend Features NOT Yet Started / Prototype Only
- **Ghost Battle UI (`/ghost-battle/:raceId` / `GhostBattle.jsx`)**: Currently a static prototype wired to mock data (`TELEMETRY_PIA_LAP42` in `lib/data.js`). Needs real backend endpoint wiring for corner-by-corner micro-sector telemetry comparison.
- **Interactive Strategy Playground (`/strategy/:raceId` / `StrategyPlayground.jsx`)**: Needs live what-if simulation backend wiring for dynamic pit lap / compound sliders.
- **Driver Scorecards & Championship Standings UI**: No dedicated driver/constructor scorecard view connected to DB scoring tables.
- **Live Race Monitor / Real-Time WebSocket Telemetry**: WebSocket server is echo-only; no live stream telemetry dashboard.
- **Authentication & User Management UI**: Frontend login/register components exist, but full session guard enforcement across all pages is not active.

### Backend Features NOT Yet Started
- **OpenF1 Live / Archive Ingestion**: Implemented in `openf1_collector.py` but not hooked to live ingestion pipeline.
- **Multi-session Conversation Memory Persistence**: Long-term thread state persistence across reboots.
- **Automated CI/CD & Docker Compose**: Full orchestration containerization unverified.

---

## 4. Season / Data Coverage Status

| Season | Grand Prix | Session ID | Real Data? | Telemetry JSON? | Notes |
|--------|-----------|------------|------------|-----------------|-------|
| 2024 | Qatar GP | 2024_qatar_gp_race | YES | YES | Ingested & verified end-to-end via /engineer/query, TelemetryCard, ScoringTool, SimulationTool & StrategyTool (Session 006/008/009/010) |
| 2024 | British GP | 2024_silverstone_gp_race | YES | YES | Ingested & verified with distanceM (329 files) |
| 2024 | Sao Paulo | 2024_são_paulo_gp_race | YES | YES | Ingested & verified with distanceM (378 files) |
| 2024 | Hungarian GP | 2024_13_race | YES | YES | Ingested & verified with distanceM (458 files) |
| 2023 | Monaco GP | 2023_monaco_gp_race | YES | YES | Ingested & verified with distanceM (510 rows/files) (Session 007/009/010) |
| 2022 | British GP (Silverstone) | 2022_british_gp_race | YES | YES | Ingested & verified with distanceM (284 rows/files) (Session 007) |
| 2024 | Monaco | 2024_monaco_gp_race | YES (Timing) | ❌ NO | Real lap times & results in DB; telemetry not yet ingested |
| 2024 | Spanish GP | 2024_spanish_gp_race | YES (Timing) | ❌ NO | Real lap times & results in DB; telemetry not yet ingested |
| 2024 | Austrian GP | 2024_austria_gp_race | ❌ PURGED | ❌ NO | Legacy synthetic purged; ready for clean FastF1 ingest |
| 2024 | Abu Dhabi | unknown | ❓ NOT INGESTED | ❌ NO | Needs real ingest run |
| 2026 | Any GP | N/A | ❌ NO | ❌ NO | FastF1 cannot serve 2026; synthetic purged |

---
