# Phase 1 — Core Backend Foundation Task Checklist

- [x] **1. User Authentication (JWT)**
  - [x] JWT Register (`POST /api/auth/register` & `POST /auth/register`)
  - [x] JWT Login (`POST /api/auth/login` & `POST /auth/login`)
  - [x] Middleware (`authenticateToken` for protected routes, `optionalAuth` for public/optional routes)
  - [x] Protected User Endpoint (`GET /api/auth/me` & `GET /auth/me`)

- [x] **2. Investigation History Storage (PostgreSQL)**
  - [x] Database Schema (`03_auth_and_history.sql` with `users`, `investigations`, `saved_investigations`)
  - [x] Store Question, AI Response, Session, Timestamp, Provider Used, Investigation Metadata
  - [x] History Service implementation for DB operations

- [x] **3. History APIs**
  - [x] `GET /history` (or `/api/history`) — List user's investigations with pagination and search
  - [x] `GET /history/:id` (or `/api/history/:id`) — Fetch specific investigation by ID
  - [x] `DELETE /history/:id` (or `/api/history/:id`) — Delete an investigation
  - [x] `POST /history/save/:id` (or `/api/history/save/:id`) — Toggle saved/bookmarked investigation

- [x] **4. Redis Caching Layer**
  - [x] Cache previous investigation responses based on query hash (Session + Question)
  - [x] Check Redis cache on query request (`/engineer/query`)
  - [x] Return cached response if identical request exists
  - [x] Automatically cache new responses and save authenticated queries to PostgreSQL

- [x] **5. Clean API Architecture**
  - [x] Controllers (`auth.controller.ts`, `history.controller.ts`, `engineer.controller.ts`)
  - [x] Routes (`auth.routes.ts`, `history.routes.ts`, `engineer.routes.ts`)
  - [x] Services (`auth.service.ts`, `history.service.ts`, `cache.service.ts`)
  - [x] Middlewares (`auth.middleware.ts`)
  - [x] Models / Types (`auth.types.ts`, `history.types.ts`)
  - [x] Utils (`hash.ts`, `jwt.ts`)

- [x] **6. Strict Boundary Constraints**
  - [x] DO NOT implement any AI changes
  - [x] DO NOT touch planner
  - [x] DO NOT touch agents
  - [x] DO NOT touch synthesizer
  - [x] DO NOT touch FastF1

- [x] **7. Verification & Documentation**
  - [x] Run backend compilation (`npm run build` in `backend`) — PASSED
  - [x] Run python tests (`34 tests` passed in `ai_services`) — PASSED
  - [x] Run frontend build (`npm run build` in `frontend`) — PASSED
  - [x] Verify backend server startup — PASSED
  - [x] Verify Docker configuration — PASSED
  - [x] Update `task.md`
  - [x] Update `walkthrough.md`
  - [x] Update `docs/project_context.md`
  - [x] Update `docs/learning.md`
