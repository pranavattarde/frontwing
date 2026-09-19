# PROJECT STATE -- FrontWing
> This file is OVERWRITTEN at the start of every agent session. It is NOT a history log.
> Last updated: 2026-09-19 by Antigravity (Session 050 - Production GitHub Actions CI/CD Pipeline & Live Multi-Stage Verification)
> Audit method: Verified live via two-stage GitHub Actions CI run on branch `test/ci-verification`. Verified that an intentional test failure blocked merge loudly (Run #35370270860, conclusion: failure). Then verified that the fixed branch passed 100% green across all 7 CI jobs: Lint AI Services, Lint Frontend, Lint Backend, Frontend Production Build, Backend Integration & Security Test Suite, AI Services Pytest Suite, and CI Quality Gate (Run #35423348988, conclusion: success). CD pipeline configured to build & publish multi-stage Docker images to GitHub Container Registry (ghcr.io) upon merge to main.

---

## 1. What Works Right Now

### Production Containerization & Hardened Docker Architecture (SESSION 049 VERIFIED LIVE)
- **Containerized 5-Service Stack (`docker-compose.yml`)**:
  - `postgres` (17-alpine): Dedicated health check (`pg_isready -U postgres -d frontwing`), initial hydration mount (`/docker-entrypoint-initdb.d/00_init_database.sql`) containing 42 sessions, 31,878 real laps, 33 drivers, 30 circuits.
  - `redis` (7-alpine): Dedicated health check (`redis-cli ping`).
  - `ai_services` (Python 3.12 slim): Non-root `appuser` (UID 1000), multi-worker Uvicorn (`--workers 2`), health check (`curl -f http://localhost:8000/health`).
  - `backend` (Node 20 alpine): Non-root `node` user (UID 1000), automatic migration validation on boot, health check (`wget --spider http://localhost:5000/api/hero/current`).
  - `frontend` (Multi-stage build):
    - Stage 1: `node:20-alpine` runs `npm run build` producing optimized static assets (2,519 modules).
    - Stage 2: `nginx:1.27-alpine` serves static bundle with hardened security headers (`X-Frame-Options DENY`, `X-Content-Type-Options nosniff`, `Referrer-Policy strict-origin-when-cross-origin`).
    - Nginx reverse proxy routes all backend and AI endpoints (`/api/`, `/engineer/`, `/strategy/`, `/ghost-battle/`, `/hero/`, `/editorial/`, `/sessions/`, `/auth/`, `/ws`).
    - Health check probing `http://localhost/healthz`.
  - Strict startup dependency health chain: `postgres` & `redis` (healthy) -> `ai_services` (healthy) -> `backend` (healthy) -> `frontend` (healthy).
- **Environment Variables & Secrets Reference**:
  - Comprehensive documentation in `docs/ENVIRONMENT_VARIABLES.md` and `.env.example` across all three tiers.
  - Hardened production security: `ENVIRONMENT=production` and `NODE_ENV=production` disable FastAPI Swagger `/docs`, `/redoc`, and `/openapi.json` (verified returning HTTP 404), mask 500 error stack traces (`safe_error_detail(e)`), and enforce strict CORS origins.
- **Database Migration Safety & Backup Runbook**:
  - All 8 database migrations verified idempotent and additive.
  - Authored `docs/BACKUP_AND_RESTORE.md` detailing automated cron `pg_dump` commands, 30-day retention policies, and single-command disaster recovery runbooks.
- **Automated Smoke Test Verification (`scratch/docker_smoke_test.py`)**:
  - All 5 automated tests passed 100% against the containerized production stack:
    1. Health endpoints verified across AI Services (8000), Backend (5000), and Frontend Nginx (5173).
    2. User registration and JWT authentication: generated 285-character token for new user.
    3. Race Engineer query: "Who won the 2024 Dutch Grand Prix and what was the podium?" answered correctly with Norris in 0.07s.
    4. Strategy Engineer what-if query: "What if Verstappen pitted on lap 22 at the 2024 Dutch GP?" simulated P7 finish, -25.19s net delta, 72 synchronized laps.
    5. 3D Ghost Battle data: 2024 Dutch GP NOR vs VER generated 567 spatial telemetry points.

### Scoped Telemetry Visualization in Strategy Engineer (SESSION 047 - FIX GG VERIFIED LIVE)
- **Backend Telemetry Normalization (`ai_services/app/agents/strategy_planner.py`)**:
  - `run_strategy_analysis()` and `run_strategy_whatif()` generate a standardized `telemetry_comparison` payload:
    - `lap_times`: Array of synchronized lap objects: `lap_number`, `actual_lap_time`, `simulated_lap_time`, `actual_compound`, `simulated_compound`, `is_pit_lap`.
    - `actual_pit_laps` & `simulated_pit_laps`: Explicit pit stop lap indices.
    - `actual_compounds` & `simulated_compounds`: Tyre compound sequences.
    - `summary_comparison`: High-level numbers (`finish_position`, `total_time_seconds`, `traffic_loss_s`, `undercut_gain_s`, `net_advantage_s`, `scenario_label`).
  - Strict protocol enforcement: Zero vehicle dynamics traces (instantaneous speed, throttle, brake, RPM, gear, steering angle) in Strategy Engineer responses.
  - Resolved candidate evaluation scope bug ensuring `sim_laps_formatted` and `act_pit_laps` execute without `UnboundLocalError` across both candidate simulation and fallback branches.
- **Frontend Scoped Telemetry Component (`frontend/src/components/StrategyTelemetryComparison.jsx`)**:
  - **Interactive 2-Series SVG Line Chart**:
    - Actual Strategy: Solid white line with subtle opacity (`stroke="rgba(255,255,255,0.85)"`).
    - Suggested/Counterfactual Strategy: Formula 1 Red dashed line (`stroke="#E10600"` with `strokeDasharray="4 3"`).
    - Pit stop window lines: Vertical dashed lines with colored badge pills (`ACT L{lap}` in slate/zinc, `SIM L{lap}` in red).
    - Dynamic interactive crosshair and hover tooltip displaying Lap number, Actual Lap Time, Simulated Lap Time, Lap Delta, and compound pills.
  - **Context-Aware Scenarios**:
    - Strategy Analysis: Displays `"Suggested Strategy Comparison"` badge with the simulated offset/compound scenario.
    - What-If Simulation: Displays `"Counterfactual Telemetry"` badge with user scenario label (e.g. `"Pit Lap 22 (HARD) instead of Lap 27 (HARD)"`).
  - **Side-by-Side Key Numbers Table**:
    - Side-by-side metrics: Finish Position, Total Race Time, Pit Stop Timing, Tyre Compounds, Traffic Loss, Undercut Advantage, and Net Advantage.
- **Full Integration into Strategy Engineer Views**:
  - `StrategyReportCard.jsx`: Section 4 `"SCOPED TELEMETRY & LAP-TIME PROGRESSION"` renders the 2-series chart and comparative table.
  - `WhatIfSimulationCard.jsx`: Counterfactual simulation results display the 2-series telemetry comparison and side-by-side table.
- **Verified Simulation Results (100% Real PostgreSQL Data)**:
  1. **Analysis 1 (Verstappen, Dutch GP 2024)**: Suggested Pit Lap 30 (HARD) instead of Lap 27 (HARD) -> P2 to P5, Net Delta: -12.60s, 72 actual vs 72 simulated laps.
  2. **Analysis 2 (Russell, Miami GP 2026)**: Suggested Pit Lap 28 (MEDIUM) instead of Lap 20 (HARD) -> P4 to P9, Net Delta: -8.10s, 57 actual vs 57 simulated laps.
  3. **What-If 1 (Verstappen, Dutch GP 2024)**: Pit Lap 22 (HARD) instead of Lap 27 (HARD) -> P2 to P7, Net Delta: -25.19s, Traffic Loss: 16.21s.
  4. **What-If 2 (Piastri, Qatar GP 2024)**: Pit Lap 18 (HARD) instead of Lap 34 (HARD) -> P3 to P7, Net Delta: -34.57s, Traffic Loss: 62.12s.

### Multi-Turn Conversation Thread Persistence & History Restoration (SESSION 046 - CRITICAL FIX II VERIFIED LIVE)
- **Single Canonical Sidebar Entry Per Thread (`investigations` vs `conversations`)**:
  - **Root Cause Identified**: Follow-up questions in Investigation Room (`InvestigationThread.jsx`) and Strategy Engineer (`StrategyEngineer.jsx`) were creating a new UUID and triggering `INSERT INTO investigations` on every submission, scattering single conversations across multiple sidebar items.
  - **Thread-Level Aggregation**: In `HistoryService.saveInvestigation()`, if a thread exists for `conversation_id`, the system updates the existing `investigations` entry (`timestamp`, `ai_response`, `session`, `investigation_metadata`) and appends the turn to `conversations`.
  - **Chronological Turn History**: `HistoryService.getInvestigationById()` queries `conversations WHERE conversation_id = $cid ORDER BY id ASC` and returns the complete `turns` array.
- **Elimination of Generic "Race debrief analysis complete" Placeholders**:
  - **Rich Response JSONB Persistence**: Added `response JSONB` column to PostgreSQL `conversations` table (via migration `08_conversation_thread_integrity.sql`). Each turn now preserves its full payload (telemetry metrics, charts, scorecards, what-if simulations).
  - **Multi-Turn Message Reconstruction (`InvestigationThread.jsx`)**: When loading an investigation from history, all turns are reconstructed chronologically. Initial question and mapped cards appear first, followed by each user follow-up prompt and its corresponding rich cards.
- **Strategy Engineer Multi-Turn Restoration (`StrategyEngineer.jsx` & `Sidebar.jsx`)**:
  - **Dedicated Routing**: Sidebar clicks on strategy sessions route directly to `/strategy?id=${item.id}`.
  - **State Restoration**: `StrategyEngineer.jsx` reads `?id=...`, fetches the thread via `fetchInvestigationById()`, and populates `chatHistory` with all prior what-if turns and simulation reports.
  - **Single Event Dispatch**: Only the first submission dispatches `frontwing-chat-created`; follow-ups dispatch `frontwing-chat-synced`.

### What-If Strategy Counterfactual Calibration & Ordinal Parsing Resolution (SESSION 045 - CRITICAL FIX HH VERIFIED LIVE)
- **Elimination of Fake Multi-Hundred-Second Deltas (`simulation_engine.py`)**:
  - **Root Cause Identified**: When simulating counterfactual pit stops (e.g. Russell at 2026 Miami GP), comparing raw synthetic green-flag projections ($93.7\text{s}$ clean air pace) against real historical race totals that included multi-lap Safety Car neutralizations (Laps 6–11 at $130\text{s}-150\text{s}$, $+246\text{s}$ SC inflation) produced fake $+232\text{s}$ to $+233\text{s}$ gains across all scenarios regardless of pit lap requested.
  - **Safety Car Pace Ceiling**: In `load_session_data_from_db()` and `run_strategy_simulation()`, dynamic SQL pace analysis identifies neutralized laps ($\text{mean} > 1.20 \times \text{median\_grid\_pace}$). On neutralized laps, simulated pace is capped by the real neutralized grid pace (`max(sim_lap, sc_pace[k])`), preventing cars in clean air from driving at green-flag pace during track-wide Safety Cars.
  - **Pre-Divergence Identity Blending**: For all laps prior to strategy divergence ($k \le \min(\text{actual\_pit\_lap}, \text{simulated\_pit\_lap})$), the driver is physically on the exact same tyre compound and age under identical race conditions. Preserved actual recorded lap times up to the divergence point, maintaining historical real-world pace while simulating counterfactual physics post-divergence.
  - **Identical Strategy Identity Principle**: When `simulated_pit_lap == actual_pit_lap` on the same compound, `strategy_delta_s = 0.00s`, `simulated_pos = actual_pos`, and `position_change = 0`.
- **Ordinal and Relative Pit Lap Parsing Resolution (`strategy_planner.py`)**:
  - Replaced crude digits-only regex with comprehensive ordinal parsing in `parse_scenario_pit_lap()`:
    - Supports numeric ordinals: `1st`, `2nd`, `3rd`, `4th`, etc.
    - Supports word ordinals: `first`, `second`, `third`, `fourth`, `fifth`, etc.
    - Word boundary regex ensures "2nd lap only" parses strictly as absolute Lap 2 instead of defaulting to `actual_pit_lap - 4 = 16`.
    - Preserves relative offset phrases: `"5 laps earlier"` $\to \text{actual} - 5 = 15$, `"3 laps later"` $\to \text{actual} + 3$.
- **Word-Boundary Protected Unmodeled Variable Detection (`strategy_planner.py`)**:
  - Replaced substring matching `if var in q_lower:` with strict word-boundary matching `re.search(r"\b" + re.escape(var) + r"\b", q_lower)`.
  - Fixes critical regression where the unmodeled variable `"ers"` matched inside the substring of `"Verstappen"` (`v-ers-tappen`), falsely rejecting valid Verstappen what-if queries.
- **Verified Simulation Results (Zero Mock, 100% Real PostgreSQL Data)**:
  - **Miami GP 2026 (George Russell, Actual Pit Stop Lap 20 on Hard, Finished P4)**:
    1. *"what if he pitted 5 laps earlier?"*: Target Lap 15 $\to$ Finish P10 ($-6$), Net Delta $-16.71\text{s}$ (Traffic Loss: $36.46\text{s}$).
    2. *"what if he pitted on 2nd lap only?"*: Target Lap 2 $\to$ Finish P13 ($-9$), Net Delta $-51.40\text{s}$ (Traffic Loss: $4.67\text{s}$).
    3. *"what if he pitted on lap 30?"*: Target Lap 30 $\to$ Finish P10 ($-6$), Net Delta $-14.52\text{s}$ (Traffic Loss: $36.46\text{s}$).
    4. *Identity Check (Lap 20)*: Target Lap 20 $\to$ Finish P4 ($+0$), Net Delta $0.00\text{s}$.
  - **Dutch GP 2024 (Max Verstappen, Actual Pit Stop Lap 27 on Hard, Finished P2)**:
    1. *"What if Verstappen pitted on lap 22 at the 2024 Dutch GP?"* (5 laps earlier): Target Lap 22 $\to$ Finish P7 ($-5$), Net Delta $-25.19\text{s}$.
    2. *"What if Verstappen pitted on lap 35 at the 2024 Dutch GP?"* (8 laps later): Target Lap 35 $\to$ Finish P8 ($-6$), Net Delta $-32.75\text{s}$.
    3. *"What if Verstappen pitted on the 3rd lap at the 2024 Dutch GP?"* (ordinal stop): Target Lap 3 $\to$ Finish P13 ($-11$), Net Delta $-81.57\text{s}$.
    4. *Identity Check (Lap 27)*: Target Lap 27 $\to$ Finish P2 ($+0$), Net Delta $0.00\text{s}$.
  - **Qatar GP 2024 (Oscar Piastri, Actual Pit Stop Lap 34 on Hard, Finished P3)**:
    1. *"What if Piastri pitted on lap 18 on hard tires at the 2024 Qatar GP?"*: Target Lap 18 $\to$ Finish P7 ($-4$), Net Delta $-34.57\text{s}$ ($< 0$, passing test).

### Collapsible & Expandable Sidebar with Responsive Layout Reflow (SESSION 044 - FIX FF VERIFIED LIVE)
- **Collapsible Sidebar Architecture (`Sidebar.jsx`, `App.jsx`, `BriefingHeader.jsx`)**:
  - Engineered dual-mode responsive sidebar: expanded full panel (`w-64` / 256px width) and collapsed slim icon-only rail (`w-16` / 64px width).
  - Collapsed rail displays strictly icon-only controls with zero text labels: FrontWing connected speed mark logo, expand double-chevron toggle (`»`), new investigation action (`＋`), global search (`🔍`), navigation route icons (`🏁` Briefing Room, `📊` Strategy Engineer, `⚡` Ghost Battle), pinned quick-access pips (`📌`), and user circular avatar profile pip (`PI` / `🔑`).
  - Implemented accessible `aria-label`s and native tooltip titles for all slim rail icons.
- **Hardware-Accelerated Motion System Tokens (`Sidebar.jsx`, `index.css`)**:
  - Smooth width transition using FrontWing motion tokens: `transition-[width] duration-[240ms] [transition-timing-function:cubic-bezier(0.2,0,0,1)] select-none`.
  - Content containers within both expanded and collapsed shells utilize GPU-accelerated opacity fades (`animate-fade-in`), avoiding layout thrashing or stuttering.
- **Dynamic Content Reflow & Window Resize Dispatch (`Sidebar.jsx`, `App.jsx`)**:
  - Main application container in `App.jsx` uses `flex-1 flex flex-col min-w-0 h-full overflow-y-auto`.
  - When the sidebar collapses, the main content area smoothly expands to occupy `calc(100vw - 64px)` without horizontal scrollbars, clipped text, or layout jumps.
  - Automatically dispatches `window.dispatchEvent(new Event("resize"))` 250ms after collapse/expand transitions to trigger chart recalculations across Recharts, SVG delta overlays, and Three.js canvases.
- **Cross-Session Persistence & Hotkey Integration (`Sidebar.jsx`)**:
  - User collapse/expand preference is persisted across browser refreshes and sessions in `localStorage.getItem("frontwing_sidebar_collapsed")`.
  - Added global keyboard shortcut `Ctrl+B` (or `Cmd+B`) to toggle sidebar collapse/expand from anywhere in the app.
  - Added `Ctrl+N` shortcut to initiate a new investigation and smoothly focus the input bar via `frontwing-focus-input`.
- **Verified Desktop & Tablet Responsive Proofs**:
  - Verified live in browser subagent across 5 screenshots:
    1. `sidebar_expanded_desktop_1789650135805.png`: Full 256px sidebar on desktop homepage.
    2. `sidebar_collapsed_desktop_1789650363060.png`: Slim 64px icon-only rail with clean reflow of countdown hero and last race results.
    3. `investigation_sidebar_expanded_1789650603713.png`: Investigation room with full sidebar.
    4. `investigation_sidebar_collapsed_1789650616001.png`: Investigation room with collapsed rail, card naturally filling the wider viewport width.
    5. `tablet_responsive_view_1789650668447.png`: Tablet viewport (820x1000) showing clean responsive reflow.

### Web Search Fallback for Out-of-Scope Queries & Critical Scope Rules (SESSION 043 - FIX BB VERIFIED LIVE)
- **Zero-Paid-API Web Search Engine (`ai_services/app/tools/web_search.py`, `adapters.py`)**:
  - Engineered `WebSearchEngine` querying Wikipedia REST API for technical, historical, and aerodynamic encyclopedic summaries, and Google News RSS for contemporary reporting, regulations, and journalism.
  - Returns structured `results` with clean fair-use snippets (truncated cleanly at sentence boundaries, <= 300 chars) and `sources` list containing `{title, url, source}`.
  - Registered `WebSearchTool` (`web_search_tool`) in `tool_registry` and `BaseF1Tool` adapter system.
- **Adaptive Routing & Factual Synthesis (`planner.py`, `nlp_parser.py`, `context_builder.py`)**:
  - Expanded NLP intent matching to classify non-telemetry questions (technical concepts, car design, rules/regulations, materials, temperatures) as `intent="knowledge"`.
  - Planner routes to `["knowledge_tool", "web_search_tool"]` and passes the query through execution order.
  - `synthesize_node` invokes LLM provider to synthesize a comprehensive, clean 2-3 paragraph answer citing retrieved evidence, with fallback to clean snippets when offline or rate-limited.
  - Returns `sources` at the top level of the response dictionary for direct frontend rendering.
- **Critical Scope Enforcement Rule (`planner.py`, `investigation_correlator.py`)**:
  - Telemetry, comparison, or driver/race-specific data sections are strictly omitted unless the query genuinely requires them.
  - Strips out empty "Telemetry Findings: No data available", dummy simulations, and empty standings for pure knowledge/web-search queries.
  - Verified across 3 out-of-scope queries with `scratch/verify_bb_queries.py`:
    1. *"Who designed the Red Bull RB19 and what aerodynamic concept made it so dominant?"* -> Adrian Newey & ground effect underfloor tunnels, citations to 5 sources, zero dummy telemetry sections.
    2. *"What is the 107% qualifying rule in Formula 1 and when was it introduced?"* -> 107% threshold, Q1 elimination, safety origins, 5 sources, zero dummy telemetry sections.
    3. *"What materials are Formula 1 brake discs made of and what operating temperatures do they reach?"* -> Carbon-carbon composites & ~1000°C temperatures, 5 sources, zero dummy telemetry sections.

### Dynamic Sizing & Natural Flow for AI Verdict Card (SESSION 043 - FIX CC VERIFIED LIVE)
- **Fluid Layout & Scroll-Trap Elimination (`VerdictBlock.jsx`, `InvestigationThread.jsx`)**:
  - Removed `overflow-hidden` and fixed height constraints from `VerdictBlock.jsx`, allowing verdict cards to size dynamically to their content.
  - Removed artificial line slicing (`cleanLines.slice(0, 4)`) in `InvestigationThread.jsx` so complete multi-paragraph answers render fully.
  - Converted verdict text display to `<MarkdownContent content={verdict} />` to render bold text, lists, and markdown formatting natively.
  - Removed nested scroll trapping (`overflow-y-auto` inside `overflow-hidden`) so the page flows naturally down into narrative findings and evidence cards.

### Elimination of Internal Provider/Model Names & Clean Title Case UI Everywhere (SESSION 043 - FIX DD VERIFIED LIVE)
- **Complete Removal of Internal AI Engine & Provider Badges Everywhere**:
  - Removed `AI_ENGINEER_ACTIVE` badge from `BriefingHeader.jsx`.
  - Removed provider names (Gemini / Groq), model names (`gemini-3.6-flash`, `openai/gpt-oss-120b`, `gemini-2.0-flash`), and internal status indicators across all user-facing UI (`VerdictBlock.jsx`, `BriefingRoom.jsx`, `InvestigationThread.jsx`, `StrategyEngineer.jsx`).
  - Completely excised `providerInfo` state and all provider/model setters from `InvestigationThread.jsx`.
  - Removed confidence percentage badges and confidence strips from `VerdictBlock.jsx`, `DriverCard.jsx`, `ExplanationPanel.jsx`, and cards across the product.
  - Updated fallback driver codes (`DRV_A`, `DRV_B`, `DRIVER_A`, `DRIVER_B`) to clean human-readable names (`Driver A`, `Driver B`).
- **Comprehensive Title Case & Clean Section Labels Across the ENTIRE Frontend**:
  - Replaced all `ALL_CAPS_WITH_UNDERSCORES` labels with clean human-readable Title Case across all components and pages:
    - `CommandPalette.jsx`: Cleaned category labels (`Navigation`, `Actions`), `[Esc to Close]`, and empty query message `No matching commands found`.
    - `ComparisonSlider.jsx`: Changed `STRATEGY_DECISION_SLIDER // PIT_STOP_WINDOW` to `Strategy Decision Slider • Pit Stop Window`, `RE_COMPUTING...` to `Computing Projection...`, and `LAP` to `Lap`.
    - `DriverCard.jsx`: Changed `GRID_START` to `Grid Start`, `GRID_DIFF` to `Grid Delta`, `TEAM` to `Team`, `STATUS` to `Status`, `COMPOSITE` to `Overall`, `SCORE` to `Score`, `COMPARE WITH TEAMMATE` to `Compare with Teammate`.
    - `ErrorBoundary.jsx`: Changed `SYSTEM_DIAGNOSTIC // COMPONENT_FAULT` to `System Diagnostic • Component Notice`, user message cleaned.
    - `ExplanationPanel.jsx`: Removed uppercase styling from `Synthesis Conclusion`, `Root Cause Reasoning Chain`, and `Dispatched Tool Invocations`.
    - `FollowUpSuggestions.jsx`: Changed `FOLLOW_UP_SUGGESTIONS` to `Suggested Follow-Ups`, `[ASK]` to `Ask →`.
    - `ReasoningTimeline.jsx`: Changed `REASONING_PIPELINE_LATENCY` to `Reasoning Pipeline Latency`, `TOTAL_DURATION` to `Total Duration`, `TYPE:` to `Type:`.
    - `SearchOverlay.jsx`: Changed `RECENT_INVESTIGATIONS` to `Recent Investigations`, `TRENDING_INVESTIGATIVE_LOOPS` to `Suggested Analyses`, `FILTERED_TACTICAL_RESULTS` to `Matching Queries`, `[VIEW]` to `[Select]`, `NO_RECORDS_MATCHING_CRITERIA` to `No matching queries found`.
    - `SourceViewer.jsx`: Changed `SOURCE_EVIDENCE_LOG` to `Source Evidence Log`, `[VIEW_SUMMARY]` to `[View Summary]`, `[INSPECT_RAW_JSON]` to `[Inspect Raw JSON]`, `IDENTIFIER:`, `TIMESTAMP:`, `TYPE:`.
    - `TeamCard.jsx`: Changed `STRAT_GRADE` to `Strategy Grade`, `PIT_CREW_RANK` to `Pit Crew Rank`, `AVG_WEAR_SLOPE` to `Tire Wear Slope`, `CONSTRUCTOR EFFICIENCY SCORE OVER WEEKEND` to `Constructor Efficiency Score`.
    - `TelemetryComparison.jsx`: Changed `TELEMETRY_DELTA_ANNOTATIONS` to `Telemetry Delta Annotations`, `DELTA:` to `Delta:`.
    - `TelemetryOverlay.jsx`: Changed `SYNCHRONIZED_MULTI_CHANNEL_TELEMETRY` to `Synchronized Multi-Channel Telemetry`, `ALIGNMENT: DISTANCE (10M BINS)` to `Alignment: Distance (10m Bins)`.
    - `RaceBriefing.jsx`: Changed `FILTER_TEAMS` to `Filter Teams`.
    - `StrategyPlayground.jsx`: Changed markers `EARLY_TRAFFIC`, `OPTIMAL_P2`, `ACTUAL_P3`, `LATE_LOSS` to `Early Traffic`, `Optimal P2`, `Actual P3`, `Late Loss`.
    - `StrategyEngineer.jsx`: Cleaned section headings (`Suggested Strategy Scenarios`, `Strategy Analysis`, `What-If Counterfactuals`, `Pit Wall`), and removed uppercase text-transforms.
    - `index.css`: Removed forced `text-transform: uppercase` from `.btn-f1-primary`.
- **Dynamic Query-Tailored Progress Messages**:
  - Replaced generic hardcoded loading interval in `InvestigationThread.jsx` with intent-aware stages (`getLoadingStagesForQuery`) tailored dynamically to the question type:
    - Telemetry queries: *"Analyzing telemetry query parameters and targeted channels..."* / *"Querying high-frequency speed traces, braking points, and throttle profiles..."* / *"Aligning lap distances and calculating micro-sector speed deltas..."* / *"Synthesizing cornering telemetry breakdown and tactical insights..."*
    - Strategy / Pit queries: *"Evaluating strategy parameters, pit windows, and tire degradation models..."* / *"Fetching historical stint lengths, tire compound wear rates, and pit loss times..."* / *"Simulating undercut viability and projecting track re-entry gaps..."* / *"Compiling strategic debrief and pit stop recommendations..."*
    - Scoring / Driver queries: *"Parsing driver evaluation criteria and session scope..."* / *"Querying lap-by-lap pace consistency and teammate delta matrices..."* / *"Calculating composite driver ratings across race craft and tire management..."* / *"Generating comprehensive driver debrief scorecard..."*
    - Race Results queries: *"Identifying Grand Prix session and classification criteria..."* / *"Retrieving official race classifications, intervals, and pit stop logs..."* / *"Validating position changes, fastest lap honors, and safety car impacts..."* / *"Synthesizing race outcome report and finishing order..."*
    - Technical Knowledge / Rules queries: *"Parsing technical topic and regulatory scope..."* / *"Searching FIA technical regulations and historical steward precedents..."* / *"Cross-referencing telemetry evidence with rulebook specifications..."* / *"Formulating regulatory assessment and engineering debrief..."*
  - Added dynamic query-tailored loading indicator to `StrategyEngineer.jsx` with counterfactual vs tactical execution vs lap timing models.
  - Collapsed technical reasoning panel in `InvestigationThread.jsx` formats step titles cleanly in Title Case (`Step 1: Fastf1 Telemetry`) with natural language parameter summaries.
  - Automated regex and AST audits verified 0 remaining `ALL_CAPS_WITH_UNDERSCORES` or provider/model strings in frontend user-facing UI. Production bundle builds with 0 errors (`npm run build`); backend security tests 14/14 passing.

### Upcoming Race Hero & FastF1 4-Hour Cadence (SESSION 042 - FIX X VERIFIED LIVE)
- **FastF1 Schedule Selection Logic (`hero_service.py`, `hero.service.js`)**:
  - Selection query checks the current real date (`2026-09-16`) against the official 2026 FastF1 schedule and resolves the **NEXT upcoming race weekend** (Round 15: Azerbaijan Grand Prix, Baku City Circuit, Sep 26, 2026) rather than stale completed races.
  - Automatically falls back to completed race results only if the season is over or no upcoming race exists.
  - Live hero displays dynamic countdown timer (`T - 09D 18H ...`), grand prix title, round badge, and complete weekend session timetable with dual IST (`Asia/Kolkata`, UTC+5:30) and local track time readouts.
- **Dedicated Last Race Results Section (`BriefingRoom.jsx`, `hero_service.py`)**:
  - Created a dedicated, clearly labeled section: `LAST RACE RESULTS // PODIUM & CLASSIFICATION` positioned immediately below the hero on the homepage.
  - Displays the most recently completed race (Round 14: Spanish Grand Prix at Madrid, Sep 13, 2026).
  - Shows full podium classification (Antonelli P1, Verstappen P2, Norris P3), fastest lap (Russell 1:35.587), round details, and real Madrid track outline.
- **4-Hour Scheduled Cadence (`backend/src/services/hero.service.js`)**:
  - Updated hero data refresh cadence from every 5 days to every 4 hours (`FOUR_HOURS_MS = 4 * 60 * 60 * 1000 = 14,400,000ms`).
  - Unit test `hero_cadence.test.js` verified the scheduled recurring job timer interval is exactly 14,400,000ms and verifies both upcoming hero and last race results payloads.

### Year-Specific Circuit Resolution & Real Telemetry Geometry (SESSION 042 - FIX Y VERIFIED LIVE)
- **Year & Location-Aware Circuit Resolution (`hero_service.py`, `circuitTracks.js`)**:
  - Resolved circuit identification using event `Location`, `Country`, and event year—never the GP name alone. In 2026, the Spanish Grand Prix moved to the Madring street circuit in Madrid (`Location: "Madrid"`, `Country: "Spain"`), which is correctly resolved to `Madring Circuit (Madrid)`.
- **Authentic Decimeter Telemetry Track Outlines (`circuitTelemetryTracks.json`, `circuitTracks.js`)**:
  - Ingested authentic FastF1 position telemetry `(X, Y, Z)` in decimeters from driver flying laps into SVG path centerlines (e.g. 715 decimeter coordinates from Russell's 1:35.587 fastest lap at Madrid; full decimeter tracks for Monza, Silverstone, and Zandvoort).
  - Includes calibrated start/finish line indicator coordinates and track metrics.
- **Honest Telemetry Pending Ingestion Placeholder (`BriefingRoom.jsx`, `circuitTracks.js`)**:
  - For circuits where race session telemetry has not yet occurred or been ingested (e.g. Round 15 Baku City Circuit), `circuitTracks.js` returns `hasTelemetry: false`.
  - The hero renders an honest, transparent placeholder: `TRACK_LAYOUT // PENDING TELEMETRY INGESTION` with explicit messaging stating authentic geometry will be generated upon session completion.
  - STRICTLY ZERO fake, approximate, or fallback shapes (no Monza fallback, no synthetic vectors). Verified across Madrid, Monza, Silverstone, and Baku via `backend/tests/circuit_geometry.test.js`.

### System Alert Authentication Recovery (SESSION 042 - FIX Z VERIFIED LIVE)
- **Retry Connection Button (`InvestigationThread.jsx`)**:
  - Checks client authentication state via `localStorage.getItem("token")`.
  - If unauthenticated, triggers the application auth modal (`frontwing-open-auth-modal`) and registers an event listener (`frontwing-auth-changed`). Upon successful login, automatically re-executes the failed investigation query.
  - If already authenticated, directly re-attempts the query with the stored bearer token.
- **Go Home Button (`InvestigationThread.jsx`)**:
  - Cleans up query-related localStorage items and navigates cleanly to the root path `/` via `navigate("/")`.

### Global Click-to-Query Removal & Input-Surface Enforcement (SESSION 042 - FIX AA VERIFIED LIVE)
- **Audited 10 In-Product Click-Triggered Query Surfaces**:
  - 1. `RaceStoryCard.jsx`: Removed "INVESTIGATE IN CONSOLE →" button and moment click handlers (`onMomentClick`, `onFullDebrief`). Key moments rendered as static broadcast divs. Retained read-only external verification links (`VERIFY ON {OUTLET} ↗`).
  - 2. `InsightCard.jsx`: Removed card click invocation; made non-interactive with `cursor-default` and retained external source link (`VERIFY ↗`).
  - 3. `QuestionBar.jsx`: Updated `handleSuggestionClick` to prefill the text input via `setValue(suggestion)` and focus the input without submitting the query.
  - 4. `InvestigationThread.jsx`: Converted follow-up suggestion chips to prefill the `QuestionBar` via `setPrefillQuery(suggestion)` without triggering auto-submission.
  - 5. `StrategyEngineer.jsx`: Changed `PRESET_QUERIES` buttons and follow-up suggestion chips to set the query input value (`setQuestion(...)`) without calling `handleExecuteQuery`.
  - 6. `RaceBriefing.jsx`: Removed `handleQueryTrigger` and `submitEngineerQuery`; converted race phase badges and team cards to static, non-clickable elements.
  - 7. `CommandPalette.jsx`: Removed query execution command runner; replaced auto-submitting query commands (`query-sainz`, `query-norris`) with safe navigation commands (`nav-strategy`, `nav-ghost`).
  - 8. `App.jsx`: Updated `handleSearchResultClick` to dispatch `frontwing-prefill-query` event instead of immediately creating a thread and submitting a query.
  - 9. `BriefingRoom.jsx`: Removed clickable prompt cards from the homepage briefing interface.
  - 10. `GhostBattle3D.jsx`: Generation remains strictly gated behind a multi-step user selection deck (Year -> Completed GP -> 2+ Drivers/Teams -> Explicit "GENERATE 3D GHOST BATTLE" button click).
- **Enforcement Rule**:
  - Race Engineer investigation and Strategy Engineer queries can ONLY be invoked via explicit user submission from dedicated typed input surfaces (Enter key or Submit button).

### Formula 1 Broadcast Visual Identity & Design System (SESSION 041 VERIFIED LIVE)
- **Extracted Broadcast Color Palette & Semantic Tokens (`design_tokens.css`, `tailwind.config.js`)**:
  - Replaced legacy electric-blue/cyan theme with authentic Formula 1 broadcast palette:
    - `--surface-canvas`: `#0B0C10` (Root near-black asphalt canvas).
    - `--surface-base`: `#15151E` (F1 Carbon Dark Slate card and container background).
    - `--surface-raised`: `#1C1D29` (Step 1 elevated: headers, active tabs, nested panels).
    - `--surface-overlay`: `#252738` (Step 2 elevated: modals, popovers, dropdowns).
    - `--surface-subtle`: `rgba(255, 255, 255, 0.03)` (Row striping and background washes).
    - `--border-subtle`: `rgba(255, 255, 255, 0.08)`, `--border-medium`: `rgba(255, 255, 255, 0.16)`, `--border-strong`: `rgba(255, 255, 255, 0.28)`.
    - `--accent-primary`: `#E10600` (Official Formula 1 Speed Red PMS 485C) with hover (`#B50500`) and active (`#8F0400`).
    - Timing Tower Statuses: `--timing-purple` (`#B138DD` Session Best), `--timing-green` (`#00D26A` Personal Best), `--timing-yellow` (`#FFD600` Slower/Caution).
    - Pirelli Tyre Compounds: Soft `[S]` (`#FF1801`), Medium `[M]` (`#FFD600`), Hard `[H]` (`#FFFFFF`), Intermediate `[I]` (`#00D26A`), Wet `[W]` (`#0090FF`).
  - Zero raw color names or hardcoded cyan in design tokens.
- **Broadcast Condensed Typography & Tabular Figures (`index.html`, `index.css`)**:
  - Wired Google Fonts: `Barlow Condensed` (400–900 normal & italic for broadcast displays and titles), `Inter` (400–700 for body reading), and `JetBrains Mono` (400–700 for data readouts).
  - Defined full type scale: `.type-display` (36px italic), `.type-h1` (28px italic), `.type-h2` (22px italic), `.type-h3` (18px bold), `.type-h4` (15px semibold), `.type-body` (14px), `.type-body-sm` (13px), `.type-caption` (11px uppercase tracked).
  - Monospace / Tabular numbers via `.type-tabular` and `.tabular-timing` (`font-variant-numeric: tabular-nums; font-feature-settings: 'tnum' 1;`). Guaranteed vertical decimal and colon alignment in timing columns.
  - Replaced cyan focus rings with broadcast red beacons (`outline: 2px solid var(--border-focus); outline-offset: 2px;`) for keyboard accessibility.
- **Original FrontWing Connected "FW" Speed Mark (`FrontWingLogo.jsx`)**:
  - 100% original React SVG component supporting `variant="mark" | "full"` and `size="sm" | "md" | "lg" | "xl" | number`.
  - 13° forward-slanted aerodynamic front-wing geometry where the upper wing plane projects forward and the mid plane bridges seamlessly into the W dual-cascade elements, terminating in a sharp trailing wingtip bevel.
  - Fully compliant with trademark constraints: zero negative space "1"s, zero parallel speed-line stripe cuts from the official F1 logo.
- **Mechanical Motion & Interactive Component System (`index.css`)**:
  - Precise mechanical easing curves (`--ease-mechanical: cubic-bezier(0.2, 0.0, 0.0, 1.0)`) and calibrated durations (120ms hover, 240ms panel reveal, 400ms route transition).
  - Consistent interactive states for `.btn-f1-primary`, `.btn-f1-secondary`, `.btn-f1-ghost`, `.input-f1`, `.card-interactive`, and tyre badges.
- **Design System Showcase Page (`DesignSystemShowcase.jsx`, `/design-system`)**:
  - Mounted dedicated showcase route showing every token swatch, full typography scale, tabular digit comparison table, FW logos at multiple sizes, and interactive states.
  - Verified live in browser with subagent screenshots (`ds_showcase_top`, `ds_showcase_middle`, `ds_showcase_bottom`, `ds_showcase_interactive`).

### Full Performance Optimization & Concurrency Baseline (SESSION 040 VERIFIED)
- **Cold-Cache Latency Instrumentation & Measurements (`scratch/measure_performance.py`)**:
  - High-precision benchmarking harness instrumenting exact durations of each pipeline stage with Redis flushed before every run.
  - Baseline vs Optimized Measured Latencies:
    - *Race Result* ("Who won the 2024 Dutch Grand Prix and what was the podium?"): Baseline 16,699.0ms -> Optimized 16,681.9ms (-17.1ms). (Single tool, dominated by LLM planning + synthesis).
    - *Telemetry Comparison* ("Compare Verstappen and Norris at 2024 Dutch GP"): Baseline 13,226.0ms -> Optimized 11,162.0ms (**-2,064.0ms, -15.6% faster**). Concurrent tool execution of `race_results_tool` and `telemetry_tool`.
    - *Driver Scoring* ("Score Verstappen's driving performance at 2024 Dutch GP"): Baseline 15,144.4ms -> Optimized 18,707.5ms. Parallel tools dropped execution time to 276ms, but Gemini API rate-limiting increased planning latency to 12.9s (reported honestly).
    - *What-If Simulation* ("What if Verstappen pitted on lap 20 at the 2024 Dutch GP?"): Baseline 18,199.7ms -> Optimized 17,694.5ms (**-505.2ms, -2.8% faster**).
    - *Strategy Analysis* ("Analyze the pit stop strategy for Norris in the 2024 Dutch GP"): Baseline 42,003.8ms -> Optimized 20,608.2ms (**-21,395.6ms, -50.9% faster**).
- **Independent Tool Parallelization in LangGraph (`ai_services/app/agents/planner.py`)**:
  - Replaced sequential loop in `execute_node` with concurrent dispatch using `concurrent.futures.ThreadPoolExecutor(max_workers=min(4, len(runnable_steps)))`.
  - Independent tool steps in a single plan (e.g. classification + telemetry, scoring + classification) run simultaneously, while preserving deterministic result indexing and trace logging.
- **PostgreSQL Query Plan Optimization & Composite Indexing (`06_performance_indexes.sql`)**:
  - Audited query plans via `EXPLAIN ANALYZE` on `laps` (31,878 rows), `telemetry_metadata` (7,939 rows), and `stints` (2,375 rows).
  - Added composite B-tree index `idx_telemetry_meta_session_driver ON telemetry_metadata(session_id, driver_id)`:
    - Planning time: **1.271ms -> 0.391ms**
    - Execution time: **0.185ms -> 0.077ms** (**58.4% faster**).
  - Confirmed 0 sequential scans on `(session_id, driver_id)` across all 3 tables (all using Bitmap Index Scan).
- **Async Backfill Concurrency Verification (Fix O Validated Under Load)**:
  - Stress-tested `start_async_backfill` with 3 concurrent requests simultaneously requesting the same uningested session.
  - All 3 callers returned in 4.12ms total (Caller 1: 0.65ms, Caller 2: 0.01ms, Caller 3: 0.01ms).
  - Exactly 1 background job instance spawned (`id: 1809594227008`), 0 duplicate worker threads spawned, 0 synchronous blocking.
- **Session-Indexed Redis Cache Invalidation (`cache.service.js`, `session.controller.js`)**:
  - Indexed investigation cache keys by session using Redis sets `cache:session_keys:<session_id>`.
  - Implemented `CacheService.invalidateSessionCache(sessionId)` purging all query caches and Ghost Battle caches for that session.
  - Connected to `POST /sessions/load` and verified via `test_cache_invalidation.py`: stale cached answers can never be served once session data is re-ingested or corrected.
- **Frontend 3D Code-Splitting & 63.1% Initial Bundle Reduction (`vite.config.js`, `App.jsx`, `GhostBattle3D.jsx`)**:
  - Code-split `GhostBattle3D` with `React.lazy()` and `<Suspense>` in `App.jsx`.
  - Configured Rollup `manualChunks` in `vite.config.js` to isolate `three-vendor`, `react-vendor`, and `icons-vendor`.
  - Initial application JavaScript payload dropped from **1,496.28 kB (411.65 kB gzip)** down to **552.27 kB (158.70 kB gzip)** (**-63.1% reduction**).
  - Heavy 3D engine `three-vendor` (906.84 kB) and `GhostBattle3D` (40.20 kB) are deferred and fetched strictly on demand when visiting `/ghost-battle`.

### Full-Stack Security Hardening & Protection Baseline (SESSION 039 VERIFIED)
- **Layered Rate Limiting (`backend/src/middleware/rate_limit.middleware.js`)**:
  - `authLimiter`: Strict 10 attempts per 15-minute window per IP on `/auth/login` and `/auth/register` (and `/api/auth/*`) to prevent credential stuffing and brute-force attacks.
  - `queryLimiter`: 30 queries per 15-minute window on `/engineer/query` and `/strategy/query`. Automatically keys by authenticated user ID (`req.user.id`) with client IP fallback, mitigating LLM token drainage and compute exhaustion.
  - `ghostBattleLimiter`: 40 requests per 15-minute window on `/ghost-battle/data` keyed by user ID or IP.
  - `generalLimiter`: 150 requests per 15-minute window across all `/api/*` routes as a baseline denial-of-service shield.
  - Verified live: Rapid repeated requests return HTTP `429 Too Many Requests` with safe structured JSON payloads.
- **Strict Input Validation & Free-Text Length Bounds (`validation.middleware.js`)**:
  - `engineerQuerySchema` and `strategyQuerySchema`: Validates free-text questions, trims whitespace, strips non-printable control characters (`[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]`), and enforces strict length boundaries: **minimum 2 characters, maximum 2,000 characters**. Prevents prompt explosion and LLM quota depletion.
  - `ghostBattleDataSchema`: Enforces valid `session_id` and bounds driver selection strictly to $2 \le \text{drivers} \le 22$.
  - `uuidParamSchema`: Validates UUID path parameters against standard regex format before hitting database queries.
  - Malformed JSON interception: Custom JSON syntax error handler catches invalid JSON payloads and returns clean HTTP `400 Bad Request` (`{ error: 'Malformed JSON payload in request body' }`), preventing default Express HTML stack dumps.
- **Zero SQL Injection Vulnerabilities (Audited Across Backend & AI Services)**:
  - 100% of queries in Node.js (`backend/src/services/history.service.js`, `auth.service.js`, `hero.service.js`, `editorial.service.js`) use PostgreSQL parameterized placeholders (`$1, $2, ...`) with values arrays.
  - 100% of queries in Python (`ai_services/app/ingestion/fastf1_collector.py`, `ai_services/app/tools/adapters.py`, `ai_services/app/core/db.py`) use parameter binding tuples with `%s` placeholders. Zero f-strings or raw string interpolations in SQL execution paths.
- **Zero XSS Risk in Frontend Content Rendering**:
  - All Markdown and telemetry tables rendered via [`MarkdownContent.jsx`](file:///c:/VS-Code_C_drive/Projects/FrontWing/frontend/src/components/MarkdownContent.jsx) decompose text into standard React virtual DOM text nodes, ensuring intrinsic browser HTML-escaping. Zero instances of `dangerouslySetInnerHTML` or raw `innerHTML` in the frontend codebase.
  - External web-search links in [`RaceStoryCard.jsx`](file:///c:/VS-Code_C_drive/Projects/FrontWing/frontend/src/components/RaceStoryCard.jsx) strictly validate URLs using `/^https?:\/\//i` before rendering `<a>` tags with `rel="noopener noreferrer"`, completely blocking `javascript:` or `data:` URI execution.
- **CORS Configuration Hardened for Production (`backend/src/index.js`)**:
  - Restricted CORS origin validation: Allows local development origins (`http://localhost:5173`, `http://localhost:3000`, `http://127.0.0.1:*`), while strictly enforcing `ALLOWED_ORIGINS` in production (`NODE_ENV=production`). Disallowed browser origins are rejected with HTTP `403 Forbidden` (`{ error: 'CORS policy violation: origin not allowed' }`).
- **Safe Error Masking & Zero Internal Info Leakage**:
  - Production 500 errors across all controllers and Express global error handler return generic safe text (`"An internal server error occurred. Please try again later."`) while logging full tracebacks and stacks server-side.
  - Zero internal stack traces, filesystem directory paths (`C:\...`), or raw database credentials leaked in client error payloads (verified by automated security audit suite).
- **Automated Security Test Suite (`backend/tests/security.test.js`)**:
  - Integrated into `npm test` in `backend/package.json`. Verifies 14 distinct security invariants across rate limiting, input validation, CORS enforcement, and error masking in <2 seconds.

### Production Secrets Inventory & Provisioning Architecture Guide
- **Active Environment Secrets Inventory**:
  1. `JWT_SECRET`: High-entropy 256-bit signing key used by `jsonwebtoken` for signing and validating session bearer tokens. Strictly required from environment (`process.env.JWT_SECRET`); server throws a fatal startup error if undefined.
  2. `DATABASE_URL`: PostgreSQL connection string with credentials (`postgresql://<user>:<password>@<host>:<port>/<dbname>`). Used by `pg` in Node backend and `psycopg2` in Python microservice.
  3. `REDIS_URL`: Redis connection URL with authentication credentials (`redis://:<password>@<host>:<port>/0`). Used for query caching, session lock deduplication, and rate limiting state.
  4. `GEMINI_API_KEY`: Google Gemini API key used by `GeminiProvider` in `providers.py` for primary F1 reasoning, plan generation, and synthesis.
  5. `GROQ_API_KEY`: Groq API key used by `GroqProvider` in `providers.py` for ultra-fast Llama-3.3 inference and fallback generation.
  6. `LANGCHAIN_API_KEY` / `LANGSMITH_API_KEY`: LangSmith observability authentication token used for tracing spans across LangGraph nodes, personas, and tools.
  7. `ALLOWED_ORIGINS`: Comma-separated list of approved web origins (e.g. `https://frontwing.app,https://admin.frontwing.app`) enforcing strict CORS boundary in production environments.
- **Git History & Source Code Audit**:
  - Confirmed `.env` files are tracked in `.gitignore` and have **never** been committed to git history (`git log --all --full-history -- "*/.env" ".env"` returned 0 commits).
  - Only template `.env.example` files containing dummy placeholders exist in repository history.
  - Comprehensive grep verified zero hardcoded API keys, passwords, or secrets anywhere in production source code.
- **Production Provisioning Architecture (Phase 6/7 Deployment Standard)**:
  - **Secret Store**: Production environments must inject secrets dynamically at container runtime using an enterprise secrets manager (e.g. AWS Secrets Manager, GCP Secret Manager, HashiCorp Vault, or Railway encrypted environment injection).
  - **Zero Plaintext Files on Host**: Production containers must not write persistent `.env` files to container filesystems.
  - **Rotation Policy**:
    - `JWT_SECRET`: Rotate every 90 days. Implement dual-key verification window during rotation so active user sessions do not abruptly invalidate.
    - LLM API Keys (`GEMINI_API_KEY`, `GROQ_API_KEY`, `LANGCHAIN_API_KEY`): Rotate every 180 days or immediately upon team departure.
    - Database & Redis Passwords: Rotate on scheduled quarterly cycle via managed cloud database IAM or credential manager.
  - **Least Privilege Access**: Cloud database users must only have DML permissions (`SELECT`, `INSERT`, `UPDATE`, `DELETE`) on application tables, with DDL restricted to automated migration pipelines.

### Multi-Season 2025/2026 Data Integrity Re-Verification (SESSION 038 VERIFIED)
- **Fix I (Fastest Lap & Sector Times Cross-Check Across 2025 & 2026)**:
  - Byte-for-byte cross-check executed against FastF1 raw lap data and PostgreSQL `laps` table across **24 driver laps in 5 sessions** (3 in 2025, 2 in 2026):
    - *2025 Australian GP (`2025_australian_gp_race`)*: Norris (L43: 82,167ms), Verstappen (L43: 83,081ms), Leclerc (L43: 85,271ms), Piastri (L43: 83,242ms), Russell (L43: 85,065ms) -> **0 ms delta** on total lap time, Sector 1, Sector 2, Sector 3, and compound.
    - *2025 Chinese GP (`2025_chinese_gp_race`)*: Verstappen (L56: 95,488ms), Norris (L53: 95,454ms), Leclerc (L49: 96,157ms) -> **0 ms delta** across all sectors and lap times.
    - *2025 Dutch GP (`2025_dutch_gp_race`)*: Verstappen (L70: 72,921ms), Leclerc (L33: 74,557ms), Piastri (L60: 72,271ms), Russell (L70: 73,728ms) -> **0 ms delta** across all sectors and lap times.
    - *2026 Austrian GP (`2026_austria_gp_race`)*: Russell (L49: 70,683ms), Piastri (L45: 70,595ms), Verstappen (L57: 70,483ms), Hamilton (L45: 70,946ms), Leclerc (L67: 70,606ms) -> **0 ms delta** across all sectors and lap times.
    - *2026 British GP (`2026_british_gp_race`)*: Hamilton (L25: 92,309ms), Verstappen (L40: 92,101ms), Norris (L45: 92,625ms), Piastri (L42: 92,917ms), Russell (L36: 92,489ms) -> **0 ms delta** across all sectors and lap times.
  - **Verdict**: Selection query accurately identifies fastest lap number and exact millisecond sector times without floating-point drift or table truncation.
- **Fix M (Tyre Degradation Stint Reset & Fuel Correction Across Multi-Stop Races)**:
  - Verified across multi-stint sessions: 2025 Bahrain GP (Verstappen 3 stints, Sainz 4 stints) and 2026 Austrian GP (Hamilton 4 stints, Leclerc 4 stints).
  - **Stint Reset**: All 15 pit stop transitions strictly reset wear to `0.0%` and pace loss to `0.0s` on the lap immediately following an out-lap (e.g. Verstappen 2025 Bahrain L11 wear `0.0%`, L27 wear `0.0%`; Hamilton 2026 Austria L14 wear `0.0%`, L27 wear `0.0%`, L44 wear `0.0%`).
  - **Exclusion Cleaning**: Out-laps, in-laps, start laps, and safety car laps cleanly excluded (`wear_pct = None`) without corrupting regression slopes.
  - **Monotonicity & Non-Negative Wear**: Zero negative wear values observed across all stints; wear increases monotonically throughout each tire lifecycle.
- **2026 Regulations Physics Constant Recalibration Audit**:
  - Investigated `0.060s/lap` linear fuel burn correction factor against 2026 regulations (70–75kg starting fuel vs 105–110kg in 2022–2025).
  - Theoretical calibrated 2026 rate: `0.042s/lap` ($1.36\text{ kg/lap} \times 0.31\text{s}/10\text{kg}$).
  - Difference across a typical 20-lap stint is $0.36\text{s}$ degradation slope delta ($0.018\text{s/lap}$).
  - `ScoringTool` evaluation on 2026 Austria and Britain confirmed all scoring pillars (Strategy, Tire, Pace, Pitstop, Execution) remain physically sane and mathematically bounded in $[0, 100]$ (e.g. Austria 2026 Russell composite 72.14, Hamilton composite 52.97; Britain 2026 Hamilton composite 63.18). Existing models are robust, with seasonal recalibration (`fuel_burn_rate = 0.042 if season >= 2026 else 0.060`) recommended for future sub-tenth precision.
- **OpenF1 Live Multi-Season Cross-Check Coverage**:
  - Live OpenF1 API fully operational and cross-checked for 2025 and 2026:
    - 2025 Australian GP (`session_key = 9693`): Norris pit stops on laps `[2, 3, 4, 34, 44]` matched FastF1 database stints with 100% agreement.
    - 2025 Bahrain GP (`session_key = 10014`): Verstappen pit stops on laps `[10, 26]` matched FastF1 database stints with 100% agreement.
    - 2026 British GP (`session_key = 11326`): Hamilton pit stops on laps `[23, 48]` matched FastF1 database stints with 100% agreement.
    - 2026 Austrian GP (`session_key = 11315`): Hamilton pit stops on laps `[12, 25, 42]` matched FastF1 database stints with 100% agreement.
  - Confirmed `StrategyTool.execute()` returns `openf1_cross_check.status: "verified"` across both 2025 and 2026 sessions.

### Clean Tool Registry & Startup Diagnostics (SESSION 037 VERIFIED)
- **11 Active Core Tools Registered Globally (`adapters.py`, `registry.py`)**:
  - `scoring_tool`, `simulation_tool`, `strategy_tool`, `telemetry_tool`, `explain_mode_tool`, `research_tool`, `knowledge_tool`, `investigation_tool`, `race_results_tool`, `driver_database_tool`, `constructor_database_tool`.
- **Zero Orphaned Tools & 100% Compatibility**:
  - `startup.py` system health diagnostics confirmed: `Tool registry complete: all planner-referenced tools registered`, `missing_tools: []`, `status: healthy`.
  - All personas in `planner.py` mapped strictly to active registered tools.

### Ghost Battle Selection UI & 3D Visual Upgrade (SESSION 036 VERIFIED LIVE)
- **F1Broadcast Custom Dropdown Component (`F1Dropdown.jsx`)**:
  - Solved broken unstyled white browser-native `<select>` dropdowns for Year and Grand Prix.
  - Custom dark asphalt surface (`#12151B` / `#181C24`) adhering strictly to `design_tokens.css`.
  - Signature F1 red (`#FF1801`) focus borders, active checkmarks, and left-accent indicator bars.
  - High-contrast text (`#FFFFFF`), sublabels with circuit locations and race dates, and smooth SVG chevron animations.
  - Outside click dismissal, keyboard navigation (`Escape`, `Enter`).
- **Low-Poly 3D Car Silhouettes (`TeamCar3D.jsx`)**:
  - Original low-poly generic F1 car mesh rendered via Three.js and `@react-three/fiber` (chassis tub, cockpit/airbox, halo safety bar, sidepods, front wing mainplane/endplates, rear wing with DRS flap, and 4 wheels).
  - Dynamically colored with team's factual primary & secondary colors (e.g. Ferrari red + yellow, Mercedes teal + silver, McLaren papaya + blue, Audi red + titan, Cadillac gold + charcoal).
  - High-performance `frameloop="demand"` when idle (0% CPU/GPU overhead), switching to interactive smooth 3/4 tilt rotation on hover.
  - SVG wireframe fallback if WebGL context is unavailable.
- **Abstract Geometric Team Badges (`TeamBadge.jsx`)**:
  - Original geometric insignias (racing shield, octagon, diamond, aerodynamic crescent, winged crest, delta arrow, high-tech chevron, hex-rings) with team monograms (`SF`, `MB`, `RBR`, `MCL`, `AMR`, `ALP`, `WIL`, `RB`, `HAS`, `SAU`, `AUD`, `CAD`).
  - STRICTLY NO copyrighted official team logos, trademarked symbols, or sponsor decals.
- **Stylized Vector Driver Avatars (`DriverAvatar.jsx`)**:
  - Replaced plain text pills with an original vector driver silhouette (aerodynamic helmet with visor glare, collarbone contour, and circular carbon asphalt base).
  - Dynamically color-coded with the driver's team accent color and glow filter (`feDropShadow`).
  - STRICTLY NO copyrighted driver photographs.
  - Displays real driver number (`#44`, `#16`, `#1`, etc.), 3-letter code, full name, and team name as factual text.
- **Dynamic 2026 Grid Resolution & Backend Fix (`ghost_battle_service.py`)**:
  - Fixed timezone-naive date comparison in `get_available_years()`, restoring 2026 Season to available years.
  - Added Audi (`#F50537`) and Cadillac (`#909090`) to `TEAM_COLORS` fallback dictionary.
  - Verified dynamic 2026 grid resolution via `/ghost-battle/drivers-teams?session_id=2026_australian_gp_race` returning 11 teams (including Audi with Bortoleto/Hulkenberg, Cadillac with Perez/Bottas, Ferrari with Hamilton/Leclerc, and Mercedes with Russell/Antonelli).
  - Added unit test suite `ai_services/tests/test_ghost_battle_service.py` (4/4 passed).

### LangSmith Tracing Across Full LangGraph Pipeline, Tools & LLM Providers (SESSION 035 VERIFIED LIVE)
- **Environment Synchronization & SDK Integration**:
  - `ai_services/.env` and `app/core/config.py` configured with `LANGCHAIN_TRACING_V2=true`, `LANGCHAIN_API_KEY`, `LANGCHAIN_PROJECT="FrontWing"`, `LANGCHAIN_ENDPOINT="https://api.smith.langchain.com"`.
  - Bidirectional environment variable synchronization between `LANGCHAIN_*` and legacy `LANGSMITH_*` keys with graceful offline fallback.
- **Descriptive LangGraph Node Architecture (`planner.py`)**:
  - Renamed all generic graph nodes to legible, clear identifiers for LangSmith's trace viewer:
    - `plan_node` (Strategy Planner)
    - `execute_node` (Tool Execution Pipeline)
    - `reflect_node` (Consistency & Completeness Reflection)
    - `judge_node` (Factual Evaluation & Scoring)
    - `context_builder_node` (Synthesis Context Assembler)
    - `synthesize_node` (Chief Engineer Synthesis)
  - Updated graph edges, conditional edge router `should_reflect_loop` (`"execute_node"` / `"judge_node"`), and entry point.
- **Distinct Tool Call Tracing (run_type = "tool") (`registry.py`)**:
  - `ToolRegistry.register` and `_wrap_tool_with_tracing` wrap all registered tools (`race_results_tool`, `telemetry_tool`, `scoring_tool`, `simulation_tool`, `strategy_tool`, `explain_mode_tool`, `knowledge_tool`, `investigation_tool`).
  - Automatically captures exact input parameters (`inputs`) and output evidence payloads as dedicated `[TOOL]` spans nested under the calling node.
- **LLM Provider Spans for Gemini & Groq (run_type = "llm") (`providers.py`)**:
  - Decorated `GeminiProvider` (`Gemini_generate_plan`, `Gemini_generate_response`) and `GroqProvider` (`Groq_generate_plan`, `Groq_generate_response`) with `@traceable(run_type="llm")`.
  - Transforms input arguments into standard chat messages `[{"role": "system", ...}, {"role": "user", ...}]` and captures assistant completions `{"generations": [{"text": ...}], "llm_output": {...}}` with model names (`gemini-2.5-flash`, `openai/gpt-oss-120b`), provider pills (`google_genai`, `groq`), token usage, and latency.
- **Feature Area Tagging**:
  - `general-query`: General Race Engineer StateGraph invocations (`run_ai_race_engineer`).
  - `strategy-engineer`: Strategy planner pipeline (`strategy_planner_workflow`), `strategy_analysis_node`, and `strategy_whatif_node`.
  - `ghost-battle`: FastF1 3D telemetry and position pipeline (`ghost_battle_3d_pipeline`).
- **Live Trace Verification**:
  - Live query: *"Who won the 2024 British Grand Prix and what was the podium?"* -> Trace ID `01a095db-277b-74e0-9c56-16a68cf39181` (11 spans: LangGraph root, plan_node, Gemini_generate_plan, execute_node, race_results_tool, reflect_node, judge_node, context_builder_node, synthesize_node, Gemini_generate_response).
  - Live Strategy query: *"What if Norris pitted on lap 25 at 2024 Dutch GP?"* -> Strategy Trace ID `01a095db-75ee-7ce2-9743-7b16e5491e18` (`strategy_planner_workflow` -> `strategy_whatif_node` -> `strategy_tool` + `simulation_tool`).
- **Mandatory Automated GitHub Push Protocol**:
  - Entry 020 in `RULES_AND_GOTCHAS.md`: Every implementation and session handoff is automatically pushed to GitHub (`origin/main`).

### Dedicated 3D Ghost Battle Tab with FastF1 Telemetry & Three.js (SESSION 034 VERIFIED LIVE)
- **Standalone 3D Architecture (`/ghost-battle`)**:
  - Standalone, high-performance 3D Ghost Battle workbench completely independent of the existing 2D `GhostBattleViewer.jsx` telemetry card.
  - Built with `@react-three/fiber@^8.16.8`, `three@^0.160.0`, and `@react-three/drei@^9.106.0` (100% React 18 compatible).
- **Python FastF1 3D Telemetry Engine (`ghost_battle_service.py`)**:
  - `get_available_years()`: Queries FastF1 schedules + DB completed sessions.
  - `get_available_gps(year)`: Filters only completed Grand Prix with results actually available (no future or cancelled rounds).
  - `get_drivers_teams(session_id)`: Extracts authentic driver/team grid who actually competed in that session (accounts for real-world driver swaps/substitutions).
  - `normalize_and_center_3d()`: Maps FastF1 decimeter tracking coordinates to Three.js coordinates `[X_norm, Z_norm * 1.5, Y_norm]` centered around origin `(0,0,0)` with vertical elevation scaling.
  - `get_ghost_battle_data(session_id, driver_ids)`: Fetches fastest valid flying lap full telemetry (speed, throttle, brake, gear, distance, X/Y/Z) and extracts authentic 3D circuit centerlines (cached in `ai_services/cache/circuits/<circuit_key>_centerline.json`).
  - Strict server-side validation enforcing min 2 / max 22 driver selection.
- **Backend Express Layer (`ghost_battle.service.js`, `ghost_battle.controller.js`, `ghost_battle.routes.js`)**:
  - Endpoints mounted at `/api/ghost-battle/*` and `/ghost-battle/*` with `optionalAuth` middleware.
  - Multi-tier caching in Redis (`cache:ghost_battle:years`, `cache:ghost_battle:gps:${year}`, `cache:ghost_battle:roster:${sessionId}`, `cache:ghost_battle:data:${hash}`).
- **Interactive Frontend 3D Workbench (`GhostBattle3D.jsx`)**:
  - 4-Step Selection Deck: Year -> Completed GP -> Driver/Team multi-select cards -> Generate button.
  - Team Selection Cards: Clicking a team card auto-toggles both of that team's drivers for that specific session.
  - URL Parameter Direct Linking: Supports `?session=X&drivers=Y` for bookmarkable, shareable 3D ghost battles.
  - Three.js 3D Circuit Canvas: `OrbitControls`, `CatmullRomCurve3` ribbon track geometry with inner/outer white track boundaries, start/finish line gantry, low-poly team-colored F1 car meshes, and 3D HTML driver code billboard tags.
  - Real Elapsed-Time Synchronization: Cars animate along 3D track driven by authentic elapsed time (`currentTime`). Faster cars cross the finish line first and despawn, visualizing real-time deltas.
  - Playback Controls: Timeline scrub slider, Play/Pause, Reset, Speed toggles (`0.5x`, `1x`, `2x`, `4x`), and live timestamp formatting.
  - Per-Driver Telemetry Stats Table: Real performance breakdown below canvas showing rank, driver, team, lap time, delta, sector times (S1, S2, S3), top speed, and status.
- **3 Visual Proofs Verified via Browser Subagent**:
  1. British GP (Silverstone): VER 1:28.952 vs HAM 1:29.438 (+0.486s) -> `3d_ghost_battle_loaded_1789201724830.png`.
  2. Dutch GP (Zandvoort): McLaren (NOR+PIA) vs Ferrari (LEC+SAI) -> Banked 3D track ribbon with 4 cars -> `ghost_battle_dutch_zandvoort_3d.png`.
  3. Italian GP (Monza): 6-Driver multi-car battle (NOR, HAM, PIA, RUS, SAI, LEC) -> High-speed Monza track ribbon, 6 cars, real-time deltas, complete classification table (Winner NOR 1:21.432, top speeds 339-341 km/h) -> `ghost_battle_monza_6drivers_1789218415947.png`.

### Live Hero Section with FastF1 & IST Conversion (SESSION 033 - FIX T VERIFIED LIVE)
- **FastF1 Schedule Ingestion**:
  - Scheduled backend job (`hero.service.js`, scheduled every 5 days + manual trigger `/api/hero/refresh`) and Python service (`hero_service.py`) querying FastF1's official event schedule.
  - Automatically identifies current upcoming or most recent Grand Prix (Spanish Grand Prix, Madrid/Barcelona, Round 14, 2026 season).
  - Extracts official session dates and converts all session times to **IST** (`Asia/Kolkata`, UTC+5:30) alongside local track times (e.g., `13 Sep, 18:30 IST | 15:00 UTC+02:00`).
  - Persisted in PostgreSQL table `hero_content` (`05_hero_and_editorial_content.sql`) and cached in Redis with `last_updated` timestamp.
  - Replaced hardcoded Spielberg / Red Bull Ring hero with dynamic `heroData`.
- **Dynamic Track Shape Geometry**:
  - Vector outline dynamically resolved via `circuitTracks.js` (`getCircuitByTrackName(heroData.circuit_key)` -> `barcelona`).
  - Added authentic `barcelona` circuit geometry (14 turns, 2 DRS zones, 4.657 km, 1:16.330 lap record).
  - Displays dynamic start/finish line indicator and real circuit metrics.

### Single-Source Left Sidebar Navigation & Conditional Search (SESSION 033 - FIX S VERIFIED LIVE)
- **Conditional Search Button**:
  - Search button (`⌘K`) in top header renders **ONLY** on the homepage (`/`) via `location.pathname === "/"`.
  - On every other page (`/investigate/:id`, `/strategy`, `/race/:id`, `/ghost-battle/:id`), search moves exclusively into the left sidebar.
- **Unified Navigation & Single Place for Controls**:
  - Left sidebar is the single place for: starting a new investigation (`+ NEW INVESTIGATION`), quick search (`SEARCH ⌘K`), recent investigations history, and user authentication.
  - Removed duplicate navigation buttons across page headers.
  - User auth widget anchored at the bottom of the left sidebar with login, register, profile info, and logout controls.

### Zero-Stale Dynamic Breadcrumbs & Investigation Headers (SESSION 033 - FIX R VERIFIED LIVE)
- **Eliminated Breadcrumb / Header Residue**:
  - Removed all hardcoded or placeholder `"Investigation T..."` and Austrian GP / Red Bull Ring labels from `InvestigationThread.jsx`.
  - Breadcrumbs dynamically format from `resolvedGrandPrix`, `sessionId`, and `questionTitle`: `[ { label: "Home", href: "/" }, ...(resolvedGrandPrix ? [{ label: resolvedGrandPrix, href: sessionId ? `/race/${sessionId}` : "#" }] : []), ...(questionTitle ? [{ label: questionTitle, href: "#" }] : [{ label: "Investigation", href: "#" }]) ]`.
  - Subheader badge dynamically formats: `INVESTIGATION_THREAD // {resolvedGrandPrix || sessionId || "ACTIVE_SESSION"}`.
  - Independently verified across 3 distinct Grand Prix investigations with real browser screenshots:
    1. British GP: `Home / British GP / Who had the fastest lap at British GP 2024?` -> `INVESTIGATION_THREAD // BRITISH_GP`
    2. Dutch GP: `Home / Dutch GP / Analyze telemetry at Dutch GP 2024` -> `INVESTIGATION_THREAD // DUTCH_GP`
    3. Italian GP: `Home / Italian GP / Compare top speeds at Italian GP Monza 2024` -> `INVESTIGATION_THREAD // ITALIAN_GP`

### Real User History Archive (SESSION 033 - FIX U VERIFIED LIVE)
- **Strictly Authenticated History**:
  - `BriefingRoom.jsx` investigation archive strictly wired to `fetchHistory({ limit: 10 })` (`GET /history`).
  - Honest empty state rendered when user has 0 investigations (`ARCHIVE_EMPTY // NO_SAVED_DEBRIEFS`).
  - Clear, sleek sign-in prompt rendered when user is logged out (`AUTHENTICATION // GUEST SESSION`).
  - Zero fake, mock, or hardcoded Austrian GP placeholder cards.

### Real Live Editorial Pipeline (SESSION 033 - FIX V VERIFIED LIVE)
- **Live F1 Strategy Feeds**:
  - Scheduled background service (`editorial.service.js`, scheduled every 12 hours + manual trigger `/api/editorial/refresh`) fetching real F1 strategy news via HTTPS RSS.
  - Extracts real summarized items with clickable authentic source URLs (e.g. Formula1.com, Tom's Hardware, autoracing1.com, Frontiers, The Guardian).
  - Persisted to PostgreSQL table `editorial_content` and cached in Redis. Fallback gracefully serves last successfully fetched batch on network drops.
  - Replaced static `FEATURED_STORIES` and `KEY_INSIGHTS` in `BriefingRoom.jsx`.
  - `RaceStoryCard` and `InsightCard` render authentic source outlet pills and clickable `[SOURCE ↗]` links.


### Email/Password JWT Authentication & Data Isolation (SESSION 032 VERIFIED LIVE)
- **Database Schema & Migrations**:
  - `database/migrations/04_add_user_id_to_conversations.sql` added `user_id UUID REFERENCES users(id) ON DELETE CASCADE` to `conversations` table with index `idx_conversations_user_id`.
  - Migrations 01–04 auto-verified and applied seamlessly by Express startup and migration service.
  - `ai_services` conversation memory (`memory.py`) and `strategy_planner.py` tag conversation records with `user_id`.
- **Backend Authentication & Security Standards**:
  - `POST /auth/register`: Validates email format via strict regex (`/^[^\s@]+@[^\s@]+\.[^\s@]+$/`), hashes passwords with bcrypt cost factor 12 (`SALT_ROUNDS = 12`), rejects duplicate emails with clear error (`"User with this email already exists"`), and issues 7-day JWT with `{ id, email }`.
  - `POST /auth/login`: Verifies credentials, returns generic `"Invalid credentials"` on failure without leaking email existence.
  - `JWT_SECRET` strictly required from environment variables (`process.env.JWT_SECRET`), never hardcoded in source.
  - `authenticateJWT` middleware strictly enforces HTTP 401 on missing, invalid, or expired tokens.
  - Auth middleware guarding `/engineer/query`, `/strategy/query`, `/ghost-battle/*`, `/bookmarks`, and `/history`.
- **Per-User History Isolation (`GET /history`)**:
  - Strict SQL filter `WHERE i.user_id = $1` ordered by `timestamp DESC`.
  - Zero cross-tenant or cross-user data leakage. Verified live with 2 separate test accounts (`Lewis Hamilton` vs `Max Verstappen`).
  - Investigation creation in `EngineerController` and `StrategyController` tagged with `req.user.id`.
- **Frontend F1 Sidebar & History Integration**:
  - `Sidebar.jsx` mounted in `App.jsx` application shell layout.
  - F1 telemetry-themed sidebar with `+ NEW INVESTIGATION` quick button, route links, and live recent investigations from `GET /history`.
  - Removed all fake/placeholder history items and unauthenticated cross-session local storage mixing from `BriefingRoom.jsx`.
  - Auth widget placed at the bottom of the sidebar (standard chat app style): shows user avatar, name, email, and `LOGOUT` when authenticated; provides sleek `[LOGIN]` / `[REGISTER]` forms with input validation and clear feedback when unauthenticated.
  - Automatic 401 interception in `api.js` (`handleAuthUnauthorized`) clears stale tokens and fires `frontwing-auth-unauthorized`, seamlessly resetting UI auth state.


### Strategy Engine Multi-Turn Memory & Counterfactual Simulation (SESSION 031 VERIFIED LIVE)
- **Multi-Turn Context Resolution**:
  - `strategy_planner.py` uses context tags (`driver_id`, `driver_name`, `session_id`, `grand_prix`, `season`) from previous conversation turns to resolve pronouns (*"he"*, *"his"*) and follow-up counterfactuals without requiring the user to re-specify the driver or race.
  - Turn persistence stored via `conversation_memory` and keyed by `conversation_id`.
  - Express controller forwards `conversation_id` and bypasses Redis cache on follow-up queries to prevent cross-conversation collisions.
- **Threaded Conversation UI (`StrategyEngineer.jsx`)**:
  - Full chat thread interface rendering Turn 1 Strategy Debrief (`StrategyReportCard`) and subsequent Turn 2+ What-If simulations (`WhatIfSimulationCard`) sequentially in the same thread.
  - Active thread indicator banner showing driver, grand prix, and query count.
  - Prominent `+ NEW CHAT` button to discard active conversation thread and reset cleanly.
  - Dynamic follow-up suggestion pills tailored to the active driver/event.

### Tyre Degradation Graph Color Calibration (SESSION 031 VERIFIED LIVE)
- **Non-Inverted Wear Mapping**:
  - Exported `getTyreWearColor(pct)` in `TyreDegradationGraph.jsx`: 0%–30% wear = Emerald Green (`#10B981`), 31%–70% wear = Amber/Yellow (`#F59E0B`), >70% wear = Red (`#EF4444`).
  - Aligned both the overview SVG curve, expanded modal SVG curve, and metrics log table.

### Butter-Smooth Graph Hover Performance (SESSION 031 VERIFIED LIVE)
- **O(log N) Binary Search**: Replaced linear `.reduce()` over 5,000+ points in `TelemetryCard.jsx` with binary search, reducing compute time by over 99%.
- **RAF Throttling**: Wrapped mousemove state and `onHover` callbacks in `requestAnimationFrame` using `useRef`.
- **Hardware-Accelerated Compositing**: Replaced `left: ...` CSS updates with `transform: translate3d(...)` and `will-change: transform`.
- **CSS Layout Thrashing Removed**: Removed `transition-all hover:scale-125` from SVG `<circle>`s in `LapTimeGraph.jsx` and `TyreDegradationGraph.jsx`, replacing with sleek radius transitions, white stroke rings, and drop-shadow glow filters.

### General Investigation Tab & Telemetry Debrief (SESSION 030 VERIFIED LIVE)
- **Windows Console / Charmap Codec Resiliency**:
  - `sys.stdout` and `sys.stderr` explicitly reconfigured for `utf-8` with `errors="replace"` across `logger.py` and `main.py`.
  - `print_debug_log()` in `BaseF1Tool` safely catches and escapes stdout encoding errors.
  - Removed emoji characters (`🏆`) in `adapters.py` that caused fatal `UnicodeEncodeError: 'charmap'` crashes in Windows PowerShell/CMD terminals.
- **Fast Session Identity & Alias Resolution**:
  - `_query_db_session` in `SessionResolver` expands circuit aliases (`"silverstone"` -> `["silverstone", "british", "britain"]`), resolving existing PostgreSQL database sessions in <10ms and preventing redundant 60s FastF1 re-downloads.
  - Decoupled heavy telemetry traces from entity resolution (`load_telemetry=False`), allowing session resolution to finish in ~1s while `TelemetryTool` handles backfill asynchronously.
- **Frontend Error-Free Rendering**:
  - Fixed missing `const startTime = Date.now()` in `InvestigationThread.jsx`, eliminating `ReferenceError: startTime is not defined` and enabling `mapResponseToMessages()` and `setMessages()` to render investigation cards immediately.
  - Verified live in browser: AI Verdict, Head-to-Head Telemetry Comparison Matrix, Live Ghost Battle, Lap Evolution, Stint Wear Curve, and Dual Speed Trace graphs all render cleanly in ~2.1s.

### OpenF1 Secondary Pit Stop & Stint Cross-Check Engine (STAGE C VERIFIED LIVE)
- **API Confirmation & Verification**:
  - OpenF1 free API (/pit and /stints endpoints) verified via official documentation and test client.
  - Documents attributes: `lap_number`, `driver_number`, `lane_duration`, `pit_duration`, `session_key` (/pit) and `compound`, `lap_start`, `lap_end`, `stint_number` (/stints).
  - OpenF1 historical data covers 2023+ sessions; pre-2023 sessions and live-session rate/auth restrictions (HTTP 401) are handled with robust fallbacks.
- **Collector Integration (`ai_services/app/ingestion/openf1_collector.py`)**:
  - Updated `OpenF1Collector` with `get_session_key(year, circuit)`, `get_driver_number(driver_id)`, `get_pit_stops(session_id, driver_id)`, and `cross_check_pit_stops(session_id, driver_id, fastf1_pit_stops)`.
  - Built resilient tiered resolution: disk cache (`ai_services/cache/openf1/`) -> live API request -> built-in Grand Prix directory fallback.
  - Zero-latency driver permanent number mapping backed by PostgreSQL `drivers` lookup.
- **Strategy Engineer Cross-Check Integration (`strategy_planner.py`, `adapters.py`)**:
  - `StrategyTool.execute()` and `strategy_planner.run_strategy_analysis()` automatically invoke OpenF1 cross-check against FastF1-derived pit stop laps.
  - FastF1 remains the primary data source; OpenF1 serves exclusively as non-destructive secondary verification.
  - **Agreement**: When FastF1 and OpenF1 agree on all pit laps, notes nothing extra in narrative per specification, while recording `agrees: true` in structured metadata.
  - **Discrepancy**: When pit laps disagree (e.g. stint end lap vs pit lane beam crossing), flags the difference explicitly in the narrative (e.g. `"Note: FastF1 and OpenF1 pit lap data disagree for this stop - FastF1 says lap 27, OpenF1 says lap 28"`).
  - **Graceful Fallback**: If OpenF1 has no data (pre-2023 seasons like 2022 British GP or API downtime), notes that no cross-check was available and proceeds seamlessly on FastF1 data without failing the report.
- **Frontend Broadcast Visualization (`StrategyReportCard.jsx`)**:
  - Pit stop header tag shows `✓ OPENF1 CROSS-CHECK: VERIFIED` (green), `⚠ OPENF1 CROSS-CHECK: DISCREPANCY FLAGGED` (amber), or `OPENF1: UNAVAILABLE (FASTF1 PRIMARY)` (muted).
  - Individual pit stops render `✓ OpenF1` or `OpenF1: Lap Y` discrepancy pill.
  - Prominent amber alert callout banner renders discrepancy messages directly under the pit stops list.
- **Verified Real Sessions (3/3 Real Data)**:
  1. *2024 Dutch GP (Verstappen)*: Started P2, Finished P2. FastF1 lap 27, OpenF1 lap 27 -> Agreement confirmed, note nothing extra.
  2. *2024 British GP (Hamilton)*: Started P2, Finished P1. Stop 1: FastF1 lap 27 vs OpenF1 lap 28 (discrepancy flagged explicitly); Stop 2: FastF1 lap 38 vs OpenF1 lap 38 (agreement).
  3. *2022 British GP (Verstappen)*: Pre-2023 session. Graceful fallback to FastF1-only confirmed with explicit note; zero crashes.

### Strategy Engineer Isolated Feature (STAGE B VERIFIED LIVE)
- Standalone `POST /strategy/query` in FastAPI and Express proxy completely isolated from `/engineer/query`.
- Dedicated `strategy_planner.py` handling `"strategy_analysis"` and `"strategy_whatif"`.
- Evaluates 12 live simulation runs per query across +/- 3, 5, 8 laps and alternate compounds.
- 0ms fast-path rejection for unmodeled vehicle dynamics / setup variables.

### Consolidated Domain Test Suite & Anti-Mocking Standard (SESSION 027 VERIFIED LIVE)
- 59/59 tests passing across repository (50 domain tests + 9 strategy tests in `test_strategy_engineer.py`).
- Zero artificial mock tools or fake test branches.

---

## 2. What Is Broken Right Now / Out of Scope

### OUT OF SCOPE FOR CURRENT RELEASE -- Standings / Championship Tool
- **StandingsTool Decommissioned (`standings_tool`)**:
  - Audit revealed that PostgreSQL `race_results` across seasons is non-contiguous and partial (2025 has only 6 rounds in DB: Rounds 1, 2, 3, 4, 7, 15; 2026 has 8 rounds; 2024 has 22 rounds but SQL group-by constructor name duplicated drivers changing teams like Max Verstappen).
  - Sprint race points (8 to 1) and fastest lap bonus points (1 pt) are missing from the `race_results` table schema.
  - FastF1 provides no season-long standings API; attempting to compute cumulative points across 24 rounds on-the-fly requires downloading all race sessions, taking >120s and exceeding timeout limits.
  - Returning partial standings sums for queries like *"what are 2025 driver standings after round 10?"* violates Rule 001 ("Fake Data Is The #1 Bug - Never fabricate or return partial success data").
  - Per project instructions, `StandingsTool` has been explicitly marked out of scope for this release, unregistered from `tool_registry`, and references cleanly removed from `planner.py`, `startup.py`, `context_builder.py`, and `investigation_correlator.py`.
  - **Documented Future Feature**: Requires dedicated tables (`season_driver_standings`, `season_constructor_standings`) populated via an offline Ergast/OpenF1 sync pipeline.

### RESOLVED TECHNICAL DEBT -- Dead Historical Tools Purged
- **HistoricalDataTool & HistoricalResultsTool Removed**:
  - `HistoricalDataTool` (`historical_data_tool`) and `HistoricalResultsTool` (`historical_results_tool`) were unmaintained prototypes querying raw SQL or `LIMIT 20` on local `race_results`.
  - There is no pre-FastF1 (1950-2017) database table in PostgreSQL.
  - All historical Grand Prix queries are comprehensively handled by `race_results_tool` (which supports `SessionResolver`, live FastF1 fallbacks, and full classification schemas).
  - Both dead tools unregistered, classes deleted from `adapters.py`, registry output validations cleaned from `registry.py`, and references purged across `startup.py`, `planner.py`, and `context_builder.py`. Zero orphaned tools remain.

### HIGH -- Wrong Behavior
- **Ergast API is dead**: `ergast_collector.py` still calls `https://ergast.com/api/f1`. (FastF1 collector is active and functional for all real ingestion).

### MEDIUM -- Data Quality
- None currently blocking.

### LOW -- Code Debt
- `aggregator.py` line 69: scoring persist failures swallowed at WARNING.
- `startup.py` line 174: migration errors at WARNING.
- FastAPI `on_event` deprecation warnings (lifespan handlers recommended).

---

## 3. What Is NOT Yet Started (Frontend & Backend Backlog)

### Frontend Features NOT Yet Started / Prototype Only
- **Ghost Battle UI (`/ghost-battle/:raceId` / `GhostBattle.jsx`)**: Prototype wired to mock data; needs backend endpoint wiring for corner-by-corner micro-sector comparison.
- **Driver Scorecards & Championship Standings UI**: Needs dedicated scorecard view connected to DB scoring tables.
- **Live Race Monitor / Real-Time WebSocket Telemetry**: WebSocket server is echo-only; no live stream telemetry dashboard.

---

## 4. Season / Data Coverage Status

| Season | Grand Prix | Session ID | Real Data? | Telemetry JSON? | OpenF1 Cross-Check? | Notes |
|--------|-----------|------------|------------|-----------------|---------------------|-------|
| 2026 | Austrian GP | 2026_austria_gp_race | YES | On-demand | VERIFIED (key 11315) | Verified 100% pit stop match |
| 2026 | Canadian GP | 2026_canadian_gp_race | YES | On-demand | Supported (key 11304) | Ingested live |
| 2026 | Miami GP | 2026_miami_gp_race | YES | On-demand | Supported (key 11293) | Ingested live |
| 2026 | Australian GP | 2026_australian_gp_race | YES | On-demand | Supported (key 11260) | Ingested live |
| 2026 | Monaco GP | 2026_monaco_gp_race | YES | On-demand | Supported (key 11348) | Ingested live |
| 2026 | British GP | 2026_british_gp_race | YES | On-demand | VERIFIED (key 11326) | Verified 100% pit stop match |
| 2025 | Emilia Romagna GP | 2025_emilia_romagna_gp_race | YES | On-demand | Supported (key 9704) | Ingested live |
| 2025 | Bahrain GP | 2025_bahrain_gp_race | YES | On-demand | VERIFIED (key 10014) | Verified 100% pit stop match |
| 2025 | Japanese GP | 2025_japanese_gp_race | YES | On-demand | Supported (key 9682) | Ingested live |
| 2025 | Chinese GP | 2025_chinese_gp_race | YES | On-demand | Supported (key 9671) | Ingested live |
| 2025 | Australian GP | 2025_australian_gp_race | YES | On-demand | VERIFIED (key 9693) | Verified 100% pit stop match |
| 2024 | Abu Dhabi GP | 2024_abu_dhabi_gp_race | YES | YES | Supported | Ingested & auto-backfilled live |
| 2024 | Italian GP | 2024_italian_gp_race | YES | YES | Supported (key 9605) | Ingested & auto-backfilled |
| 2024 | Qatar GP | 2024_qatar_gp_race | YES | YES | Supported (key 9642) | Ingested & verified end-to-end |
| 2024 | British GP | 2024_british_gp_race | YES | YES | VERIFIED (key 9558) | Verified with flagged discrepancy |
| 2024 | Dutch GP | 2024_dutch_gp_race | YES | YES | VERIFIED (key 9599) | Verified with 100% agreement |
| 2024 | Monaco GP | 2024_monaco_gp_race | YES | YES | Supported (key 9516) | Ingested & auto-backfilled |
| 2023 | Monaco GP | 2023_monaco_gp_race | YES | YES | VERIFIED (key 9087) | Ingested & verified |
| 2022 | British GP | 2022_british_gp_race | YES | YES | Pre-2023 Fallback | Verified graceful FastF1 fallback |
| 2022 | Austrian GP | 2022_austrian_gp_race | YES | On-demand | Pre-2023 Fallback | Auto-ingested live from FastF1 |
