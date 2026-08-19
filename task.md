# FrontWing Sprint Task List: JavaScript Migration & Day 1 MVP Preservation

## Objective
Convert all first-party TypeScript code across the FrontWing platform to pure JavaScript (`.jsx` and `.js`), eliminating TypeScript dependencies (`typescript`, `tsc`, `ts-node`, `@types/*`, `@typescript-eslint/*`) while preserving 100% of existing runtime architecture and Day 1 MVP user-level behavior.

## Stack Definition
- **Frontend**: React (v18) + pure JavaScript (ES2022 / JSX) + Vite (v5) + Tailwind CSS (v3)
- **Backend API Gateway**: Node.js + Express (v4) + pure JavaScript (CommonJS)
- **AI Microservice**: Python (v3.12) + FastAPI (v0.111) + LangGraph + FastF1 + PostgreSQL + Redis

## Migration Checklist
- [x] Step 1 — Complete Inventory of TypeScript files (20 backend `.ts` files, 47 frontend `.tsx`/`.ts` files)
- [x] Step 2 — Frontend Migration: Converted 100% of `.tsx` $\rightarrow$ `.jsx` and `.ts` $\rightarrow$ `.js`
- [x] Step 3 — Express Backend Migration: Converted 100% of `.ts` $\rightarrow$ `.js`
- [x] Step 4 — Configuration Migration: Converted `vite.config.ts` $\rightarrow$ `vite.config.js`, updated `index.html`, removed all `tsconfig*.json` files
- [x] Step 5 — Package.json & Dependency Cleanup: Removed `tsc`, `ts-node`, `typescript`, `@types/*`, `@typescript-eslint/*`
- [x] Step 6 — Production Build Verification: `npm run build` in `frontend/` passed cleanly (Vite bundle built in 4.26s)
- [x] Step 7 — Backend Verification: Express server (`node src/index.js`) starts cleanly, connects to PostgreSQL, applies migrations, and connects to Redis
- [x] Step 8 — E2E MVP Regression Validation: Executed 10/10 target queries against pure JS Express gateway with 100% PASS rate
- [x] Step 9 — Python Isolation: Unchanged (Python remains as Python)
- [x] Step 10 — Documentation: Updated `docs/project_context.md`, `task.md`, `walkthrough.md`, `docs/learning.md`

## AI Investigation Pipeline Correctness Fix
- [x] Step 1 — Root Cause Diagnosis: Identified SQL column error (`season` vs `year`), `SessionResolver` defaulting to `monaco`, and LLM API model string deprecations
- [x] Step 2 — Database & Resolver Fix: Corrected `SessionResolver` SQL query to `SELECT r.year FROM races r JOIN sessions s ON s.race_id = r.id`, removed `monaco` default fallback for unstated GPs
- [x] Step 3 — Cross-Query Contamination Prevention: Updated `planner.py` `execute_node` to force `session_id = None` when GP is specified but unresolved
- [x] Step 4 — Model String & Config Fix: Updated `config.py` default PostgreSQL fallback port to 5433 and updated `providers.py` to active models (`gemini-2.5-flash` and `qwen/qwen3.6-27b`)
- [x] Step 5 — Regression Validation: 11/11 queries (A-K) passed cleanly with 100% factual accuracy and zero cross-query contamination; Redis cache isolation verified (PASS)
- [x] Step 6 — Production Build Verification: `npm run build` in `frontend/` passed cleanly in 11.34s

## Day 2 Feature 1 — Real Telemetry Comparison End-to-End
- [x] Step 1 — Real Telemetry Persistence: Enabled downsampled telemetry extraction in `fastf1_collector.py` storing `distanceM`, `speed`, `throttle`, `brake`, `gear`, `rpm` into JSON files and `telemetry_metadata` table
- [x] Step 2 — Targeted FastF1 Ingestion: Downloaded and processed real lap and telemetry profiles for 20 drivers at `2024_british_gp_race`
- [x] Step 3 — NLP Semantic Contract: Added `telemetry_comparison` intent and metric classification rules in `nlp_parser.py`
- [x] Step 4 — Planner Routing & Parameters: Updated `plan_node` and `execute_node` in `planner.py` to route telemetry queries to `telemetry_tool` and pass `driver_id` and `comparative_driver_id`
- [x] Step 5 — TelemetryTool & Real Delta Calculations: Updated `TelemetryTool` in `adapters.py` to load Driver A and Driver B profiles, calculate real lap deltas (-0.173s) and sector deltas ($S1, S2, S3$), and eliminate synthetic mock array fallbacks
- [x] Step 6 — Synthesis Evidence Integration: Formatted telemetry executive summaries in `synthesize_node` based strictly on verified lap and sector deltas
- [x] Step 7 — Frontend Mock Fallback Removal: Removed static `TELEMETRY_PIA_LAP42` mock fallback from `InvestigationThread.jsx`
- [x] Step 8 — Regression & E2E Validation: Verified targeted telemetry queries return real speed/throttle/brake traces and verified Day 1 MVP queries (Monaco, Chinese, British) continue to pass 100%
- [x] Step 9 — Production Build Verification: `npm run build` in `frontend/` passed cleanly (Vite bundle built in 3.92s)

## Status
**FRONTWING DAY 2 FEATURE 1 — REAL TELEMETRY COMPARISON END-TO-END COMPLETE & VALIDATED**
