# PHASE 7 — DEF-6F-001 FIX REPORT

**Project:** `C:\Users\ADMIN\Desktop\LifeBuddy`  
**Date:** 2026-11-12  
**Defect ID:** DEF-6F-001  
**Status:** **FIXED AND VERIFIED** (within approved scope)

---

## 1. Root cause

- **Symptom:** Partial `PATCH /api/v1/medicines/:medicineId` requests omitting `startDate`/`endDate` could incorrectly return **HTTP 400** `endDate must be on or after startDate` when existing stored dates were valid.
- **Cause (confirmed):** In `backend/src/services/medicineService.js`, `updateMedicine` initialized existing dates from DB as `String(med.start_date).slice(0,10)` / `String(med.end_date).slice(0,10)`. mysql2 can return MySQL `DATE` columns as JavaScript `Date` objects; `String(Date).slice(0,10)` produces a non-`YYYY-MM-DD` prefix (e.g. `Sat Jan 10`), causing invalid date comparison and a spurious validation failure on partial updates omitting date fields.
- **Schema/contract:** `medicines.start_date/end_date` are nullable `DATE` columns (validated). No schema/API-contract/auth/CORS/security changes required or made.

---

## 2. Files modified

| File | Change |
|---|---|
| `backend/src/services/medicineService.js` | Added `normalizeStoredDate(value)` to safely normalize DB-stored date values (`Date` instance → local `YYYY-MM-DD`, string `YYYY-MM-DD...` → first 10 chars, fallback parse) avoiding timezone-shift from `toISOString()` on Date objects. Updated `updateMedicine` to use `normalizeStoredDate` for existing `med.start_date/end_date`, and to treat explicitly provided `null`/empty `startDate`/`endDate` in payload as clearing to `null` (supported nullable behavior) while preserving existing invalid-date validation for non-null invalid inputs and `endDate >= startDate` checks. No other logic changed. |
| `backend/tests/phase4b.stage3.medicines.test.js` | Added regression test **"DEF-6F-001: partial PATCH omitting stored dates (mysql2 DATE handling) and date validation behavior"** covering: partial PATCH omitting both dates (non-date fields) retains dates; partial PATCH omitting startDate retains existing startDate; partial PATCH omitting endDate retains existing endDate; explicit valid dates; invalid `endDate < startDate` rejected (400); supported null/optional date clearing; DB persistence and no unintended field changes (incl. mysql2 Date-object handling in real MySQL). Added safe DB-date normalization helper inside test for assertions. No existing assertions removed/weakened. |

**Not modified:** routes, controllers, validators, other services, schema, auth/CORS/security, mobile, dashboard, dependencies.

---

## 3. Exact implementation approach

- **Stored-date normalization (fix):** `normalizeStoredDate` returns `null` for null/empty; for `Date` uses local calendar components (`getFullYear/getMonth/getDate`) formatted `YYYY-MM-DD` (prevents UTC `toISOString` day-shift on mysql2 Date objects); for strings uses first 10 chars when matching `YYYY-MM-DD...` else falls back to `toMysqlDate`.
- **Update behavior:** `startDate/endDate` baselines loaded from DB via `normalizeStoredDate`. If payload provides date key: `null`/`''` → clear to `null`; otherwise normalized via `toMysqlDate` with same `Invalid startDate/endDate` (400) on invalid non-null input. Range check preserved: reject when both present and `endDate < startDate`. Persist normalized values.
- **Contract preserved:** endpoint/method/path, request/response shapes, validation semantics, ownership/auth, and unrelated medicine fields/behaviors unchanged.

---

## 4. Regression cases covered

1. **Partial PATCH omitting both dates** (non-date fields only) with existing valid stored dates → **200**, dates retained, non-date fields updated, unrelated fields unchanged (API + DB verified).
2. **Partial PATCH omitting startDate** while updating endDate/other fields → **200**, existing startDate retained.
3. **Partial PATCH omitting endDate** while updating startDate/other fields → **200**, existing endDate retained.
4. **Explicit valid startDate and endDate** → **200**, persisted correctly.
5. **Invalid endDate earlier than startDate** → **400** (`endDate must be on or after startDate`).
6. **Supported null/optional date behavior** (clear endDate, clear startDate) → **200**, nulls persisted.
7. **mysql2 DATE values returned as JavaScript Date objects** → exercised by real MySQL integration (API and DB assertions normalized correctly).
8. **No unintended modification** of unrelated medicine fields/ownership (`prescribedInstructions`, `care_user_id`, `created_by_caregiver_id`, unchanged fields preserved).

All cases pass with corrected behavior.

---

## 5. Before/after test results

| Run | Before (baseline) | After (this fix) |
|---|---|---|
| Focused medicine tests (`tests/phase4b.stage3.medicines.test.js`) | 4 tests PASS (existing) | **5 tests PASS, 0 failed** (includes DEF-6F-001 regression) |
| Full backend regression (`npm test -- --runInBand`) | **11 suites, 49 tests, 0 failed** | **11 suites, 50 tests, 0 failed, PASS** (exit 0) |

Notes: initial test-run after fix exposed a **test assertion normalization issue** (direct SQL Date comparison in new test used `String(...).slice(0,10)`), not an application defect; test corrected to normalize DB Date objects/strings. Subsequent focused and full runs passed.

---

## 6. API/MySQL verification

- **Real API + MySQL (Jest/Supertest against live app/DB):** DEF-6F-001 regression cases executed end-to-end (create medicine with dates, multiple partial/explicit/invalid/null PATCH variants, GET/DB verification). Responses and persisted DB state verified (including retained/updated/cleared dates and unchanged unrelated fields).
- **Temporary records:** created only by automated tests with isolated temp users/links/medicines/reminders/logs and cleaned by existing test cleanup hooks (per suite design). No pre-existing records modified.

---

## 7. Database preservation evidence

**Pre-fix verification baseline (this session):** approved QA domain counts intact; `activity_logs` **524, MAX 724** (all <=676 preserved: 487, incl. 669–676; 677–724 preserved).

**Post-fix/final verification (read-only):**
- **Domain counts (unchanged):** users 3, caregiver_links 1, user_preferences 1, routines 1, routine_steps 3, routine_completions 0, medicines 1, medicine_reminders 2, medicine_logs 0, emergency_contacts 2, sos_alerts 0, communication_items 2, favourite_phrases 1, situation_steps 0, device_tokens 0.
- **Approved QA IDs present:** 1578,1579,1580,662,61,62,87,158-160,86,52,53,30,31,30,68.
- **Activity logs preserved:** **606, MIN 33, MAX 828**. Rows `id <= 676` = **487** (all preserved, incl. 669–676 = 8). Rows `677–724` = **37** preserved. **New logs generated during fix verification runs (all preserved, never deleted/updated): 725–732, 744–808, 820–828** (82 rows total, exact IDs recorded by DB query) — test-generated events referencing temporary cleaned entities (logins, SOS, routine/medicine logs, preferences, contact CRUD, etc.).
- **No cleanup of existing QA dataset performed.** No destructive SQL, no schema/seed, no direct SQL record edits.

---

## 8. Remaining limitations

- **Runtime QA still pending/blocked:** browser automation disconnected (7B manual evidence pending), no Android emulator/device for 7C, cross-module runtime 7D incomplete.
- **QA access:** Caregiver A (1578) password unavailable; new linked QA pair plan prepared but **creation not approved**.
- **Other known/open items:** situation guidance data empty (C not approved), Expo Doctor SDK patch drift (upgrades not approved), external SOS/notification delivery and local notification delivery not implemented/claimed.
- **No unrelated fixes/refactors performed.**

**Conclusion:** DEF-6F-001 is **fixed in approved scope and verified** by focused and full backend regression (11/50 PASS) with real API/MySQL checks and preserved dataset/activity-log integrity.
