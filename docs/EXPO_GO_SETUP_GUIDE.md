# Expo Go / Android Runtime Setup Guide — Life Buddy Mobile

**Project:** `C:\Users\ADMIN\Desktop\LifeBuddy\mobile`  
**Date:** 2026-11-12  
**Status:** **Prepared from static/config verification. Physical-device/Expo Go runtime NOT executed or verified by agent.** Do not treat export/TypeScript success as device-runtime proof.

---

## 1. Static readiness (verified 2026-11-12)

| Check | Result | Notes |
|---|---|---|
| Mobile TypeScript | **PASS** | `cd mobile && npx tsc --noEmit` |
| Expo config | **Present** | `mobile/app.json` includes Expo Router, SecureStore, Location plugin, Android/iOS config |
| Android bundle export | **PASS (previous/static)** | `npx expo export --platform android` completed successfully in Phase 2A (Metro bundle produced) |
| Expo Doctor | **19/20 PASS, 1 FAIL** | Expo SDK patch-version mismatches (e.g. `expo` and related packages). **No dependency installs/upgrades performed.** Review with `npx expo install --check` only if approved/compatible with installed Expo Go |
| Physical device runtime | **NOT VERIFIED** | No device/emulator/ADB available to agent |

---

## 2. Prerequisites

- Node.js/npm installed.
- Backend running and healthy: `http://localhost:4000/api/v1/health` → HTTP 200, DB connected.
- Android phone with **Expo Go** (SDK must be compatible with project Expo SDK 58; confirm in Expo Go).
- Phone and development laptop on the **same Wi-Fi network** for LAN mode.
- Correct `EXPO_PUBLIC_API_BASE_URL` in `mobile/.env` (no secrets).

---

## 3. API base URL and LAN connection (verify each session)

**Important:** `localhost` / `127.0.0.1` on a phone/emulator points to that device, not your laptop.

| Target | `EXPO_PUBLIC_API_BASE_URL` example | Notes |
|---|---|---|
| Physical Android/iOS device (same Wi-Fi) | `http://<LAPTOP_LAN_IP>:4000` | Find current IP with `ipconfig` (Wi-Fi IPv4). Example observed earlier: `http://10.106.140.4:4000` — **verify current value before testing** |
| Android emulator | `http://10.0.2.2:4000` | Host loopback mapping |
| iOS simulator | `http://localhost:4000` | Simulator shares host network context |

**Current `mobile/.env` state (2026-11-12):** set to `http://10.106.140.4:4000` (LAN-style). Adjust to emulator/simulator/device as needed, then restart Metro with cache clear if required.

**Network/firewall:**
- Backend must listen on port **4000** and be reachable from the phone.
- Allow Node/backend and Expo/Metro ports through Windows Firewall for the active network profile if needed.
- Avoid guest Wi-Fi isolation/VPNs that block LAN device-to-device traffic.

---

## 4. Start backend and Expo

**Backend:**
```powershell
cd C:\Users\ADMIN\Desktop\LifeBuddy\backend
npm start
```
Verify: `http://localhost:4000/api/v1/health` on laptop.

**Mobile (Metro):**
```powershell
cd C:\Users\ADMIN\Desktop\LifeBuddy\mobile
npx expo start
```
Options if needed: `npx expo start --lan` or `npx expo start --tunnel` (network-dependent). After `.env` changes: `npx expo start -c`.

Scan QR code with **Expo Go** on Android.

---

## 5. Android runtime QA checklist (manual, record actual results)

> **Do not claim device testing completed by static checks or Expo export.** Mark PASS/FAIL/BLOCKED only with on-device evidence.

| ID | Area | Steps | Expected (real behavior only) | Actual | Status | Evidence/notes |
|---|---|---|---|---|---|---|
| D-01 | Launch | Open app in Expo Go | App loads without red-screen crash |  | NOT EXECUTED |  |
| D-02 | Login | Sign in as care user / caregiver as applicable | Auth succeeds against real API; session restored appropriately |  | NOT EXECUTED | Use correct LAN URL |
| D-03 | Session restoration | Reopen app / return after background (as applicable) | Stored session behavior matches implementation (SecureStore/JWT flow) |  | NOT EXECUTED |  |
| D-04 | Home summaries | Open Home (care user) | Real routines/medicines/emergency/SOS summaries or honest empty/partial/error states; no invented values |  | NOT EXECUTED |  |
| D-05 | Talk | Categories, search, sentence build, favourites, TTS speak/replay/stop | Server-backed items/favourites; device TTS behavior as available; clear errors if unavailable |  | NOT EXECUTED |  |
| D-06 | My Day | Load routines/progress, open routine, complete step | Real progress; completion persisted via existing API; duplicate submissions prevented/handled |  | NOT EXECUTED |  |
| D-07 | Medicine | Details/schedules/reminders/history, log taken/skipped/missed | Real data; logs recorded only via authorized existing workflow; reminders are stored schedules (not delivery-confirmed) |  | NOT EXECUTED |  |
| D-08 | Help Me | Situations list/detail/steps | Stored guidance or honest empty state; no persistent request workflow claimed/created |  | NOT EXECUTED |  |
| D-09 | SOS contacts/history | View contacts and alert history/status | Real backend records/statuses; no external delivery claims |  | NOT EXECUTED |  |
| D-10 | SOS flow | Confirm and create SOS (only if explicitly approved/data-changing) | Event recorded in DB/backend status only; location handling honest |  | NOT EXECUTED / APPROVAL REQUIRED |  |
| D-11 | Dialer/SMS handoff | Tap Call/Message on contact | Device dialer/messaging app opens (explicit action only); no completion/delivery confirmation claimed |  | NOT EXECUTED |  |
| D-12 | Network failure/retry | Interrupt connectivity / invalid URL scenario | Understandable errors, retry works, no false success |  | NOT EXECUTED |  |
| D-13 | Navigation/responsiveness | Move across modules, back/forward, small-screen usability | Screens responsive, no freezes/blank screens |  | NOT EXECUTED |  |

---

## 6. Troubleshooting

- **Cannot connect to server:** verify backend running, correct LAN IP in `mobile/.env`, same Wi-Fi, firewall, `--lan` mode.
- **App loads but API fails:** check base URL, CORS not applicable to native fetch like browser but backend must be reachable; inspect Metro/device logs.
- **Env changes not applied:** restart `npx expo start -c`.
- **Expo Go incompatibility:** if native module behavior differs, a development build may be required (assess separately; no installs/changes made here).
- **No false claims:** SMS/email/push/emergency-service delivery and local notification delivery are not verified unless explicitly proven.

---

## 7. References
- `docs/PROJECT_RUN_GUIDE.md`
- `docs/TESTING_AND_QA_REPORT.md`
- `docs/KNOWN_ISSUES_AND_LIMITATIONS.md`
