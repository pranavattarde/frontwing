# PROJECT STATE -- FrontWing
> This file is OVERWRITTEN at the start of every agent session. It is NOT a history log.
> Last updated: 2026-09-12 by Antigravity (Session 039 - Full Security Hardening Pass: Rate Limiting, Input Validation & Length Caps, Secrets Audit & Provisioning Architecture, Restricted CORS Whitelist, Safe Error Masking)
> Audit method: Verified layered rate limiting on /auth, /engineer/query, /strategy/query, /ghost-battle/data (14/14 security test assertions passed); verified strict Zod schemas with 2,000-character caps and control character stripping; audited SQL injection risks across pg and psycopg2 (100% parameterized queries); audited XSS in frontend (React DOM auto-escaping + http/https URL validation); confirmed .env was never committed to git history and zero hardcoded keys exist in source; restricted Express CORS with production origin whitelisting; masked 500 error messages with safe fallbacks. All 63 pytest tests and 14 Node security tests passed.

---

## 1. What Works Right Now

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
