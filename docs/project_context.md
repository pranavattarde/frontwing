# FrontWing Project Context

FrontWing is a production-grade, AI-powered Formula 1 intelligence platform. It processes real-time telemetry, historical statistics, and race configurations to deliver interactive telemetry charts, driver comparisons, and AI chat diagnostics.

---

## 1. System Architecture

The platform uses a decoupled microservices design to balance performance (Node.js I/O and WebSockets) with data analysis/AI capabilities (Python and scientific libraries). V1 operates completely without RAG and vector databases, eliminating vector index overheads.

```text
Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ       HTTP / WS       Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
Ã¢ÂÂ  React Frontend Ã¢ÂÂ <Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ> Ã¢ÂÂ Node.js API Gateway Ã¢ÂÂ
Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ                       Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ¬Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
                                                     Ã¢ÂÂ
                                            Redis    Ã¢ÂÂ HTTP / RPC
                                           Pub/Sub   Ã¢ÂÂ
                                                     Ã¢ÂÂ¼
Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ                       Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
Ã¢ÂÂ                 Ã¢ÂÂ <Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ> Ã¢ÂÂ AI Python Service   Ã¢ÂÂ
Ã¢ÂÂ   PostgreSQL    Ã¢ÂÂ                       Ã¢ÂÂ  (LangGraph/FastF1) Ã¢ÂÂ
Ã¢ÂÂ                 Ã¢ÂÂ                       Ã¢ÂÂ  Gemini 2.5 Flash   Ã¢ÂÂ
Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ                       Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂÃ¢ÂÂ
```

- **Frontend**: React (TypeScript) dashboard styled with TailwindCSS and ShadCN UI components, communicating via REST and WebSockets.
- **Backend API Gateway**: Node.js + Express server handling user sessions, WebSockets connection management, Redis data routing, and proxying AI queries.
- **AI Microservice**: Python + FastAPI microservice implementing LangGraph conversational state machines, FastF1 pandas dataframe operations, and Gemini/Groq LLM connectors.
- **AI Orchestration Nodes**:
  - **Primary**: Gemini 2.5 Flash (utilizing large context windows for processing session logs).
  - **Fallback**: Groq (for fast latency responses).
  - **Future Optional**: OpenRouter integration.
- **Cache & Message Broker**: Redis coordinates pub/sub channels for real-time timing/telemetry and acts as a lightweight hot-data store.
- **Primary Database**: PostgreSQL storing structured race summaries, lap lists, stints, weather, and user chat contexts.

---

## 2. Folder Structure

```text
FrontWing/
Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂ ai_services/                # Python LangGraph/FastF1 microservice
Ã¢ÂÂ   Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂ app/
Ã¢ÂÂ   Ã¢ÂÂ   Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂ agents/             # LangGraph state machines & routers
Ã¢ÂÂ   Ã¢ÂÂ   Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂ tools/              # Custom F1 tools (FastF1 analytics, scoring)
Ã¢ÂÂ   Ã¢ÂÂ   Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂ core/               # Configuration, logging, DB setups
Ã¢ÂÂ   Ã¢ÂÂ   Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂ main.py             # FastAPI Entrypoint
Ã¢ÂÂ   Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂ requirements.txt
Ã¢ÂÂ   Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂ README.md
Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂ backend/                    # Node.js + Express API Gateway
Ã¢ÂÂ   Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂ src/
Ã¢ÂÂ   Ã¢ÂÂ   Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂ config/             # PG, Redis, OpenF1 client configs
Ã¢ÂÂ   Ã¢ÂÂ   Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂ controllers/        # Express handlers (auth, telemetry, chat)
Ã¢ÂÂ   Ã¢ÂÂ   Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂ middleware/         # Auth, rate limiting, error catching
Ã¢ÂÂ   Ã¢ÂÂ   Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂ routes/             # REST endpoints (V1)
Ã¢ÂÂ   Ã¢ÂÂ   Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂ services/           # Live feeds, WS managers, DB layer
Ã¢ÂÂ   Ã¢ÂÂ   Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂ index.ts            # Express Entrypoint
Ã¢ÂÂ   Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂ package.json
Ã¢ÂÂ   Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂ tsconfig.json
Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂ database/                   # Database schemas & migrations
Ã¢ÂÂ   Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂ migrations/             # PostgreSQL DDL scripts
Ã¢ÂÂ   Ã¢ÂÂ   Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂ 01_init_schema.sql  # Core schemas
Ã¢ÂÂ   Ã¢ÂÂ   Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂ 02_intelligence_tables.sql # Scoring, sim, and insights tables
Ã¢ÂÂ   Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂ seeds/                  # Baseline F1 seed data (teams, circuits)
Ã¢ÂÂ   Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂ schema.sql              # Master database schema layout
Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂ docs/                       # Project Documentation
Ã¢ÂÂ   Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂ component_library.md     # Complete component architecture specification
Ã¢ÂÂ   Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂ design_system.md        # Single source of truth for UI/UX Design System
Ã¢ÂÂ   Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂ learning.md             # Active learning log & system design insights
Ã¢ÂÂ   Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂ project_context.md      # Persistent project memory (APIs, schemas)
Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂ frontend/                   # React + TypeScript SPA dashboard
    Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂ src/
    Ã¢ÂÂ   Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂ components/         # Shared & ShadCN UI components
    Ã¢ÂÂ   Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂ hooks/              # Custom React hooks (WS sub, telemetry)
    Ã¢ÂÂ   Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂ pages/              # Main routes (Dashboard, Telemetry, AI Chat)
    Ã¢ÂÂ   Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂ services/           # API services & WebSockets
    Ã¢ÂÂ   Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂ App.tsx             # React Entrypoint
    Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂ tailwind.config.js
    Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂ package.json
    Ã¢ÂÂÃ¢ÂÂÃ¢ÂÂ tsconfig.json
```

---

## 3. Database Schema Reference

### Core Schema (Defined in `schema.sql` / `01_init_schema.sql`)
Relational tables tracking `constructors`, `drivers`, `circuits`, `races`, `sessions`, `laps`, `stints`, `weather`, and `telemetry_metadata` (see [schema.sql](file:///c:/VS-Code_C_drive/Projects/FrontWing/database/schema.sql) for column definitions).

### Intelligence Schema (Defined in `02_intelligence_tables.sql`)

#### `scoring_results`
Stores the deterministic outputs of the FrontWing Intelligence Scoring Engine.
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | BIGSERIAL | PRIMARY KEY | Auto-increment ID |
| `session_id` | VARCHAR(100) | REFERENCES sessions(id) | Target F1 session |
| `driver_id` | VARCHAR(50) | REFERENCES drivers(id) | Target driver |
| `strategy_score` | DECIMAL(5,2) | CHECK (0.00 to 100.00) | Metric score |
| `tire_management_score`| DECIMAL(5,2) | CHECK (0.00 to 100.00) | Metric score |
| `pace_efficiency_score`| DECIMAL(5,2) | CHECK (0.00 to 100.00) | Metric score |
| `pit_stop_efficiency_score`| DECIMAL(5,2)| CHECK (0.00 to 100.00) | Metric score |
| `race_execution_score` | DECIMAL(5,2) | CHECK (0.00 to 100.00) | Metric score |
| `composite_score` | DECIMAL(5,2) | CHECK (0.00 to 100.00) | Average performance score |

#### `simulation_runs`
Tracks results of the "What-If" pit stop strategy simulation engine.
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | BIGSERIAL | PRIMARY KEY | Auto-increment ID |
| `session_id` | VARCHAR(100) | REFERENCES sessions(id) | Target F1 session |
| `driver_id` | VARCHAR(50) | REFERENCES drivers(id) | Target driver |
| `simulated_pit_lap`| INTEGER | NOT NULL | Lap input for simulation |
| `actual_pit_lap` | INTEGER | | What driver actually did |
| `simulated_net_time_gain_ms`| INTEGER | NOT NULL | Predicted time gained/lost |
| `simulated_position_change`| INTEGER | NOT NULL | Net position shift (+/-) |
| `run_parameters` | JSONB | | T_loss, target compound, wear rate |

#### `race_insights`
Stores telemetry insights for conversational prompts and dashboard display.
| Column | Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | BIGSERIAL | PRIMARY KEY | Auto-increment ID |
| `session_id` | VARCHAR(100) | REFERENCES sessions(id) | Target F1 session |
| `driver_id` | VARCHAR(50) | REFERENCES drivers(id) | Reference driver |
| `insight_type` | VARCHAR(50) | NOT NULL | 'strategy', 'tire', 'pace', etc. |
| `severity` | VARCHAR(20) | DEFAULT 'info' | 'info', 'warning', 'critical' |
| `summary` | TEXT | NOT NULL | Textual description of telemetry |
| `supporting_metrics`| JSONB | | Datapoints mapping the event |

---

## 4. FrontWing's First Unique Feature: Telemetry-Driven Ghost Battle Dialogue

### Concept
A conversational comparative utility. Users select any two drivers and a lap (e.g. *Piastri vs. Sainz, Lap 42 of the 2024 Austrian GP*). Instead of presenting static charts, the AI acts as a telemetry race engineer, narrating exactly where time was gained or lost on track.

### Technical Workflow
1. **Distance-Based Alignment**: The backend aligns both laps' telemetry sequences by track distance (in meters) rather than timestamps to resolve chronological drift.
2. **Telemetry Micro-Deltas**: The system calculates metrics at each corner: braking point differences (in meters), minimum apex speed (in km/h), and throttle application margins (time difference to 100%).
3. **Gemini 2.5 Flash Generation**: The micro-deltas are structured and sent to Gemini, which generates a turn-by-turn interactive commentary:
   > *"At Turn 3 (Remus), Piastri braked 12 meters later than Sainz, carrying 8 km/h more apex speed. However, Sainz achieved 100% throttle application 0.4 seconds earlier on exit, resolving the gap on the following straight."*

---

## 5. FrontWing Intelligence Engine: Refined Deterministic Formulas

To ensure two independent engineers compute the exact same score from identical raw data, all terms are mathematically bounded and defined. The formulas have been structurally refined to eliminate compression bias, reward front-runner position retention, and isolate strategic outcomes from on-track driving prowess.

### 1) Strategy Score ($S_{\text{strat}}$)
Evaluates pit stop timing, clean air maintenance, and tyre compound allocation.
$$S_{\text{strat}} = 0.4 \cdot \text{CAR} + 0.4 \cdot \text{SPG} + 0.2 \cdot \text{TSE}$$
- **Clean Air Ratio ($\text{CAR}$)**:
  $$\text{CAR} = \frac{\sum_{k=1}^{N} I(\text{Gap}_{i}(k) > 1.5\text{s})}{N - N_{\text{SC}}} \times 100$$
  - *Inputs*: $N$ (Total race laps), $N_{\text{SC}}$ (Laps run under Safety Car or VSC), $\text{Gap}_{i}(k)$ (Gap between driver $i$ and leading car on lap $k$).
  - *Edge Cases*: If $N = N_{\text{SC}}$ (e.g. red flag on safety car start), $\text{CAR} = 100$.
  - *Weaknesses*: Drivers in the midfield pack are penalized heavily by traffic regardless of strategy quality.
- **Strategic Position Gain ($\text{SPG}$)**:
  $$\text{SPG} = \min\left(100, \max\left(0, 50 + 10 \times \sum_{p \in P_{\text{stops}}} \Delta \text{Pos}_{\text{strategy}}(p) \right)\right)$$
  - *Inputs*: $\Delta \text{Pos}_{\text{strategy}}(p) = \left( \text{Pos}_{i}(L_p - 1) - \text{Pos}_{i}(L_p + 3) \right) - N_{\text{overtakes\_on\_track}}(L_p \to L_p + 3)$. This explicitly subtracts on-track overtakes to isolate undercut/overcut strategy efficiency.
  - *Edge Cases*: If $|P_{\text{stops}}| = 0$, $\text{SPG} = 50.0$.
  - *Weaknesses*: Punctures or front-wing damage stops drop the score unfairly. These are flagged in database via `is_forced_stop` and excluded from $P_{\text{stops}}$.
- **Tire Stint Efficiency ($\text{TSE}$)**:
  $$\text{TSE} = \max\left(0, 100 - \frac{1}{|P_{\text{stops}}|} \sum_{s \in \text{stints}} \frac{|\text{Length}_s - O_C|}{O_C} \times 100\right)$$
  - *Inputs*: $\text{Length}_s$ (Actual laps run in stint $s$), $O_C$ (Optimal tire stint compound length for track: e.g. Soft = 18, Medium = 26, Hard = 34).
  - *Edge Cases*: Stints ended by DNF or forced stops are excluded.

### 2) Tire Management Score ($S_{\text{tire}}$)
Measures pace degradation over stint life compared to the grid.
We compute a linear regression on fuel-corrected lap times $L_{\text{corr}}(t) = L(t) + 0.06 \cdot t$ against tire age $t$ for clean laps:
$$L_{\text{corr}}(t) = \alpha + \beta_{\text{driver}} \cdot t$$
$$\text{StintScore}_s = 100 \times \left(1 - \text{ReLU}\left(\frac{\beta_{\text{driver}} - \beta_{\text{grid\_median}}}{\beta_{\text{grid\_median}}}\right)\right)$$
$$S_{\text{tire}} = \frac{1}{|S_{\text{clean}}|} \sum_{s \in S_{\text{clean}}} \text{StintScore}_s$$
- *Inputs*: $\beta_{\text{driver}}$ (Driver wear slope), $\beta_{\text{grid\_median}}$ (Median wear slope of same stint compound).
- *Edge Cases*: If stint clean laps $< 3$, the stint score is set to neutral ($100.0$).
- *Weaknesses*: Wet compounds are excluded due to drying track volatility.

### 3) Pace Efficiency Score ($S_{\text{pace}}$)
Evaluates driver pace relative to the car's machine potential and lap consistency.
$$S_{\text{pace}} = 50 \cdot \text{Consistency} + 50 \cdot \text{SpeedMargin}$$
- **Consistency**:
  $$\text{Consistency} = \max\left(0, 1 - \frac{\sigma(L_i(k))}{\sigma_{\text{limit}}}\right) \quad [\sigma_{\text{limit}} = 1.5\text{s}]$$
  - Scales standard deviation directly against a realistic threshold, avoiding statistical compression.
- **SpeedMargin**:
  $$\text{SpeedMargin} = \max\left(0, 1 - \frac{\mu(L_i(k)) - L_{\text{optimal}}}{\Delta_{\text{pace\_limit}}}\right) \quad [\Delta_{\text{pace\_limit}} = 2.0\text{s}]$$
  - *Inputs*: $L_{\text{optimal}} = \min(L_{i}(k), L_{\text{teammate}}(k))$. Scales absolute pace delta against a 2.0-second maximum gap.
  - *Weaknesses*: If teammate has car floor damage, $L_{\text{optimal}}$ drops, inflating the driver's score.

### 4) Pit Stop Efficiency Score ($S_{\text{pit}}$)
Differentiates driver entry/exit from crew wheel-change times.
$$S_{\text{pit}} = 100 \times \frac{1}{|P_{\text{stops}}|} \sum_{p \in P_{\text{stops}}} (0.5 \cdot \text{SF}(p) + 0.5 \cdot \text{LF}(p))$$
- **Stationary Factor ($\text{SF}$)**:
  $$\text{SF} = \max\left(0, 1 - \frac{t_{\text{stationary}} - t_{\text{stationary\_opt}}}{t_{\text{stationary\_opt}}}\right) \quad [t_{\text{stationary\_opt}} = 2.0\text{s}]$$
- **Lane Factor ($\text{LF}$)**:
  $$\text{LF} = \max\left(0, 1 - \frac{t_{\text{pit\_lane}} - t_{\text{pit\_lane\_opt}}}{t_{\text{pit\_lane\_opt}}}\right)$$
  - *Inputs*: $t_{\text{stationary}}$ (Stationary duration), $t_{\text{pit\_lane}}$ (Pit lane duration), $t_{\text{pit\_lane\_opt}}$ (Fastest grid lane transit).
  - *Edge Cases*: No stops $\rightarrow S_{\text{pit}} = 100.0$.
  - *Weaknesses*: Double-stacking delays SF through no fault of the driver.

### 5) Race Execution Score ($S_{\text{exec}}$)
Penalizes driver errors and rewards grid progression and front-runner retention.
$$S_{\text{exec}} = \min\left(100, \max\left(0, 80 - 15 \cdot N_{\text{penalties}} - 5 \cdot N_{\text{warnings}} - 5 \cdot N_{\text{lockups}} + \text{PPF}\right)\right)$$
- **Position Performance Factor ($\text{PPF}$)**:
  $$\text{PPF} = \text{Progression} + \text{Retention}$$
  $$\text{Progression} = \max(0, 2 \cdot (P_{\text{start}} - P_{\text{finish}}))$$
  $$\text{Retention} = \begin{cases} 2 \cdot (11 - P_{\text{finish}}) & \text{if } P_{\text{finish}} \le P_{\text{start}} \text{ and } P_{\text{finish}} \le 10 \\ 0 & \text{otherwise} \end{cases}$$
  - *Inputs*: $N_{\text{penalties}}$ (Steward penalties), $N_{\text{warnings}}$ (Track limit flags), $N_{\text{lockups}}$ (Wheel Speed $< 0.7 \times$ Vehicle Speed while brake pressure $> 10$ bar), $P_{\text{start}}, P_{\text{finish}}$ (Grid/finish positions).
  - *Retention Bonus*: Eliminates the "Winner's Penalty" by rewarding front-runners who start and stay high on the grid (e.g. pole to victory adds 20.0 to PPF, offsetting lockups/warnings).
  - *Edge Cases*: Non-steward DNF penalizes the score by a flat 25.
  - *Weaknesses*: Position shifts can be skewed by other drivers' mechanical DNF events.

---

## 6. Strategy Simulation Engine: Refined Deterministic & Multi-Agent Models

### 1) Scope Division: V1 vs. V2

| Feature | V1 (Current Implementation) | V2 (Proposed Design Upgrade) |
| :--- | :--- | :--- |
| **Simulated Target** | Single driver only | Full grid (all 20 drivers simulated simultaneously) |
| **Rival Timelines** | Static actual timelines | Dynamic multi-agent timelines |
| **Overtake Check** | Simple binary pace difference | Logistic probability model with DRS |
| **DRS Modeling** | None | Dynamic delta reduction and detection rules |
| **Tire Warmup** | None | Compound-dependent out-lap thermal penalties |
| **Simulation Mode** | Deterministic only | Deterministic + Monte Carlo Stochastic |

---

### 2) V2 Simulation Architecture

The V2 Multi-Agent Simulation Engine coordinates data loading, tire wear modeling, state propagation, traffic detection, and stochastic overtake checks:

```mermaid
graph TD
    Config[Race & Strategy Config] --> Engine[V2 Simulation Engine]
    History[Historical Lap Timing & Wear Data] --> ModelFitting[Tire Degradation Fitting Module]
    
    subgraph V2 State Engine Loop (Lap 1 to N)
        InitState[Initialize Grid State Vector] --> ProjectPace[Project Natural Pace for All Drivers]
        ProjectPace --> SortTimes[Sort Cumulative Race Times]
        SortTimes --> UpdateGaps[Recompute Gaps & Positions]
        UpdateGaps --> PitCheck[Check Pit Stop Decisions]
        
        PitCheck -->|Pits| PitLoss[Apply Pit Loss & Tire Warmup Penalties]
        PitCheck -->|Stays Out| WearProj[Apply Linear Tire Wear & Fuel Burn]
        
        PitLoss --> TrafficCheck[Check Traffic & DRS Detection]
        WearProj --> TrafficCheck
        
        TrafficCheck --> OvertakeCalc[Calculate Overtake Probabilities]
        OvertakeCalc --> OvertakeResolve[Resolve Overtakes & Capping Logic]
        OvertakeResolve --> UpdateState[Update Race State Vector]
    end
    
    UpdateState --> Output[Simulated Timelines & Position Logs]
```

- **Race Config Loader**: Reads the target session parameters, starting grid order, tyre specifications, pit lane loss ($T_{\text{loss}}$), and circuit difficulty index ($OD$).
- **Tire Degradation Fitting Module**: Performs linear regressions on historical stint data to calculate base paces ($\alpha$) and wear slopes ($\beta$) for all driver-compound pairs.
- **Multi-Agent State Manager**: Main loop driver tracking the cumulative race times and positions of all 20 cars.
- **Traffic & DRS Resolver**: Evaluates spacing between cars at the end of each lap to update dirty air and DRS activation state.
- **Overtake Probability Engine**: Computes sigmoidal overtaking chances and resolves grid swapping.
- **Monte Carlo Orchestrator**: Aggregates statistical outcomes over $R$ runs for the stochastic simulation mode.

---

### 3) V2 Mathematical Design

#### A. Race State Engine
The state of the race at the end of lap $k$ is represented by the set of driver state vectors:
$$\mathbf{X}(k) = \{ \mathbf{s}_i(k) \}_{i=1}^{M}$$
where each driver's state vector $\mathbf{s}_i(k)$ contains:
1. $T_i(k)$: Cumulative race time (seconds) at the completion of lap $k$.
2. $P_i(k)$: Track position rank ($1 \dots M$).
3. $C_i(k)$: Active tire compound (Soft, Medium, Hard).
4. $t_i(k)$: Tire age (laps run on current set).
5. $G_i(k)$: Gap to the car immediately ahead (seconds):
   $$G_i(k) = T_i(k) - T_{\text{rival\_ahead}}(k)$$
   (For the leader, $G_{\text{leader}}(k) = 0$).
6. $W_i(k)$: Pit exit window (seconds). The projected cumulative time if pitting on lap $k$:
   $$W_i(k) = T_i(k) + T_{\text{loss}}(C_{\text{new}})$$
7. $\text{Traffic}_i(k)$: Traffic congestion status:
   $$\text{Traffic}_i(k) = \begin{cases} \text{Dirty Air} & \text{if } G_i(k) \le 1.5\text{s} \\ \text{Clean Air} & \text{otherwise} \end{cases}$$
8. $Status_i(k)$: Driver status ('Active', 'DNF', 'Pit').

#### B. Dynamic Position & Traffic Updates
When a driver changes strategy (e.g., pitting early or extending a stint), positions and traffic must be dynamically recomputed for the whole grid:
1. **Recompute Cumulative Times**:
   For driver $i$ pitting on lap $k$:
   $$T_i(k) = T_i(k-1) + L_{i,\text{natural}}(1, C_{\text{new}}) + T_{\text{loss}} + \theta_{\text{warmup}}(C_{\text{new}})$$
   For driver $j$ staying out:
   $$T_j(k) = T_j(k-1) + L_{j,\text{actual}}(k)$$
2. **Re-sort Grid Positions**:
   Sort the array of cumulative times $\{T_1(k), T_2(k), \dots, T_M(k)\}$ in ascending order:
   $$T_{\pi(1)}(k) < T_{\pi(2)}(k) < \dots < T_{\pi(M)}(k)$$
   where $\pi(r)$ is the driver occupying position rank $r$.
3. **Update Gaps & Traffic States**:
   For each position rank $r \in [2, M]$:
   $$G_{\pi(r)}(k) = T_{\pi(r)}(k) - T_{\pi(r-1)}(k)$$
   If $G_{\pi(r)}(k) \le 1.5\text{s}$, the traffic status of driver $\pi(r)$ is marked as `Dirty Air`.
4. **Recompute Clean Air Windows**:
   - If driver $\pi(r-1)$ pits, driver $\pi(r)$ is released from their dirty air. Their gap to the new leading car $\pi(r-2)$ is evaluated. If $T_{\pi(r)}(k-1) - T_{\pi(r-2)}(k-1) > 1.5$ seconds, their clean air window opens, allowing them to run at their natural pace $L_{\pi(r),\text{natural}}(k)$ on the following lap.

#### C. Undercut/Overcut & Warmup Logic
- **Tire Warmup Penalty ($\theta_{\text{warmup}}$)**:
  Out-laps on fresh tires suffer a thermal lag penalty before reaching optimal working temperature. This delay is compound-dependent:
  - Soft: $\theta_{\text{warmup}} = 0.3\text{s}$
  - Medium: $\theta_{\text{warmup}} = 0.6\text{s}$
  - Hard: $\theta_{\text{warmup}} = 1.2\text{s}$
- **Undercut Mechanics**:
  Driver $i$ pits on lap $k$ to mount fresh tires, resetting $t_i(k) = 0$. On lap $k+1$, they exploit fresh-rubber pace $L_{i,\text{natural}}(1, C_{\text{new}})$. If their fresh tire pace outweighs the worn-tire pace of rival $j$ who stayed out, driver $i$ jumps ahead when driver $j$ pits on lap $k+d$.
- **Overcut Mechanics**:
  Driver $j$ stays out on worn tires. If driver $i$ exits the pit lane and lands in a traffic bottleneck ($\text{Traffic}_i(k) = \text{Dirty Air}$), their fresh-rubber pace is capped:
  $$L_i(m) = L_{\text{traffic}}(m)$$
  This neutralizes the undercut advantage. Since driver $j$ continues in clean air, they successfully overcut driver $i$ when pitting later.
- **Success Criteria**:
  An undercut/overcut attempt by driver $i$ (pitting at $k$) against rival $j$ (pitting at $k+d$) is successful if:
  $$T_i(k+d) < T_j(k+d)$$

#### D. Overtake Probability Model
Overtaking is modeled probabilistically when a following driver is within the DRS detection zone ($G_i(k-1) \le 1.0\text{s}$).
- **DRS Pace Boost ($\delta_{\text{DRS}}$)**:
  If the gap at the end of the previous lap was $\le 1.0$ second, the chasing driver receives a DRS boost of $\delta_{\text{DRS}} = 0.4$ seconds on the subsequent lap:
  $$L_{i,\text{DRS}}(k) = L_{i,\text{natural}}(k) - \delta_{\text{DRS}}$$
- **Probability Formulation**:
  We calculate the overtake probability:
  $$P_{\text{overtake}} = \frac{1}{1 + e^{-k_{\text{sens}} \cdot (\Delta_{\text{pace}} + \delta_{\text{DRS}} - OD)}}$$
  where:
  - $\Delta_{\text{pace}} = L_{i-1,\text{natural}} - L_{i,\text{natural}}$ is the clean-air pace difference.
  - $OD$ is the circuit's Overtake Difficulty Index (e.g. Monaco = 2.0s, Singapore = 1.5s, Monza = 0.5s, Austria = 0.4s).
  - $k_{\text{sens}} = 5.0$ represents the curve sensitivity.
- **Resolution Modes**:
  - **Deterministic**: An overtake succeeds if $P_{\text{overtake}} \ge 0.5$ (equivalent to $\Delta_{\text{pace}} + \delta_{\text{DRS}} \ge OD$).
  - **Stochastic (Monte Carlo)**: Sample $r \sim \text{Uniform}(0, 1)$. The overtake succeeds if $r < P_{\text{overtake}}$.
  - If successful, the chaser moves ahead: $T_i(k) = T_{i-1}(k) + 0.3$s, and the overtaken driver drops back.
  - If failed, the chaser is held up in dirty air: $T_i(k) = \max\left(T_i(k), T_{i-1}(k) + 0.6\text{s}\right)$.

---

### 4) Computational Complexity Estimation

For a grid of $M$ drivers and a race of $N$ laps:
- **Per Lap**: Sorting $M$ drivers takes $O(M \log M)$. Updating gaps and resolving traffic bottlenecks takes $O(M)$.
- **Total Race**: Running a single grid simulation takes $O(N \cdot M \log M)$ operations.
- **Numeric Verification**:
  - For $N = 70$ laps, $M = 20$ drivers:
    $$70 \times 20 \log_2(20) \approx 70 \times 20 \times 4.32 \approx 6,050 \text{ operations}$$
    A single deterministic run executes in **< 1 millisecond** in Python.
  - **Monte Carlo Performance**:
    Running $R = 1,000$ simulation trials requires $O(R \cdot N \cdot M \log M) \approx 6 \times 10^6$ operations.
    Using vectorized operations (e.g. NumPy arrays), sorting and state transitions can be evaluated in parallel across trials, completing in **< 0.5 seconds**. This allows real-time interactive strategy projection.

---

### 5) V1 API Response Structure
The FastAPI route (`POST /simulate`) returns the following structured JSON output:
```json
{
  "status": "success",
  "results": {
    "session_id": "2024_austria_gp_race",
    "driver_id": "sainz",
    "simulated_pit_lap": 19,
    "actual_pit_lap": 22,
    "target_compound": "HARD",
    "actual_finishing_position": 3,
    "projected_finishing_position": 3,
    "position_change": 0,
    "actual_total_time_seconds": 4985.2,
    "projected_total_time_seconds": 4983.8,
    "simulated_net_time_gain_ms": 1400,
    "simulated_lap_times": [71.2, 70.8, ...],
    "run_parameters": {
      "pit_loss": 22.0,
      "overtake_difficulty": 0.4,
      "stints": [...]
    }
  }
}
```

---** in Python using NumPy vectors.

---

### 4) V1 API Response Structure
The FastAPI route (`POST /simulate`) returns the following structured JSON output:
```json
{
  "status": "success",
  "results": {
    "session_id": "2024_austria_gp_race",
    "driver_id": "sainz",
    "simulated_pit_lap": 19,
    "actual_pit_lap": 22,
    "target_compound": "HARD",
    "actual_finishing_position": 3,
    "projected_finishing_position": 3,
    "position_change": 0,
    "actual_total_time_seconds": 4985.2,
    "projected_total_time_seconds": 4983.8,
    "simulated_net_time_gain_ms": 1400,
    "simulated_lap_times": [71.2, 70.8, ...],
    "run_parameters": {
      "pit_loss": 22.0,
      "overtake_difficulty": 0.4,
      "stints": [...]
    }
  }
}
```

---

## 9. 2024 Austrian GP Refined Worked Calculations

- **Race Metrics Setup**: Total Laps $N = 71$. Safety Car / VSC laps $N_{\text{SC}} = 4$. Net Racing Laps = 67.
- **Optimal stints parameters**: $O_M = 26$, $O_H = 34$. $t_{\text{stationary\_opt}} = 2.0\text{s}$, $t_{\text{pit\_lane\_opt}} = 20.80\text{s}$.
- **Pace Benchmarks**: $\sigma_{\text{limit}} = 1.5\text{s}$, $\Delta_{\text{pace\_limit}} = 2.0\text{s}$.

### A) Max Verstappen (Red Bull - P5)
* **Strategy Score ($S_{\text{strat}}$)**:
  - $\text{CAR}$: Ran in clean air for 62 laps. $\text{CAR} = \frac{62}{67} \times 100 = 92.54\%$.
  - $\text{SPG}$: Stop 1 (Lap 23): Net position P1 $\rightarrow$ P1 (0). Stop 2 (Lap 51): Net position P1 $\rightarrow$ P1 (0). Stop 3 (Lap 65, puncture): Ignored. $\text{SPG} = 50 + 10(0) = 50.0$.
  - $\text{TSE}$: Stint 1 (M) = 23 laps. Stint 2 (H) = 28 laps. Stint 3 (M, puncture): Ignored.
    $\text{TSE} = 100 - \text{Mean}(\frac{|23-26|}{26}, \frac{|28-34|}{34}) \times 100 = 100 - 14.55 = 85.45$.
  - **$S_{\text{strat}} = 0.4(92.54) + 0.4(50.0) + 0.2(85.45) = 74.1$** (rounded to 1 decimal place)
* **Tire Management Score ($S_{\text{tire}}$)**:
  - Stint 1 (M) degradation: $\beta_{\text{VER}} = 0.065\text{s/lap}$. $\beta_{\text{grid\_median}} = 0.080\text{s/lap} \rightarrow \text{StintScore} = 100.0$.
  - Stint 2 (H) degradation: $\beta_{\text{VER}} = 0.055\text{s/lap}$. $\beta_{\text{grid\_median}} = 0.050\text{s/lap} \rightarrow \text{StintScore} = 100(1 - \frac{0.005}{0.050}) = 90.0$.
  - **$S_{\text{tire}} = \frac{100 + 90.0}{2} = 95.00$**
* **Pace Efficiency Score ($S_{\text{pace}}$)**:
  - $\text{Consistency}$: $\sigma(L_{\text{VER}}) = 0.350\text{s} \rightarrow 1 - \frac{0.350}{1.5} = 76.67\%$ (Score = 38.33).
  - $\text{SpeedMargin}$: Teammate (Perez) mean clean lap = $71.950\text{s}$. Verstappen's own optimal limit $L_{\text{optimal}} = 69.950\text{s}$. Gap = $70.800 - 69.950 = 0.85\text{s}$.
    $\text{SpeedMargin} = 1 - \frac{0.850}{2.0} = 57.50\%$ (Score = 28.75).
  - **$S_{\text{pace}} = 38.33 + 28.75 = 67.08$**
* **Pit Stop Efficiency Score ($S_{\text{pit}}$)**:
  - Stop 1: $t_{\text{stationary}} = 2.2\text{s}$ ($\text{SF} = 0.90$), $t_{\text{pit\_lane}} = 21.0\text{s}$ ($\text{LF} = 0.9904$). Stop 1 Score = $94.52$.
  - Stop 2: $t_{\text{stationary}} = 6.5\text{s}$ ($\text{SF} = 0$), $t_{\text{pit\_lane}} = 25.4\text{s}$ ($\text{LF} = 0.7788$). Stop 2 Score = $38.94$.
  - **$S_{\text{pit}} = \frac{94.52 + 38.94}{2} = 66.73$**
* **Race Execution Score ($S_{\text{exec}}$)**:
  - $P_{\text{start}} = 1$, $P_{\text{finish}} = 5$. Progression = 0. Retention = 0. PPF = 0.
  - Errors: $N_{\text{penalties}} = 1$ (10s collision penalty), $N_{\text{warnings}} = 1$ (track limits), $N_{\text{lockups}} = 1$.
  - **$S_{\text{exec}} = 80 - 15(1) - 5(1) - 5(1) + 0 = 55.00$**
* **Composite Performance Score: 71.58**

### B) Oscar Piastri (McLaren - P2)
* **Strategy Score ($S_{\text{strat}}$)**:
  - $\text{CAR}$: Clean air laps = 50. $\text{CAR} = \frac{50}{67} \times 100 = 74.63\%$.
  - $\text{SPG}$: Stop 1 (Lap 21): P5 $\rightarrow$ P6 (Net -1). Stop 2 (Lap 52): P2 $\rightarrow$ P3 (Net -1). $\text{SPG} = 50 + 10(-2) = 30.0$.
  - $\text{TSE}$: Stint 1 (M) = 21 laps, Stint 2 (H) = 31 laps, Stint 3 (M) = 19 laps.
    $\text{TSE} = 100 - \text{Mean}(\frac{|21-26|}{26}, \frac{|31-34|}{34}, \frac{|19-26|}{26}) \times 100 = 100 - 18.30 = 81.70$.
  - **$S_{\text{strat}} = 0.4(74.63) + 0.4(30.0) + 0.2(81.70) = 58.19$**
* **Tire Management Score ($S_{\text{tire}}$)**:
  - Stint 1 (M): $\beta_{\text{PIA}} = 0.085\text{s/lap}$. $\beta_{\text{grid\_median}} = 0.080\text{s/lap} \rightarrow \text{Score} = 93.75$.
  - Stint 2 (H): $\beta_{\text{PIA}} = 0.048\text{s/lap}$. $\beta_{\text{grid\_median}} = 0.050\text{s/lap} \rightarrow \text{Score} = 100.0$.
  - Stint 3 (M): $\beta_{\text{PIA}} = 0.075\text{s/lap}$. $\beta_{\text{grid\_median}} = 0.080\text{s/lap} \rightarrow \text{Score} = 100.0$.
  - **$S_{\text{tire}} = \frac{93.75 + 100 + 100}{3} = 97.92$**
* **Pace Efficiency Score ($S_{\text{pace}}$)**:
  - $\text{Consistency}$: $\sigma(L_{\text{PIA}}) = 0.410\text{s} \rightarrow 1 - \frac{0.410}{1.5} = 72.67\%$ (Score = 36.33).
  - $\text{SpeedMargin}$: Teammate (Norris) optimal limit $L_{\text{optimal}} = 69.880\text{s}$. Gap = $71.100 - 69.880 = 1.22\text{s}$.
    $\text{SpeedMargin} = 1 - \frac{1.220}{2.0} = 39.00\%$ (Score = 19.50).
  - **$S_{\text{pace}} = 36.33 + 19.50 = 55.83$**
* **Pit Stop Efficiency Score ($S_{\text{pit}}$)**:
  - Stop 1: $t_{\text{stationary}} = 2.4\text{s}$ ($\text{SF} = 0.80$), $t_{\text{pit\_lane}} = 21.2\text{s}$ ($\text{LF} = 0.9808$) $\rightarrow$ Score = $89.04$.
  - Stop 2: $t_{\text{stationary}} = 2.3\text{s}$ ($\text{SF} = 0.85$), $t_{\text{pit\_lane}} = 21.1\text{s}$ ($\text{LF} = 0.9856$) $\rightarrow$ Score = $91.78$.
  - **$S_{\text{pit}} = \frac{89.04 + 91.78}{2} = 90.41$**
* **Race Execution Score ($S_{\text{exec}}$)**:
  - $P_{\text{start}} = 7$, $P_{\text{finish}} = 2$. Progression = $2(5) = 10.0$. Retention = $2(9) = 18.0$. PPF = 28.0.
  - Errors: $N_{\text{penalties}} = 0, N_{\text{warnings}} = 0, N_{\text{lockups}} = 0$.
  - $S_{\text{exec}} = \min(100, 80 - 0 + 28.0) = \mathbf{100.00}$.
* **Composite Performance Score: 80.47**

### C) Carlos Sainz (Ferrari - P3)
* **Strategy Score ($S_{\text{strat}}$)**:
  - $\text{CAR}$: Clean air laps = 58. $\text{CAR} = \frac{58}{67} \times 100 = 86.57\%$.
  - $\text{SPG}$: Stop 1 (Lap 22): P3 $\rightarrow$ P4 (-1). Stop 2 (Lap 47): P3 $\rightarrow$ P3 (0). $\text{SPG} = 50 + 10(-1) = 40.0$.
  - $\text{TSE}$: Stints = 22 laps (M), 25 laps (H), 24 laps (M).
    $\text{TSE} = 100 - \text{Mean}(\frac{|22-26|}{26}, \frac{|25-34|}{34}, \frac{|24-26|}{26}) \times 100 = 100 - 16.53 = 83.47$.
  - **$S_{\text{strat}} = 0.4(86.57) + 0.4(40.0) + 0.2(83.47) = 67.32$**
* **Tire Management Score ($S_{\text{tire}}$)**:
  - Stint 1 (M): $\beta_{\text{SAI}} = 0.078\text{s/lap}$. $\beta_{\text{grid\_median}} = 0.080\text{s/lap} \rightarrow 100.0$.
  - Stint 2 (H): $\beta_{\text{SAI}} = 0.052\text{s/lap}$. $\beta_{\text{grid\_median}} = 0.050\text{s/lap} \rightarrow 100(1 - \frac{0.002}{0.050}) = 96.0$.
  - Stint 3 (M): $\beta_{\text{SAI}} = 0.072\text{s/lap}$. $\beta_{\text{grid\_median}} = 0.080\text{s/lap} \rightarrow 100.0$.
  - **$S_{\text{tire}} = \frac{100 + 96.0 + 100}{3} = 98.67$**
* **Pace Efficiency Score ($S_{\text{pace}}$)**:
  - $\text{Consistency}$: $\sigma(L_{\text{SAI}}) = 0.380\text{s} \rightarrow 1 - \frac{0.380}{1.5} = 74.67\%$ (Score = 37.33).
  - $\text{SpeedMargin}$: Teammate (Leclerc) compromised. $L_{\text{optimal}} = 70.420\text{s}$. Gap = $71.450 - 70.420 = 1.03\text{s}$.
    $\text{SpeedMargin} = 1 - \frac{1.030}{2.0} = 48.50\%$ (Score = 24.25).
  - **$S_{\text{pace}} = 37.33 + 24.25 = 61.58$**
* **Pit Stop Efficiency Score ($S_{\text{pit}}$)**:
  - Stop 1: $t_{\text{stationary}} = 2.5\text{s}$ ($\text{SF} = 0.75$), $t_{\text{pit\_lane}} = 21.3\text{s}$ ($\text{LF} = 0.9760$) $\rightarrow$ Score = $86.30$.
  - Stop 2: $t_{\text{stationary}} = 2.4\text{s}$ ($\text{SF} = 0.80$), $t_{\text{pit\_lane}} = 21.2\text{s}$ ($\text{LF} = 0.9808$) $\rightarrow$ Score = $89.04$.
  - **$S_{\text{pit}} = \frac{86.30 + 89.04}{2} = 87.67$**
* **Race Execution Score ($S_{\text{exec}}$)**:
  - $P_{\text{start}} = 4$, $P_{\text{finish}} = 3$. Progression = $2(1) = 2.0$. Retention = $2(8) = 16.0$. PPF = 18.0.
  - Errors: $N_{\text{penalties}} = 0, N_{\text{warnings}} = 0, N_{\text{lockups}} = 0$.
  - $S_{\text{exec}} = \min(100, 80 - 0 + 18.0) = \mathbf{98.00}$.
* **Composite Performance Score: 82.65** Efficiency Score ($S_{\text{pit}}$)**:
  - Stop 1: $t_{\text{stationary}} = 2.5\text{s}$ ($\text{SF} = 0.75$), $t_{\text{pit\_lane}} = 21.3\text{s}$ ($\text{LF} = 0.9760$) $\rightarrow$ Score = $86.30$.
  - Stop 2: $t_{\text{stationary}} = 2.4\text{s}$ ($\text{SF} = 0.80$), $t_{\text{pit\_lane}} = 21.2\text{s}$ ($\text{LF} = 0.9808$) $\rightarrow$ Score = $89.04$.
  - **$S_{\text{pit}} = \frac{86.30 + 89.04}{2} = 87.67$**
* **Race Execution Score ($S_{\text{exec}}$)**:
  - $P_{\text{start}} = 4$, $P_{\text{finish}} = 3$. Progress = $+1$.
  - Errors: $N_{\text{penalties}} = 0, N_{\text{warnings}} = 0, N_{\text{lockups}} = 0$.
  - $S_{\text{exec}} = 100 + 2(+1) = 102 \rightarrow \mathbf{100.00}$ (capped).
* **Composite Performance Score: 90.54**

---

## 10. Product Redesign: FrontWing as the World's Best AI Race Engineer

> **Date**: 2026-06-28
> **Author**: Head of Product Design & UX
> **Status**: All prior UI work (Design Bible, wireframes, Landing.tsx, AppShell, ui_architecture.md) is classified as **failed experiments**. See [learning.md](file:///c:/VS-Code_C_drive/Projects/FrontWing/docs/learning.md) Section 10 for the full post-mortem. This section defines the complete product experience from zero.

### The Product Vision

FrontWing is **not** an F1 dashboard.

FrontWing is the world's best **AI Race Engineer**. Users feel like they are investigating a race with an AI engineer sitting beside them. Every interaction begins with a **question**. The AI investigates. The AI explains. Then it shows evidence. Then simulations. Then raw telemetry.

The user is never alone with raw data. The AI is always present, always narrating, always connecting insights to stories.

### Core Product Principles

1. **Question-First Architecture**: Every feature, every page, every component begins with a question a real F1 fan would ask. "Could Ferrari have won Austria?" "Why was Norris slower?" "Where did Verstappen gain time?"
2. **AI as Narrator, Not Widget**: The AI is not a chatbot in a sidebar. It is the primary interface. It explains, it reveals, it guides. Evidence (charts, simulations, telemetry) appears because the AI summoned it to support an argument.
3. **Progressive Disclosure**: Information is layered. First: the verdict. Second: the explanation. Third: the evidence. Fourth: the simulation. Fifth: the raw data. Users peel back layers at their own pace.
4. **Conversation, Not Navigation**: There is no sidebar with five page links. Users navigate by asking questions, following threads, and exploring branches. The product grows organically around the investigation.
5. **Emotional Design**: F1 is sport. FrontWing must feel the dramaâ€”the tension of a late pit stop, the anguish of a wrong strategy call, the triumph of a perfect undercut. The AI should have voice, personality, and conviction.

---

## 11. Product Experience Architecture

### The Investigation Thread Model

The core UI primitive is an **Investigation Thread**â€”a vertically scrolling conversation between the user and the AI Race Engineer, punctuated by inline evidence cards (charts, simulations, comparisons) that the AI reveals as it builds its argument.

```text
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â” 
â”‚                                                                     â”‚
â”‚  [User Question]                                                    â”‚
â”‚  "Could Ferrari have won the Austrian GP?"                          â”‚
â”‚                                                                     â”‚
â”—â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                                   │
                                   ▼
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â” 
â”‚  [AI Verdict â€” Layer 1: The Answer]                                 â”‚
â”‚  "Almost certainly yes. Sainz finished P3, 6.8 seconds behind      â”‚
â”‚   Piastri. But Ferrari's strategy cost them approximately 4.2       â”‚
â”‚   seconds through a poorly-timed first pit stop..."                 â”‚
â”—â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
                                   │
                                   ▼
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â” 
â”‚  [AI Evidence â€” Layer 2: The Explanation]                           â”‚
â”‚  "The critical moment was Lap 22. Ferrari pitted Sainz one lap     â”‚
â”‚   after the optimal window. By Lap 21, Hamilton had already        â”‚
â”‚   passed the pit exit point, meaning Sainz exited into clean air   â”‚
â”‚   on Lap 20 but hit traffic on Lap 22..."                          â”‚
â”‚                                                                     â”‚
â”‚  â”Œâ”€ Inline Evidence Card: Strategy Timeline Comparison ──────────â”  â”‚
â”‚  â”‚ [Actual vs. Optimal Pit Windows - Visual Gantt + Gap Chart]    â”‚ â”‚
â”‚  â”‚ Tap to expand full simulation                                  â”‚ â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜ â”‚
â”—â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
                                   │
                                   ▼
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â” 
â”‚  [AI Simulation â€” Layer 3: What-If]                                │
â”‚  "If Sainz pitted on Lap 20 instead of 22, he'd have exited       â”‚
â”‚   with +2.1s of clean air to Piastri. Running the simulation..."   â”‚
â”‚                                                                     â”‚
â”‚  â”Œâ”€ Inline Simulation Card: What-If Result ──────────────────────â”  â”‚
â”‚  â”‚ Simulated Finish: P2 (+1 position gained)                      â”‚ â”‚
â”‚  â”‚ Net Time Gain: +1.400s                                         â”‚ â”‚
â”‚  â”‚ [Expand to see lap-by-lap projections]                         â”‚ â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜ â”‚
â”—â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
                                   │
                                   ▼
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â” 
â”‚  [AI Raw Evidence â€” Layer 4: Telemetry]                            â”‚
â”‚  "For the deeper detail: here's Sainz's sector-by-sector pace     â”‚
â”‚   on his out-lap compared to Piastri's. Notice the 0.4s loss      â”‚
â”‚   in Sector 2 from dirty air behind Albon..."                      â”‚
â”‚                                                                     â”‚
â”‚  â”Œâ”€ Inline Telemetry Card: Speed Trace Overlay ──────────────────â”  â”‚
â”‚  â”‚ [Canvas: SAI vs PIA lap overlay, distance-aligned]             â”‚ â”‚
â”‚  â”‚ Hover for corner-by-corner breakdown                           â”‚ â”‚
â”‚  â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜ â”‚
â”—â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
```

### Information Layers (Progressive Disclosure)

Every AI response follows this layering:

| Layer | What | Format | When Visible |
| :--- | :--- | :--- | :--- |
| **1. Verdict** | The direct answer in plain language | Text paragraph | Always (immediately) |
| **2. Explanation** | Why the verdict is true, with key metrics cited inline | Text with highlighted data callouts | Always (follows verdict) |
| **3. Evidence** | Supporting visual proof (charts, timelines, comparisons) | Inline expandable cards | Collapsed by default; one-tap expand |
| **4. Simulation** | What-if projections, Monte Carlo distributions | Interactive inline cards | Collapsed; expand reveals slider controls |
| **5. Raw Data** | Full telemetry traces, lap-by-lap tables, wear regressions | Canvas/table views | Hidden; "Show raw data" link at bottom |

---

## 12. Complete Page Definitions

All 5 core views conform to the visual style guidelines and interaction principles defined in [design_system.md](file:///c:/VS-Code_C_drive/Projects/FrontWing/docs/design_system.md).

### PAGE 1: The Briefing Room (Home / Entry Point)
- **Why the user opens it**: Curious about race dynamics, strategy calls, or driver performance debates.
- **What they first see**: A single, prominent question: *"Could Ferrari have won the Austrian Grand Prix?"* and a query bar.
- **Their first 5 seconds**: Realize this is a tool for active investigation. See trending loops and recent queries.
- **The AI workflow**: Maps queries to fast deterministic scoring, strategy simulations, and telemetry overlays.
- **Progressive disclosure**: Starts with a large query box, transitions to a live streaming narrative, then reveals collapsed cards.
- **Beginner experience**: Conversations avoid engineering abbreviations; hovering shows plain English tooltips.
- **Intermediate experience**: Interactive strategy sliders to manipulate variables.
- **Advanced experience**: Monospace delta margins, Monte Carlo toggles, CSV data exports.
- **Emotional moments**: AI reveals unexpected design floor cracks or strategy bottlenecks that were invisible on live TV.
- **Delight moments**: Cards slide in as if laid on a desk; team-colored tags pulse during mentions.
- **Empty states**: Looping racetrack outline with query suggestions.
- **Loading states**: Streaming block cursor, skeleton progress lines.
- **Error states**: Clean fallback to lap sheets with error code callouts if telemetry collector drops.
- **Sharing opportunities**: Export formatted verdict quotes and thread URLs.

### PAGE 2: The Investigation Thread (The Core Experience)
- **Why the user opens it**: Seeking answers to a specific tactical question.
- **What they first see**: The prompt followed by a streaming AI narrative.
- **Their first 5 seconds**: Follow the word-by-word explanation, watching inline cards appear.
- **The AI workflow**: State stategraph parses intents, queries FastF1, processes mathematical models, and generates verdicts.
- **Progressive disclosure**: Text stream -> Collapsed card -> Interactive slider panel -> Deep-dive data table.
- **Beginner experience**: Direct summaries; tooltips for tyre degradation slopes and clean air ratios.
- **Intermediate experience**: Expand and hover over canvas speed traces.
- **Advanced experience**: Distance alignment comparison sheets.
- **Emotional moments**: The AI shifts narrative direction dynamically based on tire regression results.
- **Delight moments**: Auto-aligning speed indicators trace corner entries.
- **Empty states**: Skeletal framework while calculating physics.
- **Loading states**: Monospace shimmering symbols `░░ ░░░ ░░`.
- **Error states**: Explicit notification of missing telemetry nodes with partial analysis.
- **Sharing opportunities**: Direct link sharing, X/Reddit formatted debate cards.

### PAGE 3: The Race Briefing (Race-Level Overview)
- **Why the user opens it**: Get the ultimate debrief of a completed GP weekend.
- **What they first see**: Circuit parameters and the AI Race Narrative block.
- **Their first 5 seconds**: Read the overall story arc (decisive moments, strategy shifts).
- **The AI workflow**: Aggregates grid scores, identifies critical stint phases, and flags anomalies.
- **Progressive disclosure**: Summary debrief -> AI score index -> Interactive session phases.
- **Beginner experience**: High-level story; simple color-coded performance bars.
- **Intermediate experience**: Tap bars to open 5-axis radial radars.
- **Advanced experience**: Track temperature timelines and pitstop Lane Factor charts.
- **Emotional moments**: Highly rated drivers finishing low due to unpenalized traffic delays.
- **Delight moments**: Micro-icons for safety cars and tyre replacements.
- **Empty states**: "GP is currently live" countdown timer.
- **Loading states**: Grid score bars fill from left to right.
- **Error states**: Missing wear indexes default to 4-factor radar plots.
- **Sharing opportunities**: Grid score comparison banners.

### PAGE 4: The Strategy Playground (Interactive What-If)
- **Why the user opens it**: Validate an alternative tyre stint plan or pitstop window.
- **What they first see**: Target driver state, compound configs, and the interactive slider.
- **Their first 5 seconds**: Drag the slider, watching exit margins update.
- **The AI workflow**: Calls V2 simulation engine on slider release to update dirty air state vector.
- **Progressive disclosure**: Slider interface -> Projected re-entry lane map -> Lap-by-lap timing sheet.
- **Beginner experience**: Interactive boundaries labeled "Early Window" / "Optimal" / "Late".
- **Intermediate experience**: Detailed traffic map displaying rival car spacing.
- **Advanced experience**: Multi-agent stochastic projections showing finishing distributions.
- **Emotional moments**: Uncovering double-stack pitstop traps that ruin both cars.
- **Delight moments**: Car nodes glide on track map dynamically.
- **Empty states**: Prompt to move slider.
- **Loading states**: Stints segments shimmer while calculating.
- **Error states**: Single-driver fallback mode with delta indicators.
- **Sharing opportunities**: Custom what-if results cards.

### PAGE 5: The Ghost Battle (Driver vs. Driver Telemetry)
- **Why the user opens it**: Compare corner-by-corner speed traces between two drivers.
- **What they first see**: Narration log detailing apex differences.
- **Their first 5 seconds**: Review turn-by-turn brakings, watching trace highlights.
- **The AI workflow**: Aligns coordinates by distance bins, computes delta profiles, and generates logs.
- **Progressive disclosure**: Corner log -> Synchronized speed traces -> Multi-graph telemetry panels.
- **Beginner experience**: plain text comparisons (braked later, carried more speed).
- **Intermediate experience**: Crosshair cursors tracking distance meters.
- **Advanced experience**: Separate Throttle, Brake (bar), and Gear overlays.
- **Emotional moments**: Spotting micro throttle adjustments that reveal aerodynamic balance differences.
- **Delight moments**: Speed trace line draws itself matching the narration stream.
- **Empty states**: Lap selector grid.
- **Loading states**: Progress lines across traces.
- **Error states**: Solo driver trace overlay if telemetry is missing.
- **Sharing opportunities**: High-contrast printable Ghost Battle Cards.

---

## 13. Design Language for the Redesign

> **Important**: The complete design language, visual specifications, spacing, typography, component behaviors, loading states, and telemetry rules are documented in the centralized [design_system.md](file:///c:/VS-Code_C_drive/Projects/FrontWing/docs/design_system.md). This file acts as the single source of truth for every future UI. The complete component architecture, inputs/outputs, states, interactions, and accessibility specifications are defined in [component_library.md](file:///c:/VS-Code_C_drive/Projects/FrontWing/docs/component_library.md). The redesign changes the **component vocabulary**, the **information architecture**, and the **interaction model** to align with the new question-first AI Race Engineer paradigm.

### New Component Vocabulary

| Old Component | New Component | Why |
| :--- | :--- | :--- |
| `AppShell` (sidebar + content) | `InvestigationCanvas` (full-screen thread) | Navigation is conversation, not sidebar links |
| `TimingGrid` (tabular data) | `EvidenceCard` (contextual inline proof) | Data appears when the AI references it, not in a grid |
| `DataBadge` (isolated metric) | `InlineCallout` (AI-highlighted metric within text) | Metrics are part of sentences, not standalone widgets |
| `ConsoleInput` (terminal aesthetic) | `QuestionBar` (natural language input) | Users ask questions, not type commands |
| `Header` (static navigation) | `BriefingHeader` (contextual race/investigation header) | Header changes based on what you're investigating |
| N/A | `VerdictBlock` (AI answer with confidence) | The AI's primary output unit |
| N/A | `FollowUpSuggestion` (contextual next question) | AI-generated investigation branches |
| N/A | `NarrativeStream` (progressive text rendering) | Word-by-word AI response rendering |
| N/A | `StrategySlider` (interactive what-if control) | Direct manipulation of simulation parameters |
| N/A | `GhostBattleNarration` (corner-by-corner AI text) | The AI's telemetry storytelling format |

### New Information Architecture

```text
â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â” 
â”‚                        FrontWing                                    â”‚
â”‚                                                                     â”‚
â”‚  Briefing Room (Home)                                               â”‚
â”‚  â”œâ”€â”€ Featured Investigation (pre-loaded)                            â”‚
â”‚  â”œâ”€â”€ Recent Investigations                                          â”‚
â”‚  â”œâ”€â”€ Trending Topics                                                â”‚
â”‚  â” â”€â”€ Ask Your Own Question                                          â”‚
â”‚                                                                     â”‚
â”‚  Investigation Thread (Core Experience)                             â”‚
â”‚  â”œâ”€â”€ AI Verdict (Layer 1)                                           â”‚
â”‚  â”œâ”€â”€ AI Explanation (Layer 2)                                       â”‚
â”‚  â”œâ”€â”€ Evidence Cards (Layer 3, expandable)                           â”‚
â”‚  â”‚   â”œâ”€â”€ Strategy Timeline Comparison                               â”‚
â”‚  â”│   â”œâ”€â”€ Performance Radar                                          â”‚
â”‚  â”│   â”œâ”€â”€ Telemetry Overlay                                          â”‚
â”‚  â”│   â”˜â”€â”€ Simulation Result                                          â”‚
â”‚  â”œâ”€â”€ Simulation Playground (Layer 4, expandable)                    â”‚
â”‚  â”œâ”€â”€ Raw Data (Layer 5, hidden by default)                          â”‚
â”‚  â”˜â”€â”€ Follow-Up Questions                                            â”‚
â”‚                                                                     â”‚
â”‚  Race Briefing (Race Overview)                                      â”‚
â”‚  â”œâ”€â”€ AI Race Narrative                                              â”‚
â”‚  â”œâ”€â”€ Key Investigation Questions                                    â”‚
â”‚  â”œâ”€â”€ Performance Rankings (AI-Scored)                               â”‚
â”‚  â”˜â”€â”€ Race Timeline (tappable phases)                                â”‚
â”‚                                                                     â”‚
â”‚  Strategy Playground (What-If)                                      â”‚
â”‚  â”œâ”€â”€ AI Context + Slider                                            â”‚
â”‚  â”œâ”€â”€ AI Narrated Result                                             â”‚
â”‚  â”œâ”€â”€ Stint Timeline + Exit Traffic Map                              â”‚
â”‚  â”˜â”€â”€ Follow-Up Scenarios                                            â”‚
â”‚                                                                     â”‚
â”‚  Ghost Battle (Driver Comparison)                                   â”‚
â”‚  â”œâ”€â”€ AI Corner-by-Corner Narration                                  â”‚
â”‚  â”œâ”€â”€ Speed Trace Overlay (synced to narration)                      â”‚
â”‚  â”œâ”€â”€ Micro-Delta Summary                                            â”‚
â”‚  â”˜â”€â”€ Ghost Battle Card (export)                                     â”‚
â”‚                                                                     â”
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

### Navigation Model

There is **no persistent sidebar**. Navigation flows through:
1. **Questions**: User types or taps a question â†’ investigation thread opens.
2. **Inline links**: AI references another driver, race, or scenario â†’ tappable link opens a new investigation or branches the current one.
3. **Follow-up suggestions**: At the end of every AI response â†’ 3 contextual next steps.
4. **Breadcrumb trail**: A minimal breadcrumb at the top shows: `Home â†’ Austrian GP â†’ Sainz Strategy â†’ What-If Lap 20`. Tapping any segment returns to that context.
5. **Global search**: Always available via `Cmd/Ctrl+K` shortcut or the question bar at the top.

### Interaction Principles

1. **The AI talks first, then shows**: Text narration always precedes visual evidence. Charts never appear without context.
2. **Cards expand, not navigate**: Evidence appears inline in the thread. Users don't leave the page to see a chart.
3. **Every interaction is reversible**: The breadcrumb trail and thread history let users backtrack freely.
4. **The product remembers context**: Follow-up questions carry the full investigation context. The AI knows what it already told you.
5. **Three taps to raw data**: Verdict â†’ Evidence Card â†’ Expand â†’ Raw Data. Never more than 3 interactions deep.

---

## 14. Retention & Engagement Design

### Why Users Return Every Race Weekend

| Timing | Hook | User Motivation |
| :--- | :--- | :--- |
| **Friday (Practice)** | AI generates pace predictions from FP data | "Who's actually fast this weekend?" |
| **Saturday (Qualifying)** | Lap-by-lap qualifying analysis | "Where did Leclerc lose pole?" |
| **Sunday (Race)** | Live investigation during the race | "Did Ferrari just throw the race?" |
| **Monday (Post-Race)** | Full race briefing + trending investigations | "Prove to Reddit that Sainz was robbed" |
| **Mid-Week** | Shared investigation links circulating on social | "Look at this FrontWing analysis" |

### The Debate Loop (Core Retention Mechanism)

1. **Race happens** â†’ User has a strong opinion.
2. **User opens FrontWing** â†’ Asks their question.
3. **AI provides a backed verdict** â†’ Confirms or challenges the opinion.
4. **User shares the verdict** â†’ Exports a Ghost Battle Card or investigation link.
5. **Friend/follower clicks the link** â†’ Becomes a new user.
6. **New user asks their own question** â†’ Cycle repeats.

### Shareability Architecture

| Shareable Unit | Format | Target Platform |
| :--- | :--- | :--- |
| AI Verdict Quote | Formatted text with citation link | Reddit, X, Discord |
| Ghost Battle Card | Image (speed trace + headline finding) | X, Instagram, Reddit |
| Investigation Thread | URL (full interactive thread) | Any platform |
| Performance Ranking | Image (composite score bar chart) | Reddit, X |
| What-If Result | Image (scenario card with key metric) | X, Discord |

---

## 15. Project Progress Tracker

### Completed Tasks
- [x] Create project foundation folder layout.
- [x] Configure backend package structures and compiler properties (`tsconfig`).
- [x] Setup frontend workspace configuration including Tailwind details.
- [x] Establish master SQL schema containing relational models (RAG-free).
- [x] Initialize documentation journals (`learning.md` and `project_context.md`).
- [x] Document detailed evaluations of F1, OpenF1, and Ergast APIs.
- [x] Define V1 user personas, problem statements, and feature outlines.
- [x] Structure the multi-agent design patterns and live timing data flow layouts.
- [x] Create sequential migrations runner and static testing seeds.
- [x] Set up backend Express PostgreSQL pool and Redis client connection utilities.
- [x] Construct Python API collectors for Ergast statistics, OpenF1 live feeds, and FastF1 downsampling.
- [x] Design async scheduling loop for static daily updates and live interval polling.
- [x] Refactor database tables to remove pgvector and the document vector chunks.
- [x] Formulate mathematical models for the Intelligence Scoring and Strategy Simulation Engines.
- [x] Create PostgreSQL database migrations tracking scoring, simulations, and insights tables.
- [x] Refine scoring engine equations to ensure deterministic, reproducible variables.
- [x] Calculate worked 2024 Austrian GP examples for Red Bull, McLaren, and Ferrari.
- [x] Design FrontWing's first unique feature: "Telemetry-Driven Ghost Battle Dialogue".
- [x] Formulate FrontWing landing page flows, retention loops, and feature hierarchy.
- [x] Establish the 7-day MVP feature survival roadmap.
- [x] Create modular Python scoring engine files (strategy, tire, pace, pitstop, execution, aggregator).
- [x] Refine scoring engine mathematical formulas to eliminate compression and front-runner bias, and isolate strategy gains.
- [x] Configure unit tests validation suite against mock 2024 Austrian GP data and resolve assertions.
- [x] Prepare repository for version control: configure gitignore, README, CONTRIBUTING, and RELEASE_NOTES.
- [x] Configure Python environment and initialize FastAPI server routes.
- [x] Implement FrontWing Strategy Simulation Engine V1 and associated unit tests.
- [x] Design FrontWing complete visual language and UI/UX Design Bible (V1 â€” now deprecated).
- [x] Define colors, typography, spacing, border, and shadow systems.
- [x] Create detailed markdown wireframes for Landing, Driver, Team, Simulation, and Ghost Battle pages (V1 â€” now deprecated).
- [x] Build and compile Frontend V1 baseline and interactive Landing Page (V1 â€” classified as failed experiment).
- [x] **Conduct full product design post-mortem and document all UI failures in `learning.md`.**
- [x] **Redesign FrontWing from zero as an AI Race Engineer with question-first architecture.**
- [x] **Define complete product experience for all 5 pages with progressive disclosure, beginner/intermediate/advanced flows, emotional moments, empty/loading/error states, and sharing opportunities.**
- [x] **Create unified, single source of truth UI/UX Design System in `docs/design_system.md`.**
- [x] **Create complete component architecture specification in `docs/component_library.md` (28 components x 15 dimensions).**
- [x] **Transform AI Race Engineer into Agentic AI with structured planning, memory resolution, reflection looping, evaluation judges, parallel executions, and developer intelligence traces (Sprint 2).**
- [x] **Upgrade AI Race Engineer into F1 AI Investigation Platform featuring modular engineer personas, RAG placeholders, structured reports, and V2 observability tracing (Sprint 3).**



### Pending Tasks
- [ ] Execute Express server setup and connect WebSocket handlers.
- [ ] Integrate FastF1 plotting visualizer services.
- [x] Build core multi-agent state machines in LangGraph using Gemini 2.5 Flash.
- [x] **Implement the Briefing Room (Home) page with featured investigation and question input.**
- [x] **Implement the Investigation Thread with AI streaming, inline evidence cards, and progressive disclosure.**
- [x] **Implement the Race Briefing page with AI narrative, rankings, and race timeline.**
- [x] **Implement the Strategy Playground with AI-narrated simulation and interactive slider.**
- [x] **Implement the Ghost Battle page with AI corner-by-corner narration synced to telemetry overlay.**
- [x] **Build the sharing/export system for Ghost Battle Cards, verdicts, and investigation links.**

---

## 16. Known Issues
- `docs/component_library.md` defines the full component API surface. Frontend implementation must conform to this specification exactly.
- Frontend V1 code (`Landing.tsx`, `Shell.tsx`, `Header.tsx`, `TimingGrid.tsx`, `DataBadge.tsx`, `ConsoleInput.tsx`) remains in the repository but is classified as deprecated. It must not be referenced in the redesign.
- `docs/ui_architecture.md` documents the old Jotai atom/widget architecture. This file remains for reference but the new investigation-thread architecture supersedes it entirely.

---
