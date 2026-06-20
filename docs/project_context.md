# FrontWing Project Context

FrontWing is a production-grade, AI-powered Formula 1 intelligence platform. It processes real-time telemetry, historical statistics, and race configurations to deliver interactive telemetry charts, driver comparisons, and AI chat diagnostics.

---

## 1. System Architecture

The platform uses a decoupled microservices design to balance performance (Node.js I/O and WebSockets) with data analysis/AI capabilities (Python and scientific libraries). V1 operates completely without RAG and vector databases, eliminating vector index overheads.

```text
┌─────────────────┐       HTTP / WS       ┌─────────────────────┐
│  React Frontend │ <───────────────────> │ Node.js API Gateway │
└─────────────────┘                       └──────────┬──────────┘
                                                     │
                                            Redis    │ HTTP / RPC
                                           Pub/Sub   │
                                                     ▼
┌─────────────────┐                       ┌─────────────────────┐
│                 │ <───────────────────> │ AI Python Service   │
│   PostgreSQL    │                       │  (LangGraph/FastF1) │
│                 │                       │  Gemini 2.5 Flash   │
└─────────────────┘                       └─────────────────────┘
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
├── ai_services/                # Python LangGraph/FastF1 microservice
│   ├── app/
│   │   ├── agents/             # LangGraph state machines & routers
│   │   ├── tools/              # Custom F1 tools (FastF1 analytics, scoring)
│   │   ├── core/               # Configuration, logging, DB setups
│   │   └── main.py             # FastAPI Entrypoint
│   ├── requirements.txt
│   └── README.md
├── backend/                    # Node.js + Express API Gateway
│   ├── src/
│   │   ├── config/             # PG, Redis, OpenF1 client configs
│   │   ├── controllers/        # Express handlers (auth, telemetry, chat)
│   │   ├── middleware/         # Auth, rate limiting, error catching
│   │   ├── routes/             # REST endpoints (V1)
│   │   ├── services/           # Live feeds, WS managers, DB layer
│   │   └── index.ts            # Express Entrypoint
│   ├── package.json
│   └── tsconfig.json
├── database/                   # Database schemas & migrations
│   ├── migrations/             # PostgreSQL DDL scripts
│   │   ├── 01_init_schema.sql  # Core schemas
│   │   └── 02_intelligence_tables.sql # Scoring, sim, and insights tables
│   ├── seeds/                  # Baseline F1 seed data (teams, circuits)
│   └── schema.sql              # Master database schema layout
├── docs/                       # Project Documentation
│   ├── learning.md             # Active learning log & system design insights
│   └── project_context.md      # Persistent project memory (APIs, schemas)
└── frontend/                   # React + TypeScript SPA dashboard
    ├── src/
    │   ├── components/         # Shared & ShadCN UI components
    │   ├── hooks/              # Custom React hooks (WS sub, telemetry)
    │   ├── pages/              # Main routes (Dashboard, Telemetry, AI Chat)
    │   ├── services/           # API services & WebSockets
    │   └── App.tsx             # React Entrypoint
    ├── tailwind.config.js
    ├── package.json
    └── tsconfig.json
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

## 10. Product Retention & Strategic Design

### A) Why Users Return Every Race Weekend
Formula 1 matches occur on fixed 3-day weekend cycles. FrontWing establishes active hooks for each phase:
- **Live-Race Companion**: During the session, fans query the "What-If" simulator in real-time (*"Did Ferrari just throw away the win by staying out?"*) to get instant coordinate-based traffic projections.
- **Post-Race Debates (The Verification Hook)**: Immediately after the chequered flag, fans argue on social channels (Reddit, Twitter/X) about driver performance. FrontWing provides immediate, deterministic **Intelligence Scorecards** and **Ghost Battle Dialogues** that act as quantitative backup evidence for their debates.

### B) Core Product Value Anchors
1. **Most Valuable Feature**: **"What-If" Pit Stop Simulation Engine**. It democratizes race strategy. Fans no longer accept commentator speculations; they run their own deterministic simulations showing exact exit coordinates and traffic bottleneck impacts.
2. **Most Addictive Feature**: **Driver Performance Scorecards**. Because the scores are derived strictly from raw telemetry (linear wear rates, brake lockup indicators, clean air ratios) rather than subjective human grading, fans trust them as absolute metrics to rank driver efficiency.
3. **Most Shareable Feature**: **Ghost Battle Cards**. A high-contrast comparative speed-trace infographic detailing exactly which corner, braking point, and apex speed separated two drivers, designed to be exported and posted to social platforms.
4. **The Irreplaceable Moat**: **Telemetry-Driven Ghost Battle Dialogue**. F1 TV offers video, FastF1 offers scripts, and Reddit offers opinions. FrontWing is the only platform where a fan can talk to an AI that is actively reading, aligning, and explaining F1 micro-telemetry deltas.

### C) Landing Page User Flow
- **The First Sight (The Visual Hook)**: A premium dark mode landing dashboard with neon trace indicators. A side-by-side active "Ghost Speed Trace Overlay" comparison card displays two driver lines crossing.
- **The First Action**: A large search query bar in the center of the hero section:
  > **"Pick two drivers or ask about a strategy..."** (with suggestions like *"Simulate Leclerc pitting on Lap 20 at Spa"* or *"Compare Verstappen vs. Hamilton's sector 2 timings"*).
- **The Conversion Hook**: Upon typing a query, a dynamic telemetry console rolls open, loading the downsampled telemetry file and printing the AI engineer's corner-by-corner braking breakdown within 2 seconds.

---

## 11. Feature Hierarchy & 7-Day MVP Scope

```text
┌─────────────────────────────────────────────────────────────┐
│                       CORE FEATURE                          │
│  - Telemetry-Driven Ghost Battle Dialogue (AI narration)    │
│  - Intelligence Scoring Engine (5 Deterministic Scores)      │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                    SUPPORTING FEATURE                       │
│  - Telemetry Graph Visualizer (Speed, Throttle, Brake)      │
│  - "What-If" Pit Stop Strategy Simulator                    │
│  - Stint and Tire Wear Regression Tables                    │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                    NICE-TO-HAVE FEATURE                     │
│  - Live Coordinate SVG Map Track                            │
│  - Weather Snapshot Tracker                                 │
│  - Team Radio Transcript Tagging                            │
└─────────────────────────────────────────────────────────────┘
```

### 7-Day MVP Survival Scope
If constrained to a 7-day timeline, the product will be stripped to its absolute, highest-value coordinates to ensure successful delivery:
1. **FastF1 Data core & Downsampler**: We must be able to load historical timing logs and compress coordinates.
2. **Gemini 2.5 Flash Ghost Battle Dialogue**: The core conversational comparative engineer.
3. **Intelligence Scorecards**: The 5-metric scorecards providing immediate value for post-race debates.
- *Dropped for V1 MVP*: The "What-If" strategy simulation engine (deferred to V2), live 2D track coordinates maps, weather logs, and team radio metadata indices.

---

## 12. Project Progress Tracker

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

### Pending Tasks
- [ ] Execute Express server setup and connect WebSocket handlers.
- [ ] Configure Python environment and initialize FastAPI server routes.
- [ ] Integrate FastF1 plotting visualizer services.
- [ ] Build core multi-agent state machines in LangGraph using Gemini 2.5 Flash.
- [ ] Develop dashboard UI components using React, Tailwind, and ShadCN.

---

## 13. Known Issues
- *None recorded currently since core test suites are fully green.*
