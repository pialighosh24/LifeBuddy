# Known Issues and Limitations — Life Buddy

**Date:** 2026-11-12 (Phase 2B documentation update)  
**Evidence basis:** Code inspection, static/build/test checks, config/service health checks, and existing reports. **No fabricated runtime results.**

---

## 1. Confirmed working (static/build/automated/config — not browser/device runtime)

- Backend health endpoint reachable with MySQL connected (verified 2026-11-12).
- Dashboard and mobile TypeScript checks **PASS**; dashboard production build **PASS**.
- Backend regression suite **PASS** (11 suites, 50 tests, recent run).
- Android Expo export/bundle **PASS** (static/bundle verification only).
- Dashboard/mobile API base URL configuration present and reviewed for local dev; backend dev CORS uses explicit allowlist for localhost/127.0.0.1 origins.
- Phase 2A mobile integrations implemented against existing APIs (Talk/My Day/Medicine/Help Me guidance/SOS/Home summaries) with honest-state handling in code; **on-device runtime behavior remains pending manual verification**.

---

## 2. Known issues / pending verification

| ID | Area | Status | Details | Evidence needed / resolution |
|---|---|---|---|---|
| KI-01 | Dashboard Communication page (runtime) | **Runtime unconfirmed** | Previously reported blank page in Edge. Static audit: route/component/API/types/build OK; loading/empty/error states implemented; `ErrorBoundary` added to avoid full blank screen on uncaught render errors. Dev CORS for localhost/127.0.0.1 origins configured. | Manual Edge QA with DevTools Console/Network evidence on both origins; if reproduced, capture error/request and apply smallest safe fix within existing contracts |
| KI-02 | Dashboard browser runtime QA (all routes) | **Not executed** | Login, Overview, Care Users, Emergency Contacts, SOS Alerts, Daily Routines, Medicines, Communication, Situation Guidance, Settings not runtime-verified by agent. | Manual Edge execution and documentation in `PHASE_7B_DASHBOARD_BROWSER_RUNTIME_QA_REPORT.md` |
| KI-03 | Mobile physical-device/Expo Go runtime | **Not verified** | No device/emulator/ADB; Metro/on-device behavior, TTS, dialer/SMS handoff, LAN connectivity unverified. | Manual device testing per `EXPO_GO_SETUP_GUIDE.md` with actual results |
| KI-04 | Cross-module end-to-end flows | **Not executed / approval-gated** | Routine/medicine/SOS/communication cross-platform propagation and acknowledgement flows not runtime-verified; data-changing cases require explicit approval. | Execute matrix in `TESTING_AND_QA_REPORT.md` with approvals and evidence |
| KI-05 | Expo SDK patch-version drift | **Open (non-blocking to current checks)** | `expo-doctor` 19/20 PASS, 1 FAIL (Expo package patch mismatches). No installs/upgrades performed. | Review `npx expo install --check`; apply targeted approved fixes if compatible |
| KI-06 | Mobile API base URL per environment | **Config-sensitive** | `mobile/.env` currently points to a LAN IP example/state; physical device requires current laptop Wi-Fi IPv4, emulator/simulator require different values. | Verify with `ipconfig`, set correct `EXPO_PUBLIC_API_BASE_URL`, confirm connectivity |
| KI-07 | `situation_steps` data empty | **Known data state** | Read-only situation guidance may show honest empty states. | Populate only if separately approved (no schema/API changes assumed) |
| KI-08 | Fresh QA pair data sparseness | **Expected** | Caregiver 1891 / care-user 1892 may have empty routines/medicines/contacts/favourites/SOS/preferences in places; honest empty states expected. | Use appropriate approved data during QA |

---

## 3. Intentional limitations (not defects)

- **No external delivery claims:** SMS, email, push notifications, emergency-service dispatch, and local notification delivery are **not verified/implemented** as confirmed external integrations unless explicitly proven. SOS/notification states reflect backend-recorded/system status only.
- **Help Me workflow:** Situation guidance is read-only; **no persistent help-request create/acknowledge/resolve workflow** exists in current API/DB contracts. Proposal/design approval required for expansion.
- **Reminders:** Presented as server-stored schedule information, not proof of notification delivery.
- **Lint:** No lint scripts configured for dashboard/mobile; lint not run.
- **Browser automation:** Disconnected; agent cannot provide automated browser evidence.
- **Repository state:** Not a git repo; changes are local/unversioned.

---

## 4. Security and data-preservation constraints (must remain)

- Never delete/update/truncate `activity_logs`.
- Preserve all approved QA records/dataset and existing user/link relationships.
- No destructive DB operations, schema resets, seeds, or direct SQL writes without explicit approval.
- No credential/PIN/JWT/hash exposure in logs, reports, screenshots, or source.
- No weakening of authentication, RBAC, ownership checks, validation, or explicit CORS/security policy.
- No fake data, fabricated metrics, or unverified PASS claims (browser/device/E2E).

---

## 5. Environment notes

- Backend: `http://localhost:4000` (`/api/v1`), DB `lifebuddy_db`.
- Dashboard dev: `http://localhost:5173` / `http://127.0.0.1:5173`, `VITE_API_BASE_URL=http://localhost:4000`.
- Mobile: set `EXPO_PUBLIC_API_BASE_URL` per runtime target; verify LAN IP each session; restart Metro after env changes.
- After backend `.env` changes (e.g. CORS), restart backend service.

---

## 6. Approval gates (remaining)

- Any data-creating QA/E2E mutations (routine completions, medicine logs, SOS create/ack, etc.).
- Dependency installs/upgrades (including Expo patch alignment).
- Any schema/API-contract/auth/RBAC/CORS/security changes.
- New modules/workflows beyond existing contracts (appointments, tasks, persistent help requests, verified notification delivery integrations).
- Runtime-confirmed defect fixes that exceed existing approved contracts.

---

## Stage D — My Day & Routine Management (2026-11-12, mobile frontend stabilization)

### Addressed (static/code-level, within existing contracts)
- My Day and routine detail now refresh on screen reopen/focus and retain authoritative backend-driven progress/completion behavior.
- Added `clientEventId` to routine completion submissions (existing API contract) to strengthen idempotent/duplicate handling alongside existing UI guards and server refresh.
- Replaced Stage-D-touched hardcoded UI strings with EN/BN translations (non-care-user hint, routine status/empty/fallback notes, localized Home routine/medicine summary counts) without redesign.

### Remaining limitations / verification pending
- **Physical Android/Expo Go runtime not verified:** actual completion persistence, focus-refresh behavior, duplicate-tap/network-failure handling, EN/BN rendering, and TTS on device remain unconfirmed.
- **Routine schedule information unavailable in contract:** existing routine APIs/types/schema do not expose scheduled time/day fields; UI shows only available backend data (name/description/steps/progress/status) and does not invent schedules.
- **Routine detail initial index on reopen:** focus refresh reloads routine state and jumps to first incomplete step for today (or start) by design; in-session manual step browsing position may reset on reopen/refresh.
- **Cross-client propagation:** caregiver dashboard reflection after mobile routine completion not runtime-verified in this stage.
- No automated mobile tests configured; lint scripts not available.
- Expo SDK patch drift remains (no dependency upgrades applied).

---

## Stage E — Medicine Management Improvement (2026-11-12, mobile frontend)

### Addressed (static/code-level, within existing contracts)
- Medicine list/detail now refresh on screen reopen/focus and present real backend data with improved clarity (active/inactive, available instructions/schedule/reminder info, history statuses including missed/pending).
- Localized previously hardcoded medicine reminder/action strings and added EN/BN safety note clarifying that logging records actions but does not independently verify medicine consumption.
- Added consistent date/time formatting for displayed schedule/history fields while preserving backend-provided values/fallbacks; reminders remain clearly distinguished from logs with no notification-delivery claims.

### Remaining limitations / verification pending
- **Physical Android/Expo Go runtime not verified:** medicine loading, reopen refresh, reminder/history display, Taken/Skipped/Missed persistence, timestamps/timezone presentation on device, TTS, duplicate-tap/network handling, and EN/BN rendering remain unconfirmed.
- **Notification delivery:** server-stored reminders only; local/push/external notification delivery not implemented or claimed.
- **Contract/data availability:** only backend-provided medicine/reminder/log fields shown (no invented dosage/timing/missed-dose guidance). Medicine logging idempotency key not added because existing medicine log API/type contract does not expose a client-event field in mobile client; UI relies on submit guards and backend-authoritative reload.
- **Home summary:** minimal real-data summary only; no redesign and no fabricated metrics.
- No automated mobile tests configured; lint scripts not available. Expo SDK patch drift remains (no dependency upgrades applied).

---

## Stage F — Consolidated Runtime Verification (Stages B–E, 2026-11-12)

- **Physical Android/Expo Go runtime not performed:** Stage B–E runtime PASS cannot be claimed (TypeScript/export success only). Actual device evidence required for navigation, local feelings persistence/restore/TTS, My Day/routine read-only behavior, medicine read-only behavior, and network/error recovery.
- **Mutation-protected checks blocked by policy:** routine step completion submission, medicine Taken/Skipped/Missed logging, SOS alert creation/submission, and any QA-data mutation intentionally not executed (**BLOCKED — MUTATION NOT APPROVED**). Some completion/logging behaviors remain unverified at runtime until separately approved safe test strategy/evidence is available.
- **Environment/config sensitivity:** mobile `EXPO_PUBLIC_API_BASE_URL` must match current laptop Wi-Fi IPv4 for physical devices (observed 10.106.140.4 at check time; verify each session). Laptop and phone must share same network; firewall/ports (backend 4000, Metro) and Expo Go connectivity must allow access.
- **Prior limitations remain:** Expo SDK patch drift (no upgrades), no automated mobile tests/lint scripts, empty `situation_steps` in some contexts, no external delivery claims, and other previously documented constraints unchanged.

---

## Stage F2 — Physical Android / Expo Go Runtime QA Preparation (2026-11-12)

- **Physical runtime not executed/claimed:** Stage B–E device checks remain NOT TESTED pending user-confirmed interactive session (backend running, Expo QR visible, Expo Go opens app) and reported/verified evidence.
- **IP/config sensitivity:** Mobile API host matched current laptop LAN IPv4 (10.106.140.4) at check time but is not permanent; verify each session. **No automatic `.env` changes** — request approval before any configuration change if mismatch.
- **Mutation restrictions remain:** no routine step completions, no Taken/Skipped/Missed medicine submissions, no SOS alert creation/emergency messages, no backend-mutating operations during QA. Local-only My Feelings storage checks permitted.
- Prior environment/runtime limitations unchanged (Expo patch drift, no automated mobile tests/lint, device/network/firewall/Metro connectivity dependencies).
