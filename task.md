# Investigation Agent Multi-Domain Correlation Checklist

- [x] **1. InvestigationCorrelator Engine (`ai_services/app/agents/investigation_correlator.py`)**
  - [x] Extract facts across Telemetry, Race Results, Regulations, and Strategy domains
  - [x] Build explicit step-by-step root-cause reasoning graph (`Reasoning Graph` and `Reasoning Graph Text` with `↓` step arrows)
  - [x] Ensure zero hallucinations by referencing retrieved tool outputs strictly

- [x] **2. Agent Pipeline & Persona Integration (`ai_services/app/agents/planner.py` & `personas.py`)**
  - [x] Integrate `InvestigationCorrelator` into `synthesize_node` in `planner.py`
  - [x] Populate `investigation_report["Reasoning Graph Text"]`, `Telemetry Findings`, `Simulation Findings`, `Historical Findings`, `Regulations Findings`, `Alternative Scenarios`, `Final Recommendation`
  - [x] Update `InvestigationEngineer` persona in `personas.py` to attach root-cause correlations
  - [x] Log explicit root-cause chain to `intelligence_trace["reasoning_graph"]`

- [x] **3. Frontend Narrative Rendering (`frontend/src/pages/InvestigationThread.tsx`)**
  - [x] Render explicit Root-Cause Reasoning Graph prominently in narrative debrief messages

- [x] **4. Automated Tests & Verification**
  - [x] Add unit test suite in `ai_services/tests/test_investigation_correlator.py`
  - [x] Verify frontend Vite production build
  - [x] Update `task.md`, `walkthrough.md`, `docs/project_context.md`, `docs/learning.md`
  - [x] Commit after verification
