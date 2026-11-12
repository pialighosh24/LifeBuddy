# Dashboard Architecture (Phase 6A)

## Stack
- React 19 + Vite 6 + TypeScript + CSS
- `react-router-dom` for routing
- Fetch-based centralized API client (no extra HTTP dependency)

## Structure (`dashboard/src/`)
- `types/` — shared auth/API/care-user types
- `services/apiClient.ts` — base URL (`VITE_API_BASE_URL` + `/api/v1`), timeout, auth header, JSON/error/401/network handling, sessionStorage token helpers
- `services/authApi.ts` — `POST /auth/caregiver/login`, `GET /auth/me`, `POST /auth/logout`
- `services/careUserApi.ts` — `GET /care-users` (linked care users, caregiver-only)
- `context/AuthContext.tsx` — session state (`loading|authenticated|unauthenticated|offline_unverified`), restore, login, logout, caregiver-role enforcement
- `components/ProtectedRoute.tsx`, `SessionBanner.tsx` — route protection and retry UI
- `layouts/DashboardLayout.tsx` — responsive sidebar/header/profile/logout shell
- `pages/` — Login, Overview (real data), placeholders, NotFound
- `styles/index.css` — design system (midnight navy/white/cyan), responsive behavior

## API compatibility (Phase 6A, verified from backend)

| Method | Route | Auth | Role | Request | Response (actual) | Notes |
|---|---|---|---|---|---|---|
| POST | `/api/v1/auth/caregiver/login` | No | caregiver credentials | `{ email, password }` | `{ success, message, data: { token, user } }` | `user`: id, role, email, fullName, displayName, preferredLanguage |
| GET | `/api/v1/auth/me` | Bearer | authenticated | — | `{ success, message, data: { user } }` | `user`: id, role, email, fullName, displayName, preferredLanguage (from auth middleware) |
| POST | `/api/v1/auth/logout` | Bearer | authenticated | — | `{ success, message, data: null }` | Stateless (best-effort); client clears session |
| GET | `/api/v1/care-users` | Bearer | caregiver | — | `{ success, message, data: { careUsers: [...] } }` | Each: sanitized user fields + `link { relationshipType, linkStatus, linkedAt }` |

- Errors: `{ success:false, message, code?, errors? }` (validation `errors[]`, 401 `UNAUTHORIZED`, 403 `FORBIDDEN`, etc.). Ownership enforced server-side.
- No cookie-based auth available; backend expects `Authorization: Bearer <token>`.

## Session/security decisions
- **Storage:** sessionStorage token (tab-scoped, non-persistent across browser close) chosen over localStorage to reduce persistent exposure; in-memory rejected due to required reload restoration. XSS risk remains → mitigations and tradeoffs documented (no token logging, safe rendering). HttpOnly cookie preferred long-term but requires backend contract changes (not made).
- **401:** clear token and require login. **Network/5xx/timeout:** preserve token, show retry (`offline_unverified`). **Logout:** stateless server-side; local token cleared.
- Caregiver-only UI enforcement plus backend role/ownership checks.

## CORS / connectivity
- Backend uses `cors` with `CORS_ORIGIN` allowlist and `credentials:true` (`backend/.env.example` includes `http://localhost:5173`). Default dashboard dev URL `http://localhost:5173`, API `http://localhost:4000`. No backend CORS/auth changes made.

## Limitations
- Only Overview consumes real data; other modules are placeholders pending later phases and endpoint mapping.
- No refresh/revocation, no external notification claims, no fabricated metrics. Live linked care-user list may be empty.
## Phase 6B — Care Users management (added)
- **Page:** `src/pages/CareUsersPage.tsx` (list/search-filter over fetched data, create, detail, edit, PIN set/reset). Route `/dashboard/care-users`.
- **API client:** `src/services/careUserApi.ts` — `getLinkedCareUsers`, `getCareUser`, `createCareUser`, `updateCareUser`, `setCareUserPin` mapping to real endpoints above.
- **Contract notes (actual):** create returns 201 `{data:{careUser}}` without link; list/detail return careUser with `link`. PATCH supports `fullName, displayName, preferredLanguage, phoneNumber, status` only. PIN `POST /care-users/:id/pin {pin}` (4-8 digits) — hashed server-side, never returned. **Ownership denial for unlinked caregiver returns 403** (not 404) for GET/PATCH/PIN; invalid/missing token 401; care-user role 403 on caregiver endpoints.
- **UI safety:** no PIN display/storage/logging/URL exposure, masked inputs + confirmation + clear-on-success; duplicate-submit prevention; honest loading/empty/error/unauthorized states; search/filter client-side over fetched results only; no fabricated data.
- **Verified:** dashboard tsc/build PASS; backend 11 suites/49 tests PASS; real API+MySQL integration 28/28 PASS (temp records cleaned, baseline restored). Browser UI runtime not automated.

## Phase 6C — Emergency Contacts management (added)
- **Page:** `src/pages/EmergencyContactsPage.tsx` (care-user selector from real linked care-users, per-care-user contact list, add/edit/delete with confirmation). Route `/dashboard/emergency-contacts` (+ query `careUserId` preselection). Care-user detail links to this module.
- **Types/API:** `src/types/emergencyContact.ts`, `src/services/emergencyContactApi.ts` — `listEmergencyContacts`, `createEmergencyContact`, `getEmergencyContact`, `updateEmergencyContact`, `deleteEmergencyContact`.
- **API compatibility (actual, verified):**
  - `POST /api/v1/care-users/:id/emergency-contacts` (Bearer, caregiver linked) body `{ contactName, phoneNumber, relationshipLabel?, email?, isPrimary? }` → `201 { data:{ contact } }`.
  - `GET /api/v1/care-users/:id/emergency-contacts` (Bearer, linked caregiver or care-user self) → `200 { data:{ contacts[] } }` ordered primary first.
  - `GET /api/v1/emergency-contacts/:contactId` (Bearer, authorized) → `200 { data:{ contact } }`.
  - `PATCH /api/v1/emergency-contacts/:contactId` (Bearer, caregiver linked) body supported subset `{ contactName?, phoneNumber?, relationshipLabel?, email?, isPrimary? }` → `200 { data:{ contact } }`.
  - `DELETE /api/v1/emergency-contacts/:contactId` (Bearer, caregiver linked) → `200 { data:{ deletedContactId, careUserId } }`.
  - Contact fields: `id, careUserId, contactName, relationshipLabel, phoneNumber, email, isPrimary, createdAt, updatedAt`.
- **Validation/rules (actual):** contactName required (1-150), phoneNumber required matching `^[0-9+\-() ]{6,30}$`, relationshipLabel max 80, email valid if provided, isPrimary boolean. Backend manages primary consistency transactionally (single primary, promotion on delete/update as needed).
- **Ownership/auth:** active caregiver–care-user link required (unlinked/other caregiver → **403** actual); care-user may view own list but cannot create/update/delete (403). Missing/invalid token 401; not found 404.
- **Supported operations:** create/list/get/update/delete all supported and implemented (no unsupported ops faked).
- **Verified:** dashboard tsc/build PASS; backend 11/49 PASS; real API+MySQL integration 37/37 PASS (auth/role/ownership, CRUD, validation incl. invalid phone/email, DB persistence/primary behavior, 404s, cleanup baseline users/links/emergency_contacts 0→0). Browser runtime QA: NOT PERFORMED — pending.

## Phase 6D — SOS Alerts & caregiver acknowledgement (added)
- **Page:** `src/pages/SosAlertsPage.tsx` (care-user selector from real linked care-users, alert list/history, detail, acknowledge action). Route `/dashboard/sos-alerts` (+ query `careUserId` preselection). Care-user detail links to SOS alerts.
- **Types/API:** `src/types/sos.ts`, `src/services/sosApi.ts` — `listSosAlerts`, `getSosAlert`, `acknowledgeSosAlert`.
- **API compatibility (actual, verified):**
  - `GET /api/v1/care-users/:id/sos-alerts` and `GET /api/v1/care-users/:id/sos-history` (Bearer, linked caregiver or care-user self) → `200 { data:{ alerts[] } }` (triggered_at desc).
  - `GET /api/v1/sos/:alertId` (Bearer, authorized) → `200 { data:{ alert } }`.
  - `PATCH /api/v1/sos/:alertId/acknowledge` (Bearer, caregiver linked) → `200 { data:{ alert } }` sets `alertStatus=acknowledged`, `acknowledgedAt`, `acknowledgedBy`; **409 CONFLICT** if already acknowledged/final/conflicting state (actual, handled). `PATCH /sos/:alertId/resolve` exists but returns 400 unsupported by schema — **not used**.
- **Alert fields (actual):** `id, careUserId, emergencyContactId, latitude, longitude, locationStatus(available|unavailable|denied|disabled), alertStatus(created|pending|sent|failed|acknowledged|cancelled), deliveryStatus, deliveryChannel, deliveryMessage, failureReason, triggeredAt, acknowledgedAt, acknowledgedBy, clientEventId, createdAt, updatedAt`.
- **Status/safety:** exact backend statuses only (**no `RESOLVED`**). Acknowledgement = caregiver response recorded only; does not end emergency. External SMS/email/push/emergency-service delivery **not confirmed/claimed** (delivery fields are stored/dashboard state). No auto actions.
- **Ownership/auth:** active caregiver–care-user link required (unlinked/other caregiver → **403**); care-user cannot acknowledge (403). Missing/invalid token 401; not found 404.
- **Verified:** dashboard tsc/build PASS; backend 11/49 PASS; real API+MySQL integration 31/31 PASS (list/detail, ownership/role denial, SOS create+DB persistence with/without coords, acknowledgement+DB metadata, repeat ack 409, 404s, cleanup baseline users/links/sos_alerts 0→0). Browser runtime QA: NOT PERFORMED — pending.

## Phase 6E — Daily Routines management (added)
- **Page:** `src/pages/RoutinesPage.tsx` (care-user selection, routine list/create/edit/delete/activate-deactivate, detail with ordered steps add/edit/delete/reorder, completion history + progress read-only). Route `/dashboard/routines` (+ `careUserId` preselection). Care-user detail links to routines.
- **Types/API:** `src/types/routine.ts`, `src/services/routineApi.ts` mapping to actual endpoints.
- **API compatibility (actual, verified):**
  - `POST /api/v1/care-users/:id/routines` (caregiver linked) body `{ titleEn, titleBn?, descriptionEn?, descriptionBn?, iconKey?, isActive?, steps?[{instructionEn,instructionBn?,imageKey?,audioHintKey?}] }` → `201 { data:{ routine, steps[] } }`.
  - `GET /api/v1/care-users/:id/routines` (self/linked caregiver) → `{ data:{ routines[] } }` (includes `stepCount`).
  - `GET /api/v1/care-users/:id/routine-progress?date=` (self/linked caregiver) → `{ data:{ careUserId,date,progress[] } }`.
  - `GET /api/v1/routines/:routineId` → `{ data:{ routine, steps[] } }`.
  - `PATCH /api/v1/routines/:routineId` body `{ titleEn?, titleBn?, descriptionEn?, descriptionBn?, iconKey?, isActive? }` → `{ data:{ routine, steps[] } }`.
  - `DELETE /api/v1/routines/:routineId` → `{ data:{ deletedRoutineId } }` (cascades steps/completions per schema).
  - `POST /api/v1/routines/:routineId/steps` `{ instructionEn, instructionBn?, imageKey?, audioHintKey?, stepOrder? }` → `201 { data:{ step } }`.
  - `PATCH /api/v1/routines/:routineId/steps/reorder` `{ orderedStepIds: [...] }` (all ids, unique) → `{ data:{ routine, steps[] } }`.
  - `PATCH /api/v1/routines/:routineId/steps/:stepId` `{ instructionEn?, instructionBn?, imageKey?, audioHintKey?, stepOrder? }` → `{ data:{ step } }`.
  - `DELETE /api/v1/routines/:routineId/steps/:stepId` → `{ data:{ deletedStepId } }` (resequenced).
  - `GET /api/v1/routines/:routineId/completions?date=` → `{ data:{ completions[] } }`.
- **Supported operations:** routine create/list/get/update/delete, activate/deactivate (`isActive`), steps add/update/delete/reorder, view completions history and progress. **Unsupported/not implemented:** scheduling/recurrence/time-of-day fields (not in contract), dashboard completion recording/auto-completion.
- **Ownership/auth:** caregiver actively linked required for manage/view (403 if unlinked); care-user may view own/list/progress/completions as per backend but cannot modify definitions (403). 401 invalid/missing token; 404 missing routine/step.
- **Completion/progress:** read-only genuine backend records/summaries; no fabricated percentages, no auto-completion, no duplicate completion system. Mobile MY DAY compatibility preserved (no backend/mobile changes; regression tests passed).
- **Verified:** dashboard tsc/build PASS; backend 11/49 PASS; real API+MySQL 42/42 PASS (CRUD/steps/reorder/activate-deactivate, validation, auth/role/ownership, completions/progress, DB persistence/cascade delete, cleanup baselines restored). Browser runtime QA: NOT PERFORMED — pending.

## Phase 6F — Medicines management (added)
- **Page:** `src/pages/MedicinesPage.tsx` (care-user selection via linked care-users and `?careUserId=`, medicine list with search/active filter, create/edit, deactivate/delete with confirmations, reminders CRUD/deactivate, medicine detail, read-only logs and care-user medicine history). Route `/dashboard/medicines`. Care-user detail and Overview link to medicines.
- **Types/API:** `src/types/medicine.ts`, `src/services/medicineApi.ts`.
- **API compatibility map (actual, verified from backend/mobile/docs):**
  - `GET /api/v1/care-users/:id/medicines` (Bearer, self or linked caregiver) → `200 { data:{ medicines[] } }` (reminders joined per medicine by service).
  - `POST /api/v1/care-users/:id/medicines` (Bearer, caregiver linked) body `{ medicineName, prescribedInstructions?, notes?, startDate?, endDate?, isActive? }` → `201 { data:{ medicine } }`.
  - `GET /api/v1/care-users/:id/medicine-history` (Bearer, self or linked caregiver) → `200 { data:{ careUserId, history[] } }`.
  - `GET /api/v1/medicines/:medicineId` (Bearer, authorized) → `200 { data:{ medicine, reminders[] } }`.
  - `PATCH /api/v1/medicines/:medicineId` (Bearer, caregiver linked) body subset `{ medicineName?, prescribedInstructions?, notes?, startDate?, endDate?, isActive? }` → `200 { data:{ medicine } }`.
  - `DELETE /api/v1/medicines/:medicineId` (Bearer, caregiver linked) → default deactivate `200 { data:{ medicine } }`; `?hard=true` delete `200 { data:{ deletedMedicineId } }` (cascades reminders/logs per schema FKs).
  - `GET/POST /api/v1/medicines/:medicineId/reminders` (GET authorized; POST caregiver) create body `{ reminderTime(HH:MM), frequency?(once|daily|weekly|custom, default daily), daysOfWeek?, reminderLabel?, isActive? }` → `201 { data:{ reminder } }`.
  - `PATCH /api/v1/medicines/:medicineId/reminders/:reminderId` (caregiver) → `200 { data:{ reminder } }`.
  - `DELETE /api/v1/medicines/:medicineId/reminders/:reminderId` (caregiver) → default hard delete `200 { data:{ deletedReminderId } }`; `?deactivate=true` `200 { data:{ reminder } }`.
  - `GET /api/v1/medicines/:medicineId/logs` (authorized) → `200 { data:{ logs[] } }`; `POST /api/v1/medicines/:medicineId/logs` (authorized self/caregiver) body `{ status(taken|skipped|missed|pending), scheduledFor, reminderId?, respondedAt?, notes? }` → `201 { data:{ log } }` (create log not exposed in dashboard UI; read-only log views only).
- **Field/validation notes (actual):** medicineName required (1-150), dates `YYYY-MM-DD` with `endDate >= startDate`, reminderTime `HH:MM` 24h, frequency enum `once|daily|weekly|custom`. Ownership via linked caregiver/care-user checks (unlinked → 403 actual).
- **Supported operations:** medicine CRUD/list/detail, activate/deactivate, hard delete, reminders create/update/delete/deactivate/list, read-only logs & care-user history. **Unsupported/not implemented:** dosage advice/calculation, external notification delivery (SMS/email/push/browser/Expo), scheduling engine/recurrence invention beyond stored fields, dashboard log creation/modification.
- **Safety/privacy:** caregiver-entered info only (no medical advice/diagnosis/dosage changes). Reminders are stored/configured DB records only — no delivery claimed. No sensitive medicine data in URLs/query params (except `careUserId` selection), no token/sensitive payload logging, backend authoritative ownership, honest states and server-confirmed mutations.
- **Mobile compatibility:** read/manage contracts align with existing mobile `medicineApi`/types (mobile unchanged). No backend/mobile changes in Phase 6F.
- **Verified:** dashboard `npx tsc --noEmit` PASS, `npm run build` PASS; backend `npm test -- --runInBand` **11 suites/49 tests PASS**; real API+MySQL integration script: **44/45 checks PASS** (auth/role/ownership, list/get/create, validation, reminders create/update/list, logs/history retrieval, deactivate/hard delete with cascade, DB persistence and independent SQL checks). **1 check failed in script:** partial PATCH without dates returned 400 due to pre-existing backend date-compare edge case when mysql2 returns DATE as Date objects (`String(Date).slice(0,10)` in service) — endpoint behaves correctly when dates are provided; documented as limitation. Temp data cleaned and baselines independently verified restored (users/links/medicines/reminders/logs). **Browser runtime QA: NOT PERFORMED — pending.**

## Phase 6G — Communication management (added)
- **Page:** `src/pages/CommunicationPage.tsx` (global communication catalogue management + care-user favourites read-only view). Route `/dashboard/communication` (`?careUserId=` supported). Integrated from Care Users detail.
- **Types/API:** `src/types/communication.ts`, `src/services/communicationApi.ts`.
- **Ownership/management model (actual):**
  - `communication_items`: **global catalogue** (not care-user-specific), used by mobile TALK. Caregivers can create/update/deactivate via existing APIs; all authenticated users can read.
  - `favourite_phrases`: **care-user-specific**. Care user self-manages add/remove in mobile/backend; **linked caregivers may list/view** but cannot add/remove (backend 403). Dashboard shows favourites **read-only** for caregivers.
- **API compatibility map (actual, verified):**
  - `GET /api/v1/communication-items?category=&active=` (Bearer) → `200 { data:{ items[] } }`.
  - `GET /api/v1/communication-items/categories` (Bearer) → `200 { data:{ categories[{category,itemCount}] } }`.
  - `GET /api/v1/communication-items/:itemId` (Bearer) → `200 { data:{ item } }`.
  - `POST /api/v1/communication-items` (Bearer, caregiver) body `{ itemKey, category?, labelEn, labelBn?, iconKey?, speakTextEn, speakTextBn?, sentenceRole?, sortOrder?, isActive? }` → `201 { data:{ item } }`.
  - `PATCH /api/v1/communication-items/:itemId` (Bearer, caregiver) supported fields subset → `200 { data:{ item } }`.
  - `DELETE /api/v1/communication-items/:itemId` (Bearer, caregiver) → `200 { data:{ item } }` (deactivated, `is_active=false`).
  - `GET /api/v1/care-users/:id/favourites` (Bearer, self care-user or linked caregiver) → `200 { data:{ favourites[] } }`.
  - (Not used by caregiver dashboard) `POST /api/v1/care-users/:id/favourites` (self user), `DELETE /api/v1/favourites/:favouriteId` (self user) — **caregiver forbidden (403)**.
- **Fields (actual):** item `id,itemKey,category,labelEn,labelBn,iconKey,speakTextEn,speakTextBn,sentenceRole,sortOrder,isActive,createdAt,updatedAt`; favourite `id,careUserId,communicationItemId,selectedItemKeys,phraseEn,phraseBn,phraseLabel,isActive,createdAt,updatedAt`.
- **Supported operations:** catalogue read/list/filter/search, create, update, deactivate (supported by backend for caregiver) with bilingual EN/BN preservation; favourites read-only listing per linked care user. **Unsupported/not exposed:** caregiver favourite add/remove, hard delete of items, auto-translation/fabricated content, unsupported management controls.
- **Bilingual behavior:** EN/BN label/speak-text fields displayed and preserved as stored; missing BN shown honestly; no fabricated/auto translations, no professional-verification claims.
- **Security/ownership:** backend authoritative; caregiver-only catalogue management/read; favourites view restricted to linked caregiver or self; 401/403/404/409/400 handled per contracts. No token logging.
- **Mobile TALK compatibility:** no backend/mobile changes; item identifiers/keys/category/icon-key/EN-BN fields and favourites contracts preserved. Existing mobile TALK/favourites flows unaffected.
- **Verified:** dashboard `tsc --noEmit` PASS, `npm run build` PASS; backend `npm test -- --runInBand` **11 suites/49 tests PASS**; real API+MySQL integration **45/45 PASS** (auth/role/ownership, catalogue CRUD/deactivate/category filter, bilingual persistence, favourites list/add/duplicate/remove/ownership, 401/403/404/409/400, DB persistence, cleanup baselines restored users/links/communication_items/favourite_phrases 0→0). **Browser runtime QA: NOT PERFORMED — pending.** Phase 6F medicine PATCH edge case remains documented separately.

## Phase 6H — Situation Guidance (added, read-only)
- **Page:** `src/pages/SituationGuidancePage.tsx` (global/predefined situation guidance catalogue and ordered step detail view, read-only). Route `/dashboard/situations`.
- **Types/API:** `src/types/situation.ts`, `src/services/situationApi.ts`.
- **Ownership/model (actual):** `situation_steps` grouped by `situation_key` (global `care_user_id NULL`/predefined; service supports care-user custom precedence, but no CRUD APIs). **No category field in schema**. Currently live catalogue empty (`situation_steps=0`).
- **API compatibility map (actual, verified):**
  - `GET /api/v1/situations?active=all` (Bearer) → `200 { data:{ situations[] } }` (grouped summaries: `situationKey, careUserId, titleEn, titleBn, isPredefined, isActive, stepCount`).
  - `GET /api/v1/situations/:situationKey` (Bearer) → `200 { data:{ situation, steps[] } }` (ordered by `stepOrder`).
  - `GET /api/v1/situations/:situationKey/steps` (Bearer) → `200 { data:{ situationKey, steps[] } }` (404 if missing).
  - **No create/update/delete/reorder endpoints exist** (verified; requests return 404/405 as unsupported).
- **Supported operations:** list/get/detail retrieval, ordered step viewing, search over fetched data, active filter. **Unsupported/not exposed:** situation/step create/update/delete/deactivate/reorder, category filtering, AI-generated guidance.
- **Bilingual/safety:** EN/BN titles/instructions displayed as stored (no auto-translation/fabrication). Deterministic stored guidance only; no medical/legal/emergency advice generation, no SOS/HELP ME behavior changes, no auto contact claims.
- **Mobile HELP ME compatibility:** no backend/mobile changes; identifiers/fields/ordering (`situationKey`, titles, step `id/stepOrder`, EN/BN instructions, `imageKey`, predefined/active) preserved.
- **Verified:** dashboard `tsc --noEmit` PASS, `npm run build` PASS; backend `npm test -- --runInBand` **11 suites/49 tests PASS**; real API+MySQL read-only integration **17/17 PASS** (401/invalid 401, list 200 caregiver/care-user incl. `active=all`, missing 404, unsupported CRUD 404/405, DB baselines unchanged; temp auth records cleaned, `situation_steps` 0→0). **Browser runtime QA: NOT PERFORMED — pending.** Phase 6F medicine PATCH issue remains documented.

## Phase 6I — Settings & Preferences (added)
- **Page:** `src/pages/SettingsPage.tsx`. Route `/dashboard/settings`.
- **Types/API:** `src/types/profile.ts`, `src/services/profileApi.ts`.
- **API compatibility map (actual, verified):**
  - `GET /api/v1/profile` (Bearer, authenticated self) → `200 { data:{ profile } }` (sanitized: id, role, email, fullName, displayName, status, preferredLanguage, phoneNumber, timestamps; no secrets).
  - `PATCH /api/v1/profile` (Bearer, self) body subset `{ fullName?, displayName?, preferredLanguage?('en'|'bn'), phoneNumber? }` → `200 { data:{ profile } }`.
  - `GET /api/v1/care-users/:id/preferences` (Bearer, care-user self or linked caregiver) → `200 { data:{ preferences } }` (creates defaults if missing).
  - `PUT /api/v1/care-users/:id/preferences` (Bearer, care-user self or linked caregiver) body subset `{ language, textSize, contrastMode, speechRate, voiceEnabled, reducedMotion, notificationsEnabled }` → `200 { data:{ preferences } }`.
- **Preference ownership/model:** `user_preferences` per `user_id` (care-user targeted by id). Caregivers can read/update preferences for **actively linked care users** (and care-user can for self). **No caregiver-owned accessibility-preferences endpoint** exists; caregiver account has only profile fields (`preferredLanguage` on users table).
- **Supported settings:** caregiver account info (view/edit supported profile fields), care-user preferences for linked care users (all schema-supported fields). **Unsupported/not exposed:** password change/reset, caregiver self accessibility prefs, theme/display backend sync, notification delivery (browser/Expo/SMS/email), token revocation/invented session controls.
- **Notifications:** `notificationsEnabled` is a stored preference flag only — **no delivery implemented/claimed**.
- **Mobile compatibility:** existing profile/preferences contracts/field names/values preserved (mobile unchanged). Mobile app language currently device-local (SecureStore) in inspected implementation and may differ from backend profile/preference language (documented).
- **Verified:** dashboard `tsc --noEmit` PASS, `npm run build` PASS; backend `npm test -- --runInBand` **11 suites/49 tests PASS**; real API+MySQL integration **29/29 PASS** (auth 401/invalid 401, profile get/update + DB persistence/validation/no secrets, prefs default creation/get/update all fields + DB persistence/validation, ownership/role restrictions 403, missing target 404/403 behavior, cleanup baselines restored users/links/user_preferences 0→0). **Browser runtime QA: NOT PERFORMED — pending.** Phase 6F medicine PATCH issue remains documented.
