# Phase 1 — Frontend Foundation Task Checklist

- [x] **1. API Layer Extensions (`frontend/src/lib/api.ts`)**
  - [x] Add auth client methods (`loginUser`, `registerUser`, `getMe`)
  - [x] Add history API methods (`fetchHistory`, `fetchInvestigationById`, `deleteHistory`, `toggleSaveInvestigation`)
  - [x] Add automatic `Authorization: Bearer <token>` header support

- [x] **2. Error Handling & Boundaries**
  - [x] Create `frontend/src/components/ErrorBoundary.tsx` for catching UI crashes
  - [x] Integrate ErrorBoundary into `App.tsx` around routes

- [x] **3. Homepage Refinements (`BriefingRoom.tsx`)**
  - [x] Hero section with interactive circuit preview & question submission
  - [x] Search Bar (`QuestionBar` & `SearchOverlay` integration)
  - [x] Recent Investigations section (backend `GET /history` with local storage fallback)
  - [x] Saved Investigations section (bookmarked threads display)

- [x] **4. Investigation Page Layout & Workflow (`InvestigationThread.tsx`)**
  - [x] Enforce strict layout ordering:
    - [x] Question
    - [x] Loading Progress
    - [x] AI Verdict
    - [x] Charts
    - [x] Evidence
    - [x] Follow-up Suggestions
  - [x] Enhanced loading animations & stage transitions (`AIThinkingIndicator`)
  - [x] Investigation history restore via backend `GET /history/:id`
  - [x] Saved investigation toggle (`POST /history/save/:id`)

- [x] **5. Responsive & Component Integrity**
  - [x] Verify mobile, tablet, and desktop layouts
  - [x] Ensure zero modifications to backend code or AI services

- [x] **6. Verification & Documentation**
  - [x] Run `npm run build` in `frontend` (0 errors) — PASSED (built in 3.25s)
  - [x] Verify route transitions and React error boundaries — PASSED
  - [x] Update `task.md`
  - [x] Update `walkthrough.md`
  - [x] Update `docs/project_context.md`
  - [x] Update `docs/learning.md`
  - [x] Commit after successful verification
