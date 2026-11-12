# LIFE BUDDY — PHASE 7 DATABASE BASELINE AUDIT

**Project:** `C:\Users\ADMIN\Desktop\LifeBuddy`  
**Phase:** 7 Continuation — Read-only database baseline audit & test-data approval review  
**Audit date/time (local inspection):** 2026-11-10 (Windows environment; read-only SQL/inspection)  
**Scope:** Read-only investigation only. No DB writes, no schema/seed scripts, no app/runtime changes, no fixes, no installs, no Phase 8/9.

---

## 1. Audit scope, constraints, and method

- **Database access:** read-only queries via configured MySQL login path (`mysql.exe --login-path=lifebuddy_local lifebuddy_db`); no credentials requested/printed.
- **Queries performed:** identity/version, table counts, `activity_logs` metadata (`SHOW CREATE TABLE`, triggers), aggregate distributions (by date, event_type, entity_type, nullability, orphan FK references). No sensitive payloads or full row contents exposed.
- **Application state checks (read-only):** `GET /api/v1/health` (200, DB connected), dashboard port 5173 (not responding at check).
- **No modifications:** no INSERT/UPDATE/DELETE/TRUNCATE/ALTER/DROP, no `lifebuddy_schema.sql`, no `demo_data.sql`, no test/demo data, no cleanup.

---

## 2. MySQL/database identity and version

| Item | Value (observed) |
|---|---|
| Database name | `lifebuddy_db` |
| MySQL version | `8.0.42` |
| `activity_logs` engine | InnoDB |
| `activity_logs` charset/collation | utf8mb4 / utf8mb4_unicode_ci |
| `activity_logs` AUTO_INCREMENT (metadata) | 669 |

---

## 3. Earlier documented `activity_logs` counts (from project docs)

| Source | Documented context | `activity_logs` count | Notes |
|---|---|---:|---|
| `docs/PHASE_7_INTEGRATION_QA_REPORT.md` | Phase 7 inspection snapshot (read-only) | 442 | Reported as pre-existing; not modified |
| `docs/PROJECT_PROGRESS.md` | Phase 7 integration QA (7D blocked context) | 442 | Reported as pre-existing |
| `docs/PHASE_7_RUNTIME_READINESS.md` | Phase 7 continuation readiness recheck (2026-11-10) | 479 | Reported as pre-existing; not modified |
| `docs/PHASE_7_TEST_DATA_APPROVAL_PLAN.md` | Baseline recheck (2026-11-10) | 479 | Reported as pre-existing; must be protected |

**Observed difference (earlier 442 → latest 479):** **+37 rows**.

---

## 4. Current `activity_logs` count and metadata (read-only evidence)

| Metric | Value |
|---|---|
| Current row count | **479** |
| Minimum `created_at` | `2026-11-10 20:15:18` |
| Maximum `created_at` | `2026-11-10 23:57:58` |

### Table structure (relevant)
- Columns: `id` (PK, AUTO_INCREMENT), `actor_user_id` (NULLable, FK→`users.id` ON DELETE SET NULL), `care_user_id` (NULLable, FK→`users.id` ON DELETE SET NULL), `event_type` (varchar, NOT NULL), `entity_type` (varchar, NULL), `entity_id` (bigint, NULL), `summary` (varchar, NOT NULL), `metadata_json` (json, NULL), `created_at` (timestamp, default CURRENT_TIMESTAMP).
- Indexes/keys: PK `id`; `idx_activity_care_user_time (care_user_id, created_at)`; `idx_activity_event_time (event_type, created_at)`; `idx_activity_actor (actor_user_id)`.
- Foreign keys: `fk_activity_actor` → `users(id)` ON DELETE SET NULL ON UPDATE CASCADE; `fk_activity_care_user` → `users(id)` ON DELETE SET NULL ON UPDATE CASCADE.
- Triggers: **none** found in `lifebuddy_db` (read-only check).

### Aggregate distributions (non-sensitive)
**By date (`created_at`):**
| Date | Count |
|---|---:|
| 2026-11-10 | 479 |

**By `event_type`:**
| event_type | Count |
|---|---:|
| USER_LOGIN | 254 |
| ROUTINE_COMPLETION_RECORDED | 42 |
| EMERGENCY_CONTACT_CREATED | 38 |
| SOS_CREATED | 38 |
| MEDICINE_LOG_CREATED | 30 |
| SOS_ACKNOWLEDGED | 25 |
| PREFERENCES_UPDATED | 14 |
| EMERGENCY_CONTACT_DELETED | 13 |
| EMERGENCY_CONTACT_UPDATED | 13 |
| CAREGIVER_LOGIN | 12 |

**By `entity_type`:**
| entity_type | Count |
|---|---:|
| user | 266 |
| emergency_contact | 64 |
| sos_alert | 63 |
| routine_completion | 42 |
| medicine_log | 30 |
| user_preferences | 14 |

**Nullability / referential state:**
| actor_user_id NULL? | care_user_id NULL? | Count |
|---|---|---:|
| Yes (1) | Yes (1) | 479 |

| Check | Result |
|---|---:|
| Rows with non-null `actor_user_id` referencing missing user | 0 |
| Rows with non-null `care_user_id` referencing missing user | 0 |

**Interpretation of evidence:** All 479 rows have both `actor_user_id` and `care_user_id` set to NULL. Given `users=0` currently and FKs configured with **ON DELETE SET NULL**, this is consistent with audit rows whose referenced users were later deleted (user references nulled by FK behavior) while `activity_logs` rows persisted. Event types/timestamps align with application/test-like flows occurring on 2026-11-10; no DB triggers exist to attribute generation automatically.

---

## 5. Investigation of the 37-record difference

### Facts established (read-only)
- Current count is **479** (confirmed). Earlier Phase 7 docs recorded **442** at a prior inspection point; readiness/plan recheck recorded **479**.
- All 479 `activity_logs` rows were created on **2026-11-10** within `20:15:18`–`23:57:58`.
- Event/entity distributions correspond to known logged actions (logins, routine/medicine/SOS/contact/preferences events) rather than schema-only artifacts.
- No triggers exist; generation is consistent with application/service activity logging paths.
- All actor/care user references are NULL now, consistent with prior deletion of associated user records under ON DELETE SET NULL semantics; `activity_logs` were not cascade-deleted.
- No domain/user/link records exist now (all other domain tables 0 except `activity_logs`), consistent with prior temporary/test records having been cleaned up while audit rows remained.

### What cannot be conclusively established from available evidence
- The **exact process, script, API session, or operator action** that produced the specific +37 (or overall 479) rows, and the precise moment relative to the earlier "442" snapshot, cannot be proven from DB aggregates alone (timestamps show same-day window but not the boundary of the earlier count event).
- Whether the increment occurred as part of normal application activity, prior verification/test runs, or other executed operations is **not provable** without external execution logs/timestamps tied to the earlier snapshot.
- Counts are recorded at different inspection times in docs, so a time-based increase is plausible but not individually attributable.

### Historical cause
**HISTORICAL CAUSE: PARTIALLY EXPLAINED** (evidence supports same-day application-generated audit activity and persistence after related user cleanup via ON DELETE SET NULL; **specific originating run/action for the 37-row delta remains UNDETERMINED**). No assumption is made about a specific feature/run without evidence.

---

## 6. Current counts for all relevant tables (authoritative baseline)

**Captured (read-only, 2026-11-10):**

| Table | Current row count |
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
| activity_logs | 479 |

This state is the **authoritative current baseline** for any future approved QA (must be re-captured immediately before any approved run).

---

## 7. Baseline comparison table

| Table | Earlier documented count (Phase 7 inspection) | Current count | Difference | Explained? |
|---|---:|---:|---:|---|
| users | 0 | 0 | 0 | Yes (unchanged) |
| caregiver_links | 0 | 0 | 0 | Yes |
| user_preferences | 0 | 0 | 0 | Yes |
| routines | 0 | 0 | 0 | Yes |
| routine_steps | 0 | 0 | 0 | Yes |
| routine_completions | 0 | 0 | 0 | Yes |
| medicines | 0 | 0 | 0 | Yes |
| medicine_reminders | 0 | 0 | 0 | Yes |
| medicine_logs | 0 | 0 | 0 | Yes |
| emergency_contacts | 0 | 0 | 0 | Yes |
| sos_alerts | 0 | 0 | 0 | Yes |
| communication_items | 0 | 0 | 0 | Yes |
| favourite_phrases | 0 | 0 | 0 | Yes |
| situation_steps | 0 | 0 | 0 | Yes |
| device_tokens | 0 | 0 | 0 | Yes |
| activity_logs | 442 | 479 | +37 | **PARTIALLY EXPLAINED** — same-day app-generated audit rows present; user refs nulled on delete (persisted). Precise delta origin **UNDETERMINED**. Treated as pre-existing baseline now. |

---

## 8. Existing record protection assessment

- **`activity_logs` (479 rows, all current):** must be treated as **pre-existing/protected baseline**. They cannot be safely attributed/removed without evidence mapping specific rows to a specific approved run; blanket deletion would be destructive and is **not permitted**.
- **FK behavior:** `actor_user_id`/`care_user_id` use ON DELETE SET NULL → deleting users does **not** remove audit rows. Therefore future approved test cleanup **must not assume** `activity_logs` created by tests will be auto-removed.
- **Other domain tables:** currently empty (0). No pre-existing domain records to protect beyond preserving emptiness until/unless approved test data is added.
- **Policy:** no modifications/deletions of any pre-existing rows; any future removals limited strictly to uniquely identified records created in an explicitly approved run (by captured IDs/`RUNID` markers where applicable).

---

## 9. Test-data plan review (`docs/PHASE_7_TEST_DATA_APPROVAL_PLAN.md`)

**Files verified present (Phase 7 readiness docs):** 5 — `PHASE_7_INTEGRATION_QA_REPORT.md`, `PHASE_7_RUNTIME_READINESS.md`, `PHASE_7_DASHBOARD_BROWSER_QA_CHECKLIST.md`, `PHASE_7_MOBILE_DEVICE_QA_CHECKLIST.md`, `PHASE_7_TEST_DATA_APPROVAL_PLAN.md` (consistent with prior readiness stage).

**Assessment of sufficiency (by supported flows, if approved and executed):**
| Requirement | Assessment | Notes |
|---|---|---|
| Caregiver and linked care-user authentication | **Sufficient (proposed)** | Caregiver register/login + care-user create/PIN via APIs (`/auth/*`, `/care-users`, `/care-users/:id/pin`) |
| Ownership-denial (unrelated caregiver) | **Sufficient (proposed)** | Unrelated Caregiver B proposed |
| Routine creation, ordered steps, completion, dashboard history | **Sufficient (proposed)** | Routine+steps via caregiver APIs; completions via supported care-user flow during QA |
| Medicine creation, reminders, Taken/Skipped logs, history | **Sufficient (proposed)** | Medicine+reminders via caregiver APIs; logs via supported flow; DEF-6F-001 reproducible with known constraint |
| Emergency contact management | **Sufficient (proposed)** | CRUD/primary via supported caregiver APIs |
| Communication catalogue and care-user favourites | **Sufficient (proposed)** | Global catalogue via caregiver API; favourites created by care-user self (API) as required |
| SOS creation, caregiver acknowledgement, history | **Sufficient (proposed)** | SOS created via care-user supported API (`POST /sos-alerts`, `clientEventId`); ack via caregiver API; history/list via supported endpoints (resolve exists but contract/status constraints must be respected) |
| Care-user preference retrieval and updates | **Sufficient (proposed)** | `GET/PUT /care-users/:id/preferences` |

**API vs direct SQL:** Plan correctly prefers supported APIs for all above. **Situation guidance excluded** from direct SQL by default (read-only API, empty table) — requires separate future approval if populated. **Appropriate:** no direct SQL proposed where supported APIs exist.

**Plan quality notes:** includes unique `RUNID` tagging, pre-run baseline capture, FK-aware cleanup order, independent verification, failure handling, and protection of pre-existing records. It acknowledges `activity_logs` side-effects and need for scoped approval — this remains critical given ON DELETE SET NULL behavior (see cleanup assessment).

---

## 10. Cleanup safety assessment

| Aspect | Assessment |
|---|---|
| Domain entities with supported API delete paths (as applicable) | Routines/steps/medicines/reminders/contacts/communication/favourites have API routes; cleanup can prefer APIs but must be verified per actual behavior/contracts |
| SOS | Create/ack supported; delete support via API not confirmed in inspected routes — may require **approved targeted direct SQL by exact ID** if cleanup needed |
| Users/links/preferences | Deleting users can cascade/affect links/preferences per schema; must follow scoped, ordered, approved cleanup and verify no pre-existing impact (none exist now) |
| **`activity_logs` side-effects** | **High caution:** approved QA actions will likely generate new `activity_logs`. Because FKs SET NULL on user delete, these rows will **persist** after user cleanup and cannot be assumed auto-removed. Plan must: capture created/run-correlated `activity_logs` IDs (or a provable scope) **during the approved run** and request/obtain explicit separate or included approval to delete **only those exact rows**; otherwise they remain and baseline will not return to 479. |
| Baseline restoration guarantee | **Not guaranteed by application flow alone** for `activity_logs`. Full restoration to pre-run counts requires: (a) no audit rows generated, or (b) exact-ID scoped approved deletion verified independently. Pre-run/current baseline (479) must be preserved regardless. |
| Pre-existing records | **Safe to protect** if cleanup is strictly limited to captured `RUNID`/IDs created in that run; never delete by name/date similarity alone. |

**Conclusion:** Cleanup is **conditionally feasible** for created domain records with careful scoping and verification, but **`activity_logs` baseline restoration is only safely possible with explicit, provable row-level scoping and approval**. Any approved run must document and handle generated audit rows explicitly.

---

## 11. Documentation consistency check

| Document | Exists | Consistency findings |
|---|---:|---|
| `docs/PHASE_7_INTEGRATION_QA_REPORT.md` | Yes | Records `activity_logs=442` as inspection-time snapshot (accurate for that inspection). Not updated in this audit (historical snapshot). |
| `docs/PHASE_7_RUNTIME_READINESS.md` | Yes | Records `activity_logs=479` (rechecked 2026-11-10) — **consistent with current audit**. |
| `docs/PHASE_7_DASHBOARD_BROWSER_QA_CHECKLIST.md` | Yes | Prepared/not executed; consistent. |
| `docs/PHASE_7_MOBILE_DEVICE_QA_CHECKLIST.md` | Yes | Prepared/not executed; consistent. |
| `docs/PHASE_7_TEST_DATA_APPROVAL_PLAN.md` | Yes | Baseline `activity_logs=479` and preservation/cleanup cautions present — **consistent with current audit**; strengthened by this audit's finding that audit rows persist via SET NULL. |
| `docs/PROJECT_PROGRESS.md` | Yes | Contains historical `activity_logs=442` references for earlier Phase 7 context and other historical entries; current authoritative baseline is 479 per this audit. **Minor factual clarification warranted** (add audit note) without rewriting historical snapshots. |

**Actual Phase 7 readiness docs created (previous stage):** 3 checklists/plans + readiness report = 4 new files in that stage (`PHASE_7_RUNTIME_READINESS.md`, `PHASE_7_DASHBOARD_BROWSER_QA_CHECKLIST.md`, `PHASE_7_MOBILE_DEVICE_QA_CHECKLIST.md`, `PHASE_7_TEST_DATA_APPROVAL_PLAN.md`), alongside pre-existing `PHASE_7_INTEGRATION_QA_REPORT.md` (total 5 Phase 7 docs present).

---

## 12. Remaining blockers

| Blocker | Status | Notes |
|---|---|---|
| Dashboard browser runtime QA (7B) | **BLOCKED / NOT PERFORMED** | Dashboard `localhost:5173` not running at check; interactive GUI/browser execution/evidence not available in this context |
| Mobile emulator/physical-device runtime QA (7C) | **BLOCKED / NOT PERFORMED** | ADB/Android SDK/Studio/emulator/device unavailable |
| Populated cross-module integration QA (7D) | **BLOCKED / APPROVAL REQUIRED** | Domain/catalogue tables empty (0); minimal non-destructive test data + approved cleanup policy required |
| `activity_logs` baseline handling for future QA | **APPROVAL REQUIRED** | 479 pre-existing rows protected; any QA-generated audit rows require explicit scoped handling/approval for cleanup if baseline restoration expected |
| DEF-6F-001 | **Known / APPROVAL REQUIRED** | Unfixed; separate approval needed for backend fix |
| Situation guidance populated data | **BLOCKED (by design/API) / APPROVAL REQUIRED** | Read-only API and empty catalogue; no default direct-SQL creation |

**Environment (rechecked, read-only):** Edge/Chrome detected; no project Playwright config; Android tooling/device unavailable; backend 200/DB connected; dashboard dev server not running. No installs/config changes performed.

---

## 13. Exact approvals still required

1. **APPROVAL A — Test data creation:** Explicit approval for minimal, uniquely tagged, API-preferred test data per `docs/PHASE_7_TEST_DATA_APPROVAL_PLAN.md` (with immediate pre-run baseline re-capture). No situation direct SQL by default.
2. **APPROVAL B — Scoped cleanup + verification:** Explicit approval to remove only approved `RUNID`/captured-ID domain records and to perform independent SQL verification. Must explicitly address **QA-generated `activity_logs`** (capture exact IDs during run and allow deletion of only those exact rows) if restoration to pre-run baseline is required; otherwise accept documented residual audit rows with approval.
3. **APPROVAL C — (Optional, separate) `situation_steps` direct SQL:** Only if populated situation QA required; exact rows/keys and cleanup pre-approved.
4. **APPROVAL D — (Separate) DEF-6F-001 fix:** Backend fix + regression tests in `backend/src/services/medicineService.js` only with explicit approval.

No insertion, deletion, cleanup, fix, or runtime QA requiring missing environments/unapproved data will be performed without corresponding explicit approval.

---

## 14. Operations not performed (audit)

- No DB inserts/updates/deletes/truncates; no schema/seed scripts executed.
- No test/demo accounts or domain records created/cleaned.
- No backend/dashboard/mobile/auth/API/schema/security changes.
- No DEF-6F-001 fix. No software/dependency installs.
- No browser or mobile runtime QA executed. No Phase 8/9 started.
- No sensitive payloads, credentials, PINs, or JWTs exposed.

**Audit conclusion:** Current authoritative baseline is **479 `activity_logs` (pre-existing/protected)** with all other relevant domain tables at **0**. The 442→479 difference is **PARTIALLY EXPLAINED** by evidence of same-day persisted audit activity and SET NULL user-reference behavior; the precise historical origin of the +37 delta is **UNDETERMINED** from available read-only evidence. Stop for review/approval.