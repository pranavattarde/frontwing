<<<<<<< HEAD
# FrontWing 🏎️

FrontWing is a production-grade, AI-powered Formula 1 intelligence platform. It processes real-time timing data, historical statistics, and high-density vehicle telemetry to deliver corner-by-corner analysis, predictive "What-If" pit stop simulations, and conversational telemetry diagnostics.

---

## 1. Project Vision

FrontWing democratizes advanced Formula 1 race engineering. By translating raw telemetry streams (speed traces, throttle overlays, brake points) into clear, human-like dialogue, and offering deterministic scoring matrices based on vehicle potential, FrontWing allows F1 enthusiasts to back up their debates with hard quantitative evidence.

---

## 2. Platform Architecture

FrontWing utilizes a decoupled dual-runtime architecture to balance high-concurrency client connections (Node.js) with intensive scientific and machine learning analysis (Python):

```text
┌─────────────────┐       HTTP / WS       ┌─────────────────────┐
│  React Frontend │ <───────────────────> │ Node.js API Gateway │
│  (Tailwind CSS) │                       │  (Express/WS Pool)  │
└─────────────────┘                       └──────────┬──────────┘
                                                     │
                                            Redis    │ HTTP / RPC
                                           Pub/Sub   │
                                                     ▼
┌─────────────────┐                       ┌─────────────────────┐
│                 │ <───────────────────> │ AI Python Service   │
│   PostgreSQL    │                       │  (FastAPI / Pandas) │
│                 │                       │  Gemini 2.5 Flash   │
└─────────────────┘                       └─────────────────────┘
```

- **Frontend**: React (TypeScript) dashboard styled with vanilla CSS/Tailwind and premium dark mode overlays.
- **API Gateway (Node.js)**: Manages client sessions, WebSockets connections, and proxies telemetry payloads.
- **AI Microservice (Python)**: Executes telemetry downsampling, linear tire wear regressions, and LangGraph-orchestrated Gemini agents.
- **Cache & Broker (Redis)**: Buffers real-time telemetry inputs and handles broker communications.
- **Primary Database**: PostgreSQL storing structured Grand Prix timings, stints, weather, and score records.

---

## 3. Core Features

### 📊 Deterministic F1 Scoring Engine
Computes 5 core metrics for every driver post-race:
1. **Strategy Score ($S_{\text{strat}}$)**: Evaluates clean air ratios, stint length efficiency, and undercut/overcut success (subtracting on-track overtakes).
2. **Tire Management Score ($S_{\text{tire}}$)**: Computes fuel-corrected degradation linear regression slopes against grid medians.
3. **Pace Efficiency Score ($S_{\text{pace}}$)**: Measures consistency and speed margin relative to teammate/machine limits.
4. **Pit Stop Efficiency Score ($S_{\text{pit}}$)**: Isolates crew stationary tire changes from driver pit lane transits.
5. **Race Execution Score ($S_{\text{exec}}$)**: Penalizes penalties, warnings, and lockups while rewarding progression and pole/top-10 retention.

### 👻 Telemetry-Driven Ghost Battle Dialogue
Select any two drivers and a lap to get a turn-by-turn narrative comparison of where time was gained or lost:
> *"At Turn 3, Verstappen braked 12 meters later carrying 8 km/h more apex speed. However, Piastri achieved 100% throttle exit 0.4 seconds earlier, resolving the gap on the straight."*

### 🔮 "What-If" Pit Stop Strategy Simulator
Simulate strategy deviations in real-time (e.g., *"What if Ferrari pitted Leclerc on lap 22?"*). Models tire wear resets, pit lane loss, and track-position traffic constraints.

---

## 4. Tech Stack

- **Frontend**: React, TypeScript, TailwindCSS, Lucide Icons, Recharts
- **Backend API Gateway**: Node.js, Express, `pg-pool`, Redis client
- **AI Service**: Python 3.11, FastAPI, FastF1, NumPy, Pandas, `google-genai`
- **Infrastructure**: PostgreSQL, Redis, Docker

---

## 5. Setup Instructions

### Backend (Node.js)
1. Navigate to `/backend` and install dependencies:
   ```bash
   npm install
   ```
2. Configure `.env`:
   ```env
   PORT=5000
   DATABASE_URL=postgresql://user:pass@localhost:5432/frontwing
   REDIS_URL=redis://localhost:6379
   ```
3. Start development server:
   ```bash
   npm run dev
   ```

### AI Service (Python)
1. Navigate to `/ai_services` and configure virtual environment:
   ```bash
   python -m venv venv
   .\venv\Scripts\activate
   pip install -r requirements.txt
   ```
2. Configure `.env` in `/ai_services`:
   ```env
   GEMINI_API_KEY=your_gemini_api_key
   REDIS_URL=redis://localhost:6379
   DATABASE_URL=postgresql://user:pass@localhost:5432/frontwing
   ```
3. Start FastAPI server:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```

### Frontend (React)
1. Navigate to `/frontend` and install packages:
   ```bash
   npm install
   ```
2. Start React app:
   ```bash
   npm run dev
   ```

---

## 6. Screenshots Placeholder

*Visual dashboard layout designs and speed-trace ghost comparison cards will be displayed here.*

![Dashboard Screenshot Placeholder](https://via.placeholder.com/800x450.png?text=FrontWing+Dashboard+Preview)

---

## 7. Product Roadmap

- **Milestone 1**: Deterministic scoring modules & WorkedGP calculations validation (Completed).
- **Milestone 2**: Express Server & WebSockets gateway implementation.
- **Milestone 3**: Gemini 2.5 Flash Ghost Battle telemetry narration logic.
- **Milestone 4**: Interactive strategy "What-If" simulator interface.
- **Milestone 5**: Production deployment & Live session streaming.
=======
>>>>>>> 95d245af243d7d5e946299f0cf2b41f8a10a9527
