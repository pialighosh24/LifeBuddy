# Project Run Guide — Life Buddy

**Workspace:** `C:\Users\ADMIN\Desktop\LifeBuddy`  
**Stack:** Backend (Node/Express, MySQL), Dashboard (React/Vite/TS), Mobile (Expo/RN/TS)

## 1. Prerequisites
- Node.js and npm installed.
- MySQL 8.x running with database `lifebuddy_db` accessible via configured credentials.
- Environment files configured locally (do not commit/share secrets):
  - `backend/.env` (DB, JWT, `PORT=4000`, `CORS_ORIGIN` includes intended dashboard origins)
  - `dashboard/.env` (`VITE_API_BASE_URL=http://localhost:4000`)
  - `mobile/.env` (`EXPO_PUBLIC_API_BASE_URL` set per target; see Expo Go guide)

## 2. Start backend (API)
```powershell
cd C:\Users\ADMIN\Desktop\LifeBuddy\backend
npm install   # only if dependencies not installed
npm start
# dev mode: npm run dev
```
- API: `http://localhost:4000/api/v1`
- Health: `http://localhost:4000/api/v1/health` (should return 200, DB connected)
- If you change `backend/.env`, restart the backend process to apply changes.

## 3. Start caregiver dashboard
```powershell
cd C:\Users\ADMIN\Desktop\LifeBuddy\dashboard
npm install   # only if needed
npm run dev
```
- Open: `http://localhost:5173` (preferred) or `http://127.0.0.1:5173`
- Build: `npm run build` | Typecheck: `npm run typecheck` / `npx tsc --noEmit`

## 4. Start mobile app (Expo)
```powershell
cd C:\Users\ADMIN\Desktop\LifeBuddy\mobile
npm install   # only if needed
npx expo start
# LAN for physical device: npx expo start --lan
```
- See `docs/EXPO_GO_SETUP_GUIDE.md` for LAN IP, firewall, and Expo Go steps.

## 5. Verified checks (as of 2026-11-12)
```powershell
# Backend
cd C:\Users\ADMIN\Desktop\LifeBuddy\backend
npm test -- --runInBand   # 11 suites, 50 tests PASS

# Dashboard
cd C:\Users\ADMIN\Desktop\LifeBuddy\dashboard
npx tsc --noEmit          # PASS
npm run build             # PASS

# Mobile
cd C:\Users\ADMIN\Desktop\LifeBuddy\mobile
npx tsc --noEmit          # PASS
npx expo-doctor           # 19/20 PASS, 1 FAIL (Expo patch mismatches; not auto-fixed)
```

## 6. Manual QA (important)
- Browser automation unavailable: perform manual Edge QA per `docs/PHASE_7B_MANUAL_EDGE_QA_GUIDE.md` and record results in `docs/PHASE_7B_DASHBOARD_BROWSER_RUNTIME_QA_REPORT.md`.
- Use verified QA pair **caregiver 1891 / care-user 1892 / link 797** for credentialed dashboard checks (enter credentials locally; never share/store secrets).
- Physical-device/Expo Go runtime must be tested manually and reported honestly.

## 7. Safety reminders
- Do not delete/update/truncate `activity_logs`. Preserve approved QA records.
- No destructive DB operations, schema resets, or demo seeds without explicit approval.
- No blind dependency/SDK upgrades; review compatibility first.
- Do not claim unverified runtime/device/delivery behavior as complete.
