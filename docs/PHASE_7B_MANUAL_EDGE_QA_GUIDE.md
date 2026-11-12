# LIFE BUDDY — PHASE 7B MANUAL MICROSOFT EDGE QA GUIDE

**Project:** `C:\Users\ADMIN\Desktop\LifeBuddy`  
**RUNID:** `20261112_130921_27017`  
**Prepared:** 2026-11-12  
**Target:** Caregiver dashboard (React + Vite + TypeScript, real backend `/api/v1`, MySQL `lifebuddy_db`) in **Microsoft Edge** (manual, interactive)

> **Status:** Manual browser QA **PREPARATION ONLY**. **Browser automation remains disconnected.** This guide has been prepared for user-executed testing; **actual manual browser QA has not yet been performed** and no results are claimed as PASS/FAIL.

---

## 1. Purpose, scope, and evidence basis

This is a beginner-friendly, click-by-click procedure for manually testing the caregiver dashboard in Microsoft Edge using the approved Phase 7 test dataset.

**Source of truth:** actual inspected dashboard implementation and Phase 7 docs:
- Routes/nav/labels: `dashboard/src/App.tsx`, `dashboard/src/layouts/DashboardLayout.tsx`
- Pages/controls: `dashboard/src/pages/LoginPage.tsx`, `OverviewPage.tsx`, `CareUsersPage.tsx`, `EmergencyContactsPage.tsx`, `RoutinesPage.tsx`, `MedicinesPage.tsx`, `CommunicationPage.tsx`, `SituationGuidancePage.tsx`, `SosAlertsPage.tsx`, `SettingsPage.tsx`
- Auth/session behavior: `dashboard/src/context/AuthContext.tsx`, `dashboard/src/components/ProtectedRoute.tsx`, `dashboard/src/services/apiClient.ts`
- Data/docs: `docs/PHASE_7_DASHBOARD_BROWSER_QA_CHECKLIST.md`, `docs/PHASE_7_TEST_DATA_CONTINUATION_REPORT.md`, `docs/PHASE_7B_DASHBOARD_BROWSER_QA_REPORT.md`

**Only features/controls present in the inspected source are included.** Do not assume features exist because they appear in older planning text.

---

## 2. Pre-test readiness (verify before opening Edge)

| Check | How | Expected |
|---|---|---|
| Backend healthy | Open a terminal and run: `curl http://localhost:4000/api/v1/health` | HTTP 200 JSON with `success:true` and `database.connected:true` |
| Dashboard reachable | Run: `curl -I http://127.0.0.1:5173` (or open in browser later) | HTTP 200 from Vite dev server |
| Approved dataset intact | Read-only verification (if available): confirm IDs below exist and `activity_logs` count 487 / MAX 676 | No unexpected changes |

**If backend or dashboard is not running, stop and start them using existing project scripts/config (no installs, no config changes).**

---

## 3. Approved dataset to preserve (do not modify)

Preserve exactly:
- Users: **1578** (Caregiver A, linked), **1579** (Caregiver B, unlinked), **1580** (Care User U1)
- Link: **662** (1578 → 1580)
- Emergency contacts: **61, 62** (U1)
- Routine: **87**; steps: **158, 159, 160**
- Medicine: **86**; reminders: **52, 53**
- Communication items: **30, 31**
- Favourite: **30**
- Preferences: **68**
- Activity logs: **487**, **MAX ID 676**

**Never delete or update `activity_logs`.** Do not clean up test data. Do not create routine completions, medicine logs, or SOS alerts during manual QA unless explicitly approved later (see safety).

---

## 4. Test credentials (secure handling)

- Approved RUNID test accounts (from continuation report): **Caregiver A = user 1578** (linked to U1/1580), **Caregiver B = user 1579** (unlinked), **Care User U1 = user 1580** (PIN set/verified during approved preparation).
- **Passwords, PINs, JWTs, hashes, and other secrets must not be written into documentation or screenshots.** Do not type them into notes you will share insecurely.
- **How to obtain credentials securely:** retrieve the caregiver login emails/passwords and care-user PIN from the **secure, approved source used during Phase 7 test-data preparation** (e.g. the person/environment that created RUNID `20261112_130921_27017`) or from a secure credential store controlled by the project owner. The continuation report records account identities/IDs but **does not contain secrets**.
- **If credentials are unavailable:** do **not** guess, do **not** reset passwords/PINs automatically, and do **not** modify database records. Ask the project owner to provide or securely re-establish credentials for users 1578/1579/1580 via an **explicitly approved, supported process**, then resume QA.
- Before login tests, confirm you are using **Caregiver A (1578)** for authorized flows and **Caregiver B (1579)** for unlinked/ownership-restriction checks.

---

## 5. How to use Microsoft Edge DevTools (manual evidence)

### 5.1 Open DevTools
1. Open Edge and navigate to the dashboard.
2. Press **F12** (or **Ctrl+Shift+I**) or right-click page → **Inspect**.
3. Keep DevTools docked (bottom/right) so you can see the page.

### 5.2 Console tab (JavaScript errors)
1. Click the **Console** tab.
2. Click the clear icon (🚫) to clear old messages before each test section.
3. Perform the test steps.
4. **PASS (for console check):** no new uncaught errors/exceptions relevant to the action; warnings may be noted but distinguish from errors.
5. **FAIL:** red error/uncaught exception, failed promise, or crash trace appears during the action.
6. **Screenshot:** capture Console showing result (filter to **Errors** if helpful) — avoid capturing any tokens.

### 5.3 Network tab (API requests and HTTP status)
1. Click the **Network** tab.
2. Check **Preserve log** if you need requests across navigation/login redirects.
3. Click clear before the action; ensure recording is on (red dot).
4. Perform the action and click the relevant request (usually to `/api/v1/...`).
5. Inspect **Headers** → **Status Code** and **Response** (summary) — **do not copy or screenshot Authorization/JWT tokens**.
6. **How to identify status codes:**
   - **401 Unauthorized:** missing/invalid/expired session (e.g. bad login, expired token). Expect login/error handling per app behavior.
   - **403 Forbidden:** authenticated but not allowed / not linked/owned. Expect clear access/authorization error.
   - **404 Not Found:** requested resource/route not found. Expect honest "not found"/error state.
   - **409 Conflict:** conflict (e.g. duplicate/conflicting state). Expect clear error; do not assume success.
   - **500 Server Error:** backend failure. Expect error state; capture evidence and stop destructive retries.
   - **2xx:** request succeeded (still verify UI matches).
7. **Screenshot:** request row showing URL/method/status (redact tokens if visible).

### 5.4 Responsive / narrow viewport
1. Press **Ctrl+Shift+M** (Toggle device toolbar) in DevTools.
2. Choose a narrow width (e.g. 390×844 or custom ~360px) or a device preset.
3. Verify layout, navigation (hamburger/menu), readability, and controls remain usable.
4. Toggle off to return to desktop.
5. **Screenshot:** narrow viewport of key pages.

### 5.5 Application/Storage inspection (only if necessary, no token exposure)
1. Open **Application** tab → **Storage** → **Session Storage** → origin `http://127.0.0.1:5173`.
2. The app stores dashboard token in **sessionStorage** (key used by implementation; do **not** record or screenshot its value).
3. Use only to confirm presence/absence of a session entry when troubleshooting (e.g. cleared after logout/401) — **never expose token value**.
4. **Screenshot:** avoid; if unavoidable, blur/redact any token values completely.

### 5.6 Screenshots for evidence
- Use **Windows Snipping Tool** (`Win+Shift+S`) or DevTools device-mode capture.
- Capture: page state, visible labels/data, URL bar, and (when relevant) Console/Network status — **redact tokens/secrets/PII not required**.
- Name files clearly, e.g. `7B_A01_login_success.png`.

---

## 6. Manual test procedure (click-by-click)

**General notes (from actual implementation):**
- Base route: `http://127.0.0.1:5173` redirects to `/dashboard` (protected) or login flow as applicable.
- Login page labels/controls: **Caregiver Dashboard** (h1), subtitle "Sign in to manage and monitor your care users.", **Email** (`#email`, placeholder `caregiver@example.com`), **Password** (`#password`, placeholder "Enter your password"), **Show/Hide** password button (`aria-label` "Show password"/"Hide password"), **Sign in** submit button. "Forgot password? Contact support for account recovery." text is informational (no reset flow implemented).
- Sidebar nav labels (exact): **Overview, Care Users, Daily Routines, Medicines, Communication, Situation Guidance, Emergency Contacts, SOS Alerts, Settings**. Header shows "Caregiver Dashboard" and page title; profile menu button labeled `Account menu for <caregiver>` with **Settings** link and **Log out** button.
- Many pages require selecting a linked **care user** (dropdown labeled e.g. "Select care user" / "Care user") and may show: "Select a care user to view..." empty state.
- `?careUserId=<id>` in URL can preselect a care user on pages that support it (Emergency Contacts, Routines, Medicines, Communication, SOS, Settings).
- **Read-only vs data-changing:** steps below mark actions as **[READ-ONLY]** (view/load/navigate/filter/select) or **[DATA-CHANGING]** (creates/updates/deletes/acknowledges/PIN set). For this QA run, avoid data-changing actions except where explicitly noted and safe; prefer read-only verification.

### A. Open Edge and access dashboard [READ-ONLY]
| Step | Where to click / action | Expected result |
|---|---|---|
| A1 | Open **Microsoft Edge**. In address bar type `http://127.0.0.1:5173` and press **Enter**. | Page loads. If not authenticated, app shows login page (`/login`) with **Caregiver Dashboard** heading, Email/Password fields, **Sign in** button. If a valid caregiver session exists in sessionStorage, may redirect to `/dashboard`. |
| A2 | Observe page without interacting beyond viewing. Open DevTools Console/Network (5.2, 5.3). | No blocking load failure. Dashboard responds in browser (HTTP 200 for app). |

- **PASS:** Login or dashboard UI renders correctly at `http://127.0.0.1:5173` with no crash/blank screen.
- **FAIL:** Blank page, cannot reach server, unhandled error, or wrong app.
- **Screenshot:** A1 landing page + URL bar; A2 Console/Network summary.
- **Data impact:** Read-only.

### B. Caregiver A login and session persistence [READ-ONLY login/session checks; logout is session action]
| Step | Where to click / action | Expected result |
|---|---|---|
| B1 | On `/login`, click **Email** field and enter Caregiver A email (1578) from secure source. Click **Password** and enter Caregiver A password. (Optional: click **Show** to verify typing, then **Hide**.) | Fields accept input. Client validation: empty/invalid email shows "Email is required." / "Enter a valid email address."; empty password shows "Password is required." (only if triggered). |
| B2 | Click **Sign in**. | Button shows "Signing in…" while submitting. On success, redirects to `/dashboard` (Overview). Profile/menu shows Caregiver A identity. |
| B3 | In sidebar, click **Overview** (if not already). Refresh the page (**F5** or browser refresh). | Session restored per implementation (`sessionStorage` token + `/auth/me`): user remains authenticated on protected dashboard (or shows "Checking your session…" briefly). No unexpected logout if backend reachable and token valid. |
| B4 | Click profile menu button (top-right, "Account menu for ..."), then click **Log out**. | Best-effort logout; returns to `/login`; protected routes require sign-in again. |
| B5 (optional negative, read-only outcome) | On `/login`, enter invalid credentials and click **Sign in**. | Clear error (e.g. "Invalid email or password..." for 401 or validation message). No authenticated session created. No secrets shown. |

- **PASS:** Valid Caregiver A login reaches dashboard; refresh preserves session when valid; logout returns to login; invalid login shows honest error without sensitive leakage.
- **FAIL:** Cannot log in with valid creds, session lost unexpectedly on refresh (with healthy backend), logout fails to clear access, or confusing/no error on invalid login.
- **Screenshot:** B2 authenticated Overview/header; B3 after refresh; B4 login page after logout; B5 error state (if tested). Network: login 200 on success, 401 on invalid.
- **Data impact:** Login/logout affect session/token state in browser (and server-side stateless logout call best-effort); no domain records modified.

### C. Care-user listing and profile [READ-ONLY preferred]
| Step | Where to click / action | Expected result |
|---|---|---|
| C1 | Sign in as **Caregiver A (1578)**. Click **Care Users** in sidebar (route `/dashboard/care-users`). | Page "Care users" loads. Shows "Create care user" button, search input "Search care users", status filter, and table/list of linked care users or honest empty/error state. Caregiver A should see linked care user(s) including **U1 (1580)** if dataset intact. |
| C2 | If U1 visible, click **View** (or select the care user row/action) to open details. | Detail view shows real fields returned (e.g. name/display name, email/phone/language/status/link info as available). Loading/error handled honestly. |
| C3 | Click **Edit** (view only) to confirm form pre-populates from fetched data; **do not submit changes**. Click **Cancel/Back** (as available) to return without saving. | Edit form shows existing values. No update sent if not submitted. |
| C4 | Locate PIN section ("Set/Reset PIN" or similar). **Do not submit** PIN changes. | UI indicates PIN management exists; existing PIN never displayed. Avoid entering/submitting to prevent unintended changes. |

- **PASS:** Linked care users list loads; U1 (1580) details viewable for Caregiver A; read-only inspection of edit form possible without mutation.
- **FAIL:** List fails to load without clear error, U1 not visible for linked caregiver, detail errors, or UI implies PIN is viewable.
- **Screenshot:** C1 list with U1; C2 detail; C3 edit form (no submit).
- **Data impact:** C1–C2 **[READ-ONLY]**. C3/C4 become **[DATA-CHANGING]** if "Save"/"Set PIN" submitted — **do not submit**.

### D. Emergency contacts [READ-ONLY preferred]
| Step | Where to click / action | Expected result |
|---|---|---|
| D1 | Click **Emergency Contacts** in sidebar (`/dashboard/emergency-contacts`) or from Care Users detail click **Manage emergency contacts** (preselects `careUserId`). | Page "Emergency Contacts" loads with care-user selector and contact list area. |
| D2 | In "Select care user" (or care-user dropdown), choose **U1 (1580)**. | Contacts for U1 load: **61, 62** displayed (name, relationship, phone, email, primary indicator as returned). Honest loading/empty/error states. |
| D3 | (Optional, read-only) Click **Edit** on a contact to view prefilled form; **do not save**. Close/cancel. **Do not** click Add/Delete/confirm delete. | Form shows existing values only. No mutation if cancelled. |

- **PASS:** U1 contacts 61 and 62 visible with correct stored details; ownership-scoped to selected linked care user.
- **FAIL:** Contacts missing/fail to load, wrong care-user data, or unauthorized access without clear error.
- **Screenshot:** D2 contacts list for U1.
- **Data impact:** Viewing **[READ-ONLY]**. Add/Edit/Delete **[DATA-CHANGING]** — avoid.

### E. Daily routines and ordered steps [READ-ONLY]
| Step | Where to click / action | Expected result |
|---|---|---|
| E1 | Click **Daily Routines** in sidebar (`/dashboard/routines`) or navigate with `?careUserId=1580`. | Page "Daily Routines" loads with care-user selector, routine list/filters, and progress/history areas as implemented. |
| E2 | Select **U1 (1580)**. | Routine **87** listed (title/description/active status/step count/progress as returned). Honest empty/error if not. |
| E3 | Open routine **87** detail/view (click routine row/title or view action). | Ordered steps **158, 159, 160** displayed in correct order with instruction text (EN/BN as stored). Completion history/progress shown as backend data (may be empty — expected). |
| E4 | (Optional) Inspect step reorder controls (up/down) or edit without saving; **do not save, delete, or reorder persistently**. | Controls visible per UI; no changes committed unless submitted. |

- **PASS:** Routine 87 and steps 158–160 load in order for linked care user; history/progress reflects real (possibly empty) data.
- **FAIL:** Routine/steps missing, wrong order, fabricated progress, or authorization issues.
- **Screenshot:** E2 routine list; E3 ordered steps/detail.
- **Data impact:** Viewing **[READ-ONLY]**. Create/edit/delete/reorder/activate **[DATA-CHANGING]** — avoid.

### F. Medicines and reminders [READ-ONLY]
| Step | Where to click / action | Expected result |
|---|---|---|
| F1 | Click **Medicines** in sidebar (`/dashboard/medicines`) or with `?careUserId=1580`. | Page "Medicines" loads with care-user selector and medicine list/history areas. |
| F2 | Select **U1 (1580)**. | Medicine **86** listed with stored details (name, instructions/notes, dates/status as available). |
| F3 | Open medicine **86** detail. | Reminders **52, 53** shown (time/frequency/days/label/active as stored). Logs/history section reflects real records (may be empty — expected; no logs pre-created). UI should not claim notification delivery. |
| F4 | (Optional) View edit/reminder forms without submitting; **do not save/delete**. | Prefilled values shown; no mutation. |

- **PASS:** Medicine 86 and reminders 52, 53 visible; history honest (empty if none); no false delivery claims.
- **FAIL:** Missing records, incorrect details, fabricated logs, or errors without handling.
- **Screenshot:** F2 list; F3 detail with reminders.
- **Data impact:** Viewing **[READ-ONLY]**. Mutations **[DATA-CHANGING]** — avoid. **Do not create medicine logs.**

### G. Communication catalogue and favourites [READ-ONLY]
| Step | Where to click / action | Expected result |
|---|---|---|
| G1 | Click **Communication** in sidebar (`/dashboard/communication`). | Page shows global communication catalogue section and care-user favourites section (caregiver view is read-oriented for favourites per implementation). |
| G2 | Review catalogue: search/filter/category/active controls over fetched data as available. | Items **30, 31** (`PH7QA_WATER_127017`, `PH7QA_HELP_127017`, EN/BN as stored) visible when loaded. |
| G3 | In favourites area, select **U1 (1580)** if required. | Favourite **30** (linked to item 30) visible for authorized linked caregiver (read-only). Honest empty/error if not. |
| G4 | **Do not** use create/edit/deactivate catalogue actions or any favourite mutation controls if presented; avoid submitting. | If controls exist, they are data-changing and outside safe read-only verification. |

- **PASS:** Catalogue items 30/31 and favourite 30 visible as real data with correct bilingual/stored fields.
- **FAIL:** Items/favourite missing, wrong data, or unauthorized access issues.
- **Screenshot:** G2 catalogue showing 30/31; G3 favourite for U1.
- **Data impact:** Viewing/filtering **[READ-ONLY]**. Catalogue mutations or favourite changes **[DATA-CHANGING]** — avoid.

### H. Care-user preferences [READ-ONLY preferred]
| Step | Where to click / action | Expected result |
|---|---|---|
| H1 | Click **Settings** in sidebar (`/dashboard/settings`) or profile menu → **Settings**. | Settings page loads with caregiver account/profile section and care-user preferences section (linked care-user selector). |
| H2 | In care-user preferences, select **U1 (1580)**. | Preferences record **68** loads (language, text size, contrast, speech rate, voice, reduced motion, notificationsEnabled as stored). Defaults/values shown honestly. |
| H3 | Inspect fields; **do not click Save/submit** preference changes. (Optionally view caregiver profile form without saving.) | Current values visible; no persistence without submit. |

- **PASS:** U1 preferences load correctly for linked caregiver; values match stored configuration; `notificationsEnabled` treated as stored flag only (no delivery claim).
- **FAIL:** Preferences fail to load, wrong values, or unauthorized errors for linked caregiver.
- **Screenshot:** H2 preferences loaded for U1.
- **Data impact:** Viewing **[READ-ONLY]**. Save/update **[DATA-CHANGING]** — avoid.

### I. SOS dashboard and available alert states [READ-ONLY preferred]
| Step | Where to click / action | Expected result |
|---|---|---|
| I1 | Click **SOS Alerts** in sidebar (`/dashboard/sos-alerts`). | Page loads with linked care-user selector, alerts list/history area, status filter over fetched data, and detail/acknowledgement UI per implementation. |
| I2 | Select **U1 (1580)**. | Alerts list loads from real backend data. **For this dataset, SOS alerts were intentionally not pre-created** — expect honest empty state ("no alerts") unless runtime-generated records exist (none expected). |
| I3 | If an alert is present (unexpected), open detail **[READ-ONLY]** and observe status fields; **do not click Acknowledge/confirm**. | Statuses must be only actual values: `created, pending, sent, failed, acknowledged, cancelled` (no `RESOLVED`). Details reflect stored data; no external delivery confirmed. |
| I4 | **Do not create SOS alerts** from mobile/dashboard flows. | No new SOS records. |

- **PASS:** SOS page loads for linked care user; empty state handled honestly; any shown status is valid and truthful.
- **FAIL:** Page errors, fabricated alerts/counts, invalid status (e.g. RESOLVED), or claims of external delivery.
- **Screenshot:** I2 empty/list state for U1; I3 detail only if present (no acknowledge).
- **Data impact:** Viewing **[READ-ONLY]**. Acknowledge **[DATA-CHANGING]** — avoid. Creating SOS **[DATA-CHANGING]** — prohibited.

### J. Caregiver B access restrictions [READ-ONLY]
| Step | Where to click / action | Expected result |
|---|---|---|
| J1 | **Log out** Caregiver A (profile menu → **Log out**). Sign in as **Caregiver B (1579)** using secure credentials. | Login succeeds for valid caregiver account; dashboard loads. |
| J2 | Click **Care Users**. | List shows only care users linked to Caregiver B. **U1 (1580) should not appear** (Caregiver B is unlinked in approved dataset). May be empty — honest empty state. |
| J3 | Attempt to access U1-scoped data directly via URL (read-only navigation): open `http://127.0.0.1:5173/dashboard/emergency-contacts?careUserId=1580` (and similarly for routines/medicines/communication favourites/preferences/sos if desired). | Backend ownership/link enforcement applies: expect **403 Forbidden** / authorization error or inability to load U1 data, surfaced as clear UI error/retry state (not U1’s records). Network tab should show 403 for protected API calls where applicable. |
| J4 | Return to Overview/allowed pages. Log out when finished. | No unauthorized data exposed. |

- **PASS:** Caregiver B cannot view/manage U1 (1580) data; unlinked access denied clearly (UI + 403 where applicable).
- **FAIL:** U1 data visible or modifiable by Caregiver B, or silent/incorrect authorization handling.
- **Screenshot:** J2 Care Users for B (no U1); J3 error state + Network 403 evidence (tokens redacted).
- **Data impact:** **[READ-ONLY]** navigation/checks.

### K. Situation Guidance (actual read-only module, included for completeness)
| Step | Where to click / action | Expected result |
|---|---|---|
| K1 | Sign in as Caregiver A. Click **Situation Guidance** in sidebar (`/dashboard/situations`). | Page loads catalogue (search, active filter as implemented). **`situation_steps` is 0 in approved baseline** — expect honest empty state (no fabricated guidance). |
| K2 | If any situation appears (unexpected), open detail **[READ-ONLY]**. | Ordered bilingual steps shown as stored only. No create/update/delete controls should produce mutations (backend read-only). |

- **PASS:** Honest empty/read-only behavior; no fabricated content.
- **FAIL:** Errors without handling or fabricated guidance.
- **Screenshot:** K1 empty state or catalogue.
- **Data impact:** **[READ-ONLY]**.

---

## 7. Per-test recording template

For each executed test, record:
- **Test ID / Section:** (e.g. B2)
- **Tester / Date-Time / Browser:** Edge version
- **Preconditions:** logged-in user, selected care user
- **Steps performed:** exact clicks/inputs (no secrets)
- **Expected result:** from this guide
- **Actual result:** observed
- **Status:** `PASS` / `FAIL` / `BLOCKED` / `NOT TESTED`
- **Evidence:** screenshot filenames, Console/Network status codes
- **Data impact:** read-only / data-changing (should be read-only in this QA)

---

## 8. Screenshots checklist

Capture (as applicable, tokens redacted):
- [ ] A: Dashboard/login landing at `127.0.0.1:5173`
- [ ] B: Caregiver A successful login (Overview), session after refresh, after logout, invalid-login error (if tested)
- [ ] C: Care Users list showing U1 (1580) for Caregiver A; U1 detail
- [ ] D: Emergency contacts for U1 (61, 62)
- [ ] E: Routine 87 list/progress; steps 158,159,160 in order
- [ ] F: Medicine 86 detail with reminders 52,53
- [ ] G: Communication catalogue (30,31) and favourite 30 for U1
- [ ] H: Preferences for U1 (68)
- [ ] I: SOS Alerts page for U1 (honest empty state expected)
- [ ] J: Caregiver B care-users view (no U1) and 403/authorization evidence for U1 access attempt
- [ ] K: Situation Guidance empty/read-only state
- [ ] DevTools: Console (errors/clean) and Network (key 200/401/403/404/409/500 as observed)
- [ ] Responsive: at least one narrow-viewport view

---

## 9. Safety restrictions and boundaries

- **No** source-code modifications, **no** API/schema/auth/CORS/security/dependency changes, **no** installs.
- **No** direct SQL writes, **no** schema/seed changes, **no** destructive DB operations.
- **No** test-data creation and **no** cleanup during this QA.
- **Never** delete or update `activity_logs`.
- **Do not** create SOS alerts, routine completions, or medicine logs during preparation/execution of this guide.
- **Do not** modify existing approved test records (including no PIN/password/profile/preference saves unless separately approved).
- Treat medicine/routine/situation content as caregiver-provided assistance only (no medical/legal/emergency advice/diagnosis/dosage changes/auto actions).
- Do not claim external SOS/notification/emergency-service delivery; statuses limited to actual backend values.
- **Preserve approved dataset:** users 1578,1579,1580; link 662; contacts 61,62; routine 87; steps 158,159,160; medicine 86; reminders 52,53; communication items 30,31; favourite 30; preferences 68; `activity_logs` 487, MAX 676.
- **Do not claim browser runtime QA is complete** until actual interactions are performed and evidence recorded.

---

## 10. Known limitations (context for QA)

- **Browser automation disconnected** in OpenCode session; this guide is for **manual** Edge execution by the user.
- **Actual manual browser QA not yet performed** (no execution evidence).
- `situation_steps` empty (C not approved) — Situation Guidance expected empty.
- Routine completions, medicine logs, SOS alerts not pre-created (intentionally deferred to approved runtime flows); some views may be empty.
- **DEF-6F-001 (not approved/fixed):** pre-existing medicine partial `PATCH` without dates edge case — avoid partial medicine updates without dates.
- Caregiver favourites are read-only in backend contract for caregivers (view only).
- MY FEELINGS is mobile/local-only (not a dashboard module).
- Mobile runtime QA (7C), cross-module populated runtime flows (7D), Phase 8/9 remain pending per project status.
- Session stored in `sessionStorage` (cleared on tab/browser session close); network/5xx may produce `offline_unverified` behavior with retry (per implementation) — report observed behavior factually.

---

## 11. Stop condition

Stop after preparing/using this guide for **planned manual verification steps as approved**. Do not start Phase 7C, 7D, 8, or 9. **Do not mark Phase 7B complete** until actual browser interactions have been performed and evidence recorded.
