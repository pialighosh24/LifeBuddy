# PHASE 7B — NEW QA CAREGIVER ACCOUNT PREPARATION (STAGE 1, READ-ONLY)

**Project:** `C:\Users\ADMIN\Desktop\LifeBuddy`  
**Date:** 2026-11-12  
**RUNID:** `20261112_130921_27017`  
**Approval scope:** Inspection/preparation only for **one additional temporary QA caregiver account** via existing supported APIs. **No account creation performed. No changes made.**

---

## 1. Stage 1 inspection scope and evidence

**Inspected (read-only):**
- Registration/auth: `backend/src/routes/authRoutes.js`, `backend/src/controllers/authController.js`, `backend/src/services/authService.js`, `backend/src/validators/authValidators.js`
- Care-user/linking: `backend/src/routes/careUserRoutes.js`, `backend/src/controllers/careUserController.js`, `backend/src/services/careUserService.js`, `backend/src/validators/careUserValidators.js`
- Ownership/link enforcement and link references: `backend/src/middleware/ownership.js`, `backend/src/services/profileService.js`, `routineService.js`, `medicineService.js`, `emergencyContactService.js`, `sosService.js`, `favouriteService.js`, `activityLogService.js` (and related routes/search for `caregiver_links`/link endpoints)
- App mounting: `backend/src/app.js`
- Live DB verification (read-only, scoped): users 1578/1579/1580, link 662, domain/activity counts

**Conclusion basis:** No endpoint/service found to create a `caregiver_links` row for an existing care user independent of creating a new care user.

---

## 2. Verification — existing account 1578 and current QA dataset intact

| Check | Result |
|---|---|
| User 1578 (Caregiver A) | **INTACT** — `id=1578, role=caregiver, email=ph7qa.cg.a.20261112_130921_27017@lifebuddy.test, full_name='PH7QA CG A 20261112_130921_27017', status=active` (unchanged) |
| User 1579 (Caregiver B) | **INTACT** — caregiver, active, unlinked (as approved) |
| User 1580 (Care User U1) | **INTACT** — user, active |
| Link 662 | **INTACT** — `caregiver_id=1578 → care_user_id=1580`, `relationship_type=test`, `link_status=active`, `linked_by=1578` |
| Domain counts (approved dataset) | **INTACT** — users 3, caregiver_links 1, emergency_contacts 2, routines 1, routine_steps 3, medicines 1, medicine_reminders 2, communication_items 2, favourite_phrases 1, user_preferences 1 (others 0 as expected) |
| `activity_logs` | **INTACT/PRESERVED** — count **487**, MAX(id) **676** (includes 669–676) |

**No modifications performed.** Account 1578 not reset/modified.

---

## 3. Caregiver registration API (existing, supported)

**Exact endpoint:** `POST /api/v1/auth/caregiver/register`  
- **Mounted:** `backend/src/app.js` → `app.use('/api/v1/auth', authRoutes)`; `backend/src/routes/authRoutes.js` → `router.post('/caregiver/register', authLimiter, v.caregiverRegister, validate, authController.registerCaregiver)`
- **Auth:** Public (no bearer token required). **Rate-limited** (`authLimiter`, config-driven window/max).
- **Controller/Service:** `authController.registerCaregiver` → `authService.registerCaregiver`

**Required fields:**
| Field | Type/validation | Required |
|---|---|---|
| `email` | valid email, normalized | **Yes** |
| `password` | string, min length **8** | **Yes** |
| `fullName` | string, trimmed, length 2–150 | **Yes** |

**Optional fields:**
| Field | Type/validation | Required |
|---|---|---|
| `displayName` | string, trimmed, max 100 | No |
| `preferredLanguage` | `en` or `bn` | No (defaults to `en`) |
| `phoneNumber` | string, trimmed, max 30 | No |

**Behavior/response (actual):**
- Rejects duplicate email with **409 CONFLICT** (`Email already registered`).
- Hashes password (bcrypt, config salt rounds); inserts `users` row with `role='caregiver'`, `status='active'`, `pin_hash=NULL`.
- Returns **201** with success payload including `data: { token, user }` (user: id, role, email, fullName, displayName, preferredLanguage). No password/hash exposed.
- **No `caregiver_links` row created** by registration.

**Evidence:** `backend/src/routes/authRoutes.js:19`, `backend/src/validators/authValidators.js:3-10`, `backend/src/controllers/authController.js:5-10`, `backend/src/services/authService.js:14-37`.

---

## 4. Caregiver-link creation endpoints (all existing, inspected)

| Endpoint | Method | Auth | Purpose | Creates link to existing care user? |
|---|---|---|---|---|
| `/api/v1/care-users` | POST | Bearer, **caregiver** | Create a **new** care-user and link to authenticated caregiver (`careUserService.createCareUser`: inserts `users` role `user`, then inserts `caregiver_links` for the **newly created** `careUserId`) | **No** — requires creating a new care user; not a link-existing-user operation |
| `/api/v1/care-users/:id/pin` | POST | Bearer, caregiver (linked) | Set PIN for **linked** care-user | No (updates existing link context only) |
| `/api/v1/care-users/:id` (PATCH/GET etc.) | — | caregiver (linked) | Manage/view **already linked** care-users | No |

**No other endpoints found** that insert into `caregiver_links` or associate an existing care-user with a (new/different) caregiver (searched routes/services for `caregiver_links` inserts/link creation; ownership/services assume pre-existing active links).

**Exact supported “linking” endpoint (as implemented):** `POST /api/v1/care-users` — **creates+links a new care-user only** (cannot target existing U1 1580).  
Request (validator): `fullName` (required, 2–150), optional `displayName`, `preferredLanguage` (`en|bn`), `phoneNumber`, `relationshipType` (max 50). Returns 201 with created care-user.

**Evidence:** `backend/src/routes/careUserRoutes.js:54-58`, `backend/src/validators/careUserValidators.js:3-9`, `backend/src/controllers/careUserController.js:4-11`, `backend/src/services/careUserService.js:41-88,97-108`.

---

## 5. Can a new caregiver be linked to existing Care User U1 (ID 1580) via supported APIs?

**No — not supported by existing APIs.**

- The only link-creating flow is `POST /api/v1/care-users`, which **creates a new care-user record** and links it to the authenticated caregiver; it does not accept an existing `careUserId` and cannot link to U1 (1580).
- No supported endpoint exists to add a second caregiver link for existing U1 (1580) / create `caregiver_links (newCaregiverId → 1580)`.
- U1 (1580) remains linked only to caregiver 1578 via link 662 (verified intact). Therefore, even if a new caregiver account were registered (supported), it **could not** access/manage U1 or the approved U1-scoped QA dataset through supported APIs without an unsupported linking mechanism (direct SQL or code/schema/API changes — **not approved**).

---

## 6. Additional records that registration or linking would create (if later executed)

**If caregiver registration (`POST /api/v1/auth/caregiver/register`) were performed (not performed):**
- **Created/modified:** +1 `users` row (`role='caregiver'`, new unique email, active, bcrypt password hash stored; no `caregiver_links`). Response includes a token for the new account (must not be recorded/exposed).
- **`activity_logs`:** registration controller/service inspected does **not** log a registration event; however, **subsequent login (`/auth/caregiver/login`) does create `CAREGIVER_LOGIN` activity logs** (`authController.loginCaregiver` → `logEvent`). Any `activity_logs` generated in future QA actions **must be preserved** (never deleted/updated/restored) per project rules.
- **Not created:** no caregiver link, no care-user, no domain records for U1.

**If linking to existing U1 were attempted via supported APIs:** **not possible** (no supported endpoint). The existing link-creation flow instead creates a **new care-user + new caregiver_link** (not U1), which would alter dataset shape and is outside the goal of linking to existing U1.

**Dataset impact consideration:** creating an additional caregiver user (even without link) adds a record beyond the current approved baseline (users 3 → 4) and potential future activity logs; this requires careful attribution and does **not** enable U1-scoped QA access without unsupported linking.

---

## 7. How a new password can be entered privately (no logs/reports exposure)

If/when account creation is later approved and executed via supported API, the password **must not** appear in command-line arguments, source files, committed files, reports, chat logs, or scripts stored in-repo. Safe handling options:
- **Interactive private prompt in a local terminal/session** (input not echoed/masked) to capture the password into a transient process-only variable, used immediately for the API request body, then discarded (never written to disk/reports). Avoid shell history (e.g. do not pass as `curl -d` inline argument in history-recorded shells).
- **Secure local secret input mechanism** (e.g. OS/terminal secure prompt or a local-only ephemeral input method) where the value is not displayed; submit directly over HTTPS/local API to `POST /api/v1/auth/caregiver/register` from a trusted local context.
- **Never** store in `.env` committed/shared files, logs, issue trackers, screenshots, or this documentation. Do not print request/response bodies containing secrets; redact Authorization/JWT. Any returned JWT must not be recorded.

*(This is procedural guidance only; no credential entered/handled in this inspection.)*

---

## 8. Restrictions compliance (this stage)

- **No** account 1578 reset/modified. **No** account created.
- **No** direct SQL writes. **No** source/schema/API-contract/auth/CORS/security changes. **No** dependency installation.
- **No** credential/secret exposure.
- **All existing QA records preserved.** **`activity_logs` preserved (487, incl. 669–676).** No cleanup performed.

---

## 9. Stage 1 outcome

- **Registration endpoint/requirements:** identified (`POST /api/v1/auth/caregiver/register`; required `email,password(min 8),fullName`, optional `displayName,preferredLanguage,phoneNumber`).
- **Supported linking endpoint:** only `POST /api/v1/care-users` (creates **new** care-user + link) — **no endpoint to link an existing care user**.
- **Linking new caregiver to existing U1 (1580):** **NOT supported** via existing APIs.
- **Additional records:** registration would add a caregiver `users` row (+ potential later login `activity_logs` which must be preserved); supported link flow cannot target U1 and would create a different new care-user/link if used.
- **Stopped after Stage 1.** **Do not proceed with account creation** without further review/approval, noting that a new caregiver alone cannot access U1-scoped QA data via supported APIs.
