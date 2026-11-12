# Mobile Architecture (Phase 5A–5G QA)

## Overview
- **Stack:** React Native + Expo (SDK ~58.0.23) + TypeScript
- **Routing:** `expo-router` (file-based). Route groups: `(auth)` unauthenticated, `(app)` authenticated.
- **Providers:** `AuthProvider` (session/auth) and `LanguageProvider` (EN/BN UI, persisted preference).
- **Backend:** Existing Express REST API (`/api/v1`) with MySQL `lifebuddy_db`; real endpoints only (no mocks/fake data).

## Navigation & auth gating
- `app/_layout.tsx` composes providers and `AuthGate`.
- **Bootstrap:** read JWT from SecureStore → `GET /api/v1/auth/me`.
  - **200 valid:** restore authenticated session → `(app)`.
  - **401 invalid/expired:** clear token → `(auth)` login.
  - **Network/timeout/5xx or temporary verification failure:** **preserve token**, no login redirect, show connection error with **Retry** and local sign-out option.
- Authenticated users redirected away from auth group; unauthenticated users redirected to login (except offline-unverified state).

## Implemented screens (5A–5F)
- **Auth:** caregiver login (email/password), care-user PIN login (ID + 4–8 digit PIN).
- **Home:** 6 accessible action tiles (TALK, MY DAY, MEDICINE, MY FEELINGS, HELP ME, SOS) with i18n labels.
- **Profile & Session:** user info, EN/BN language selection (persisted), logout.
- **TALK:** real communication catalog, category/search, sentence builder, TTS, care-user favourites with role-aware UI and honest states.
- **MY FEELINGS:** local-only emotion selection (no backend persistence).
- **MY DAY (5C):** real routines/progress/completions with step-by-step execution, bounded navigation, reused TTS, server-confirmed completion.
- **MEDICINE (5D):** real medicines/reminders/history/logs with explicit Taken/Skipped logging and server-confirmed refresh. **Local notification delivery not implemented/verified**.
- **HELP ME (5E):** real situation catalogue/detail/steps with step-by-step guidance, reused TTS, EN/BN fallback, and stored-guidance safety (no auto-trigger SOS). Live catalogue currently empty.
- **SOS (5F):** care-user emergency alert flow with explicit confirmation/cancel, duplicate-submission protection, foreground permission-aware location capture (`expo-location`, optional), and real API integration (`POST /api/v1/sos`, `GET /care-users/:id/sos-alerts`, `GET /care-users/:id/emergency-contacts`, `GET /sos/:alertId`) with `clientEventId` idempotency. Shows real alert status/history and caregiver acknowledgement as returned by backend (no `RESOLVED`), emergency contacts, and honest messaging: saved-in-MySQL ≠ external delivery ≠ emergency-service contact. No auto-trigger, no background tracking.

## API & services
- `src/constants/config.ts`: `EXPO_PUBLIC_API_BASE_URL` + `/api/v1`, timeout.
- `src/services/api/client.ts`: fetch + timeout, Bearer auth, JSON/error parsing, validation message extraction; clears token on 401 responses. `AuthContext` decides session handling (preserve token on network/temporary failures during restore).
- `src/services/api/authApi.ts`, `communicationApi.ts`, `favouritesApi.ts`, `routineApi.ts`, `medicineApi.ts`, `situationApi.ts`, `sosApi.ts`: typed real-endpoint calls.
- `src/services/auth/tokenStorage.ts`: SecureStore JWT.
- `src/services/speech/tts.ts`: expo-speech wrapper (speak/stop, best-effort en-US/bn-BD, overlap avoidance, error handling) reused by TALK, MY DAY, MEDICINE, HELP ME.
- `src/utils/sentence.ts`: label/speak text selection by language with fallbacks, sentence composition and punctuation normalization.
- `src/types/routine.ts`, `src/types/medicine.ts`, `src/types/situation.ts`, `src/types/sos.ts`: types aligned to backend responses.

## Internationalisation
- `src/i18n/translations.ts` + `LanguageContext.tsx` (EN/BN, SecureStore-persisted). UI strings translated; backend item labels/speak text use `*Bn` when available with honest fallback to EN fields.

## Security & data handling
- JWT in **SecureStore** only; no credentials/tokens/PINs logged or stored in AsyncStorage. Language preference stored locally (non-secret).
- Favourites: only created/removed after successful API responses; ownership/role enforced by backend and reflected in UI.
- Communication data displayed from backend responses only; in-memory session caching distinguished from fresh loads (no false persistence claims).

## Accessibility & UX (foundation)
- Large touch targets, labels/roles/states, readable contrast, clear loading/empty/error/success states, retry actions, responsive card layouts. Not fully accessibility-certified.

## Known technical notes/limitations
- TypeScript strict (`tsc --noEmit` pass), `expo-doctor` 20/20 pass. No mobile lint/unit-test framework configured beyond scripts/checks.
- `communication_items`, `routines`, `medicines`, `situation_steps`, `sos_alerts`/`emergency_contacts` may be empty in live DB → honest empty states shown (verified). Bengali TTS voice availability is device-dependent.
- HELP ME presents deterministic stored guidance only (no dynamic/AI safety or emergency-response authority; SOS not auto-triggered).
- SOS: alert saved-in-MySQL ≠ backend status ≠ caregiver acknowledgement ≠ external delivery. External SMS/email/push/emergency-service contact **not implemented/verified**; no `RESOLVED` status (schema-limited). No background location tracking.
- Local device notification delivery not implemented/verified (no `expo-notifications`); reminders are server-stored/displayed only. No offline sync/log queue, no emotion persistence; emulator/physical runtime QA not executed. No backend/DB schema changes made.