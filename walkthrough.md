# Query Orchestration Architecture & Contract Fix Report

## 1. Summary of Architectural Improvements
The query orchestration pipeline has been upgraded across all 5 semantic query classes (`knowledge`, `historical_fact`, `telemetry_comparison`, `strategy`, `simulation`):

1. **Phase 1 — Query Classification**:
   - Upgraded [`nlp_parser.py`](file:///c:/VS-Code_C_drive/Projects/FrontWing/ai_services/app/agents/nlp_parser.py#L485) to establish strict semantic query classes.
   - Keywords like `"difference"`, `"compare"`, `"versus"`, `"vs"` no longer force a query to `telemetry_comparison` unless driver mentions or telemetry metrics are present.
   - Concept questions like `"Explain the difference between soft and hard tyres"` are classified as `knowledge`.

2. **Phase 2 & 3 — Knowledge & Session Resolution**:
   - Upgraded [`session_resolver.py`](file:///c:/VS-Code_C_drive/Projects/FrontWing/ai_services/app/core/session_resolver.py#L110) to return `session_id = None` when `grand_prix` and `season` are unstated by the user, preventing fallback session injection (`2024_são_paulo_gp_race`) for knowledge queries.
   - Upgraded [`planner.py`](file:///c:/VS-Code_C_drive/Projects/FrontWing/ai_services/app/agents/planner.py#L626) to dynamically extract the requested concept topic (`term = "UNDERSTEER"`, `term = "SOFT VS HARD TYRES"`, `term = "DRS"`) for `explain_mode_tool` instead of hardcoding `term = "CAR"`.

3. **Phase 4 — Telemetry Comparison Planning**:
   - `plan_node` assigns `tools = ["telemetry_tool"]` (without `scoring_tool`) for pure telemetry comparisons.
   - Preserves exact user driver ordering ($A \rightarrow B$) and session resolution (`2024_qatar_gp_race`).

4. **Phase 5 — Synthesizer Routing**:
   - `synthesize_node` respects intent class:
     - `knowledge` $\rightarrow$ returns direct concept explanation.
     - `historical_fact` $\rightarrow$ returns deterministic race fact/classification summary.
     - `telemetry_comparison` $\rightarrow$ returns lap time delta, sector deltas, and speed/throttle/brake diffs summary.
   - `CorrelationEngine` (Root Cause Analyzer) is ONLY invoked when the intent is `investigation` or the query asks an explicit causal question (`"why"`, `"reason"`, `"cause"`, `"retire"`).

5. **Phase 6 & 7 — Failure State & Confidence**:
   - Every LangGraph branch returns a normalized schema with `investigation_report`.
   - Confidence is set accurately (20.0%-50.0% for missing data/error fallback; 95.0%+ for verified evidence).

---

## 2. End-to-End Acceptance Test Matrix Execution
Executed via [`scratch/test_end_to_end_acceptance.py`](file:///c:/VS-Code_C_drive/Projects/FrontWing/scratch/test_end_to_end_acceptance.py):

| Test Query | Intent Class | Executed Tools | Session ID | Executive Summary Output | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1. "What is understeer in F1?"** | `knowledge` | `explain_mode_tool` | `None` | Understeer occurs when a car turns less than intended, sliding front tyres wide... | **PASSED** |
| **2. "Explain the difference between soft and hard tyres."** | `knowledge` | `explain_mode_tool` | `None` | Soft tyres provide maximum grip but degrade quickly; hard tyres last longer... | **PASSED** |
| **3. "Who finished second in Spain?"** | `historical_fact` | `race_results_tool` | `2024_spanish_gp_race` | Carlos Sainz finished P2 in the 2024 Spanish Grand Prix. | **PASSED** |
| **4. "Who won Monaco in 2026?"** | `historical_fact` | `race_results_tool` | `2026_monaco_gp_race` | Charles Leclerc won the 2026 Monaco Grand Prix. | **PASSED** |
| **5. "Compare lap timings of Verstappen and Hamilton at Qatar GP"** | `telemetry_comparison` | `telemetry_tool` | `2024_qatar_gp_race` | At Qatar GP, Verstappen's lap 55 time (82.905s) vs Hamilton's lap 52 time (83.865s) (0.960s faster). S1: -0.321s, S2: -0.376s, S3: -0.263s. | **PASSED** |
| **6. "Compare Piastri vs Verstappen at Brazil"** | `telemetry_comparison` | `telemetry_tool` | `2024_são_paulo_gp_race` | Piastri's lap 64 time (81.838s) vs Verstappen's lap 67 time (80.472s) (1.366s slower). S1: +0.355s, S2: +0.898s, S3: +0.113s. | **PASSED** |

---

## 3. Automated Test Suite Verification Summary
1. `scratch/test_end_to_end_acceptance.py`: **PASSED 100% CLEANLY**
2. `scratch/test_season_policy_suite.py`: **PASSED 100% CLEANLY**
3. `scratch/test_directional_comparison.py`: **PASSED 100% CLEANLY**
4. `scratch/test_telemetry_pipeline_matrix.py`: **PASSED 100% CLEANLY**
5. `scratch/test_frontend_telemetry_formatter.js`: **PASSED 100% CLEANLY**
6. `npm run build`: Built in `6.39s` with **0 compilation errors**.
