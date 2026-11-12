# Life Buddy — Requirements

## 1. Project overview
**Life Buddy** is an intelligent visual and voice-assisted personal support system to help people who may experience communication difficulties, memory challenges, difficulty understanding instructions, or difficulty managing daily activities. Authorised caregivers can manage relevant information and provide appropriate assistance.

- **Tagline:** Empowering independence through simple communication, visual guidance and intelligent assistance.
- **Deliverable type:** Real, functional, integrated software (not a static prototype). Suitable for BCA final-year capstone, demonstration, viva, and potential future research.
- **Core principle:** MySQL (`lifebuddy_db`) is the authoritative persistent store. Both mobile and dashboard use the same Express REST backend.

## 2. System components
1. **User Mobile Application** — React Native, Expo, TypeScript (primary interface for the assisted user).
2. **Caregiver Web Dashboard** — React, Vite, TypeScript, CSS (management and monitoring).
3. **Backend** — Node.js, Express.js, RESTful JSON APIs, `mysql2` pool, connected to MySQL.

## 3. Stakeholders and roles
| Role | Description | Access |
|---|---|---|
| **User** (assisted person) | Uses mobile app for communication, routines, medicines, emotions, situations, SOS | Simplified PIN-based access; may access only own permitted records; practical session to avoid repeated PIN entry |
| **Caregiver** | Manages linked users and monitors activity/alerts via dashboard | Email + password; may access only explicitly linked users and their authorized data |
| **System/Admin (implicit)** | Not a separate UI required unless needed; setup/linking flows governed by business rules | N/A |

**RBAC (minimum):** `caregiver`, `user`. Enforced on backend (middleware + ownership/link checks), not only frontend.

## 4. Functional requirements

### 4.1 Mobile — Home
- Six large primary actions: **TALK, MY DAY, MEDICINE, MY FEELINGS, HELP ME, SOS**.
- Each: clear icon/illustration, readable label, large touch target, appropriate colour, screen-reader label, working navigation.
- Simple, consistent, uncluttered; SOS prominent but not confusing.

### 4.2 Picture-based communication (TALK)
- Visual tiles/categories: Food, Water, Toilet, Pain, Help, Sleep, Hungry, Thirsty, Yes, No, Happy, Sad, Tired, I need help (extensible).
- Multi-select, clear selection state, meaningful sentence generation from combinations (e.g. `FOOD + HUNGRY → "I am hungry. I need food."`), display + device **TTS** (read aloud, replay), clear selection.
- Save/load favourite phrases. Bengali & English. Items/favourites stored via backend in MySQL. **No paid AI dependency** for sentence generation.
- Suggested components: `PictureCard`, `CommunicationGrid`, `SelectedCommunication`, `VoiceInstruction`.

### 4.3 Smart daily routine (MY DAY)
- Visual routines (e.g. Morning Routine) with ordered steps; one focused step at a time (or clearly focused).
- Show current/total, Next/Previous, Repeat Voice, mark completed, progress, completion message.
- Caregiver CRUD on routines/steps and reorder; assigned to user. Stored in MySQL.
- **Offline:** cache essential assigned routines locally for viewing offline. Offline completions queued and synchronized when online; avoid silently overwriting newer server data.

### 4.4 Medicine reminder (MEDICINE)
- Caregiver config: medicine name, prescribed instructions, reminder time, frequency, start/end date (if applicable), notes.
- Mobile: upcoming reminders, local notifications where supported, voice announcements where enabled, display name/instructions, mark **Taken/Skipped**, store results in MySQL, view history.
- **Safety:** no diagnosis, no medicine recommendations, no invented/changed doses or schedules, no AI medication decisions. Display only caregiver-entered info. State tool is reminder/assistance, not medical service.

### 4.5 Emotion communicator (MY FEELINGS)
- Emotions: Happy, Sad, Angry, Afraid, Tired, Confused, Pain, Need Help.
- Each: clear icon/illustration, large selection, corresponding message, optional voice playback (e.g. "I am feeling sad."). Bengali & English. Appropriate caregiver customisation where practical.

### 4.6 Smart situation assistant (HELP ME) — signature feature
- Guided visual + voice step-by-step instructions for predefined situations: Washing Hands, Going Outside, Getting Ready, Feeling Lost, Crossing a Road, Asking Someone for Help, What To Do in an Emergency (extensible).
- One step at a time, relevant visual, optional voice, repeat, forward/backward, progress, restart. Predefined instructions stored in MySQL; caregivers may manage custom situations where appropriate.
- **Safety:** instructions predefined, reviewed, deterministic. **No AI dependency** for emergency/road-safety/essential safety decisions. Optional AI only after core works and never on critical paths.

### 4.7 Emergency SOS
- Easily accessible button with confirmation to reduce accidental activation and cancel option.
- Flow: request location permission if needed → obtain coords if granted/available (else continue without) → send to backend → create real SOS record in MySQL (correct user) → visible in authorised caregiver dashboard → show available emergency contact + **accurate alert status**.
- **Baseline notification:** reliable DB-backed caregiver dashboard alert. Notification service designed so Expo Push can integrate when valid tokens/credentials configured.
- **Honesty:** never claim external push/SMS/email delivered unless confirmed. Clear statuses (e.g. Created, Pending, Sent, Failed, Acknowledged) with transitions matching actual mechanism.
- **Handle:** permission denied, location disabled, no internet, backend unavailable, notification failure, duplicate activation, missing emergency contact. If offline, explain alert could not be transmitted (no false success).
- Store timestamps, coords when available, user ID, notification/delivery outcome. Protect/restrict location data to authorised caregivers.

### 4.8 Caregiver dashboard
- **Auth:** secure login (email/password), bcrypt, JWT, protected routes.
- **Overview:** linked users count, active routines, upcoming medicine reminders, recent SOS alerts, recent routine activity, medicine history, recent user activity — all from real APIs; empty states when no data.
- **User management:** view linked users/profiles, create/register/edit permitted details (where permitted), configure accessibility preferences, manage authorized links. Access limited to explicitly linked users.
- **Routine management:** create/edit/delete routines and steps, reorder, assign to user; persisted in MySQL.
- **Medicine management:** add/edit medicines, configure reminders/frequency, view history and Taken/Skipped records; no medical recommendations.
- **Emergency contacts:** add/edit/delete, set primary, view; protected.
- **SOS management:** view user, date/time, location availability/coords/map link, notification & acknowledgement status, relevant contact; acknowledge alert (record time and caregiver identity). Do not show externally delivered when only DB record created.
- **Activity/history:** routine completion, medicine Taken/Skipped, SOS events, other useful events from real API data; useful filtering/sorting where appropriate.

### 4.9 Accessibility settings (mobile)
- Configurable: Language (Bengali/English), Text size, Contrast preference, Speech rate, Voice assistance on/off, Reduced motion, Notification preferences.
- Applied consistently across the app (not only home). Respectful/professional for adults and younger users.

## 5. Non-functional requirements
- **Accessibility (highest priority):** large touch targets, clear icons/labels, high contrast, adjustable text/speech, TTS + repeat, screen-reader labels, reduced animation, consistent/simple navigation, limited simultaneous choices, clear confirmation/error messages, offline access to essential communication pictures and saved routines.
- **Security:** JWT auth, bcrypt password/PIN hashing, RBAC + ownership checks on backend, protected routes, request validation, parameterized SQL, rate limiting on auth, helmet/CORS, env-based secrets, centralized error handling. No plaintext passwords/PINs, no secrets/PII in repo.
- **Privacy:** restricted access to medicine/emergency/location data; demo data clearly labelled with no real personal/medical info.
- **Reliability & honesty:** loading/empty/success/error/offline states; never claim unverified functionality or delivery; handle failures gracefully.
- **Offline:** cache essential communication items and assigned routines; distinguish locally available/pending/synced/failed; no false offline SOS success; sync medicine history/SOS when possible; sensible conflict handling without silent overwrite of newer server records.
- **Maintainability:** modular, readable code; consistent architecture; minimal necessary dependencies; beginner-friendly explanations/comments for important logic.

## 6. Data and persistence requirements
- Primary DB: **MySQL `lifebuddy_db`** (InnoDB, utf8mb4). Proper PKs/FKs, unique constraints, indexes, normalization, timestamps, referential integrity.
- Local storage (AsyncStorage/SQLite on device) only for caching/preferences as appropriate — never primary record store.
- Core tables (minimum): `users`, `caregiver_links`, `user_preferences`, `routines`, `routine_steps`, `routine_completions`, `medicines`, `medicine_reminders`, `medicine_logs`, `emergency_contacts`, `sos_alerts`, `communication_items`, `favourite_phrases`, `situation_steps`, plus `device_tokens` (if push implemented) and `activity_logs` (where useful). Supporting tables added only if genuinely necessary.

## 7. Constraints and assumptions
- **Environment (observed):** Node v24.19.0, npm 11.17.0, Git 2.55.0, Java 17 available; **MySQL CLI not on PATH** (server/Workbench/credentials to be confirmed). Windows PowerShell commands required for guidance.
- **Stable/compatible packages:** choose versions compatible with installed environment; avoid unnecessary deps.
- **No mandatory paid services:** Gemini optional and non-critical; Expo Push requires valid tokens/credentials to claim delivery.
- **Demo context:** clearly identified demo accounts/records; safe for classroom demonstration.

## 8. Out of scope / explicit exclusions (core)
- MongoDB, Firebase Firestore, or primary SQLite/JSON/localStorage as record store.
- AI-dependent safety/medical/emergency decisions or AI-required core functionality.
- Unverified claims of external notification delivery or passed tests.
- Real personal/medical data in seeds, docs, or repo.

## 9. Acceptance (high level)
Aligned with final success criteria: mobile/dashboard/backend run; MySQL connected; auth & RBAC work; communication+TTS, routines, medicines (supported env), emotions, situations (no AI), SOS persisted and visible with correct status; real API/DB integration and essential offline verified; security/privacy addressed; docs complete; major tests executed; limitations documented.
