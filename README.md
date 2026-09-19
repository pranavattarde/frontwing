# FrontWing 🏎️

> **Production-Grade Formula 1 Strategy & Telemetry Intelligence Platform**  
> Democratizing F1 race engineering through quantitative telemetry analysis, deterministic performance scoring, counterfactual "What-If" pit stop simulations, and interactive 3D ghost car battles.

---

## 1. Platform Overview

FrontWing bridges the gap between raw, complex Formula 1 telemetry streams and accessible, engineering-grade race analysis. By coupling high-frequency vehicle telemetry (speed traces, throttle maps, gear selections, braking points, and tire degradation curves) with an intelligent LangGraph orchestration pipeline, FrontWing allows users to interrogate race strategies and explore counterfactual outcomes backed by hard empirical data.

### Key Capabilities
- **Race Engineer Copilot**: Conversational multi-turn investigations powered by an adaptive LangGraph agent with deterministic tool execution, multi-domain correlation, and self-correcting reflection/judge nodes.
- **Strategy & "What-If" Simulator**: Counterfactual race strategy simulation computing undercut/overcut deltas, traffic loss, tire degradation regressions, and simulated finishing positions.
- **3D Ghost Battle Arena**: Interactive Three.js/WebGL spatial telemetry visualizer rendering two drivers' telemetry traces side-by-side in real-time 3D space.
- **Deterministic 5-Factor Driver Scoring**: Objective mathematical rubric grading Strategy, Tire Management, Pace Efficiency, Pit Stop Execution, and Race Craft.
- **Full Multi-Turn Thread History**: Persistent PostgreSQL conversation threads supporting branched investigations, session grouping, and thread bookmarking.

---

## 2. System Architecture

FrontWing uses a decoupled multi-tier architecture balancing high-throughput API gateway routing (Node.js/Express), high-performance scientific/ML analysis (Python/FastAPI), and a hardware-accelerated 3D user experience (React/Three.js):

```text
┌────────────────────────────────────────────────────────┐
│             Client Layer (React 18 + Vite)             │
│   Jotai State • Three.js / R3F Canvas • Tailwind CSS   │
└───────────────────────────┬────────────────────────────┘
                            │ HTTP / WebSocket (via Nginx Reverse Proxy)
                            ▼
┌────────────────────────────────────────────────────────┐
│          API Gateway Layer (Node.js / Express)         │
│  JWT Authentication • Rate Limiting • Thread Tracking  │
└─────────────┬────────────────────────────┬─────────────┘
              │                            │
      Internal HTTP                        │ SQL Queries
              ▼                            ▼
┌───────────────────────────┐   ┌────────────────────────┐
│ AI Services (FastAPI)     │   │ Primary Storage        │
│ • LangGraph State Graph   │   │ • PostgreSQL 17        │
│ • FastF1 Telemetry Engine │   │   (Timings & Threads)  │
│ • Gemini 2.5 / Groq Llama │   │ • Redis 7              │
│ • LangSmith Observability │   │   (Telemetry Caching)  │
└───────────────────────────┘   └────────────────────────┘
```

- **Frontend (`/frontend`)**: React 18 SPA built with Vite, Tailwind CSS, Framer Motion, and Three.js (`@react-three/fiber` & `@react-three/drei`) for 3D track and telemetry rendering.
- **API Gateway (`/backend`)**: Node.js/Express service managing JWT authentication, input validation, rate limiting, and PostgreSQL session/history persistence.
- **AI Microservice (`/ai_services`)**: Python 3.12 FastAPI service executing telemetry downsampling, linear tire wear regressions, FastF1 telemetry retrieval, and LangGraph agent pipelines.
- **Caching & Brokers**: Redis 7 buffering raw telemetry, LLM responses, and real-time session state.
- **Database**: PostgreSQL 17 storing users, investigation threads, conversations, race results, and driver scorecards.

---

## 3. Core Features

### 🧠 Adaptive LangGraph Race Engineer
The Race Engineer agent dynamically analyzes user queries to extract race session context, driver identifiers, and analytical intent:
- **Zero Hallucination Grounding**: All telemetry comparisons, race classifications, and lap times are strictly resolved against verified FastF1/OpenF1 datasets. If data is unavailable, the model explicitly declares the omission.
- **Reflection & Judge Nodes**: Independent verification nodes evaluate model claims against underlying tool outputs, revising or rejecting ungrounded assumptions.
- **Multi-Turn Context Resolution**: Remembers prior context across turns (e.g., asking *"Why did he finish P2?"* followed by *"What if he pitted 5 laps earlier?"* preserves driver and GP context).

### 🔮 Counterfactual Strategy Simulator
Simulate race deviations and pit stop decisions in real-time:
- **Tire Wear Modeling**: Stint-bounded fuel-corrected degradation regressions calculated across compound lifespans.
- **Pit Lane Loss Matrix**: Circuit-specific pit lane delta calculation factoring in in-lap and out-lap time losses.
- **Traffic & Position Estimation**: Models gap deltas, track-position re-entry, and traffic bottlenecks upon rejoining.

### 🏎️ 3D Ghost Battle Telemetry
- Spatial telemetry interpolation generating 3D trajectories with speed, gear, throttle, and braking overlays.
- Dynamic driver selection with official team hex palettes, interactive camera controls, and delta-scrubbing timelines.

### 📊 Objective 5-Factor Driver Scoring
Computes normalized performance metrics post-race:
1. **Strategy ($S_{\text{strat}}$)**: Clean-air ratios, stint length efficiency, and undercut/overcut net yield.
2. **Tire Management ($S_{\text{tire}}$)**: Fuel-corrected degradation slope compared against grid medians.
3. **Pace Efficiency ($S_{\text{pace}}$)**: Lap consistency and delta relative to machine limits and teammate benchmarks.
4. **Pit Stop Execution ($S_{\text{pit}}$)**: Crew stationary box time isolated from pit lane transit.
5. **Race Craft ($S_{\text{exec}}$)**: Net position progression, overtakes, lockups, and incident penalties.

---

## 4. Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, Vite 5, JavaScript, Three.js, `@react-three/fiber`, Tailwind CSS, Lucide Icons, Framer Motion, Jotai |
| **API Gateway** | Node.js (v20+), Express 4, `pg-pool`, `jsonwebtoken`, `express-rate-limit`, `cors`, WebSockets (`ws`) |
| **AI Microservice** | Python 3.12, FastAPI, LangGraph, LangChain Core, LangSmith, FastF1, NumPy, Pandas, Google GenAI SDK, Groq |
| **Data & Cache** | PostgreSQL 17, Redis 7 Alpine |
| **Infrastructure** | Docker, Docker Compose, Nginx (Alpine reverse proxy with gzip & security headers) |

---

## 5. Quick Start with Docker

The fastest way to spin up the complete, production-ready FrontWing stack:

### Prerequisites
- [Docker](https://docs.docker.com/get-docker/) & Docker Compose
- API Keys for Google Gemini and/or Groq

### 1. Clone & Configure Environment
```bash
git clone https://github.com/Pranav722/frontwing.git
cd frontwing
```

Create `.env` in the project root (or export in shell):
```env
GEMINI_API_KEY=your_gemini_api_key
GROQ_API_KEY=your_groq_api_key
JWT_SECRET=your_secure_jwt_secret_key
```

### 2. Boot the Full Stack
```bash
docker compose up --build -d
```

### 3. Verify Health & Access
- **Frontend Dashboard**: `http://localhost:3000` (or `http://localhost:5173`)
- **Backend API Gateway**: `http://localhost:5000`
- **AI Microservice Docs**: `http://localhost:8000/docs`

To verify container health:
```bash
docker ps
python scratch/docker_smoke_test.py
```

---

## 6. Local Development Setup

If running services natively outside Docker:

### 1. PostgreSQL & Redis
Ensure PostgreSQL is running on port `5433` (or update `.env`) and Redis on `6379`.

### 2. AI Services (Python)
```bash
cd ai_services
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --port 8000 --reload
```

### 3. Backend Gateway (Node.js)
```bash
cd backend
npm install
npm run dev
```

### 4. Frontend (React)
```bash
cd frontend
npm install
npm run dev
```

---

## 7. Verification & Test Suites

FrontWing maintains comprehensive test suites across all tiers:

```bash
# Backend Security Suite (14 tests — Auth, RBAC, input sanitization)
cd backend && npm run test:security

# Multi-Turn Thread Integrity Suite (State persistence & session isolation)
cd backend && node tests/multiturn_thread_integrity.test.js

# AI Services Pytest Suite (63 tests — Tools, RAG, scoring, telemetry, LangGraph)
cd ai_services && pytest tests/ -v

# Frontend Production Build (Vite bundling & asset optimization)
cd frontend && npm run build
```

---

## 8. Agent & Developer Context

For maintainers and automated agents operating on this codebase:
- [`docs/agent-context/PROJECT_STATE.md`](docs/agent-context/PROJECT_STATE.md) — Comprehensive technical inventory, verified features, known issues, and deferred roadmap.
- [`docs/agent-context/RULES_AND_GOTCHAS.md`](docs/agent-context/RULES_AND_GOTCHAS.md) — Mandatory development rules, gotchas, and architectural constraints.
- [`docs/agent-context/CHANGELOG.md`](docs/agent-context/CHANGELOG.md) — Chronological ledger of all sessions and codebase modifications.
