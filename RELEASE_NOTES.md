# Release Notes - FrontWing v1.0.0-beta

We are excited to announce the initial beta release of the FrontWing F1 Intelligence Engine! This release marks the completion of our core data architectures, database schemas, and deterministic mathematical scoring engine.

---

## What's New in v1.0.0-beta

### 🗄️ Database Architecture & Schemas
- Created initialized PostgreSQL DDL scripts tracking core F1 timing entities (`drivers`, `races`, `sessions`, `laps`, `stints`, etc.).
- Formulated the **Intelligence Schema** in `02_intelligence_tables.sql` storing deterministic driver scoring outputs (`scoring_results`), estratégico simulations (`simulation_runs`), and telemetry insights (`race_insights`).
- Removed all vector/RAG requirements, optimizing performance by operating directly on structured Pandas timing matrices.

### 📐 Refined Scoring Engine
Successfully implemented 5 modular Python scoring formulas to ensure transparent, repeatable scoring across race weekends:
1. **Strategy Score**: Measures clean air availability, stint length optimization, and undercuts/overcuts (excluding driver on-track overtakes).
2. **Tire Management**: Estimates fuel-corrected degradation regression slopes compared against the grid's median slope.
3. **Pace Score**: Computes absolute standard deviation consistency and speed margins relative to the car's machine potential.
4. **Pit Stop Score**: Separates crew stationary change times from driver transit lane performance.
5. **Race Execution**: Deducts steward penalties, track limits, and lockups while rewarding grid climbing and front-row retention.

### 🧪 Mock Verification & Unit Testing
- Configured a test suite validating scoring engines against the **2024 Austrian GP** timing logs.
- Confirmed scores for Max Verstappen, Oscar Piastri, and Carlos Sainz resolve successfully with zero assertions or rounding errors.

---

## Roadmap

In the upcoming release cycles, we will focus on:
- Establishing the Express API Gateway and Redis real-time streaming connectors.
- Implementing the LangGraph comparative narration engine for the **Telemetry-Driven Ghost Battle Dialogue**.
- Activating the "What-If" pit stop strategy simulator dashboard interface.
