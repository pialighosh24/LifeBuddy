# LIFE BUDDY — PHASE 7 DASHBOARD BROWSER QA CHECKLIST

**Project:** `C:\Users\ADMIN\Desktop\LifeBuddy`  
**Prepared:** 2026-11-10 (readiness/planning)  
**Target:** Caregiver dashboard (React + Vite + TypeScript), real backend `/api/v1`, MySQL `lifebuddy_db`  
**Execution status:** **NOT EXECUTED** (checklist prepared only). No tests marked PASS. Interactive browser runtime QA pending.

## Preconditions (global)
- Backend running and healthy (`GET /api/v1/health` → `database.connected:true`).
- Dashboard running (`npm run dev` or preview) and reachable in browser (default `http://localhost:5173`).
- `VITE_API_BASE_URL` configured; CORS allows dashboard origin.
- Test accounts/data available as required (**APPROVAL REQUIRED** for any DB seeding; do not modify pre-existing records).
- Record browser/version, date/time, tester, and evidence (screenshots/notes/network responses where possible).

## Legend
- **Actual result:** fill during execution
- **Status:** `PASS` / `FAIL` / `NOT TESTED` (default `NOT TESTED`)

---

## 1. Authentication
| Test ID | Preconditions | Steps | Expected result | Actual result | Status | Evidence |
|---|---|---|---|---|---|---|
| DB-AUTH-01 | Valid caregiver credentials exist (approved test data) | Open login, enter valid email/password, submit | Login succeeds, redirected to protected dashboard, session established |  | NOT TESTED |  |
| DB-AUTH-02 | None | Enter invalid credentials, submit | Clear error shown, no authenticated session, no sensitive leakage |  | NOT TESTED |  |
| DB-AUTH-03 | Authenticated session | Navigate to protected route while logged in | Access granted, correct page renders |  | NOT TESTED |  |
| DB-AUTH-04 | Authenticated session | Refresh browser on protected route | Session restored per actual behavior (sessionStorage + `/auth/me`) or honest re-auth flow |  | NOT TESTED |  |
| DB-AUTH-05 | Authenticated session | Click logout | Local session cleared, redirected to login; backend logout called best-effort (stateless) |  | NOT TESTED |  |
| DB-AUTH-06 | Expired/invalid token scenario (if reproducible safely) or simulated 401 | Trigger protected API call returning 401 | Session cleared and user returned to login with honest message |  | NOT TESTED |  |
| DB-AUTH-07 | Temporary network failure / backend unreachable | Perform action requiring API while network/server down | Honest network error, retry possible, valid session not cleared solely due to transient network error (per implementation) |  | NOT TESTED |  |

## 2. Care Users
| Test ID | Preconditions | Steps | Expected result | Actual result | Status | Evidence |
|---|---|---|---|---|---|---|
| DB-CU-01 | Authenticated caregiver, linked care users exist | Open Care Users | Real linked care users listed (or honest empty state), loading/error/retry behave correctly |  | NOT TESTED |  |
| DB-CU-02 | Authenticated caregiver | Create care user via supported form/API | Server-confirmed creation, list/detail refreshed, data persists after refresh; no fabricated data |  | NOT TESTED |  |
| DB-CU-03 | Existing linked care user | View care-user details | Only real backend fields shown; loading/not-found/unauthorized handled |  | NOT TESTED |  |
| DB-CU-04 | Existing linked care user | Edit supported fields and save | Changes persist after refresh (DB-backed); validation/errors handled |  | NOT TESTED |  |
| DB-CU-05 | Existing linked care user | Set/reset PIN via supported API | Success only after server confirmation; PIN never displayed/logged; persisted behavior per backend |  | NOT TESTED |  |
| DB-CU-06 | Unrelated caregiver / unauthorized context (if safely testable) | Attempt access to non-owned care user resources | Access denied (403/ownership enforced), no data leakage |  | NOT TESTED |  |

## 3. Emergency Contacts
| Test ID | Preconditions | Steps | Expected result | Actual result | Status | Evidence |
|---|---|---|---|---|---|---|
| DB-EC-01 | Selected linked care user | Open Emergency Contacts | Real contacts listed or honest empty state |  | NOT TESTED |  |
| DB-EC-02 | Selected care user | Create contact with valid data | Server-confirmed create, persists after refresh |  | NOT TESTED |  |
| DB-EC-03 | Existing contact | Edit contact details | Updates persist after refresh; validation handled |  | NOT TESTED |  |
| DB-EC-04 | Multiple contacts / backend supports primary | Set/change primary contact | Primary state consistent with backend rules and persists |  | NOT TESTED |  |
| DB-EC-05 | Existing contact | Delete/deactivate per actual backend contract (with confirmation) | Correct backend behavior, UI refresh, persistence verified |  | NOT TESTED |  |

## 4. SOS Alerts
| Test ID | Preconditions | Steps | Expected result | Actual result | Status | Evidence |
|---|---|---|---|---|---|---|
| DB-SOS-01 | Care user with SOS alerts exists | Open SOS Alerts list | Real alerts shown with actual statuses/fields or honest empty state |  | NOT TESTED |  |
| DB-SOS-02 | Existing alert | Open alert details | Actual status, timestamps, and available location info shown; no invented address/delivery |  | NOT TESTED |  |
| DB-SOS-03 | Eligible (acknowledgeable) alert and linked caregiver | Acknowledge alert | Server-confirmed acknowledgement, status/metadata updated, persists (DB-verifiable); repeat/409 handled honestly |  | NOT TESTED |  |
| DB-SOS-04 | No alerts / error condition | View list/detail under empty/error states | Honest empty/loading/error/retry UI; no fabricated data |  | NOT TESTED |  |
| DB-SOS-05 | Any alert view | Review status semantics | No `RESOLVED` status invented; acknowledgement ≠ emergency ended; no external SMS/email/push/emergency-service delivery claimed |  | NOT TESTED |  |

## 5. Daily Routines
| Test ID | Preconditions | Steps | Expected result | Actual result | Status | Evidence |
|---|---|---|---|---|---|---|
| DB-RT-01 | Selected linked care user | List routines | Real routines or honest empty state |  | NOT TESTED |  |
| DB-RT-02 | Selected care user | Create routine (supported fields) | Server-confirmed create, persists after refresh |  | NOT TESTED |  |
| DB-RT-03 | Existing routine | Edit routine details | Supported fields update and persist |  | NOT TESTED |  |
| DB-RT-04 | Existing routine | Activate/deactivate | `isActive` changes per backend and persists |  | NOT TESTED |  |
| DB-RT-05 | Existing routine | Add/edit/delete steps and reorder (supported ops) | Ordering/content persisted correctly after refresh; no silent reorder |  | NOT TESTED |  |
| DB-RT-06 | Routine with completions/progress | View completion history and progress | Real backend records/summaries only; read-only where applicable; no fabricated progress |  | NOT TESTED |  |
| DB-RT-07 | Any routine UI | Check unsupported features | No scheduling/recurrence invented; no dashboard auto-completion |  | NOT TESTED |  |

## 6. Medicines
| Test ID | Preconditions | Steps | Expected result | Actual result | Status | Evidence |
|---|---|---|---|---|---|---|
| DB-MED-01 | Selected linked care user | List medicines | Real records or honest empty state |  | NOT TESTED |  |
| DB-MED-02 | Selected care user | Create/edit medicine (caregiver-entered, supported fields) | Server-confirmed save, persists after refresh; validation handled |  | NOT TESTED |  |
| DB-MED-03 | Existing medicine | Activate/deactivate | Status persists per backend |  | NOT TESTED |  |
| DB-MED-04 | Existing medicine | Manage supported reminders (create/edit/delete/deactivate) | Stored reminder info persists; no delivery claims |  | NOT TESTED |  |
| DB-MED-05 | Existing medicine with logs/history | View logs and history | Genuine read-only records/statuses only; no fabricated history/auto-marking |  | NOT TESTED |  |
| DB-MED-06 | Existing medicine with dates (safe temp data) | Reproduce known DEF-6F-001: partial PATCH without date fields vs with explicit dates | Observe/document actual behavior (expected: without dates may fail 400; with dates succeeds) — **no backend fix** |  | NOT TESTED |  |
| DB-MED-07 | Any medicine UI | Safety/claims check | No notification delivery claimed; no medical advice/dosage calculations |  | NOT TESTED |  |

## 7. Communication
| Test ID | Preconditions | Steps | Expected result | Actual result | Status | Evidence |
|---|---|---|---|---|---|---|
| DB-COM-01 | Authenticated caregiver | Load communication catalogue | Real global catalogue or honest empty state |  | NOT TESTED |  |
| DB-COM-02 | Catalogue loaded | Search and filter (category/active over real fields) | Results reflect fetched real data only |  | NOT TESTED |  |
| DB-COM-03 | Items with EN/BN content (or missing BN) | Verify bilingual display | EN/BN shown as stored; missing values honest; no fabricated/auto translation |  | NOT TESTED |  |
| DB-COM-04 | Supported backend ops | Create/edit/deactivate item | Server-confirmed mutations, persist after refresh; identifiers/semantics preserved |  | NOT TESTED |  |
| DB-COM-05 | Linked care user with favourites (if any) | View care-user favourites | Read-only for caregiver (no add/remove controls); real data or honest empty state |  | NOT TESTED |  |

## 8. Situation Guidance
| Test ID | Preconditions | Steps | Expected result | Actual result | Status | Evidence |
|---|---|---|---|---|---|---|
| DB-SIT-01 | Authenticated caregiver | Load global situation catalogue | Real catalogue or honest empty state (read-only) |  | NOT TESTED |  |
| DB-SIT-02 | Situation exists (or none) | Open detail and ordered steps | Steps shown in backend order with EN/BN as stored; honest empty/missing handling |  | NOT TESTED |  |
| DB-SIT-03 | Any situation UI | Contract/safety check | No unsupported CRUD controls; no AI-generated/fabricated guidance; HELP ME/SOS behavior unchanged |  | NOT TESTED |  |

## 9. Settings & Preferences
| Test ID | Preconditions | Steps | Expected result | Actual result | Status | Evidence |
|---|---|---|---|---|---|---|
| DB-SET-01 | Authenticated caregiver | Load Settings page/profile | Real caregiver profile info shown (no secrets) |  | NOT TESTED |  |
| DB-SET-02 | Authenticated caregiver | Edit supported profile fields and save | Server-confirmed update, persists after refresh; validation handled |  | NOT TESTED |  |
| DB-SET-03 | Linked care user selected | Load care-user preferences | Real preferences (or defaults per backend) shown |  | NOT TESTED |  |
| DB-SET-04 | Preferences loaded | Update supported preference values and save | Server-confirmed persistence, values retained after refresh |  | NOT TESTED |  |
| DB-SET-05 | Invalid inputs / unauthorized context | Validation and ownership restrictions | 400 validation shown appropriately; 401/403 handled without leaking data; no session cleared on transient network errors |  | NOT TESTED |  |
| DB-SET-06 | Any settings UI | Claim checks | No claim that backend pref changes auto-update mobile; notificationsEnabled is stored flag only (no delivery) |  | NOT TESTED |  |

## 10. Accessibility & Responsive Behavior
| Test ID | Preconditions | Steps | Expected result | Actual result | Status | Evidence |
|---|---|---|---|---|---|---|
| DB-A11Y-01 | Dashboard running | Desktop viewport review | Layout usable, no broken/overlapping critical UI |  | NOT TESTED |  |
| DB-A11Y-02 | Dashboard running | Tablet-sized viewport | Responsive layout adapts correctly |  | NOT TESTED |  |
| DB-A11Y-03 | Dashboard running | Mobile-sized browser viewport | Mobile drawer/nav and forms usable |  | NOT TESTED |  |
| DB-A11Y-04 | Interactive elements | Keyboard navigation (Tab/Shift+Tab/Enter/Escape as applicable) | Logical focus order, operable controls, no traps |  | NOT TESTED |  |
| DB-A11Y-05 | Focusable elements | Visible focus states | Focus clearly visible on interactive controls |  | NOT TESTED |  |
| DB-A11Y-06 | Forms/controls | Labels and accessible control names | Inputs/buttons have clear labels/names |  | NOT TESTED |  |
| DB-A11Y-07 | Content/pages | Text readability and contrast | Text readable, contrast consistent with design; status not by color alone |  | NOT TESTED |  |

## Execution notes
- Record environment: OS, browser/version, dashboard URL, backend URL, date/time.
- Capture evidence for PASS/FAIL (screenshots, network responses, DB verification where safe/approved).
- Do not execute destructive actions, schema/seed scripts, or unapproved data insertion.
- If a prerequisite/test is blocked, mark **NOT TESTED** with reason.