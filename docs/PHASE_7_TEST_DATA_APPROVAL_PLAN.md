# LIFE BUDDY — PHASE 7 TEST DATA APPROVAL PLAN (NON-DESTRUCTIVE)

**Project:** `C:\Users\ADMIN\Desktop\LifeBuddy`  
**Prepared:** 2026-11-10 (read-only planning; **no data inserted**)  
**Status:** **APPROVAL REQUIRED** — STOP for explicit user approval before any insertion or cleanup execution.  
**Purpose:** Enable populated dashboard browser QA (7B), mobile device QA (7C), and cross-module integration QA (7D) using minimal, temporary, non-destructive records.

> **Hard constraints (must hold):** no schema/API/auth/CORS/security changes, no destructive SQL/reset, no `database/schema/lifebuddy_schema.sql`, no `database/seed/demo_data.sql`, no modification of pre-existing records, protect `activity_logs` baseline, prefer supported APIs, create only with explicit approval and verified cleanup.

---

## 1. Current database baseline (read-only recheck)

**Checked:** 2026-11-10 via read-only `SELECT COUNT(*)` on `lifebuddy_db` (MySQL 8.0.42).

| Table | Count |
|---|---:|
| users | 0 |
| caregiver_links | 0 |
| user_preferences | 0 |
| routines | 0 |
| routine_steps | 0 |
| routine_completions | 0 |
| medicines | 0 |
| medicine_reminders | 0 |
| medicine_logs | 0 |
| emergency_contacts | 0 |
| sos_alerts | 0 |
| communication_items | 0 |
| favourite_phrases | 0 |
| situation_steps | 0 |
| device_tokens | 0 |
| **activity_logs** | **479** (**pre-existing; do not modify/delete**) |

**Note:** Baseline differs from earlier snapshot (442). All 479 existing `activity_logs` rows must be treated as pre-existing and preserved; any QA-created activity rows must be uniquely identifiable and removed only if explicitly approved and safely scoped (see cleanup/risks).

---

## 2. Proposed minimal test accounts & relationships

All records temporary and uniquely identifiable (suggested prefix/tag: `PH7QA_<YYYYMMDD>_<RUNID>` in names/labels/emails/notes where schema allows).

| Proposed record | Purpose | Created via | Tables involved |
|---|---|---|---|
| **Caregiver A** (primary) | Owns/manages linked care-user data for dashboard/mobile flows | **API** `POST /api/v1/auth/caregiver/register` (email like `ph7qa.cg.a.<runid>@lifebuddy.test`, strong temp password, unique fullName/displayName) | `users` (role caregiver) |
| **Care User U1** (linked to Caregiver A) | Subject for routines/medicines/contacts/SOS/favourites/prefs | **API** `POST /api/v1/care-users` (auth as Caregiver A) + `POST /api/v1/care-users/:id/pin` to set PIN | `users` (role user), `caregiver_links`, (may create `user_preferences`/logs per implementation) |
| **Caregiver B** (unrelated) | Ownership-denial / RBAC negative tests (must not access U1 data) | **API** `POST /api/v1/auth/caregiver/register` (separate unique email) | `users` |

**Auth/handling:** tokens obtained via login APIs during QA only; **no credentials/passwords/PINs/JWTs recorded in docs or logs**.

---

## 3. Proposed domain records (minimal)

| Domain | Proposed records | Why needed | Preferred creation method | Tables involved |
|---|---|---|---|---|
| Routines | 1 routine for U1 with 2–3 ordered steps (EN + optional BN labels), active | MY DAY, dashboard routine CRUD/steps/reorder/progress flows | **API** (caregiver A): `POST /care-users/:id/routines`, `POST /routines/:rid/steps`, reorder if needed | `routines`, `routine_steps` |
| Routine completions | 0–2 completions generated only if executed during runtime QA | Progress/history verification | **API** (care-user U1): `POST /routines/:rid/completions` during QA (supported flow) | `routine_completions` |
| Medicines | 1 medicine for U1 with supported fields (incl. explicit start/end dates to avoid unrelated issues) + 1–2 supported reminders | Medicine UI, reminders display, logs/history; DEF-6F-001 reproduction | **API** (caregiver A): `POST /care-users/:id/medicines`, `POST /medicines/:mid/reminders` | `medicines`, `medicine_reminders` |
| Medicine logs | 0–2 logs (Taken/Skipped) only if executed during runtime QA | History/log UI verification | **API** (care-user/self or supported flow): `POST /medicines/:mid/logs` during QA | `medicine_logs` |
| Emergency contacts | 1–2 contacts for U1 (one primary if supported) | Contact CRUD/primary/SOS context display | **API** (caregiver A): `POST /care-users/:id/emergency-contacts`, updates as needed | `emergency_contacts` |
| Communication catalogue | 2–3 global items (EN and BN where possible, distinct categories, active) | TALK/catalogue/search/bilingual/favourites linkage | **API** (caregiver): `POST /api/v1/communication` (global, schema-supported) | `communication_items` |
| Favourites | 1–2 favourites for U1 referencing created communication item(s) and/or phrase (per service rules) | TALK favourites + dashboard read-only favourites view | **API** (care-user U1, self): `POST /care-users/:id/favourites` (caregivers cannot modify) | `favourite_phrases` |
| Preferences | Update U1 preferences to known values | Settings/preferences retrieval/update persistence | **API**: `GET/PUT /care-users/:id/preferences` | `user_preferences` |
| SOS alerts | 1 (optionally 2) SOS records generated via supported flow during QA (unique `clientEventId`) | SOS list/detail/ack/real status/location handling; cross-module visibility | **API** (care-user U1): `POST /api/v1/sos-alerts` (explicit confirmed flow equivalent), caregiver `PATCH .../acknowledge` if tested | `sos_alerts` |
| Device tokens | **None proposed** | Not required for scoped QA | N/A | `device_tokens` |

### Situation guidance (special handling)
- **`situation_steps` is currently empty (0).** Inspected routes expose **read-only** endpoints (`GET /situations`, `GET /situations/:key`, `GET /situations/:key/steps`) with **no create/update/delete API**.
- **Proposal:** **Do not create situation guidance records by default.** Treat populated HELP ME/situation runtime checks as **NOT TESTED/BLOCKED by empty catalogue** unless explicitly approved.
- **If (and only if) explicit approval is granted for limited direct SQL:** insert the minimum global/predefined rows for 1 situation key with ordered steps using unique identifiable keys/titles (e.g. `PH7QA_*`) — **still no schema/seed script execution**. This requires **separate explicit approval** and a precise row-level cleanup plan (delete only those exact keys/ids).

---

## 4. Records creation order (API-preferred, if approved)

1. Register **Caregiver A** and **Caregiver B** (capture IDs via API responses during execution; do not persist secrets).
2. Login Caregiver A → create **Care User U1** → set U1 PIN.
3. Login Caregiver A → create **communication items** (needed before item-linked favourites).
4. Login Care User U1 → create **favourites** (and perform TALK/mobile flows as needed).
5. Login Caregiver A → create **emergency contacts**, **routine + steps**, **medicine + reminders**; update **preferences**.
6. During runtime QA only (care-user flows): create **routine completions**, **medicine logs**, **SOS alerts** as needed.
7. (Optional, **separate approval**) direct-SQL `situation_steps` minimal rows if situation QA must be populated.

---

## 5. Uniqueness, identification & traceability

- Use a single `RUNID` per approved run (timestamp/random short token) embedded in: caregiver emails, `full_name`/`display_name`, routine/medicine/contact labels/notes, communication `item_key`/labels, favourite labels/phrases (where allowed), and SOS `clientEventId`.
- Record created entity IDs in a **local, non-committed execution log** (operator-controlled) for deterministic cleanup; **never record secrets**.
- Do not reuse IDs/keys from pre-existing data (baseline shows none in domain tables except `activity_logs`).

---

## 6. Baseline counts before insertion (must capture again immediately pre-run)

Re-run and record read-only counts for: `users, caregiver_links, user_preferences, routines, routine_steps, routine_completions, medicines, medicine_reminders, medicine_logs, emergency_contacts, sos_alerts, communication_items, favourite_phrases, situation_steps, device_tokens, activity_logs` (and note max IDs if helpful) **before** any approved insertion.

**Current known baseline:** as in Section 1 (`activity_logs = 479`, others 0).

---

## 7. Cleanup procedure (only if insertion approved & executed)

**Principle:** remove **only** records created for this `RUNID`/captured IDs; preserve all pre-existing records; respect FK dependencies.

**Preferred cleanup order (child → parent), scoped to captured IDs/unique markers:**
1. `medicine_logs` (created IDs)
2. `routine_completions` (created IDs)
3. `sos_alerts` (created IDs) — note: delete may be restricted by business rules in some systems, but schema allows; if API delete unsupported, use **approved direct SQL by exact ID** only
4. `favourite_phrases` (created IDs)
5. `medicine_reminders` (created IDs)
6. `medicines` (created IDs)
7. `routine_steps` (created IDs)
8. `routines` (created IDs)
9. `emergency_contacts` (created IDs)
10. `situation_steps` (only if any approved direct-SQL rows inserted for `RUNID` keys/IDs)
11. `communication_items` (created IDs; ensure no remaining favourites reference them or remove favourites first)
12. `user_preferences` (rows for created care-user IDs)
13. `caregiver_links` (rows linking created caregivers/care-user)
14. `device_tokens` (none expected)
15. `users` (created caregiver A/B and care-user U1 IDs)
16. **`activity_logs`:** any rows created **as a side-effect** of approved QA actions that reference created actor/care-user/entity IDs — delete **only** those exact rows (by `id`/scoped criteria) if explicitly approved; **never delete or modify pre-existing rows** (baseline 479 and any other pre-existing IDs must remain).

**Method preference:** use supported APIs for deletion where they exist and are safe/reversible in effect (e.g. deletes provided by routines/medicines/contacts/communication/favourites). For entities without supported delete APIs or where FK/order requires it, perform **targeted, approved direct SQL `DELETE ... WHERE id IN (...)` / exact-key predicates** only — no truncate, no drop, no schema/seed scripts.

---

## 8. Independent SQL cleanup verification (required after cleanup)

- Re-run read-only counts and confirm they match the **pre-run baseline** (Section 6), including `activity_logs` returning to its preserved pre-run count/state for pre-existing rows.
- Verify no rows remain matching `RUNID` markers or captured created IDs (targeted `SELECT` checks).
- Record verification results and any discrepancies before closing QA.

---

## 9. Protection of pre-existing records

- **No updates/deletes** to any row not created for this approved `RUNID`.
- **`activity_logs` (479 pre-existing):** protected; only newly created, uniquely attributable QA side-effect rows may be removed with explicit scoped approval.
- No `TRUNCATE`, `DROP`, `ALTER`, schema migration, or seed/reset scripts.
- No modification of unrelated config/auth/CORS/API behavior.

---

## 10. If cleanup fails (handling plan)

- **Stop further QA actions** that create additional data.
- Capture: failing statement/API call, error, affected IDs/tables, and current counts (read-only).
- Do **not** attempt broad/destructive fixes. Escalate for **explicit user approval** of a narrowly scoped corrective cleanup (exact IDs/keys only).
- Preserve evidence and leave system in documented state; do not claim cleanup complete until independent verification passes.

---

## 11. Direct SQL usage (only if explicitly approved)

- **Default:** none. **Preferred:** supported APIs.
- **Possible limited exception:** `situation_steps` population and/or FK-constrained cleanup where no supported API exists — **requires separate explicit approval**, exact statements reviewed beforehand, and row-level verification. No schema/seed scripts.

---

## 12. Approvals requested (explicit)

I request explicit approval for the following, as needed:

1. **APPROVAL A — Create minimal test data (API-preferred):** accounts (Caregiver A, Care User U1, Caregiver B), communication items, favourites (by U1), emergency contacts, routine+steps, medicine+reminders, preferences, and runtime-generated completions/logs/SOS records as specified — all uniquely tagged, with pre/post baselines and cleanup.
2. **APPROVAL B — Execute scoped cleanup + verification:** delete only approved `RUNID`/captured-ID records (API-preferred; targeted direct SQL only if required and approved) and independently verify baseline restoration.
3. **APPROVAL C — (Optional, separate) Minimal `situation_steps` direct SQL:** only if populated situation QA is required and supported by schema; exact rows/keys and cleanup pre-approved.
4. **APPROVAL D — DEF-6F-001 backend fix:** **not requested to execute now**; separate decision after review (see Section 13).

**No insertion, cleanup, or fix will be performed without the corresponding explicit approval.**

---

## 13. Stage F — Known defect: DEF-6F-001 (separate approval request, no code changes)

**Defect:** `DEF-6F-001` (Medium, pre-existing, reproduced in Phase 7)  
**Reproduction:** Partial `PATCH /api/v1/medicines/:medicineId` **without date fields** returns **400**; `PATCH` with explicit valid dates succeeds.  
**Suspected cause:** mysql2 DATE values returned as JavaScript `Date` objects and incorrectly normalized via `String(...).slice(0,10)`.

**Actual affected source (inspected):**
- `backend/src/services/medicineService.js` — `toMysqlDate` (e.g. ~L21) and existing-row date normalization in `updateMedicine` (e.g. `String(med.start_date).slice(0,10)` / `end_date` around ~L146–147). Also note `toMysqlDateTime`/log timestamp formatting uses `toISOString().slice(...)` in other contexts (separate from DATE-only handling but worth review during fix).

**Minimal proposed correction (conceptual, **not applied**):**
- When normalizing DATE fields from DB or input, detect `Date` instances and format as `YYYY-MM-DD` using **local/calendar-safe date components** (or a DB-consistent method) rather than `String(date).slice(0,10)` or timezone-shifting `toISOString()` for date-only values. Accept valid `YYYY-MM-DD` strings as-is; keep `null` semantics unchanged. Preserve existing validation/behavior for explicit date updates.

**Regression tests needed (if approved later):**
- Partial PATCH without `startDate`/`endDate` preserves existing dates and succeeds.
- PATCH with explicit valid/cleared dates behaves as today.
- Coverage for mysql2 Date-object normalization and edge cases (timezone boundary) without changing API contract.

**API compatibility considerations:** No request/response contract change intended; fix should be behavior-correcting and backward-compatible.

**Database safety implications:** No schema/data migration; read/normalize behavior only.

**Request:** **Separate explicit approval required** before any backend modification or test addition. **No fix implemented.**

---

## 14. STOP

**Planning complete. Awaiting explicit user approval** for data insertion/cleanup options (A/B/C as applicable) and any separate decision on DEF-6F-001 (D). No runtime QA requiring unapproved data or missing environments has been executed. No Phase 8/9 started.