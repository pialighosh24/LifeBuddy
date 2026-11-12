# Life Buddy — Caregiver Dashboard (Phase 6A Foundation)

React + Vite + TypeScript + CSS caregiver web dashboard foundation for Life Buddy, connected to the existing Express/MySQL backend (`/api/v1`).

## Implemented in Phase 6A
- Dashboard scaffold (Vite + React + TypeScript) in `dashboard/`
- Centralized API client (`VITE_API_BASE_URL`, timeout, JSON/error handling, no token/password logging)
- Caregiver authentication against real backend (`POST /api/v1/auth/caregiver/login`)
- Session restoration via `GET /api/v1/auth/me` on load/reload
- Protected routes and caregiver-only access enforcement (UI guard + backend authorization)
- Honest session handling: 401 clears invalid session; network/timeout/5xx preserves token and shows retry state (no false logout)
- Responsive layout: sidebar (desktop), collapsible/mobile drawer navigation, header/profile menu, logout
- Overview page using **real backend data only** (`GET /api/v1/care-users`) with loading/empty/error/retry states
- Placeholder "Coming in a later phase" pages for management modules (no fake CRUD/data)
- Accessible, professional UI (midnight navy/white/cyan, semantic structure, labels, focus states, keyboard-friendly controls)

## Prerequisites
- Node.js/npm
- Running Life Buddy backend with MySQL `lifebuddy_db` connected
- Backend reachable from browser (default local: `http://localhost:4000`)

## Environment configuration
Create `dashboard/.env` (do not commit secrets):
```env
VITE_API_BASE_URL=http://localhost:4000
```
See `.env.example`. `.env` is gitignored.

## Install & run
```powershell
cd dashboard
npm install
npm run dev      # Vite dev server (default http://localhost:5173)
```

## Build & checks
```powershell
npm run typecheck   # tsc --noEmit
npm run build       # typecheck + vite build
npm run preview
```

## Routes (Phase 6A)
- `/login` — caregiver login
- `/dashboard` — Overview (real linked care-user data)
- `/dashboard/care-users`, `/dashboard/routines`, `/dashboard/medicines`, `/dashboard/communication`, `/dashboard/situations`, `/dashboard/emergency-contacts`, `/dashboard/sos-alerts`, `/dashboard/settings` — **placeholders (later phases, no fake data)**

## Authentication & session (security notes)
- Backend auth is **bearer JWT** (no HttpOnly cookie auth in current backend contract); no backend auth changes made.
- Token stored in **sessionStorage** (cleared on tab/session close) to reduce persistent exposure vs localStorage. **XSS risk remains** (same-origin scripts can read token). Mitigations: no token logging, no `dangerouslySetInnerHTML`, clear on 401, strict API handling. HttpOnly/Secure/SameSite cookies would be preferable but require backend changes (not implemented). Tradeoff documented.
- `GET /auth/me` restores session; invalid/expired token (401) → cleared and redirected to login. Network/5xx/timeout → token preserved, retry state shown. Logout calls backend best-effort and clears local session; **backend JWT logout is stateless (no server-side revocation claimed)**.
- Caregiver-only access enforced in UI guards and by backend authorization.

## Known limitations
- Management modules beyond Overview are placeholders (no CRUD, no fabricated data/endpoints).
- No browser/E2E UI automation executed in this environment; UI behavior verified by build/static checks and real API integration patterns.
- Backend CORS must allow the dashboard origin (e.g. `http://localhost:5173` in backend `CORS_ORIGIN`) — existing backend config supports this; not modified.
- No refresh-token rotation or server-side token revocation.
- SOS `RESOLVED` not supported by backend schema; no external delivery claims.
- Live catalogs (care users/contacts/alerts etc.) may be empty — honest empty states shown.

## Next phase
- **Phase 6B:** implement Care Users management (and related flows) using existing authorized backend APIs, with real data, validation, ownership enforcement, and full verification.
## Phase 6B — Care Users management (implemented)
- Routes: `/dashboard/care-users` (protected) using real backend APIs.
- Features: list (search over fetched data, status filter, loading/empty/error/retry/refresh), create (validation, duplicate-submit prevention, server errors), detail view, edit (PATCH supported fields), PIN set/reset (masked, explicit confirmation, never displayed/logged, only on server success).
- API endpoints used: `GET/POST /api/v1/care-users`, `GET/PATCH /api/v1/care-users/:id`, `POST /api/v1/care-users/:id/pin` (Bearer JWT).
- Authz: caregiver-only enforced by UI + backend; unauthorized/unlinked returns 403 from backend; care-user role denied (403). Ownership required.
- Safety: no fabricated data, PIN not exposed, temp test records cleaned, no backend/schema/API/auth changes.

## Phase 6C — Emergency Contacts management (implemented)
- Route: `/dashboard/emergency-contacts` (protected, caregiver-only UI + backend). Integrated with Care Users (select linked care user; "Manage emergency contacts" link from care-user detail).
- Features (real backend/MySQL): list contacts for selected linked care user (loading/empty/error/retry/refresh), add, edit, delete (explicit confirmation) — all operations supported by existing backend and implemented. Client-side validation consistent with backend; server validation/ownership errors displayed; duplicate-submission prevention; success only after server confirmation; list refreshed after confirmed mutations.
- Fields shown/submitted (actual contract): `contactName` (required), `phoneNumber` (required), `relationshipLabel`, `email`, `isPrimary`. No fabricated data/contacts.
- API endpoints used: `GET/POST /api/v1/care-users/:id/emergency-contacts`, `GET/PATCH/DELETE /api/v1/emergency-contacts/:contactId`.
- Authz/ownership: backend enforces active caregiver–care-user link (unlinked/unauthorized → 403 actual); missing/invalid token 401; care-user role denied for manage operations (403). Valid session not cleared on temporary network errors.
- Verified: dashboard tsc/build PASS; backend 11 suites/49 tests PASS; real API+MySQL integration 37/37 PASS (create/list/get/update/delete, validation incl. invalid phone/email, ownership/role denial, DB persistence/primary handling, cleanup baseline restored). **Browser runtime QA: NOT PERFORMED — pending.**

## Phase 6D — SOS Alerts & caregiver acknowledgement (implemented)
- Route: `/dashboard/sos-alerts` (protected, caregiver-only UI + backend). Integrated with Care Users (select linked care user; "View SOS alerts" link from care-user detail).
- Features (real backend/MySQL): alert list/history for selected linked care user (loading/honest empty/error/retry/refresh, client-side status filter over fetched data), alert detail view, caregiver acknowledgement (explicit confirmation, duplicate-submit prevention, only when state allows) — acknowledgement supported and implemented; **resolve not supported by backend schema** and not exposed. Success only after server confirmation; list/detail refreshed after confirmed acknowledgement. Repeated acknowledgement handled as backend **409 conflict** (no false success).
- Status contract (actual): `created, pending, sent, failed, acknowledged, cancelled` — **no `RESOLVED`**. UI shows actual backend status/ack metadata/location only when present; no invented timestamps/addresses/delivery.
- Delivery/safety honesty: SOS stored in MySQL ≠ external delivery. **No SMS/email/push/emergency-service delivery confirmed/claimed.** Acknowledgement records caregiver response only and does not mean emergency ended. No auto-ack/resolve/cancel.
- API endpoints used: `GET /api/v1/care-users/:id/sos-alerts` (and history alias), `GET /api/v1/sos/:alertId`, `PATCH /api/v1/sos/:alertId/acknowledge`.
- Authz/ownership: backend enforces active caregiver–care-user link (unlinked → 403 actual); missing/invalid token 401; care-user cannot acknowledge (403). Valid session not cleared on temporary network errors.
- Verified: dashboard tsc/build PASS; backend 11 suites/49 tests PASS; real API+MySQL integration 31/31 PASS (auth, list/detail, ownership/role denial, create+DB persistence with/without coords, acknowledgement+DB metadata, repeat ack 409, 404s, cleanup users/links/sos_alerts baseline restored). **Browser runtime QA: NOT PERFORMED — pending.**

## Phase 6E — Daily Routines management (implemented)
- Route: `/dashboard/routines` (protected, caregiver-only UI + backend). Integrated with Care Users (select linked care user; "Manage routines" link from care-user detail).
- Features (real backend/MySQL, supported operations only): care-user scoped routine list (loading/honest empty/error/retry/refresh, search/status filter over fetched data), create, edit, delete (explicit confirmation), activate/deactivate; routine detail with ordered step management (add/edit/delete/reorder via backend), and read-only completion history/progress views (genuine records only). No fabricated routines/counts/progress.
- **Supported:** routine CRUD, `isActive` toggle, steps CRUD + reorder, completion history (`GET /routines/:id/completions`) and progress (`GET /care-users/:id/routine-progress`). **Not supported by current contract (not implemented/faked):** scheduling/recurrence/time-of-day/day fields, dashboard-initiated completion recording/auto-completion, offline sync UI.
- Fields (actual): routine `titleEn/titleBn/descriptionEn/descriptionBn/iconKey/isActive` (+ ids/timestamps/stepCount); steps `instructionEn/instructionBn/imageKey/audioHintKey/stepOrder`; completions `routineStepId/completionStatus(completed|skipped|pending_sync)/completedAt/source/notes` etc.
- API endpoints used: `GET/POST /care-users/:id/routines`, `GET /care-users/:id/routine-progress`, `GET/PATCH/DELETE /routines/:routineId`, `POST/PATCH(reorder)/DELETE /routines/:routineId/steps...`, `PATCH/DELETE /routines/:routineId/steps/:stepId`, `GET /routines/:routineId/completions`.
- Authz/ownership: backend enforces active caregiver–care-user link (unlinked/other caregiver 403 actual); care-user can view own but cannot modify definitions (403). Missing/invalid token 401.
- Mobile compatibility: no backend/mobile changes; dashboard uses same read/manage contracts. Backend regression incl. routine tests passed.
- Verified: dashboard tsc/build PASS; backend 11 suites/49 tests PASS; real API+MySQL integration 42/42 PASS (CRUD/steps/reorder, activate/deactivate, validation, auth/role/ownership, completions/progress, DB persistence/cascade delete, cleanup baselines restored). **Browser runtime QA: NOT PERFORMED — pending.**

## Phase 6F — Medicines management (implemented)
- Route: `/dashboard/medicines` (protected, caregiver-only UI + backend). Integrated with Care Users (select linked care user via list or `?careUserId=`; "Manage medicines" link from care-user detail; Overview link updated).
- Features (real backend/MySQL, supported operations only): care-user scoped medicine list (loading/honest empty/error/retry/refresh, search over fetched data, active/inactive filter), create/edit medicine (caregiver-entered fields only; validation; duplicate-submit prevention; success only after server confirmation), activate/deactivate and delete medicine (explicit confirmation with honest behavior: default deactivate, `?hard=true` deletes with cascades as per backend/schema), reminders management (add/edit/delete/deactivate stored reminder info — **no delivery/SMS/email/push claimed/implemented**), medicine detail, and read-only medicine history/logs (genuine records only; dashboard does not mark medicines taken/modify logs).
- **Supported (actual):** list/get/create/update/deactivate/delete medicines, reminders CRUD/deactivate, logs/history retrieval. **Not supported/faked:** medical advice/diagnosis/dosage recommendations/calculations, recurring schedule invention, browser/Expo notifications, external delivery claims, dashboard completion marking, fabricated data.
- API endpoints used: `GET/POST /api/v1/care-users/:id/medicines`, `GET /api/v1/care-users/:id/medicine-history`, `GET/PATCH/DELETE /api/v1/medicines/:medicineId` (`?hard=true` for hard delete), `GET/POST/PATCH/DELETE /api/v1/medicines/:medicineId/reminders[/ :reminderId]` (`?deactivate=true` for reminder soft delete/deactivate), `GET/POST /api/v1/medicines/:medicineId/logs`.
- Authz/ownership: active caregiver–care-user link required (unlinked/other caregiver → **403** actual); care-user can view own/list/reminders/history/logs as per backend but cannot manage medicines/reminders (403). Missing/invalid token 401.
- Mobile compatibility: existing mobile medicine APIs/flows unchanged; dashboard uses same contracts (verified against mobile usage patterns). No mobile code changes.
- Verified: dashboard **tsc --noEmit** PASS, **npm run build** PASS; backend regression **11 suites/49 tests PASS**; real API+MySQL integration via automated script: **44/45 checks PASS** (1 failure due to pre-existing backend date-handling edge case on partial PATCH without explicit dates when mysql2 returns Date objects — `String(Date).slice(0,10)` mismatch causing validation; update works when dates provided explicitly; all other operations/auth/ownership/persistence/reminders/logs/hard delete verified). **Independent cleanup verified**: all temporary users/links/medicines/reminders/logs removed, baselines restored. **Browser runtime QA: NOT PERFORMED — pending.**

## Phase 6G — Communication management (implemented)
- Route: `/dashboard/communication` (protected, caregiver-only UI + backend). Integrated with Care Users (select linked care user via list or `?careUserId=`; "View communication & favourites" link from care-user detail).
- **Catalogue ownership/model (actual):** `communication_items` is a **global** (not care-user-specific) catalogue used by mobile TALK. Caregiver-manageable via existing backend (create/update/deactivate); authenticated users can read/list/filter.
- **Favourites ownership/model (actual):** `favourite_phrases` are **care-user-specific** (owned by care user). Care user can add/remove via mobile/backend self routes; **linked caregivers can list/view** favourites for an authorized care user but **cannot add/remove** (backend enforced 403). Dashboard implements **read-only favourites view** for caregivers (no add/remove controls).
- **Supported operations (implemented):** catalogue list/get/categories, search and category/active filtering over fetched data, create, update, deactivate (`DELETE` sets inactive per backend), bilingual display/preservation (EN/BN fields). Favourites: list/view for selected linked care user (read-only). **Unsupported/not exposed:** caregiver add/remove favourites (no backend support), hard delete of global items, auto-translation, fabricated content.
- **English/Bengali behavior:** actual `labelEn/labelBn`, `speakTextEn/speakTextBn` fields displayed/preserved as stored; missing BN shown honestly; no fabricated/auto translations, no claims of professional verification. `itemKey`/identifiers/semantics unchanged.
- **API endpoints used:** `GET/POST/PATCH/DELETE /api/v1/communication-items`, `GET /api/v1/communication-items/categories`, `GET /api/v1/communication-items/:itemId`, `GET /api/v1/care-users/:id/favourites`.
- **Mobile TALK compatibility:** no backend/mobile changes; catalogue fields/identifiers/category/icon-key semantics and favourites retrieval contracts preserved (mobile unchanged). Backend communication/favourites regression tests passed.
- **Verified:** dashboard **tsc --noEmit PASS**, **npm run build PASS**; backend regression **11 suites/49 tests PASS**; real API+MySQL integration **45/45 PASS** (auth/role/ownership, catalogue CRUD/deactivate/filter/categories, bilingual persistence/retrieval, favourites add/list/duplicate/remove/ownership rules, DB persistence, missing refs/404/409/400). Temp records cleaned and baselines restored (users/links/communication_items/favourite_phrases 0→0). **Browser runtime QA: NOT PERFORMED — pending.** Keep Phase 6F medicine PATCH note in tracker.

## Phase 6H — Situation Guidance management (implemented, read-only)
- Route: `/dashboard/situations` (protected, caregiver-only UI + backend). Global/predefined guidance catalogue used by mobile HELP ME.
- **Ownership/model (actual):** `situation_steps` stores guidance grouped by `situation_key` (global `care_user_id NULL` / predefined; service supports care-user custom precedence but no CRUD APIs exist). No category field in schema.
- **Supported operations (implemented):** catalogue list retrieval, situation detail retrieval, ordered step viewing, search over fetched data, active filter (`active=all` supported). Bilingual EN/BN titles/instructions displayed as stored.
- **Unsupported (not exposed, per actual backend):** situation/step create, update, delete/deactivate, reorder, and category filtering — no backend APIs/contracts exist. Implemented as **read-only** (no fake CRUD controls).
- **Safety:** displays stored/deterministic guidance only; no AI-generated medical/legal/emergency advice, no changes to HELP ME/SOS behavior, no auto SOS/contact claims. Existing safety behavior preserved.
- **API endpoints used:** `GET /api/v1/situations`, `GET /api/v1/situations/:situationKey`, `GET /api/v1/situations/:situationKey/steps`.
- **Mobile HELP ME compatibility:** no backend/mobile changes; fields/identifiers/ordering (`situationKey`, titles, step `id/stepOrder`, EN/BN instructions, `imageKey`, predefined/active semantics) preserved.
- **Verified:** dashboard **tsc --noEmit PASS**, **npm run build PASS**; backend regression **11 suites/49 tests PASS**; real API+MySQL read-only integration **17/17 PASS** (auth 401/invalid 401, list 200 for caregiver/care-user incl. `active=all`, missing 404, unsupported CRUD routes 404/405, DB baselines unchanged; temp auth records cleaned, `situation_steps` baseline 0→0). Live catalogue currently empty (honest empty states). **Browser runtime QA: NOT PERFORMED — pending.** Phase 6F medicine PATCH issue remains documented.

## Phase 6I — Settings & Preferences (implemented)
- Route: `/dashboard/settings` (protected, caregiver-only UI + backend).
- **Account information (caregiver, self):** real profile via `GET /api/v1/profile`; editable supported fields via `PATCH /api/v1/profile` (`fullName`, `displayName`, `preferredLanguage` en/bn, `phoneNumber`). No password/token/hash/secret/session-management changes exposed.
- **Care-user preferences (linked care users):** real retrieval/update via `GET/PUT /api/v1/care-users/:id/preferences` for authorized linked care users (backend enforces). Supported fields: `language`, `textSize`, `contrastMode`, `speechRate`, `voiceEnabled`, `reducedMotion`, `notificationsEnabled` (stored preference flag only — **no notification delivery implemented/claimed**). Preferences auto-created with defaults when missing (backend behavior).
- **Ownership/model:** caregiver manages own profile; caregivers can manage **linked care-user** preferences (and care-user self can via backend). No caregiver-owned accessibility-preferences endpoint exists; dashboard does not invent it.
- **Unsupported/not exposed:** password change/reset, caregiver self accessibility prefs endpoint, theme/display sync to backend, notification delivery (browser/Expo/SMS/email), token revocation/invented session controls, unsupported settings.
- **Mobile compatibility:** existing preference/profile contracts/field names/values preserved; mobile app language currently device-local (SecureStore) and may differ from backend profile/preference language — documented honestly. No mobile/backend changes.
- **Verified:** dashboard **tsc --noEmit PASS**, **npm run build PASS**; backend regression **11 suites/49 tests PASS**; real API+MySQL integration **29/29 PASS** (auth 401/invalid 401, profile get/update + DB persistence + validation/no-secrets, prefs get/create-defaults/update all supported fields + DB persistence + validation, ownership/role restrictions 403, missing target 403/404; cleanup baselines restored users/links/user_preferences 0→0). **Browser runtime QA: NOT PERFORMED — pending.** Phase 6F medicine PATCH issue remains documented.
