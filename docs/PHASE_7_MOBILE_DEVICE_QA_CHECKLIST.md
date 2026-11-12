# LIFE BUDDY — PHASE 7 MOBILE DEVICE QA CHECKLIST

**Project:** `C:\Users\ADMIN\Desktop\LifeBuddy`  
**Prepared:** 2026-11-10 (readiness/planning)  
**Target:** Mobile app (React Native + Expo ~58, TypeScript), real backend `/api/v1`, MySQL `lifebuddy_db`  
**Execution status:** **NOT EXECUTED** (checklist prepared only). No tests marked PASS. Mobile runtime QA pending usable emulator/device.

## Preconditions (global)
- Usable Android emulator (AVD) or physical Android device with USB debugging; `adb`/SDK configured; device/emulator detected.
- Backend running and reachable from device/emulator (`EXPO_PUBLIC_API_BASE_URL` correct: `10.0.2.2:4000` for emulator, LAN IP for physical device; firewall/network allows access).
- Required test accounts/data exist (**APPROVAL REQUIRED** for any DB seeding; no modification of pre-existing records).
- Record: device model, Android version, Expo SDK/app runtime, network, date/time, tester, evidence (screenshots/video/notes).

## Testing-type distinction (do not substitute)
| Type | Description | This checklist status |
|---|---|---|
| **Static checks** | TypeScript, lint (if any), code inspection | Can be executed separately (not runtime QA) |
| **Expo Doctor checks** | Project/config health checks | Can be executed separately (not runtime QA) |
| **Emulator runtime tests** | Interactive tests on Android emulator | **NOT EXECUTED** |
| **Physical-device tests** | Interactive tests on real Android device | **NOT EXECUTED** |

> No type substitutes for another. Do not claim device/emulator runtime QA from static/Expo Doctor results.

## Legend
- **Actual result:** fill during execution
- **Status:** `PASS` / `FAIL` / `NOT TESTED` (default `NOT TESTED`)
- **Test type:** Emulator / Physical device (specify when executed)

---

## 1. Authentication & Session
| Test ID | Test type | Device/Env | Preconditions | Steps | Expected result | Actual result | Status | Evidence |
|---|---|---|---|---|---|---|---|---|
| MB-AUTH-01 |  |  | Valid caregiver credentials | Caregiver login with valid credentials | Login succeeds, session established, navigates to app home |  | NOT TESTED |  |
| MB-AUTH-02 |  |  | Valid care-user PIN (linked) | Care-user PIN login | Login succeeds for care-user role/context |  | NOT TESTED |  |
| MB-AUTH-03 |  |  | Authenticated session | Close/reopen app (or relaunch) | Session restoration per implementation (`/auth/me`, SecureStore); valid session restored or honest state shown |  | NOT TESTED |  |
| MB-AUTH-04 |  |  | Authenticated session | Logout | Local token cleared, backend logout best-effort, returned to auth |  | NOT TESTED |  |
| MB-AUTH-05 |  |  | None | Invalid caregiver credentials / invalid PIN | Clear error, no session created |  | NOT TESTED |  |
| MB-AUTH-06 |  |  | Network unavailable/intermittent | Trigger API/network failure states during auth flows | Honest network/timeout/5xx handling; token preserved on transient failures per implementation; retry available |  | NOT TESTED |  |

## 2. TALK & Sentence Building
| Test ID | Test type | Device/Env | Preconditions | Steps | Expected result | Actual result | Status | Evidence |
|---|---|---|---|---|---|---|---|---|
| MB-TALK-01 |  |  | Authenticated care-user, communication items exist (approved data) | Open TALK, load catalogue | Real communication items/categories loaded or honest empty/error state |  | NOT TESTED |  |
| MB-TALK-02 |  |  | Items loaded | Select picture-based items and build sentence | Selected tokens form readable sentence; clear/remove/replay/stop behave correctly |  | NOT TESTED |  |
| MB-TALK-03 |  |  | Care-user context | Add/list/speak/load/remove favourites (supported self flows) | Favourites persist via backend and reflect after refresh; role rules respected |  | NOT TESTED |  |
| MB-TALK-04 |  |  | TTS available on device | Test English and Bengali speech output | Speak/replay/stop work with selected language where voice available; graceful fallback if unavailable |  | NOT TESTED |  |

## 3. MY DAY (Routines)
| Test ID | Test type | Device/Env | Preconditions | Steps | Expected result | Actual result | Status | Evidence |
|---|---|---|---|---|---|---|---|---|
| MB-DAY-01 |  |  | Care-user with caregiver-created routines/steps | Open MY DAY | Real routines/progress loaded or honest empty/error state |  | NOT TESTED |  |
| MB-DAY-02 |  |  | Routine with ordered steps | Navigate steps one at a time (Previous/Next bounds) | Correct order/content, no out-of-bounds, progress reflects backend data |  | NOT TESTED |  |
| MB-DAY-03 |  |  | Routine step view | Test TTS (repeat/stop), EN/BN content | Speech works/fails gracefully; translations shown honestly per data |  | NOT TESTED |  |
| MB-DAY-04 |  |  | Routine in progress | Complete step/routine via existing supported behavior | Server-confirmed completion only; UI refresh shows real progress/history after reopen |  | NOT TESTED |  |

## 4. MEDICINE
| Test ID | Test type | Device/Env | Preconditions | Steps | Expected result | Actual result | Status | Evidence |
|---|---|---|---|---|---|---|---|---|
| MB-MED-01 |  |  | Care-user with medicines/reminders | Open MEDICINE list/detail | Real records/reminders/log history shown or honest empty/error state |  | NOT TESTED |  |
| MB-MED-02 |  |  | Medicine available | Record Taken and Skipped actions | Server-confirmed logging only; history refresh reflects saved records |  | NOT TESTED |  |
| MB-MED-03 |  |  | Any medicine/reminder view | Check delivery claims | No local/remote notification delivery claimed; reminders displayed as stored/supported only |  | NOT TESTED |  |

## 5. MY FEELINGS
| Test ID | Test type | Device/Env | Preconditions | Steps | Expected result | Actual result | Status | Evidence |
|---|---|---|---|---|---|---|---|---|
| MB-FEEL-01 |  |  | Authenticated user | Open MY FEELINGS and test all existing choices | Local-only selection/confirmation/speech/change/clear behave as implemented |  | NOT TESTED |  |
| MB-FEEL-02 |  |  | After interactions | Verify persistence/sync claims | No claim of DB/backend synchronization (local-only by design) |  | NOT TESTED |  |

## 6. HELP ME (Situation Guidance)
| Test ID | Test type | Device/Env | Preconditions | Steps | Expected result | Actual result | Status | Evidence |
|---|---|---|---|---|---|---|---|---|
| MB-HELP-01 |  |  | Authenticated user; situations exist or empty | Open HELP ME list | Real situations loaded or honest empty/error state |  | NOT TESTED |  |
| MB-HELP-02 |  |  | Situation with steps | Navigate ordered instructions (Previous/Next) | Correct deterministic order, TTS/EN-BN behavior as stored, safe fallback |  | NOT TESTED |  |
| MB-HELP-03 |  |  | Emergency-keyword or any situation view | Safety behavior check | Stored guidance only (no AI advice), no auto SOS/contact; SOS navigation only if user explicitly chooses (no auto trigger) |  | NOT TESTED |  |

## 7. SOS
| Test ID | Test type | Device/Env | Preconditions | Steps | Expected result | Actual result | Status | Evidence |
|---|---|---|---|---|---|---|---|---|
| MB-SOS-01 |  |  | Care-user authenticated, backend reachable | Initiate SOS and confirm; also test cancel | Explicit confirmation required; cancel aborts; no auto-trigger |  | NOT TESTED |  |
| MB-SOS-02 |  |  | On confirmed SOS flow only | Location permission requested/handled (grant/deny/unavailable/timeout/disabled) | Permission requested only in existing confirmed flow; graceful handling without crash |  | NOT TESTED |  |
| MB-SOS-03 |  |  | Location available or unavailable | Submit SOS | Server-created SOS record; optional coordinates included only when valid/available; honest status/history shown |  | NOT TESTED |  |
| MB-SOS-04 |  |  | Retry/idempotent scenario (if feasible) | Repeat same logical SOS submission (clientEventId behavior) | Idempotency handled per backend contract; no duplicate false claims |  | NOT TESTED |  |
| MB-SOS-05 |  |  | Any SOS flow | Delivery/claims check | No external SMS/email/push/emergency-service contact triggered or claimed |  | NOT TESTED |  |

## 8. Network, Accessibility & Device Behavior
| Test ID | Test type | Device/Env | Preconditions | Steps | Expected result | Actual result | Status | Evidence |
|---|---|---|---|---|---|---|---|---|
| MB-NET-01 |  |  | App running | Disconnect/reconnect network during key flows | Honest loading/error/retry states; recovery without false success claims |  | NOT TESTED |  |
| MB-A11Y-01 |  |  | Device accessibility settings | Test text scaling | UI remains usable/readable at larger text sizes (where supported) |  | NOT TESTED |  |
| MB-A11Y-02 |  |  | App/preferences | Contrast/reduced motion behavior (only if mobile consumes settings) | Behavior matches actual implementation; no assumed backend-pref effects |  | NOT TESTED |  |
| MB-A11Y-03 |  |  | Screen reader available (TalkBack) | Basic screen reader navigation on key screens | Key controls labeled/operable where implemented (no full certification claim) |  | NOT TESTED |  |
| MB-DEV-01 |  |  | Android device/emulator | Safe areas, system navigation, rotation (if applicable) | No critical overlap/clipping; usable navigation |  | NOT TESTED |  |

## Execution notes
- Do not claim preference settings affect mobile behavior unless mobile implementation actually consumes them.
- Do not trigger real emergency notifications/services.
- Capture device model, Android version, Expo runtime/build details, and evidence per test.
- Mark blocked/unavailable tests as **NOT TESTED** with reason.