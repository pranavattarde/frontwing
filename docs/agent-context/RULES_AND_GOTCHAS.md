# RULES AND GOTCHAS — FrontWing Project
> Append-only. Add new entries at the BOTTOM of this file, never edit or delete existing ones.
> Date each entry. A future agent that ignores this file is violating project protocol.

---

## Entry 001 — 2026-08-26 — Fake Data Is The #1 Bug

**RULE:** NEVER fabricate/simulate/synthesize fake data (fake sessions, fake telemetry,
fake sector times, fake scores) to make a code path return success. If real data
can't be fetched/computed, return an explicit error status. This was the #1 cause
of wasted weeks in this project — silent fake success data caused every debugging
session to chase phantom bugs.

**Context:** `fastf1_collector.py::_populate_synthetic_session()` (lines 381–558) inserts
hardcoded lap times with `np.random.randint`, dummy speed traces (`{"speed": 220 + (i % 80), ...}`),
and hardcoded race results for a handful of GPs (Monaco, Hungary, Austria, British). This method
is called automatically whenever FastF1 fails to download a real session (line 104). The returned
`status` is **still `"loaded"`** — identical to a real ingestion. Downstream tools cannot
distinguish synthetic from real data.

**What to do instead:** Return `{"status": "DATA_UNAVAILABLE", "message": "FastF1 fetch failed ..."}`.
Do NOT fall through to `_populate_synthetic_session` unless the intent is explicitly offline/demo mode
AND it is clearly flagged in every response payload.

---

## Entry 002 — 2026-08-26 — Exception Swallowing in Ingestion and Tool Code

**RULE:** Never catch exceptions and log at debug/warning level in ingestion or tool code —
log at ERROR with full traceback and propagate a real status.

**Known violations in codebase (as of 2026-08-26):**
- `fastf1_collector.py` `safe_execute_query()` line 20: logs DB failures at **DEBUG** level (`logger.debug(...)`).
- `fastf1_collector.py` `load_session()` line 102: catches all exceptions and falls through to synthetic data at **WARNING** level.
- `adapters.py` `ScoringTool._gather_metrics_from_db()` line 162: logs DB errors at **WARNING** instead of **ERROR**.
- `adapters.py` `TelemetryTool._load_telemetry_from_db()` line 558: logs at **WARNING**.
- `simulation_engine.py` and `aggregator.py`: both swallow DB persist errors at WARNING.
- `startup.py` line 174: migration errors swallowed at WARNING.

**Fix protocol:** Any exception that causes a tool to return degraded/empty/synthetic data
MUST be logged at `logger.error(...)` with `exc_info=True` (full traceback) AND the return
payload must include `"status": "error"` with the exception message, NOT `"status": "success"`.

---

## Entry 003 — 2026-08-26 — Mandatory Agent Handoff Protocol

**RULE:** Any new agent/model picking up this project MUST read all 3 files in
`docs/agent-context/` before touching any code, and MUST update `PROJECT_STATE.md`
and `CHANGELOG.md` before ending its session — this is non-negotiable, even if
the session was cut short or ran out of credits.

**Why:** This project has burned multiple debugging sessions rediscovering problems
that were already documented. The 3-file system exists to prevent this. If you end
your session without updating the files, the next agent starts blind.

**Protocol:**
1. Read `PROJECT_STATE.md`, `CHANGELOG.md`, `RULES_AND_GOTCHAS.md` FIRST.
2. Do your work.
3. Before ending: Overwrite `PROJECT_STATE.md` with verified current state.
4. Before ending: Prepend a new dated entry to `CHANGELOG.md`.
5. If you discovered a new gotcha: Append to `RULES_AND_GOTCHAS.md`.

---

## Entry 004 — 2026-08-26 — `_populate_synthetic_session` Telemetry Is Not Real FastF1 Data

**RULE:** Sessions produced by `_populate_synthetic_session` (identified by GPs: monaco, hungary,
austria, silverstone, spain — any year) contain:
- Lap times: `86000 + (lap * 40) + random(-200, 200)` ms — SYNTHETIC
- Telemetry: `{"speed": 220 + (i % 80), "rpm": 11500, "gear": 6, "throttle": 90, "brake": False}` — ALL FAKE, NO `distanceM` field
- Sector times: `s3 = ltime - s1 - s2` back-computed from a random total — FAKE

The British GP (`2024_silverstone_gp_race`) was the ONLY session specifically targeted for real
FastF1 ingestion via `scratch/ingest_2024_british_gp_telemetry.py`. All other sessions in
the DB are synthetic UNLESS they were explicitly ingested via a real FastF1 download run.

---

## Entry 005 — 2026-08-26 — `TelemetryTool._load_telemetry_from_db` Has a Synthetic Fallback

**RULE:** If no JSON telemetry cache file exists on disk for a (session, driver, lap),
`_load_telemetry_from_db` (adapters.py lines 526–556) generates synthetic telemetry
using a sin-wave speed model. This data looks realistic (has `distanceM`, speed, throttle, brake,
gear) but is NOT from FastF1. Tests that check `len(pts) > 0` will PASS on this fake data.

**To distinguish real from synthetic:** Real telemetry JSON files are stored in
`ai_services/cache/telemetry/<session_id>_<driver_id>_<lap>.json`. Check if those files
exist on disk. If the file does not exist, the tool is generating synthetic points.

---

## Entry 006 — 2026-08-26 — `load_default_race_weekend` Function Does Not Exist

**RULE:** `main.py` line 51 imports and calls `load_default_race_weekend` from
`app.ingestion.loader`, but this function does NOT exist in `loader.py`. The loader only
defines `ensure_session_in_db()`. This import will cause an `ImportError` / `AttributeError`
at startup if the DB sessions table is empty. This is a latent crash bug.

---

## Entry 007 — 2026-08-26 — `planner.py` offline dev-mode detection is fragile

**RULE:** `classify_intent()` in `planner.py` (lines 43–45) checks for mock/dummy API keys
by string-matching `"aq.ab8"` inside the Gemini key and `"gsk_"` inside the Groq key to
decide if it is "offline dev" mode. `"gsk_"` is the REAL prefix of valid Groq API keys,
meaning any real Groq key incorrectly triggers offline/rule-based mode. This breaks LLM
classification when Groq is the active provider.

---

## Entry 008 — 2026-08-26 — 2026 Season Data Does Not Exist in FastF1

**RULE:** FastF1 cannot provide data for races that have not yet been published in its
dataset. As of 2026-08-26, FastF1 may not have complete 2026 season data. Any query
for "2026 Monaco GP" or similar will silently fall through to `_populate_synthetic_session`,
returning fake results with `status: "loaded"`. The walkthrough claims "Who won Monaco in 2026?"
returned a correct answer — this was synthetic data, not real FastF1 data.

---

## Entry 009 — 2026-08-26 — Ergast API is Deprecated / Shutdown

**RULE:** `ergast_collector.py` and `config.py` still reference `https://ergast.com/api/f1`
(the Ergast F1 API). The Ergast API was shut down in 2024. Any code paths that depend on it
will fail with connection errors. The `openf1_collector.py` targets `https://api.openf1.org/v1`
which is the current replacement, but it is not wired into the main ingestion flow.

---

## Entry 010 -- 2026-08-26 -- Deleting Synthetic Fallbacks Makes Sessions Return "error" Not "cached"

**RULE:** After deleting _populate_synthetic_session(), any session that was previously in the DB
only because of the synthetic path (Monaco, Hungary, Austria, Spain, any 2026 GP) will now return
status="error" from load_session() when FastF1 cannot fetch the real data. This means previously
"working" queries for those GPs will now return error status instead of synthetic data.

**This is correct and intended behavior.** Do NOT add a new synthetic fallback to "fix" this.
The correct fix is to run a real FastF1 ingestion: FastF1Collector().load_session(year, gp_name)
with a live network and FastF1 having data for that session.

**To check if a session exists with REAL data:** Query the DB:
  SELECT id, data_source FROM sessions WHERE id LIKE '%monaco%';
If data_source is 'synthetic' or NULL, the data is not trustworthy.
(NOTE: The data_source column may not exist yet -- adding it should be a future task.)

---

## Entry 011 -- 2026-08-26 -- pytest -k telemetry Misses test_fastf1_ingestion.py Tests

**RULE:** pytest -k telemetry matches on test *names* containing "telemetry". The two tests in
test_fastf1_ingestion.py are named 	est_load_session_endpoint_returns_error_on_fastf1_failure
and test_collector_load_session_direct_returns_error_on_failure -- neither contains "telemetry".
They will NOT run under -k telemetry.

To run ingestion tests: pytest tests/test_fastf1_ingestion.py -v
To run all tests: pytest tests/ -v

---

## Entry 012 -- 2026-08-26 -- Legacy Synthetic DB Rows Mask Real FastF1 Ingestion

**RULE:** Even though _populate_synthetic_session() is deleted, existing sessions in PostgreSQL that were previously populated by the synthetic generator remain in the DB. When FastF1Collector.load_session(year, gp_name, session_type) is called, find_existing_session_id() finds the old synthetic session and immediately returns {"status": "cached", ...}, short-circuiting before FastF1 can download real data.

**Exact symptom observed in Session 004:**
- FastF1Collector().load_session(2024, "Qatar", "R") returned status="cached" with session_id="2024_qatar_gp_race".
- telemetry_metadata row count was 317.
- Loading the storage_path JSON file ai_services/cache/telemetry/2024_qatar_gp_race_verstappen_1.json revealed synthetic data:
  [{"speed": 220, "rpm": 11500, "gear": 6, "throttle": 90, "brake": false}, ...] — NO distanceM field!
- Meanwhile, direct call fastf1.get_session(2024, "Qatar", "R").load() proved real FastF1 data DOES exist (943 laps, 838 telemetry points per lap with full distance/speed/rpm/gear/throttle/brake).

**Trap:** Do NOT assume status="cached" means verified real data. Check if telemetry JSON contains distanceM. Legacy synthetic rows must be purged or invalidated to allow real FastF1 ingestion.

---

## Entry 013 -- 2026-08-27 -- ScoringTool Real-Data Edge Cases and Formula Sensitivities

**Context & Diagnosis (Session 009 Sanity Check):**

1. **Pace Score Fuel Gradient Sensitivity:**
   - In `calculate_pace_score()`, `std_limit` is 1.5s and `delta_limit` is 2.0s.
   - Across a full 55–78 lap race, ~110kg fuel burn-off (~0.06s/lap) creates a ~3.3s natural pace difference between early-race full-fuel laps (~86.4s) and end-of-race low-fuel fastest laps (~82.9s).
   - This natural spread yields standard deviations of ~1.0s and mean-to-optimal deltas of ~1.74s, resulting in mathematically exact lower scores (e.g. 22.0 for Verstappen Qatar 2024) despite winning the race.
   - **Status:** Mathematically correct per current formula specification; fuel-corrected lap times would raise pace scores in future formula revisions.

2. **Tire Score Wet Transition Clamp Behavior:**
   - In `calculate_tire_score()`, Intermediates/Wets are excluded, and slick stint degradation is compared against `grid_median_deg`.
   - At Monaco 2023, Verstappen ran 55 laps on Medium slicks through the onset of torrential rain before pitting (lap 55 was 130.567s). This created a steep driver slope (+0.8801) vs grid median (0.1397), yielding `rel_diff = 5.30` and causing the stint score formula `100 * (1 - 5.30) = -430` to clamp to `0.00`.
   - **Status:** Expected mathematical behavior of the clamp threshold during wet transitions on slick tires.

3. **Lap 1 DNF Missing Timed Laps:**
   - For drivers who retire on Lap 1 before crossing the timing beam (e.g. Alexander Albon, Silverstone 2022 collision), `race_results`, `stints`, and `telemetry_metadata` exist in DB, but `laps.lap_time_ms` is `NULL`.
   - `ScoringTool` correctly returns `{"status": "missing_data"}` because no completed timed laps exist for pace/tire calculation.
   - **Status:** Legitimate behavior, NOT a database query bug.


## Entry 014 -- 2026-08-27 -- Simulation Traffic Loss vs Net Time Delta Tradeoff

**Context & Trace Analysis (Session 010):**

1. **Tradeoff Between Early Pit Stop, Tire Age, and Net Delta:**
   - Shifting a pit stop earlier (e.g. Hamilton Qatar 2024 pit on Lap 25 vs actual Lap 34) produces a small net time delta ($-2.5\text{s}$) through a genuine physical tradeoff:
     - **Early Pit Incurrence:** Incurs $+23.0\text{s}$ pit lane loss on Lap 26 while competitors are flying.
     - **Competitor Pit Offset:** Gains $-51.2\text{s}$ on Lap 34 when actual competitors pit.
     - **Late-Stint Degradation:** Loses $+25.7\text{s}$ on Laps 41–55 because tires are 9 laps older and have degraded.
     - **Net Tradeoff:** $+23.0 - 51.2 + 25.7 = -2.5\text{s}$.

2. **Why Traffic Loss Reflects Safety Car and Weather Neutralizations:**
   - In `project_race_timeline()`, traffic bottlenecking caps simulated lap time to competitor actual times when following in pack (`simulated_lap = rival_actual_lap + 0.6`).
   - During Safety Car periods (e.g. Qatar Laps 2–4 and Lap 37) or rain transitions (e.g. Monaco 2023 Laps 51–56), actual competitor lap times rise from ~85s to ~140s (or ~75s to ~115s).
   - The simulation caps the driver's pace to the neutralized pack pace, recording the delta ($\text{neutralized\_pace} - \text{green\_flag\_pace}$) as `traffic_loss` (e.g. 115.6s for Qatar, 132.2s for Monaco).
   - Because the actual driver also endured the exact same neutralized laps, the simulated total race time and actual race time remain aligned within small net deltas.
   - **Status:** Physically and mathematically sound; traffic constraint captures real-world pack bottlenecks without distorting race-distance finishing totals.

---

## Entry 015 — 2026-08-30 — Query Latency & Zero-Hardcode Verification Audit

**Context & Trace Analysis (Session 011):**

1. **Why Frontend Queries Rendered Suspiciously Fast (<100ms):**
   - **Frontend Investigation Caching**: `InvestigationThread.jsx` (lines 274–285) cached completed investigation responses in browser `localStorage` keyed by `frontwing_investigation_${threadId}`. Re-opening or revisiting a thread reloads from `localStorage` in 0ms without hitting the backend API.
   - **Backend Redis Response Caching**: `backend/src/services/cache.service.js` (lines 35–55) caches completed investigation payloads in Redis keyed by `cache:investigation:${hash}`.
   - **Python In-Memory Plan Cache**: `ReliableLLMProvider` previously maintained a process-level `_plan_cache` dictionary. This was **completely eliminated** in Session 011 to ensure 100% live LLM dispatch on every query.

2. **Fresh End-to-End Execution Trace (`"how did verstappen perform at qatar gp?"`):**
   - **Total End-to-End Latency**: `23,366ms` (~23.4s).
   - **NLP Intent & Contract Parsing**: Gemini `gemini-3.6-flash` live call (`6,409ms`), classified intent: `scoring`, metric: `scoring`.
   - **Planner LLM Call**: Gemini `gemini-3.6-flash` live call (`6,411ms`), generated execution plan: `['race_results_tool|driver=verstappen,gp=Qatar GP', 'scoring_tool|driver=verstappen,gp=Qatar GP']`.
   - **Entity / Session Resolution**: `SessionResolver` dynamically resolved `2024_qatar_gp_race` in `0ms` (FastF1 download bypassed as data is populated in PostgreSQL).
   - **Tool 1 (`race_results_tool`)**: Queried PostgreSQL `race_results`, returned 20 rows (P1 Max Verstappen, P2 Charles Leclerc, P3 Oscar Piastri).
   - **Tool 2 (`scoring_tool`)**: Queried PostgreSQL `sessions`, `laps` (19 timed laps), `stints` (4 stints), and teammate data in `1,612ms` (live DB queries, zero precomputed cache hit).
   - **Mathematical Scoring (`aggregator.py`)**:
     - Clean Laps Mean: `84.649s`, Clean Std: `1.032s`, Optimal Lap: `82.905s`, Teammate Optimal: `85.288s`.
     - Strategy: `50.27`, Tire: `100.0`, Pace: `22.0`, Pitstop: `89.04`, Execution: `100.0` $\to$ Composite: `72.26`.
   - **Synthesis LLM Call**: Gemini `gemini-3.6-flash` live call (`7,805ms`), synthesized progressive explanations from structured context.

3. **Codebase Grep Audit (Search for Hardcoded Canned Responses):**
   - Searched `ai_services/app` for driver `verstappen` and grand prix `qatar`.
   - Result: 0 canned/mock answer dictionaries. All occurrences are strictly circuit aliases (`circuit_aliases.json`), NLP entity dictionaries (`nlp_parser.py`), driver lookup maps (`entity_resolver.py`), or verified test fixtures.

4. **Direct Redis & PostgreSQL Audit**:
   - Redis: Connected, total cached keys = 0.
   - PostgreSQL: Table `scoring_results` contains 0 precomputed rows for `2024_qatar_gp_race` (confirming all scores are computed live from raw lap timing).

---

## Entry 016 — 2026-09-11 — Strict Anti-Mocking Policy & Test Suite Architecture

**RULE:** Tests in FrontWing MUST exercise real system behavior against real data, real database operations in PostgreSQL, real FastF1 data, or pure deterministic mathematical functions. Tests that mock out the entire system under test (e.g., using `MagicMock` to fake FastF1 downloads, simulating tool execution with dummy failure mocks, or patching LLM agents with synthetic responses to force green pytest passes) are STRICTLY FORBIDDEN.

**Why:** Mocks mask catastrophic real-world failure modes (such as 2024 season hardcoded ceilings, silent fallback to synthetic data, database schema mismatches, and demonyic stemming collisions). A test suite with 100% green checks against fake mocks provides zero assurance of system health and leads future agents to chase phantom bugs.

**Test Architecture (Consolidated 8-Module Standard):**
All tests under `ai_services/tests/` are organized into 8 domain-focused modules:
1. `test_race_results.py`: Real season resolution (2026/2025/2024), FastF1 live schedules, `RaceResultsTool` classification.
2. `test_telemetry_pipeline.py`: TelemetryTool, personal best flying laps matching SQL `MIN(lap_time_ms)`, stint-bounded tyre degradation, fuel-corrected monotonicity, gear trace integrity.
3. `test_scoring_engine.py`: 5 scoring metrics (Strategy, Tire, Pace, Pitstop, Execution), mathematical boundaries, composite score aggregator.
4. `test_strategy_simulation.py`: Simulation physics (pit loss, undercut, traffic loss, lap time projection), query parameter binding, honest failure handling on non-racing drivers.
5. `test_planner_and_reasoning.py`: Heuristic & structured plan extraction, entity resolution, parse_step parsing, multi-turn PostgreSQL conversation memory, reflection/judge nodes, correlator.
6. `test_infrastructure_and_api.py`: FastAPI endpoints (`/health`, `/simulate`), configuration loading & validation, prompt loader & disk caching, startup health diagnostics, background backfill registry & timeout.
7. `test_tool_registry.py`: Tool registration, schema validation, `infer_parameter`, `ExplainModeTool`, knowledge RAG retrieval.
8. `test_end_to_end_investigations.py`: Full multi-agent investigations against real ingested PostgreSQL sessions verifying reports, short bullet executive summaries, and zero raw JSON/status leaks.

---

## Entry 017 — 2026-09-11 — Windows Charmap Encodings, Telemetry Ingestion Traps & Frontend Latency Handlers

**1. Windows Console Charmap Encoding Crashes:**
- **RULE:** NEVER inject high Unicode characters (such as emojis like `🏆` or special non-ASCII symbols) into strings that are written to standard output or logged via `logger.info()` without ensuring UTF-8 stream handling.
- **Gotcha:** On Windows (PowerShell/cmd), Python's default console encoding is `cp1252`. Writing characters like `\U0001f3c6` throws `UnicodeEncodeError: 'charmap' codec can't encode character...`. When this happens inside a tool or inside `print_debug_log()`, it crashes the engineer execution.
- **Fix Applied:**
  - Reconfigured `sys.stdout` and `sys.stderr` to `encoding="utf-8", errors="replace"` in `app/core/logger.py` and `app/main.py`.
  - Wrapped `print_debug_log()` in `app/tools/registry.py` with an encoding-safe fallback.
  - Replaced `🏆` in `adapters.py` with standard ASCII strings (`FASTER`, `[P1]`).

**2. Never Run Synchronous Heavy Telemetry Extraction in Entity Resolution:**
- **RULE:** During entity resolution (`entity_resolver.py`), `SessionResolver.resolve_session` must ALWAYS be invoked with `load_telemetry=False`.
- **Why:** Ingesting 22 drivers with full telemetry traces synchronously blocks the event loop for >200 seconds. Entity resolution only needs session and race classification metadata (<1.5s). Full telemetry fetching is the exclusive domain of `TelemetryTool`, which operates asynchronously with background backfill jobs.

**3. Circuit & Grand Prix Alias Resolution in Postgres Queries:**
- **Gotcha:** In PostgreSQL, sessions and races often use formal titles (e.g. `r.name = 'British Grand Prix'`, `c.id = 'british'`), whereas user queries mention colloquial circuit names (`"silverstone"`).
- **Rule:** In `_query_db_session()`, always expand `sub_tokens` to include canonical aliases (`"silverstone"` -> `["silverstone", "british", "britain"]`). Without this, existing database records will fail to match, causing redundant and slow FastF1 download attempts.

**4. Frontend Elapsed Time Variables:**
- **Gotcha:** In `InvestigationThread.jsx`, calculating elapsed time via `(endTime - startTime) / 1e3` will throw `ReferenceError: startTime is not defined` if `startTime` is not recorded at the start of `executeQuery()`. This caught error prevents `setMessages()` from running, resulting in a blank or errored investigation tab despite a 200 OK backend response.

---

## Entry 018 — 2026-09-12 — Multi-Turn Memory Resolution, Graph Hover Rendering Bottlenecks & SVG Color Mappings

**1. Multi-Turn Context Carryover for Pronouns and Counterfactuals:**
- **RULE:** When executing follow-up queries in `strategy_planner.py` (e.g. *"what if he pitted on lap 18 instead?"*), if the query does not name a driver or Grand Prix, the planner MUST resolve the active driver and session from `context` tags stored in the conversation memory.
- **Gotcha:** Never rely solely on pronoun regex; check if `resolve_driver()` returns None and fall back to `context.get("driver_id")` and `context.get("driver_name")`.
- **Cache Invalidation:** Always bypass Redis query caching in the Express controller when a `conversation_id` is supplied to ensure follow-up turns are never clobbered by prior cached queries.

**2. Telemetry Trace Distance Lookups Must Use O(log N) Binary Search:**
- **RULE:** NEVER run linear `.reduce()` over 5,000+ points on every mousemove event in `TelemetryCard.jsx`.
- **Gotcha:** Telemetry datasets contain thousands of points sorted monotonically by track distance in meters (`distanceM`). Calling `.reduce()` on every pixel mousemove blocks the JavaScript event loop and causes severe chart stuttering/lag, especially when multiple cards are rendered.
- **Fix:** Use binary search $O(\log N)$ for closest distance lookups, and throttle mouse movement coordinate updates inside `requestAnimationFrame`.

**3. SVG Hover Layout Thrashing vs GPU Compositing:**
- **RULE:** Do not use `className="transition-all hover:scale-125"` on dozens of raw SVG `<circle>` elements.
- **Why:** In SVG, CSS transforms force layout recalculation and boundary box re-evaluations across the entire SVG DOM tree on every hover event.
- **Fix:** Use dynamic SVG attributes (`r={isHovered ? 6.5 : 3.5}`, `stroke={isHovered ? "#FFF" : "..."}`) paired with CSS GPU-composited overlay indicators (`transform: translate3d(...)` with `will-change: transform`).

**4. Tyre Degradation Graph Color Mapping:**
- **RULE:** Degradation wear percentage curve colors MUST match the metrics table:
  - $0\% \le \text{wear} \le 30\%$: Emerald Green (`#10B981`) [Fresh tyre / minimal wear]
  - $30\% < \text{wear} \le 70\%$: Amber / Yellow (`#F59E0B`) [Moderate wear / pace loss onset]
  - $\text{wear} > 70\%$: Red (`#EF4444`) [High degradation / cliff reached]
- **Gotcha:** Inverted comparisons (`wear_pct < 40 ? red : green`) will show green when tyres are dead and red when fresh off the tyre blankets.

---

## Entry 019 — 2026-09-12 — FastF1 Cache Unification, 3D Coordinate Mapping, React 18 Fiber Compatibility & Session Roster Guardrails

**1. FastF1 Cache Must Always Point to Unified `ai_services/cache`:**
- **RULE:** Never initialize `fastf1.Cache.enable_cache(...)` with temporary paths like `~/AppData/Local/Temp/fastf1`.
- **Why:** The project maintains a centralized 500MB+ HTTP cache (`ai_services/cache/fastf1_http_cache.sqlite`). Initializing FastF1 with a different directory forces a redundant re-download of full multi-car race streams (car_data, pos_data) over the network, which can take 60–120s or hang if throttled by F1 live timing servers. Pointing to `PROJECT_ROOT / "ai_services" / "cache"` enables instant local loading (<2s).

**2. React 18 Peer Dependency Constraint for React Three Fiber:**
- **RULE:** In this codebase (React 18.3.1), do NOT install `@react-three/fiber` version 9.x.
- **Gotcha:** Fiber v9 targets React 19 and will fail npm installation. Always specify `@react-three/fiber@^8.16.8` and `@react-three/drei@^9.106.0` for 100% React 18 compatibility.

**3. FastF1 Coordinate Mapping to Three.js Space:**
- **RULE:** When transforming FastF1 decimeter tracking coordinates `(X, Y, Z)` to Three.js coordinates:
  - `ThreeX = X_centered * scale` (lateral track span)
  - `ThreeY = Z_centered * scale * 1.5` (elevation / banking, with 1.5x vertical exaggeration for 3D visibility)
  - `ThreeZ = Y_centered * scale` (longitudinal depth)
- Center the track points around origin `(0, 0, 0)` and scale so `max(span_x, span_y) == target_radius * 2` (e.g. 240 units) so the camera orbit framing is always consistent across different circuit lengths.

**4. Team Roster Object Properties in API Contracts:**
- **RULE:** When serializing roster teams, always provide both `name` and `team_name`, as well as `color` and `team_color`. Accessing `team.team_name.toLowerCase()` when the backend returned `team.name` throws an unhandled `TypeError` in frontend render loops.

**5. Future/In-Progress Season Verification:**
- **RULE:** Do not assume a season or race is completed just because its date is on the event calendar. Always verify `session.results` is not empty before exposing the GP in `/ghost-battle/available-gps`.

---

## Entry 020 — 2026-09-12 — Automated GitHub Push Protocol & LangSmith Full-Pipeline Observability

**1. Mandatory Automated GitHub Push Protocol:**
- **RULE:** From Session 035 onward, EVERY single implementation, feature addition, bug fix, or agent session handoff MUST be automatically committed and pushed to GitHub (`git add -A && git commit -m "..." && git push origin <branch>`).
- **Why:** Never leave uncommitted or unpushed work on local disk. Automated synchronization ensures repo integrity, allows remote CI/CD triggers, and prevents session handoff data divergence across development environments. Future agents MUST keep this in mind and execute automatic git push before concluding their turn.

**2. LangSmith Tracing Architecture & Span Conventions:**
- **Configuration Synchronization:** `ai_services/app/core/config.py` automatically synchronizes `LANGCHAIN_TRACING_V2=true`, `LANGCHAIN_API_KEY`, `LANGCHAIN_PROJECT="FrontWing"`, and `LANGCHAIN_ENDPOINT="https://api.smith.langchain.com"`. Both `LANGCHAIN_*` and legacy `LANGSMITH_*` environment variable keys are supported interchangeably.
- **Tool Span Convention:** Every tool (`race_results_tool`, `telemetry_tool`, `scoring_tool`, `simulation_tool`, `strategy_tool`, `explain_mode_tool`, etc.) is wrapped during registration in `ToolRegistry.register` with `@traceable(run_type="tool", name=tool.name)`. This captures exact input parameters, output payload, and duration without manual instrumentation.
- **LLM Span Convention:** In `providers.py`, `GeminiProvider` and `GroqProvider` methods are decorated with `@traceable(run_type="llm")` using `_format_gemini_inputs`/`_format_groq_inputs` and `_format_llm_outputs`. This structures the trace with `messages` in input, `generations` in output, `ls_provider`, `ls_model_name`, token usage, and real execution latency so LangSmith renders them natively as LLM playground/trace cards.
- **LangGraph Node Naming:** Node identifiers in `StateGraph(AgentState)` must always use explicit descriptive names (`plan_node`, `execute_node`, `reflect_node`, `judge_node`, `context_builder_node`, `synthesize_node`). Never revert to generic single-word names (`plan`, `execute`).
- **Feature Area Tagging:** Every trace must carry its designated feature area tag:
  - General Race Engineer investigations: `tags=["general-query"]`
  - Strategy Engineer simulations & analysis: `tags=["strategy-engineer"]`
  - 3D Ghost Battle telemetry pipeline: `tags=["ghost-battle"]`
- **Graceful Fallback:** If `LANGCHAIN_API_KEY` is missing or LangSmith is unreachable, tracing decorators degrade gracefully to local execution with zero crashes.

---

## Entry 021 — 2026-09-12 — FrontWing Security Baseline & Hardening Protocols

**1. Layered Rate Limiting On High-Cost / High-Risk Surface Area:**
- **RULE:** Apply targeted rate limiting to abuse-prone and expensive endpoints:
  - `/auth/login`, `/auth/register`: 10 attempts per 15 minutes per IP (`authLimiter`) to mitigate brute-force and credential stuffing.
  - `/engineer/query`, `/strategy/query`: 30 queries per 15 minutes (`queryLimiter`), keyed by `req.user.id` when authenticated, falling back to IP address. Prevents LLM quota and inference compute depletion.
  - `/ghost-battle/data`: 40 requests per 15 minutes (`ghostBattleLimiter`), keyed by user ID or IP address.
  - `/api/*` safety net: 150 requests per 15 minutes (`generalLimiter`).
- **Standard Protocol:** Always return `429 Too Many Requests` with a structured, safe JSON payload (`{ error: "...", status: 429 }`).

**2. Strict Input Validation & Length Limits Before Forwarding to Compute/LLM:**
- **RULE:** Never forward unbounded user free-text into agent planners or LLM providers.
- **Protocol:**
  - Free-text questions must be trimmed, stripped of non-printable control characters (`[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]`), and bounded between 2 and 2,000 characters via `zod` (`validation.middleware.js`).
  - UUID path parameters (e.g. `/history/:id`, `/save/:id`) must be validated against `^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$` before executing database queries.
  - Array inputs (e.g. `driver_ids` in `/ghost-battle/data`) must enforce bounded limits (min 2, max 22 drivers).
  - Malformed JSON payloads must be intercepted immediately after `express.json()` and rejected with a clean `400 Bad Request` (`{ error: "Malformed JSON payload in request body" }`). Never allow default HTML error stacks to reach the client.

**3. Zero Unparameterized SQL In Production Code:**
- **RULE:** Every database query in Node.js (`pg`) and Python (`psycopg2`) MUST use parameterized placeholders (`$1, $2, ...` in Node.js; `%s` tuple in Python).
- **Gotcha:** Never use f-strings or template string interpolation (`${val}`) to construct SQL WHERE clauses or table filters. All query builders must push values strictly to a parameter array/tuple.

**4. External Link Sanitization & XSS Mitigation:**
- **RULE:** React intrinsically escapes text nodes, but any external hyperlink URL rendered into an `<a>` tag (e.g. `sourceUrl` in `RaceStoryCard.jsx`) MUST be validated with `/^https?:\/\//i` before rendering. This completely blocks `javascript:` or `data:` URI attacks from scraped or AI-generated links.

**5. Production CORS Whitelist Enforcement:**
- **RULE:** Express CORS must never be wide open (`*`) in production.
- **Protocol:** Whitelist approved origins via `ALLOWED_ORIGINS` (or defaults `localhost:5173`, `localhost:3000`). In production (`NODE_ENV=production`), reject unlisted browser origins with `403 Forbidden` (`{ error: "CORS policy violation: origin not allowed" }`), while allowing legitimate server-to-server and non-browser curl requests.

**6. Safe Error Masking & Zero Internal Leakage:**
- **RULE:** Never send internal database connection errors, table names, file paths, or stack traces in HTTP responses to clients.
- **Protocol:** In production (`NODE_ENV=production`), all 500 responses must return safe, generic error text (`"An internal server error occurred. Please try again later."`) while logging the complete `error.message` and `error.stack` server-side for investigation.

---

## Entry 022 — 2026-09-15 — Concurrency, Caching Invalidation & Heavy 3D Code-Splitting Standards

**1. Independent Tool Parallelization in LangGraph Execution Nodes:**
- **RULE:** When a planner schedules multiple tools with no data dependencies on each other (e.g. `race_results_tool` + `telemetry_tool` or `scoring_tool` + `race_results_tool`), execute them concurrently using `concurrent.futures.ThreadPoolExecutor(max_workers=min(4, len(runnable_steps)))`.
- **Why:** In Python, tool execution entails synchronous I/O (PostgreSQL queries, reading disk JSON telemetry, FastF1 cache checks). Sequential execution forces independent tools to wait for one another. Parallel execution reduced Telemetry Comparison latency by -2,064ms (-15.6%) and Strategy Analysis latency by -21,395ms (-50.9%).
- **Protocol:** Pre-resolve and validate all arguments first; execute runnable steps concurrently; sort results back into the original step index order before updating state evidence and timelines to ensure deterministic downstream behavior.

**2. Composite Database Indexing for Session-Driver Lookups:**
- **RULE:** Queries filtering by both `session_id` and `driver_id` on high-volume tables (`laps`, `telemetry_metadata`, `stints`) MUST be backed by composite B-tree indexes `(session_id, driver_id)`.
- **Impact:** Adding `idx_telemetry_meta_session_driver` dropped PostgreSQL `EXPLAIN ANALYZE` execution time from 0.185ms to 0.077ms (58.4% faster) and planning time from 1.271ms to 0.391ms, eliminating sequential bitmap scans.

**3. Session-Indexed Redis Cache Invalidation on Ingestion & Backfills:**
- **RULE:** Never allow a full-response cache to serve stale or incorrect data after a session has been re-ingested, loaded, or backfilled.
- **Implementation:** Index investigation cache keys by session in Redis using `cache:session_keys:<session_id>` sets.
- **Trigger:** When `POST /sessions/load` loads or updates session data, invoke `CacheService.invalidateSessionCache(session_id)`. This purges all investigation keys and Ghost Battle keys for that session without destroying unrelated session caches.

**4. Heavy 3D Library Code-Splitting in Frontend Builds:**
- **RULE:** Never statically import Three.js or `@react-three/fiber` in top-level components or root routers.
- **Gotcha:** A static import of `GhostBattle3D` in `App.jsx` inflated the initial application JavaScript bundle to 1,496.28 kB (1.5 MB!) for every single user on the homepage or text debrief pages.
- **Protocol:** Always use `React.lazy(() => import(...))` with `<Suspense>` fallbacks for 3D pages, and configure Rollup `manualChunks` in `vite.config.js` to isolate `three-vendor`. This reduced the initial app bundle to 552.27 kB (-63.1% reduction).

---

## Entry 023 — 2026-09-15 — Formula 1 Broadcast Visual Identity, Semantic Tokens & Tabular Timing Alignment

**1. Semantic Design Tokens Exclusively (Zero Raw Color Names in Components):**
- **RULE:** All frontend components MUST consume semantic CSS variables (`--surface-base`, `--surface-raised`, `--border-subtle`, `--accent-primary`, `--timing-purple`, etc.) defined in `design_tokens.css`. Never use raw color names (like `--f1-red`, `--cyan`, `--gray-900`) or hardcoded hex codes (`#00E5FF`, `#FF1801`) inside component files.
- **Why:** Semantic tokens allow instant global theme calibrations, maintain strict contrast compliance for broadcast readability, and eliminate color drift across independent widgets.

**2. Tabular Numerical Figures For Timing & Deltas:**
- **RULE:** Any display of lap times (e.g. `1:28.952`), sector times (e.g. `24.112s`), deltas (e.g. `+0.486s`), top speeds, or grid positions MUST use tabular numbers via `font-variant-numeric: tabular-nums; font-feature-settings: 'tnum' 1;` (class `.type-tabular` / `.tabular-timing`).
- **Gotcha:** Proportional fonts render digits with variable character widths (e.g. "1" is significantly narrower than "8"). In timing towers and delta comparison tables, proportional fonts cause numbers to jitter and misalign across rows, breaking broadcast alignment standards.

**3. Original Logo Geometry Constraints:**
- **RULE:** Do NOT trace or replicate the official Formula 1 logo's negative-space numeral "1", parallel speed-line stripe cuts, or official team marks. FrontWing's identity is an original, forward-slanted connected "FW" aerodynamic front-wing mark that conveys speed through continuous multi-plane geometry.

**4. Visible Focus-Visible Beacons for Keyboard Navigation:**
- **RULE:** Never remove `:focus-visible` outlines or hide focus rings. In the F1 broadcast system, focus rings use a high-visibility 2px solid beacon in `--border-focus` (`#E10600`) with a 2px offset, ensuring complete accessibility compliance.

---

## Entry 024 — 2026-09-16 — FastF1 Venue & Circuit Resolution: Never Infer Circuit from GP Name Alone

**1. Dynamic Circuit Resolution by Event Location and Year:**
- **RULE:** NEVER resolve circuit identity or track metadata from the Grand Prix name alone (e.g., assuming "Spanish GP" is always Circuit de Barcelona-Catalunya).
- **Gotcha:** In 2026, the Spanish Grand Prix moved to the new Madring street circuit in Madrid (`Location: "Madrid"`). Mapping the Spanish GP strictly to Barcelona resulted in rendering the wrong track layout and displaying incorrect circuit statistics.
- **Protocol:** Always inspect `event.get('Location')` and `event.get('Country')` from FastF1's official event schedule in conjunction with the championship year before binding circuit metadata (`circuit_key`, `name`, `length_km`, `turns`, `lap_record`).

---

## Entry 025 — 2026-09-16 — Authentic FastF1 Telemetry Track Geometry vs Honest Placeholders

**1. Zero Synthetic or Approximated Track Outlines:**
- **RULE:** Circuit outlines rendered across the product MUST be derived from real track geometry extracted from FastF1 position telemetry decimeters `(X, Y, Z)` for that specific session. Never render generic, hand-approximated, or fallback track shapes (such as falling back to Monza for unmapped tracks).
- **2. Honest Pending Telemetry Ingestion Placeholder:**
- **RULE:** If a circuit has no telemetry ingested yet (e.g. an upcoming race weekend before its first session has run, or a brand-new circuit), honestly report `has_telemetry: false` and render the dedicated placeholder: `TRACK_LAYOUT // PENDING TELEMETRY INGESTION - Authentic geometry will be extracted post-session from FastF1 decimeter telemetry. Synthetic or approximated layouts are disabled.`

---

## Entry 026 — 2026-09-16 — Zero Click-Triggered Agent Invocations Protocol

**1. Strict Dedicated Input Surface Requirement:**
- **RULE:** Investigation agent queries (`/engineer/query`), Strategy Engineer simulations (`/strategy/query`), and Ghost Battle 3D telemetry extractions MUST be invokable ONLY from their own dedicated, conscious human input surface (typed query box, or in Ghost Battle's case the explicit generate button after deliberate multi-step selection).
- **2. Pre-Fill Without Auto-Submit for Suggestion Chips:**
- **RULE:** Suggestion chips (e.g. in `QuestionBar.jsx`, `InvestigationThread.jsx`, and `StrategyEngineer.jsx` preset scenarios) MUST prefill the text input field without auto-submitting. The user must consciously press send or Enter to dispatch an agent call.
- **3. Read-Only Editorial Feeds:**
- **RULE:** Featured Debriefs and Trending Insights cards are strictly read-only content that link out to verified external sources (`VERIFY ON {OUTLET} ↗`). They must never execute an agent query on card or moment click.

---

## Entry 027 — 2026-09-18 — What-If Counterfactual Simulation Calibration & Safety Car Pace Ceilings (Fix HH)

**1. Track-Wide Safety Car Pace Ceiling Rule:**
- **RULE:** When projecting counterfactual race timelines in `project_race_timeline()` / `run_strategy_simulation()`, NEVER allow a simulated car in clean air to lap at synthetic green-flag pace (e.g. $85\text{s}-93\text{s}$) during track-wide neutralizations (Safety Cars or VSCs).
- **Gotcha:** If a real race experienced a 6-lap Safety Car (e.g. 2026 Miami GP Laps 6–11 at $130\text{s}-150\text{s}$ vs $93\text{s}$ green pace), real race time was inflated by $+246\text{s}$. If simulated laps are projected without the Safety Car slowdown, calculating $\text{net\_gain} = \text{actual\_total\_time} - \text{simulated\_total\_time}$ produces a fake $+232\text{s}$ advantage regardless of what pit stop was requested!
- **Protocol:** Identify neutralized laps dynamically via SQL ($\text{avg\_ms} > 1.20 \times \text{median\_grid\_ms}$ across $\ge 3$ cars) and enforce a minimum lap time ceiling (`max(sim_lap, sc_pace[k])`). Under Safety Cars, all cars are constrained by the safety car delta.

**2. Pre-Divergence Identity Blending Principle:**
- **RULE:** For all laps prior to strategy divergence ($k \le \min(\text{actual\_pit\_lap}, \text{simulated\_pit\_lap})$), the driver has NOT pitted in either strategy. The driver is physically on the exact same tyre compound, at the exact same tyre age, under identical track conditions.
- **Protocol:** Pre-divergence laps MUST use the driver's actual recorded lap times (`simulated_lap[k] = actual_lap[k]`). This guarantees that early race anomalies (standing starts, opening lap chaos, early Safety Cars) are identically represented in both strategies, isolating the true counterfactual delta created exclusively by the strategy change.

**3. Strategy Identity Neutrality:**
- **RULE:** When a user simulates the driver's actual pit lap on the actual fitted compound (`simulated_pit_lap == actual_pit_lap`), the simulation MUST return `strategy_delta_s = 0.00s`, `simulated_pos = actual_pos`, and `position_change = 0`. Running the actual strategy produces zero net delta.

**4. Ordinal vs Relative Lap Parsing Rule:**
- **RULE:** In `parse_scenario_pit_lap()`, ordinal numbers (`"2nd lap"`, `"second lap"`, `"3rd lap"`, `"third lap"`) are ABSOLUTE target lap numbers (Lap 2, Lap 3), NOT relative offsets (`actual - 4`). Relative offsets MUST require explicit relative syntax (`"5 laps earlier"`, `"3 laps later"`, `"extend by 4 laps"`).
- **5. Word-Boundary Protected Substrings:**
- **RULE:** When detecting unmodeled variables (e.g. `"ers"`, `"aero"`, `"wings"`), ALWAYS use word-boundary regex (`\b` + var + `\b`). Substring matching (`if var in text:`) causes severe false positives (e.g. `"ers"` matching inside `"Verstappen"`).

---

## Entry 028 — 2026-09-18 — Multi-Turn Conversation Thread Integrity & History Restoration (Fix II)

**1. Canonical Thread Identity (`investigations` vs `conversations`):**
- **RULE:** Never insert a new row into `investigations` when processing follow-up questions in an existing thread. The `investigations` table represents the **thread** displayed in the sidebar history; the `conversations` table represents the individual **turns** within that thread.
- **Gotcha:** Calling `INSERT INTO investigations` unconditionally on every follow-up question generates a new UUID for every message, causing sidebar history fragmentation where a 4-turn debrief produces 4 separate sidebar items instead of 1 thread.
- **Protocol:**
  - Client sends `conversation_id` on follow-up requests.
  - Backend `HistoryService.saveInvestigation()` checks whether a thread with `conversation_id` (or `id::text = conversation_id`) exists.
  - If it exists: UPDATE the existing `investigations` row (update `timestamp`, `ai_response`, `session`, `investigation_metadata`) and INSERT a new row into `conversations (conversation_id, question, answer, context, response, user_id, timestamp)`.
  - If it does not exist: INSERT the new thread into `investigations` and INSERT Turn 1 into `conversations`.

**2. Complete Rich Response Persistence (`response JSONB`):**
- **RULE:** Always persist the full AI response object in `conversations.response JSONB` alongside question and text answer.
- **Gotcha:** Persisting only text `answer` drops structured telemetry traces, sector comparison matrices, simulation cards, and driver scorecards. When reloading a saved thread from history, components failed to render rich cards and fell back to `"Race debrief analysis complete."` generic placeholders.
- **Protocol:** `conversations` table stores `response JSONB`. On `getInvestigationById()`, join and return `turns` containing full `response` objects for every turn. Frontend restores complete rich cards across all turns in chronological order.

**3. Strategy Engineer History Routing:**
- **RULE:** Sidebar clicks on Strategy Engineer sessions MUST route directly to `/strategy?id=${item.id}` so that Strategy Engineer restores the full multi-turn what-if simulation history, rather than routing to `/investigate/${item.id}`.

---

## Entry 029 — 2026-09-18 — Scoped Telemetry Visualization Protocol in Strategy Engineer (Fix GG)

**1. Zero High-Frequency Telemetry in Strategy Engineer Rule:**
- **RULE:** Strategy Engineer responses (`strategy_analysis` and `strategy_whatif`) must NEVER include high-frequency vehicle dynamics traces (instantaneous speed, throttle, brake, RPM, gear, steering angle). High-frequency vehicle dynamics belong strictly to the Investigation Room / Telemetry Tool.
- **Protocol:** Telemetry in Strategy Engineer is strictly scoped to macroscopic strategy parameters: stint lengths, lap-time progression series, position progression, pit stop markers, tyre compound history, and traffic/undercut time deltas.

**2. Mandatory 2-Series Lap-Time Progression Line Chart:**
- **RULE:** Both `strategy_analysis` and `strategy_whatif` queries must output a `telemetry_comparison` payload with synchronized lap arrays: `lap_number`, `actual_lap_time`, `simulated_lap_time`, `actual_compound`, `simulated_compound`, and `is_pit_lap`.
- **Protocol:** The frontend renders an interactive SVG 2-series line chart (Actual: solid white, Simulated: dashed red `#E10600`) with vertical dashed pit stop markers (`ACT L{lap}`, `SIM L{lap}`), interactive crosshairs, and hover tooltips showing lap, delta, and compound pills.

**3. Explicit Scenario Labelling & Side-by-Side Table:**
- **RULE:** Counterfactual scenarios must explicitly state the user's requested pit stop timing vs the original pit stop (e.g. `"Pit Lap 22 (HARD) instead of Lap 27 (HARD)"`), accompanied by a side-by-side key numbers table (Finish Position, Total Race Time, Pit Timing, Tyre Compounds, Traffic Loss, Undercut Advantage, Net Advantage).

**4. Variable Scope & Candidate Evaluation Fallback:**
- **RULE:** In multi-candidate simulation evaluation loops in `run_strategy_analysis()`, always ensure summary variables (e.g. `act_pit_laps`, `sim_laps_formatted`) are initialized at function scope prior to conditional branching (`if candidate_results: ... else: ...`) to prevent `UnboundLocalError`.
