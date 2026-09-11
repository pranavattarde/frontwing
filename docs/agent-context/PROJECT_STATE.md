# PROJECT STATE -- FrontWing
> This file is OVERWRITTEN at the start of every agent session. It is NOT a history log.
> Last updated: 2026-09-11 by Antigravity (Session 029 - STAGE C: OpenF1 Secondary Pit Stop & Stint Cross-Check Verification)
> Audit method: 9/9 tests passing in dedicated strategy test suite (`pytest tests/test_strategy_engineer.py`); 50/50 tests passing in consolidated domain test suite (`pytest tests/`); 3 real-world sessions verified against live running FastAPI (:8000), Express (:5000), and Vite (:5173); browser visual verification complete with recorded artifacts.

---

## 1. What Works Right Now

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

## 2. What Is Broken Right Now

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
| 2026 | Austrian GP | 2026_austria_gp_race | YES | On-demand | No (future/synthetic OpenF1) | Ingested live |
| 2026 | Canadian GP | 2026_canadian_gp_race | YES | On-demand | No (future/synthetic OpenF1) | Ingested live |
| 2026 | Miami GP | 2026_miami_gp_race | YES | On-demand | No (future/synthetic OpenF1) | Ingested live |
| 2026 | Australian GP | 2026_australian_gp_race | YES | On-demand | No (future/synthetic OpenF1) | Ingested live |
| 2026 | Monaco GP | 2026_monaco_gp_race | YES | On-demand | No (future/synthetic OpenF1) | Ingested live |
| 2026 | British GP | 2026_british_gp_race | YES | On-demand | No (future/synthetic OpenF1) | Auto-ingested live |
| 2025 | Emilia Romagna GP | 2025_emilia_romagna_gp_race | YES | On-demand | On-demand | Ingested live |
| 2025 | Bahrain GP | 2025_bahrain_gp_race | YES | On-demand | On-demand | Ingested live |
| 2025 | Japanese GP | 2025_japanese_gp_race | YES | On-demand | On-demand | Ingested live |
| 2025 | Chinese GP | 2025_chinese_gp_race | YES | On-demand | On-demand | Ingested live |
| 2025 | Australian GP | 2025_australian_gp_race | YES | On-demand | On-demand | Ingested live |
| 2024 | Abu Dhabi GP | 2024_abu_dhabi_gp_race | YES | YES | Supported | Ingested & auto-backfilled live |
| 2024 | Italian GP | 2024_italian_gp_race | YES | YES | Supported (key 9605) | Ingested & auto-backfilled |
| 2024 | Qatar GP | 2024_qatar_gp_race | YES | YES | Supported (key 9642) | Ingested & verified end-to-end |
| 2024 | British GP | 2024_british_gp_race | YES | YES | VERIFIED (key 9558) | Verified with flagged discrepancy |
| 2024 | Dutch GP | 2024_dutch_gp_race | YES | YES | VERIFIED (key 9599) | Verified with 100% agreement |
| 2024 | Monaco GP | 2024_monaco_gp_race | YES | YES | Supported (key 9516) | Ingested & auto-backfilled |
| 2023 | Monaco GP | 2023_monaco_gp_race | YES | YES | VERIFIED (key 9087) | Ingested & verified |
| 2022 | British GP | 2022_british_gp_race | YES | YES | Pre-2023 Fallback | Verified graceful FastF1 fallback |
| 2022 | Austrian GP | 2022_austrian_gp_race | YES | On-demand | Pre-2023 Fallback | Auto-ingested live from FastF1 |
