# BCA Capstone Demonstration Guide — Life Buddy

**Project:** Life Buddy — An Intelligent Visual and Voice-Assisted Personal Support System  
**Workspace:** `C:\Users\ADMIN\Desktop\LifeBuddy`

> This guide is based on the current implemented project and verified evidence as of 2026-11-12. Do not claim features, tests, or integrations that are not actually verified.

## 1. Project introduction
Life Buddy is an accessible personal assistance system designed to support care-users and caregivers through a mobile application, caregiver dashboard, backend API, and MySQL database. It focuses on clear communication, routine support, medicine information/reminders, feelings expression, situation guidance, and SOS assistance with caregiver visibility.

## 2. Problem statement
Individuals who need structured daily support and accessible communication tools may benefit from a simple, caregiver-linked system that provides visual/voice assistance, routine guidance, medicine tracking support, and emergency alert workflows while keeping caregivers informed through authorized interfaces.

## 3. Objectives
- Provide accessible mobile support modules (TALK, MY DAY, MEDICINE, MY FEELINGS, HELP ME, SOS).
- Provide caregivers a secure dashboard to manage/view authorized care-user information.
- Maintain real backend/MySQL integration with authentication, RBAC, ownership checks, and validation.
- Ensure honest states (loading/empty/error), accessibility considerations, and data preservation.
- Demonstrate a stable, integrated capstone prototype with verifiable evidence.

## 4. Architecture
- **Mobile:** React Native + Expo + TypeScript + Expo Router (`mobile/`)
- **Dashboard:** React + Vite + TypeScript + CSS (`dashboard/`)
- **Backend:** Node.js + Express REST API (`/api/v1`) (`backend/`)
- **Database:** MySQL 8 (`lifebuddy_db`) — authoritative data store (`database/`)

**Integration flow:** Mobile/Dashboard → Backend API → MySQL → Backend → Mobile/Dashboard (authorized responses only).

## 5. Technologies used
- Frontend/mobile: React, React Native, Expo, Expo Router, TypeScript, Vite
- Backend: Node.js, Express, JWT, bcrypt, express-validator, helmet, cors, morgan, mysql2
- Database: MySQL 8
- Testing/tools: Jest/Supertest (backend), TypeScript, Expo CLI/Doctor, Vite build

## 6. Module descriptions
- **TALK:** Picture-based communication, sentence building, TTS, favourites, EN/BN support (API-backed where applicable).
- **MY DAY:** Routines/ordered steps, progress and completion tracking via backend APIs.
- **MEDICINE:** Caregiver-managed medicine/reminder info and Taken/Skipped logging/history (no dosage advice).
- **MY FEELINGS:** Eight feelings, **local-only** behavior as specified.
- **HELP ME:** Deterministic stored situation guidance shown step-by-step.
- **SOS:** Explicit confirmation, optional foreground location (if supported), stored alert record and caregiver acknowledgement; **no external emergency-service/SMS/email/push delivery claimed** unless verified.
- **Dashboard:** Caregiver login and modules for care users, emergency contacts, SOS alerts, routines, medicines, communication, situation guidance, settings/preferences.

## 7. Database overview (high level)
Core entities include users, caregiver links, preferences, routines/routine steps/completions, medicines/reminders/logs, emergency contacts, SOS alerts, communication items/favourites, situations/steps, activity logs, and device tokens (as implemented). Referential integrity, ownership/link enforcement, and parameterized queries are used in backend logic.

## 8. Security features
- JWT authentication, bcrypt password/PIN hashing
- RBAC and caregiver-care-user ownership/link checks
- Request validation and parameterized SQL
- Helmet and explicit CORS allowlist (dev origins configured)
- Env-managed secrets (not hardcoded in source/reports)
- Immutable `activity_logs` preserved

## 9. Actual limitations (be honest in viva)
- Manual browser runtime QA and Expo Go/physical-device runtime not fully verified in this environment.
- Expo Doctor shows 1 patch-version compatibility check failure (packages not blindly upgraded).
- `situation_steps` may be empty (read-only); fresh QA data may show honest empty states.
- No verified external SMS/email/push/emergency-service delivery.
- Lint scripts not configured; browser automation unavailable.

## 10. Testing evidence (current verified)
- Backend: **11 suites, 50 tests PASS** (`npm test -- --runInBand`), health endpoint 200/DB connected.
- Dashboard: **TypeScript PASS**, **production build PASS**.
- Mobile: **TypeScript PASS**, **Expo Doctor 19/20 PASS (1 fail)**, **Android export/bundle check PASS** (`npx expo export --platform android`).
- DB/activity-log preservation verified (approved QA records intact; activity logs immutable/preserved).

## 11. Demo sequence (recommended)
1. **Start services:** backend (`npm start`), dashboard (`npm run dev`), confirm health endpoint.
2. **Dashboard login:** open `http://localhost:5173`, caregiver login (use verified QA account; enter credentials locally), show Overview and Care Users (authorized linked user).
3. **Dashboard modules:** navigate Communication (loading/empty/error/content states), Routines, Medicines, Emergency Contacts, SOS Alerts, Situation Guidance, Settings/Preferences — explain real API/DB data and honest empty states.
4. **Mobile (if device ready):** start Expo (`npx expo start`), open in Expo Go with correct `EXPO_PUBLIC_API_BASE_URL`, demonstrate available modules (TALK, MY DAY, MEDICINE, MY FEELINGS local-only, HELP ME, SOS flow) without claiming unverified external delivery.
5. **Wrap-up:** show testing evidence, security measures, and limitations/future scope.

## 12. Future scope
- Complete full runtime/device QA evidence and CI automation.
- Expand populated guidance/content datasets (approved), richer analytics, and verified notification integrations if implemented.
- Additional accessibility refinements and performance/usability improvements based on user testing.
- Deployment hardening and production environment configuration (secrets, CORS, monitoring) as appropriate.

## 13. Viva tips
- Explain **real architecture and data flow**; distinguish **build/test verified** vs **runtime/device verified**.
- Be transparent about limitations and why certain claims (e.g. external SOS delivery) are not made.
- Highlight security (JWT/bcrypt/RBAC/validation/parameterized SQL/CORS) and data integrity (preserved QA records, immutable activity logs).
- Reference actual files/modules and test results when asked.
