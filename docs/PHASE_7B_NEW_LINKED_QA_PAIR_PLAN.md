# PHASE 7B — NEW LINKED QA TEST-PAIR PREPARATION PLAN (STAGE 1, NO CREATION)

**Project:** `C:\Users\ADMIN\Desktop\LifeBuddy`  
**Date:** 2026-11-12  
**Context/RUNID (original approved dataset):** `20261112_130921_27017`  
**Objective:** Prepare a **minimal, isolated caregiver–care-user QA pair** using existing supported APIs so dashboard caregiver login and ownership/link behavior can be tested independently of account 1578 credential issues.  
**Status:** **PREPARATION ONLY. No records created. No changes made. Pending separate review/approval before any creation.**

---

## 1. Safety and preservation constraints (must hold during any future approved execution)

- **Do not create accounts/records now.** This document is a plan only.
- **Do not modify** original users **1578, 1579, 1580**, link **662**, or the original approved QA dataset (contacts 61–62, routine 87/steps 158–160, medicine 86/reminders 52–53, communication items 30–31, favourite 30, preferences 68).
- **No** direct SQL writes, **no** source/schema/API-contract/auth/CORS/security changes, **no** dependency installs, **no** credential resets.
- **No** cleanup in this stage.
- **Never delete or update `activity_logs`.** Preserve existing **487** logs, including IDs **669–676**. All newly generated logs from any future approved actions must be identified and preserved.
- No credentials/passwords/PINs/JWTs/hashes exposed in commands, files, reports, or chat.

**Verified baseline (read-only, 2026-11-12):** users 3 (MAX 1580), caregiver_links 1 (662), user_preferences 1 (68), routines 1 (87), routine_steps 3 (160), medicines 1 (86), medicine_reminders 2 (53), emergency_contacts 2 (62), communication_items 2 (31), favourite_phrases 1 (30), routine_completions/medicine_logs/sos_alerts/situation_steps/device_tokens 0, **activity_logs 487 (MAX 676)**. Accounts 1578/1579/1580 and link 662 intact.

---

## 2. Reinspected API contracts (existing, supported)

### 2.1 Caregiver registration (creates caregiver account)
- **Endpoint:** `POST /api/v1/auth/caregiver/register`
- **Mounting:** `backend/src/app.js` → `/api/v1/auth`; `backend/src/routes/authRoutes.js` (`authLimiter`, `v.caregiverRegister`, `validate`, `authController.registerCaregiver`)
- **Auth:** Public (no bearer token). Rate-limited.
- **Required fields:** `email` (valid, normalized), `password` (string, **min 8**), `fullName` (string, trimmed, **2–150**)
- **Optional:** `displayName` (max 100), `preferredLanguage` (`en`|`bn`, default `en`), `phoneNumber` (max 30)
- **Behavior:** 409 if email already registered. Creates `users` row (`role='caregiver'`, `status='active'`, bcrypt `password_hash`, `pin_hash=NULL`). **No `caregiver_links` created.** No registration activity-log event in inspected controller/service.
- **Response:** **201** `success` with `data: { token, user }` (user: id, role, email, fullName, displayName, preferredLanguage). Token must not be recorded/exposed.

**Evidence:** `authRoutes.js:19`, `authValidators.js:3-10`, `authController.js:5-10`, `authService.js:14-37`.

### 2.2 Care-user creation + link (creates new care user linked to authenticated caregiver)
- **Endpoint:** `POST /api/v1/care-users`
- **Mounting:** `backend/src/app.js` → `/api/v1/care-users`; `backend/src/routes/careUserRoutes.js` (`authenticate`, `authorizeRoles('caregiver')`, `v.createCareUser`, `validate`)
- **Auth:** Bearer JWT, **caregiver** only.
- **Required fields:** `fullName` (string, trimmed, **2–150**)
- **Optional:** `displayName` (max 100), `preferredLanguage` (`en`|`bn`, default `en`), `phoneNumber` (max 30), `relationshipType` (string, max 50)
- **Behavior:** Transaction inserts `users` (`role='user'`, active, no email/password/pin initially) and inserts `caregiver_links` (`caregiver_id` = authenticated caregiver, `care_user_id` = new user, `relationship_type`, `link_status='active'`, `linked_by` = caregiver). Enforces self-link invariant in service. **Creates a new care-user (cannot link an existing care-user).**
- **Response:** **201** `success` with `data: { careUser }` (sanitized user fields).

**Evidence:** `careUserRoutes.js:54`, `careUserValidators.js:3-9`, `careUserController.js:4-11`, `careUserService.js:41-88`.

### 2.3 Care-user PIN setup (supported)
Two equivalent supported flows (both set bcrypt PIN hash for an **active linked** care-user; caregiver must be actively linked):

| Endpoint | Auth | Required | Optional | Notes |
|---|---|---|---|---|
| `POST /api/v1/care-users/:id/pin` | Bearer caregiver (linked/owner) | path `id` (int>=1), body `pin` (string, **4–8 digits**) | `fullName`, `displayName`, `preferredLanguage` | `careUserRoutes.js:58`, `careUserValidators.js:27-33`, `careUserController.js:36-46`, `careUserService.js:147-167` |
| `POST /api/v1/auth/user/pin-setup` | Bearer caregiver (rate-limited) | body `careUserId` (int>=1), `pin` (**4–8 digits**) | `fullName`, `displayName`, `preferredLanguage` | `authRoutes.js:21`, `authValidators.js:17-23`, `authController.js:20-33`, `authService.js:64-96` |

Both verify active caregiver link and active care-user role; update `pin_hash` (and optional fields). **Prefer one consistent flow** in execution (recommend `POST /api/v1/care-users/:id/pin` for path clarity) and capture exact response/IDs.

### 2.4 Care-user PIN login (supported)
- **Endpoints:** `POST /api/v1/auth/user/pin/login` (primary) and alias `POST /api/v1/auth/user/login`
- **Mounting/Auth:** `authRoutes.js:23-24`, public, rate-limited (`v.userLogin`)
- **Required fields:** `careUserId` (int>=1), `pin` (string, **4–8 digits**)
- **Behavior:** validates care-user exists/active/has PIN and bcrypt match; generic 401 on failure. **Generates `USER_LOGIN` activity log** on success (`authController.loginUser` → `logEvent` with actor/care user = care-user id).
- **Response:** **200** `success` with `data: { token, user }` (token must not be recorded/exposed).

**Evidence:** `authValidators.js:25-28`, `authController.js:34-43`, `authService.js:98-119`.

### 2.5 Caregiver login (verification)
- **Endpoint:** `POST /api/v1/auth/caregiver/login` — required `email`, `password` (non-empty). On success returns token/user and **generates `CAREGIVER_LOGIN` activity log** (`authController.js:12-18`). Useful for verifying new caregiver credentials and for authenticating to create the linked care-user.

---

## 3. Minimum required fields (proposed pair)

| Record | Endpoint | Minimum required | Recommended minimal optional (for traceability) |
|---|---|---|---|
| New QA caregiver | `POST /api/v1/auth/caregiver/register` | `email`, `password` (>=8), `fullName` | `displayName` (e.g. `PH7QB-CG`), `preferredLanguage='en'` |
| New QA care-user (linked to new caregiver) | `POST /api/v1/care-users` (auth as new caregiver) | `fullName` | `displayName` (e.g. `PH7QB-CU`), `preferredLanguage='en'`, `relationshipType='test'` |
| Care-user PIN setup | `POST /api/v1/care-users/:id/pin` (or auth pin-setup) | `pin` (4–8 digits) | none |

**Proposed identifying markers (suggestion, pending approval):** use a distinct suffix/tag (e.g. `PH7QB_PAIR_<timestamp>` or similar RUNID-safe marker) in `email`, `fullName`, `displayName` to ensure unique attribution and safe later cleanup scoping — **without altering 1578/1579/1580**. Exact values/IDs to be captured at execution time.

---

## 4. Proposed new records and expected link relationship

| Proposed record | Description | Expected relationship |
|---|---|---|
| 1 new caregiver (`users.role='caregiver'`) | Temporary QA caregiver for dashboard login/ownership testing | Authenticated actor; no link to 1578/1579/1580 |
| 1 new care-user (`users.role='user'`) | Minimal care-user for isolated ownership tests | Created and owned/linked **only** to the new caregiver |
| 1 new caregiver link (`caregiver_links`) | Active link created by `POST /api/v1/care-users` | `newCaregiverId → newCareUserId`, `link_status='active'` (proposed `relationshipType='test'`) |

**Isolation intent:** pair is independent of original dataset (1578↔1580 link 662 untouched). No domain records (routines/meds/contacts/etc.) proposed in this minimal plan unless separately approved.

---

## 5. Expected database effects (if executed later under approval)

| Table | Expected delta | Notes |
|---|---:|---|
| `users` | **+2** | +1 caregiver (register), +1 care-user (create+link) |
| `caregiver_links` | **+1** | new caregiver ↔ new care-user |
| `user_preferences` | **0 expected** (possible **+1** later) | not created by register/create-care-user flows; `GET/PUT /api/v1/care-users/:id/preferences` may auto-create defaults if accessed |
| `routines`, `routine_steps`, `routine_completions` | 0 | not in scope |
| `medicines`, `medicine_reminders`, `medicine_logs` | 0 | not in scope |
| `emergency_contacts`, `sos_alerts` | 0 | not in scope |
| `communication_items`, `favourite_phrases` | 0 | not in scope |
| `situation_steps`, `device_tokens` | 0 | not in scope |
| **`activity_logs`** | **>= +0 (likely +N)** | Register: no log observed. **Caregiver login generates `CAREGIVER_LOGIN`**; **care-user PIN login generates `USER_LOGIN`**. PIN setup/other calls may or may not log depending on implementation; **all generated logs must be captured, attributed, and preserved** (never deleted/updated). Exact count/IDs unknown until execution. |

**Auto-increment IDs** (users, links, activity_logs, any prefs) are **unknown before execution** and must be captured from API responses/verification queries.

---

## 6. Credential-handling procedure (private, no exposure)

- **Passwords/PINs must never** appear in shell command arguments/history, source/committed files, `.env`, logs, reports, screenshots, or chat. **Never** print or store request/response bodies containing secrets; never record JWTs/hashes.
- **Private entry method (recommended):** capture via **local interactive non-echo/masked terminal prompt** (or equivalent secure local secret input) into a transient process-only variable/memory, use immediately in the API request, then discard. Avoid commands that persist history with secrets (e.g. inline JSON with password in shell history).
- **Execution environment:** run from a trusted local context; if using scripted API calls, ensure script does not echo secrets, does not write them to disk, and is removed/cleaned if temporary (without affecting DB/logs).
- **Post-creation:** verify login by success/failure outcome only (HTTP status/sanitized response), without exposing returned token/password/PIN.

---

## 7. Activity-log preservation and identification procedure

- **Preservation rule:** existing **487** logs (MAX **676**, incl. 669–676) **must remain unchanged**. Any new `activity_logs` created during future approved execution/verification **must not be deleted, updated, or restored**.
- **Identification (at execution time, read-only checks):**
  1. Capture **pre-execution baseline:** `COUNT(*)` and `MAX(id)` from `activity_logs` (and confirm 487/676 unchanged before start).
  2. After each relevant API operation (especially caregiver login, care-user PIN login, and any other mutating/auth calls), capture **post-step** `COUNT(*)`/`MAX(id)` and/or select rows with `id > <pre-step-max-id>` (read-only) to record **exact new IDs**.
  3. **Attribute** each new ID by examining `event_type, entity_type, entity_id, actor_user_id, care_user_id, created_at, summary` and correlating to the specific operation/time/known new user IDs (no attribution by range alone without row inspection).
  4. Record all new IDs and attributions in the execution report; report any unattributed rows explicitly.
- **Post-execution verification:** confirm pre-existing 487 still present and all newly identified QA log IDs preserved.

---

## 8. Verification plan (for separately approved execution)

1. **Pre-checks:** backend health/DB connected; re-verify baseline counts and that 1578/1579/1580/662 and original dataset/logs unchanged.
2. **Register new caregiver:** `POST /api/v1/auth/caregiver/register` → expect 201, capture new caregiver `id`/email (sanitized); confirm via supported API (`GET /api/v1/auth/me` with returned token if used transiently without recording) and/or read-only DB check for existence/role/status (no secrets).
3. **Login new caregiver:** `POST /api/v1/auth/caregiver/login` → expect 200; capture `CAREGIVER_LOGIN` activity-log ID(s).
4. **Create linked care-user:** `POST /api/v1/care-users` (as new caregiver) → expect 201, capture new care-user `id` and verify link ownership (`GET /api/v1/care-users`, `GET /api/v1/care-users/:id`).
5. **Set PIN:** `POST /api/v1/care-users/:newCareUserId/pin` → expect 200; verify PIN state set (read-only boolean/hash-presence check only, no value).
6. **Care-user login:** `POST /api/v1/auth/user/pin/login` → expect 200; capture `USER_LOGIN` activity-log ID(s).
7. **Ownership isolation:** confirm new caregiver sees only its linked care-user (not 1580) where applicable; confirm 1578/1579/1580/link 662/domain records and original 487 logs unchanged.
8. **Record** all created IDs, endpoints used, responses (sanitized), and exact new `activity_logs` IDs/attributions.

---

## 9. Cleanup plan (separately approved, later stage — NOT executed now)

- **Scope:** remove only the newly created pair records (exact captured IDs): new `caregiver_links` row, new care-user `users` row, new caregiver `users` row, and any `user_preferences` row created for the new care-user (only if created and ID captured). **Do not touch** 1578/1579/1580/662 or any original domain records.
- **Dependency-aware order (proposed):** remove dependent rows first as applicable (e.g. `user_preferences` for new care-user if exists) → `caregiver_links` (new link) → `users` (new care-user) → `users` (new caregiver), using supported flows if available or separately approved ID-scoped cleanup consistent with project rules.
- **`activity_logs`:** **must NOT be deleted/updated/restored** (including all logs generated by creation/verification). Cleanup report must independently verify original 487 and all new QA log IDs remain.
- **Independent verification:** read-only checks confirming only captured IDs removed, original dataset/users/links unchanged, and `activity_logs` preserved.

---

## 10. Stop condition

**Stage 1 preparation complete.** This plan requires **separate review and explicit approval** before any account/record creation, PIN setting, login verification, or cleanup. No records created in this stage.
