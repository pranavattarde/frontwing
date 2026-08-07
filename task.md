# FrontWing MVP Backend Verification Sprint Checklist

- [x] **STEP 1: Service Health Verification**
  - [x] PostgreSQL service verified: HEALTHY
  - [x] Redis cache & pub/sub broker verified: HEALTHY
  - [x] Python AI service microservice verified: HEALTHY

- [x] **STEP 2: Complete Database Inspection**
  - [x] Circuits table: 13 rows
  - [x] Races table: 9 rows (2024 season GP rounds verified)
  - [x] Sessions table: 9 completed sessions
  - [x] Constructors table: 11 active constructor records
  - [x] Drivers table: 21 driver records
  - [x] Race results table: 58 verified classification rows
  - [x] Laps table: 2,963 lap records
  - [x] Stints table: 157 tire stint records
  - [x] Weather table: 758 telemetry weather data points

- [x] **STEP 3: FastF1 Dynamic Ingestion & Database Population**
  - [x] Dynamic SessionResolver queries PostgreSQL and populates missing GP sessions on-demand via FastF1 SDK
  - [x] Ingested and stored clean race classifications, lap times, stints, and circuit metadata directly into PostgreSQL

- [x] **STEP 4: Target Query Verification Suite (5/5 Queries PASS)**
  - [x] Query 1: *"Who won Monaco GP?"* -> `Charles Leclerc won the 2024 Monaco Grand Prix.`
  - [x] Query 2: *"Who won British GP?"* -> `Lewis Hamilton won the 2024 British Grand Prix.`
  - [x] Query 3: *"Who won Hungarian GP?"* -> `Oscar Piastri won the 2024 Hungarian Grand Prix.`
  - [x] Query 4: *"Who won Austrian GP?"* -> `George Russell won the 2024 Austrian Grand Prix.`
  - [x] Query 5: *"Who finished P3 in Monaco GP?"* -> `Carlos Sainz finished P3 in the 2024 Monaco Grand Prix.`

- [x] **STEP 5: Root Cause Debugging & Architecture Integrity**
  - [x] Fixed 2024 Monaco vs British GP race ID assignment in PostgreSQL `races` table
  - [x] Enforced clean Planner entity extraction preservation into `EntityResolver` and `SessionResolver`
  - [x] Zero symptom patching; zero hardcoded fake driver/session responses

- [x] **STEP 6: Secondary Validation Suite (5/5 Queries PASS)**
  - [x] Query 6: *"Who won Spanish GP?"* -> `Max Verstappen won the 2024 Spanish Grand Prix.`
  - [x] Query 7: *"Who won Belgian GP?"* -> `Lewis Hamilton won the 2024 Belgian Grand Prix.`
  - [x] Query 8: *"Who won Miami GP?"* -> `Lando Norris won the 2024 Miami Grand Prix.`
  - [x] Query 9: *"Who won Canadian GP?"* -> `Max Verstappen won the 2024 Canadian Grand Prix.`
  - [x] Query 10: *"Who won Imola GP?"* -> `Max Verstappen won the 2024 Emilia Romagna Grand Prix.`

- [x] **DOCUMENTATION & GIT COMMIT**
  - [x] Updated `task.md`
  - [x] Updated `walkthrough.md`
  - [x] Updated `docs/project_context.md`
  - [x] Updated `docs/learning.md`
