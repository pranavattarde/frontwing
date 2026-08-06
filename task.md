# Adaptive Planning Architecture Checklist

- [x] **1. Replace Keyword Planner Routing with Adaptive Planning (`ai_services/app/agents/planner.py`)**
  - [x] Extract `intent`, `entities`, `required_evidence`, `missing_evidence`, and `confidence`
  - [x] Dynamically choose tools based on required evidence instead of static hardcoded keyword mapping
  - [x] Minimize unnecessary tool calls (e.g. single factual query = 1 tool call; comparison = 3 tools; investigation = 4 tools)

- [x] **2. Prompt Schema & Validation Updates (`app/prompts/planning.md`)**
  - [x] Update JSON planning prompt schema to include `intent`, `entities`, `required_evidence`, `missing_evidence`, and `confidence`
  - [x] Update `validate_plan_schema` to validate adaptive planning metadata

- [x] **3. Diagnostic Debug Logger**
  - [x] Log `Question`, `Intent`, `Entities`, `Required Evidence`, `Missing Evidence`, `Confidence`, `Tools`, `Parameters` in PLANNER execution block

- [x] **4. Verification & Documentation**
  - [x] Unit test suite in `ai_services/tests/test_adaptive_planner.py`
  - [x] Frontend Vite production build verified (passed in 7.24s)
  - [x] Update `task.md`, `walkthrough.md`, `docs/project_context.md`, `docs/learning.md`
  - [x] Commit after verification
