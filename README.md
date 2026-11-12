# Life Buddy
**Empowering independence through simple communication, visual guidance and intelligent assistance.**

Life Buddy is a BCA final-year capstone project: an accessible personal assistance system with a **React Native (Expo) mobile app**, a **React (Vite) caregiver web dashboard**, and a **Node.js + Express** backend backed by **MySQL** (`lifebuddy_db`).

> Status: **Phases 0–4C (backend + core APIs, verified), Phase 5A–5F mobile implemented, Phase 5G QA (static + API/DB integration) completed, Phase 6A caregiver dashboard foundation implemented, Phase 6B Care Users management, Phase 6C Emergency Contacts management, Phase 6D SOS Alerts (view/ack), Phase 6E Daily Routines management, Phase 6F Medicines management, Phase 6G Communication management, Phase 6H Situation Guidance (read-only), and Phase 6I Settings & Preferences implemented with build/typecheck, backend regression, and real-backend/MySQL API checks verified.** Interactive browser/emulator/physical-device runtime QA pending. See `docs/PROJECT_PROGRESS.md` for executed/verified results, limitations, and next steps.

## Repository structure
- `mobile/` — User mobile application (React Native, Expo, TypeScript)
- `dashboard/` — Caregiver web dashboard (React, Vite, TypeScript, CSS)
- `backend/` — REST API server (Node.js, Express.js)
- `database/` — MySQL schema, seed data, sample queries, ERD (`lifebuddy_db`)
- `docs/` — Architecture, API, database, testing, report, and progress documentation

## Key principles
- **MySQL is the authoritative persistent store** (no MongoDB/Firestore/JSON/primary SQLite/localStorage substitutes for records).
- **Accessibility-first**: large targets, high contrast, TTS/repeat, Bengali & English, configurable text/speech, reduced motion, screen-reader-friendly labels.
- **Security & privacy**: JWT auth, bcrypt hashing, RBAC/ownership checks, parameterized SQL, no secrets or real personal/medical data in the repo.
- **Honest behavior**: SOS/notifications report actual status; essential safety instructions are predefined (not AI-dependent).

## Setup (current)

### Backend
```powershell
cd backend
npm install
npm run start   # http://localhost:4000, health: /api/v1/health
```

### Mobile (Phase 5A–5F)
```powershell
cd mobile
npm install
copy .env.example .env   # set EXPO_PUBLIC_API_BASE_URL (Android emulator: http://10.0.2.2:4000)
npx expo start
```
See `mobile/README.md` and `docs/mobile-architecture.md` for emulator/physical-device configuration, auth, TALK, MY DAY, MEDICINE, HELP ME, and SOS details.

### Caregiver Dashboard (Phase 6A–6E)
```powershell
cd dashboard
npm install
copy .env.example .env   # set VITE_API_BASE_URL (default http://localhost:4000)
npm run dev              # http://localhost:5173
```
See `dashboard/README.md` and `docs/dashboard-architecture.md` for architecture, auth/session behavior, routes (Overview, Care Users CRUD/PIN, Emergency Contacts CRUD, SOS Alerts view/ack, Daily Routines CRUD/steps/progress), and limitations. Backend must be running and reachable (CORS allows dashboard origin).

## Documentation
- Progress: `docs/PROJECT_PROGRESS.md`
- Architecture: `docs/architecture.md`, `docs/mobile-architecture.md`
- Database: `docs/database.md`
- APIs: `docs/api/`
- UI/UX: `docs/ui-design.md`

## License / academic note
Academic project for demonstration and viva examination. Demo accounts/data must be clearly labelled; never use real personal or medical information.
