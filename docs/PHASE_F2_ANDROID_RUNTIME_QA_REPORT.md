# PHASE F2 — Android / Expo Go Runtime QA (Preparation & Execution Log)

**Project:** `C:\Users\ADMIN\Desktop\LifeBuddy`  
**Stage:** F2 — Physical Android/Expo Go Runtime QA Preparation & Guided Verification  
**Date prepared:** 2026-11-12  
**Scope:** Verification and preparation only. No application source, backend, API, auth/RBAC, CORS, security, database schema/config, dependency, or QA-data changes performed.

---

## 1. Environment readiness (independently verified, read-only)

| Item | Status | Evidence / notes |
|---|---|---|
| Project root / mobile directory | **PASS** | `C:\Users\ADMIN\Desktop\LifeBuddy`, `mobile/` present |
| Mobile `.env` present | **PASS** | Present (secrets/values not printed) |
| Mobile API base URL class / configured host | **PASS (pattern)** | Private LAN IP configured; configured host observed as `10.106.140.4` (value classification only, no secrets). |
| Current laptop LAN IPv4 (`ipconfig`) | **OBSERVED** | **10.106.140.4** (2026-11-12 check). **Not permanent — verify each session.** |
| Configured mobile API IP vs current LAN IP | **MATCH (current check)** | Configured host matches observed LAN IPv4 at time of check. If mismatch occurs later, **do not change `.env` automatically**; explain mismatch and request approval before any config change. |
| Backend health | **PASS** | `GET http://localhost:4000/api/v1/health` → success, DB connected (2026-11-12). Backend appeared running (uptime observed). |
| Expo project start readiness (existing deps) | **PASS (basic)** | Expo CLI/version available (`npx expo --version` returned `58.1.19`); existing dependencies present. Actual Metro/device connection not verified here. |

**Safety:** No configuration changes made. No secrets printed.

---

## 2. Exact startup instructions (PowerShell)

> Do not start duplicate backend or Expo processes if they are already running.

**Terminal 1 — Backend**
```powershell
cd C:\Users\ADMIN\Desktop\LifeBuddy\backend
npm start
```

**Terminal 2 — Mobile Expo**
```powershell
cd C:\Users\ADMIN\Desktop\LifeBuddy\mobile
npx expo start --clear --lan
```

**Connectivity notes**
- Android phone and laptop must be on the **same Wi-Fi network**.
- Open **Expo Go** on Android and scan the Metro QR code.
- Verify backend from phone browser: `http://<CURRENT_LAN_IP>:4000/api/v1/health` (replace with current laptop IPv4 from `ipconfig`; do not use `localhost` on phone).
- If mobile API IP/config becomes outdated, stop and request approval before any `.env` change.

---

## 3. Interactive execution prerequisites (user confirmation required)

| Prerequisite | Status | Evidence |
|---|---|---|
| Backend is running | **PENDING USER CONFIRMATION** | — |
| Expo QR code is visible | **PENDING USER CONFIRMATION** | — |
| Expo Go successfully opens Life Buddy | **PENDING USER CONFIRMATION** | — |

**Physical device testing not yet performed/claimed.**

---

## 4. Guided test checklist and results

> Record only user-reported or independently verified evidence.  
> **Status legend:** PASS = actually observed; FAIL = actually reproduced; BLOCKED = could not perform; NOT TESTED = not attempted.  
> **Mutation restrictions:** No Taken/Skipped/Missed, no routine step completion, no SOS alert creation, no other backend-mutating operation.

### Stage B — Navigation, buttons, states
| # | Test | Status | Evidence (user-reported/verified) | Notes |
|---|---|---|---|---|
| B1 | Home screen loads | NOT TESTED | — | — |
| B2 | SOS screen opens | NOT TESTED | — | — |
| B3 | Back to Home works | NOT TESTED | — | — |
| B4 | Alert History refresh works (no alert created) | NOT TESTED | — | — |
| B5 | More → Emergency Contacts opens | NOT TESTED | — | — |
| B6 | More → Appointments opens | NOT TESTED | — | — |
| B7 | More → Daily Tasks opens | NOT TESTED | — | — |
| B8 | Retry buttons invoke expected refresh behavior | NOT TESTED | — | — |

### Stage C — My Feelings (local-only storage permitted)
| # | Test | Status | Evidence | Notes |
|---|---|---|---|---|
| C1 | All nine feeling options appear | NOT TESTED | — | Happy, Sad, Angry, Afraid, Tired, Confused, In Pain, Need Help, Speak Feeling |
| C2 | Selecting a feeling displays expected response | NOT TESTED | — | — |
| C3 | Timestamp and latest selection display correctly | NOT TESTED | — | — |
| C4 | Reopening My Feelings preserves local history | NOT TESTED | — | Local device only |
| C5 | Clear Selection does not delete history | NOT TESTED | — | — |
| C6 | Delete History cancellation preserves entries | NOT TESTED | — | — |
| C7 | Confirmed deletion clears local history | NOT TESTED | — | — |
| C8 | Bengali and English labels work | NOT TESTED | — | — |
| C9 | Text-to-speech works if available | NOT TESTED | — | — |
| C10 | Need Help/In Pain/Speak Feeling do not auto-create SOS or contact anyone | NOT TESTED | — | — |
| C11 | Home latest-feeling summary works | NOT TESTED | — | Local-only, not backend |

### Stage D — My Day and Routines (read-only; no step completion)
| # | Test | Status | Evidence | Notes |
|---|---|---|---|---|
| D1 | My Day loads | NOT TESTED | — | — |
| D2 | Existing routine information and progress display correctly | NOT TESTED | — | — |
| D3 | Routine detail opens | NOT TESTED | — | — |
| D4 | Reopening a routine refreshes data | NOT TESTED | — | — |
| D5 | Instructions, step order and status readable | NOT TESTED | — | — |
| D6 | Retry and refresh work | NOT TESTED | — | — |
| D7 | Bengali and English labels work | NOT TESTED | — | — |
| D8 | Text-to-speech works if available | NOT TESTED | — | — |
| D9 | Routine step completion submitted | **BLOCKED — MUTATION NOT APPROVED** | — | Must not perform |

### Stage E — Medicine (read-only; no Taken/Skipped/Missed)
| # | Test | Status | Evidence | Notes |
|---|---|---|---|---|
| E1 | Medicine list and details open | NOT TESTED | — | — |
| E2 | Existing reminders and history display correctly when available | NOT TESTED | — | — |
| E3 | Refresh and retry work | NOT TESTED | — | — |
| E4 | Dates and times display correctly | NOT TESTED | — | — |
| E5 | Bengali and English labels work | NOT TESTED | — | — |
| E6 | Safety note visible (recording does not independently verify consumption) | NOT TESTED | — | — |
| E7 | Text-to-speech works if available | NOT TESTED | — | — |
| E8 | Taken/Skipped/Missed actions submitted | **BLOCKED — MUTATION NOT APPROVED** | — | Must not perform |

### Network/error/connectivity observations (if reported)
| Observation | Status | Evidence | Notes |
|---|---|---|---|
| — | NOT TESTED | — | Inspect connectivity/current API IP without config changes if issues reported |

---

## 5. Error handling log (if reported)

| Time/context | Reported issue | Visible details (no secrets) | Classification | Action taken |
|---|---|---|---|---|
| — | — | — | — | — |

**Rules:** Do not invent fixes or modify source/config. Stop affected test on crash/unexpected mutation and report.

---

## 6. Static verification (if rerun)

| Check | Command | Result | Notes |
|---|---|---|---|
| Not rerun in F2 preparation | — | — | See Stage F static results (tsc/export PASS) unless user requests safe rerun |

---

## 7. Defects found

| ID | Screen | Description | Repro steps | Severity | Evidence type | Approval needed for fix |
|---|---|---|---|---|---|---|
| — | — | None recorded (testing not yet performed) | — | — | — | — |

---

## 8. Files changed (Stage F2)

- `docs/PHASE_F2_ANDROID_RUNTIME_QA_REPORT.md` (created — preparation/checklist log)
- `docs/PROJECT_PROGRESS.md` (updated — Stage F2 preparation entry)
- `docs/TESTING_AND_QA_REPORT.md` (updated — Stage F2 preparation entry)
- `docs/KNOWN_ISSUES_AND_LIMITATIONS.md` (updated — Stage F2 notes)

No application source, backend, API, auth, RBAC, CORS, security, schema, dependency, or database record changes.

---

## 9. Preservation confirmation

- Backend APIs, authentication, RBAC, CORS, and security: **not modified**.
- Database schema and records: **not modified**. No users/QA records created/updated/deleted/reset.
- `activity_logs`: **not modified** (immutable).
- No medicine Tak
