# Life Buddy Mobile (Phase 5A–5F)

React Native + Expo + TypeScript mobile app for Life Buddy with real backend authentication, session hardening, picture-based communication (TALK), favourites, My Feelings (local-only), MY DAY routines, MEDICINE (information/reminders/logs), HELP ME situation guidance, SOS emergency alerts (real backend), and EN/BN UI support.

## Selected stack
- **Expo SDK:** `~58.0.23`, **React/React Native:** `19.3.0` / `0.88.1`
- **Navigation:** `expo-router` (file-based)
- **Secure storage:** `expo-secure-store` (JWT + language preference; **no tokens/passwords/PINs in AsyncStorage**)
- **Speech:** `expo-speech` (device TTS, best-effort language support)
- **Icons/fonts:** `@expo/vector-icons`, `expo-font`
- **TypeScript:** `~6.0.3`

Installed with Expo-compatible tooling where applicable (`npx expo install`). `npx expo-doctor`: **20/20 checks passed**. `npx tsc --noEmit`: **pass**. Node v24.19.0 / npm 11.17.0.

## Project structure (key)
```text
mobile/
  app/
    _layout.tsx                 # AuthProvider + LanguageProvider + auth gate
    (auth)/caregiver-login.tsx, user-pin-login.tsx
    (app)/home.tsx, profile.tsx, talk.tsx, my-feelings.tsx, (placeholders: my-day, medicine, help-me, sos)
  src/
    components/                 # Screen, AppButton, AppTextInput, StatusMessage, ActionTile, ComingSoonModule
    context/AuthContext.tsx     # session states + restore/retry
    i18n/                       # translations (en/bn), LanguageContext (persisted in SecureStore)
    services/
      api/client.ts             # timeout, auth header, error parsing, 401 handling
      api/authApi.ts, communicationApi.ts, favouritesApi.ts
      auth/tokenStorage.ts      # SecureStore token
      speech/tts.ts             # speak/stop, language selection, overlap avoidance
    utils/sentence.ts           # sentence building from selected items
    types/auth.ts, communication.ts
    theme/, constants/
  .env.example
```

## Environment configuration
1. Copy `mobile/.env.example` to `mobile/.env` and set `EXPO_PUBLIC_API_BASE_URL` (no DB/JWT secrets in Expo env).
   - **Android emulator:** `http://10.0.2.2:4000` (maps to host machine localhost)
   - **iOS simulator:** `http://localhost:4000`
   - **Physical device (same Wi-Fi):** `http://<COMPUTER_LAN_IP>:4000`
2. Ensure backend is running and reachable (firewall/port). The app shows clear connection errors and supports retry.

## Phase 5B functionality

### Session restoration fix (corrected)
- Reads JWT from SecureStore and calls `GET /api/v1/auth/me`.
- **Valid token:** authenticated session restored.
- **Explicit 401 / invalid or expired token:** stored token cleared and user returned to authentication.
- **Network unavailable, timeout, or temporary server error (5xx/unreachable):** **token preserved**, no redirect to login, clear connection error shown with **Retry** action (and option to sign out locally).
- Login stores token securely; logout calls `POST /api/v1/auth/logout` best-effort and always clears local token. Stateless JWT logout is **not** claimed as server-side revocation. No password/PIN/JWT logged.

### TALK — picture-based communication (real backend)
- **Integrated APIs (verified contracts):** `GET /api/v1/communication-items`, `GET /api/v1/communication-items/categories`, `GET /api/v1/communication-items/:itemId`, `POST /api/v1/care-users/:id/favourites`, `GET /api/v1/care-users/:id/favourites`, `DELETE /api/v1/favourites/:favouriteId`.
- Displays **only actual backend items** (no fabricated items). Supports category filter and search. Shows loading, empty, and error states with retry. If server data cannot refresh but prior session data exists in memory, UI labels it as previously loaded/cached for this session.
- **Current DB state:** `communication_items` is empty in `lifebuddy_db` (verified), so TALK correctly shows an honest empty state with guidance. Populate real items safely (with approval) via existing backend/catalog process if needed.
- **Sentence builder:** tap items to append tokens; shows readable composed sentence derived from selected items; remove individual tokens; **Clear**, **Speak**, **Replay/Stop**. Punctuation/spacing normalized; uses available speak/label fields with safe fallbacks (no assumption of undocumented fields).
- **Favourites (real API, role-aware):** signed-in **care-user** can save composed sentence as favourite, list, load/speak, and remove favourites (after API success; duplicate requests guarded). **Caregivers** cannot manage favourites via these endpoints (backend-enforced); UI shows honest guidance. Ownership/auth errors handled.
- **TTS:** `expo-speech` speaks/replays/stops composed sentence and favourites; empty-sentence guarded; overlapping requests avoided; EN/BN language selected best-effort. Missing Bengali/device voice support handled gracefully (not guaranteed).

### Bengali/English support
- Lightweight i18n resources and `LanguageContext` with **EN/BN** selection in Profile; preference persisted locally (SecureStore). Screen labels/buttons/messages translated where implemented. Bengali Unicode rendered. Communication labels use backend `labelBn/speakTextBn` when present and fall back honestly when missing. API identifiers/DB keys/enums not translated.

### MY FEELINGS (local-only)
- Accessible emotion cards (Happy, Sad, Angry, Afraid, Tired, Confused, In Pain, Need Help) with clear selection confirmation, optional speech, change/clear, EN/BN labels.
- **Limitation:** no dedicated emotion-recording backend/table exists. Selections are **not** saved to MySQL/server and no emotion history is shown/claimed. No fake API or DB migration added. (Future persistence would require approved API + schema design.)

### MY DAY — routines (real backend)
- **Integrated APIs (verified):** `GET /api/v1/care-users/:id/routines`, `GET /api/v1/care-users/:id/routine-progress?date=...`, `GET /api/v1/routines/:routineId`, `GET /api/v1/routines/:routineId/completions?date=...`, `POST /api/v1/routines/:routineId/completions`.
- **Routine list (care-user):** shows actual caregiver-assigned routines with title/description (EN/BN when available), step counts, completed/remaining/progress percent derived from backend, status states, Start/Continue/View, pull-to-refresh/retry, loading/empty/error states. **No fabricated data.** If no routines assigned, shows honest empty state (caregiver must assign). Live DB currently has 0 routines.
- **Step-by-step execution:** one instruction at a time with step number/total, backend instruction text (EN/BN with honest fallback), accessible visual/icon placeholder for `imageKey` (no random external URLs), Previous/Next (bounded), progress summary, exit confirmation. Reuses Phase 5B TTS for **Repeat Voice/Stop Voice**.
- **Completion:** care-user marks step complete via real API (`routineStepId`, status, source/timestamp); submit guarded against duplicates; UI updates only after server success and authoritative refresh. 400/401/403/404/409/network handled (refresh on conflict where appropriate). **Not marked saved locally without server confirmation.**
- **Progress:** from real backend progress/completions (completed/total/remaining/percent); safe for zero-step routines; 100% only when supported by data.
- **Network behavior:** preserves current screen/navigation on failures, clear errors/retry, stale (previously loaded session) vs fresh indication, no unverified offline completion queue or false saved claims. Backend authoritative.

### MEDICINE — information, reminders & tracking (real backend)
- **Integrated APIs (verified):** `GET /api/v1/care-users/:id/medicines`, `GET /api/v1/care-users/:id/medicine-history`, `GET /api/v1/medicines/:medicineId`, `GET /api/v1/medicines/:medicineId/reminders`, `GET /api/v1/medicines/:medicineId/logs`, `POST /api/v1/medicines/:medicineId/logs`.
- **List/detail:** shows actual caregiver-assigned medicine information (name, prescribed instructions, notes, start/end dates, active status) as stored; reminders (time, frequency, days, label, active) and medicine history/logs from server. No invented medicines/dosages/instructions/times/history. Empty states when none assigned (live DB currently has 0 medicines).
- **Logging:** care-user can explicitly record **Taken** or **Skipped** (`scheduledFor` required, optional `reminderId`/`respondedAt`) with confirmation/loading, duplicate-submit guard, success only after server confirmation, and authoritative refresh. 400/401/403/404/409/network handled honestly; no automatic marking on reminder time; scheduled reminder ≠ taken and ≠ notification delivery.
- **Reminders/notifications:** real reminder data displayed from backend. **Local device notification scheduling/delivery not implemented or verified** in this phase (no `expo-notifications`; no simulation/fabricated delivery claims). Reminders are server-stored/displayed only.
- **TTS:** reused `expo-speech` to listen to available caregiver-provided instructions (Repeat/Stop), EN/BN best-effort. **Safety:** assistance/tracking only — no medical advice, diagnosis, dosage calculation/modification, or treatment recommendations.

### HELP ME — situation assistant (real backend)
- **Integrated APIs (verified):** `GET /api/v1/situations`, `GET /api/v1/situations/:situationKey`, `GET /api/v1/situations/:situationKey/steps`.
- **List/detail:** shows actual situation catalogue (titles EN/BN with honest fallback, step counts) and ordered step-by-step guidance from backend. One instruction at a time with step number/total, bounded Previous/Next/Finish, accessible visuals/placeholders (no external URLs), zero-step handling, loading/error/retry. **Live DB state:** `situation_steps` = 0 rows, so UI shows honest empty state (no fabricated situations/instructions).
- **TTS:** reused `expo-speech` for Repeat/Stop Voice in selected language (EN/BN best-effort), stops on leave/unmount, no overlap, handles empty/unavailable voice gracefully.
- **Safety:** deterministic presentation of stored guidance only (no AI-generated/dynamic instructions). Emergency-like situations show stored-instructions-only note and optional navigation to SOS screen **without auto-triggering SOS** or claiming services/caregivers contacted. No medical diagnosis/treatment advice.

### SOS — emergency assistance (real backend)
- **Integrated APIs (verified):** `POST /api/v1/sos` (care-user, `clientEventId` idempotency), `GET /api/v1/care-users/:id/sos-alerts` (history), `GET /api/v1/sos/:alertId`, `GET /api/v1/care-users/:id/emergency-contacts`.
- **Flow:** prominent SOS button → explicit confirmation/cancel (never auto-triggered) → foreground location permission requested only on confirm (`expo-location`, SDK-compatible) → valid lat/lng attached only when available; SOS can proceed without location when supported. Duplicate submissions prevented while in progress.
- **Honest status/feedback:** shows only server-persisted alert status/history and caregiver acknowledgement (schema: `created,pending,sent,failed,acknowledged,cancelled`; **no `RESOLVED`**). **Alert saved in MySQL ≠ external notification delivery ≠ emergency-service contact.** Care-user cannot acknowledge. No external SMS/email/push/emergency-service integration claimed or implemented.
- **Contacts/network:** displays real emergency contacts from backend (no fake data, no auto call/message). Clear failure/offline handling with retry (no false saved/sent claims). EN/BN, accessible high-contrast UI.

## Commands

### Backend
```powershell
cd backend
npm install   # if needed
npm run start # or: npm run dev
# health: http://localhost:4000/api/v1/health
```

### Mobile
```powershell
cd mobile
npm install
copy .env.example .env   # set EXPO_PUBLIC_API_BASE_URL
npx expo start           # 'a' for Android emulator / scan for device (dev build if required)
```

### Checks
- `npx tsc --noEmit`
- `npx expo-doctor`

## Testing/verification executed (Phase 5B–5F)
- **Passed (static):** TypeScript `npx tsc --noEmit`, Expo Doctor **20/20** (including `expo-location` SDK-compatible install).
- **Passed (logic):** sentence **5/5**; routine navigation/progress **7/7**; medicine schedule helper **6/6**; HELP ME step/bounds/fallback **8/8**; SOS payload/coords/status logic **6/6**.
- **Passed (real backend + MySQL, Supertest, isolated temp data + cleanup):**
  - Phase 5B: **14/14**. Phase 5C routines: **25/25** (SQL-verified). Phase 5D medicine: **27/27** (SQL-verified). Phase 5E situations: **9/9** read-only checks.
  - Phase 5F SOS: core required checks **PASSED** — auth/role (401/403), create with coords **201** (saved=true, externalDeliveryConfirmed=false, DB-persisted), idempotent duplicate `clientEventId`, create without coords **201**, invalid coord pair **400**, care-user/linked-caregiver history **200**, unlinked **403**, caregiver acknowledge **200** (SQL-verified `acknowledged`/`acknowledgedBy`), care-user cannot acknowledge **403**, temp data cleaned. *(Verification-script duplication produced one extra re-ack 409 artifact; required behaviors verified.)*
- **Not tested:** interactive emulator runtime, physical device, on-device permissions/location/TTS, lint/automated mobile UI tests.

## Known limitations
- `communication_items`, `routines`, `medicines`, `situation_steps`, and `emergency_contacts`/`sos_alerts` may be empty in live DB → honest empty states. No fake data inserted.
- **SOS:** external SMS/email/push/emergency-service contact **not implemented/verified**; saved-in-MySQL ≠ external delivery ≠ emergency-service contact. No `RESOLVED` status (schema-limited). No auto-trigger, no background tracking.
- **Local device notifications not implemented/verified** (no `expo-notifications`). HELP ME is stored-guidance only. MY FEELINGS local-only. No offline sync/log queue. No full accessibility certification. Stateless JWT logout. Device TTS/Bengali voice support varies.

## Phase 5G QA notes (executed)
- **Stage A (Phase 5F correction):** corrected temp SOS verification script (removed duplicated re-ack block; added explicit expected 409 repeat-ack check; fixed cleanup verification). **25/25 PASS** on real backend+MySQL with temp data cleaned and pre-existing SOS/contact records unchanged. Backend acknowledgement behavior confirmed correct.
- **Static/API-DB QA:** `npx tsc --noEmit` PASS, `npx expo-doctor` 20/20 PASS, backend `npm test -- --runInBand` **11 suites/49 tests PASS**, health DB-connected, API integration QA **23/23 PASS** (auth, empty catalogs/endpoints, ownership, cleanup). No emulator/adb/physical device available → **interactive runtime not tested**.

## Recommended next steps (Phase 6 / remaining QA)
- **Emulator/physical-device QA and regression** across 5A–5F (auth/session restore UX, populated TALK/MY DAY/MEDICINE/HELP ME flows, SOS permission/location/offline runtime, TTS EN/BN voices, accessibility, network states).
- **Phase 6 caregiver dashboard** (React/Vite/TS) consuming real APIs with honest status/delivery handling.
- With explicit approval only: safe seeding of minimal real demo data. Keep backend/DB/contracts and existing data intact. No unverified functionality claims.

