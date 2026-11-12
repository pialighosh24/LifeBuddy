# Life Buddy — Database Documentation (`lifebuddy_db`)

## 1. Overview
- **DBMS:** MySQL (target: 8.0+, verified environment has MySQL Server 8.0.42)
- **Database name:** `lifebuddy_db`
- **Engine:** InnoDB (transactions, FK support)
- **Charset/Collation:** `utf8mb4` / `utf8mb4_unicode_ci` (supports Bengali and English)
- **Role:** authoritative persistent store for all application records (no JSON/local storage substitute)

**Artifacts (this phase):**
- Schema: `database/schema/lifebuddy_schema.sql`
- Demo seed (clearly labelled, idempotent): `database/seed/demo_data.sql`
- Sample queries: `database/queries/sample_crud.sql`
- ERD (Mermaid): `database/erd/lifebuddy_erd.mmd`

> **Verification status:** SQL files are designed to be syntactically coherent for MySQL 8/InnoDB, but **execution against a live MySQL server has NOT been tested in this coding session** (CLI not on PATH; server service detected as running). See environment/setup notes below.

## 2. Environment investigation (read-only, observed)
- **MySQL Server/Workbench installed:** Yes — `C:\Program Files\MySQL\` contains `MySQL Server 8.0`, `MySQL Workbench 8.0`, `MySQL Shell 8.0`, `MySQL Router 8.0`; `C:\Program Files (x86)\MySQL\MySQL Installer for Windows` present.
- **Service:** `MySQL80` — **RUNNING** (Windows service).
- **Versions (from binaries):** `mysql.exe Ver 8.0.42 for Win64` (`C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe`), MySQL Workbench 8.0.42.
- **CLI on PATH:** `mysql`/`mysqld` **not found** on PATH in this session; use full path or MySQL Workbench to run scripts.
- **XAMPP:** not detected at `C:\xampp\mysql\bin`.

No software installed, no PATH/system configuration changed, and no database operations executed.

## 3. How to apply schema and seed (Windows PowerShell)
> Run only against a development/demo MySQL instance you control. `lifebuddy_schema.sql` includes `DROP DATABASE IF EXISTS lifebuddy_db;` — this is **destructive** to any existing `lifebuddy_db` database. **Do not run it on a database with data you need to keep** without explicit backup/permission.

### Option A — MySQL Workbench (GUI)
1. Open **MySQL Workbench** and connect to local instance (e.g. `localhost`, service `MySQL80`).
2. **Schema:** File → Open SQL Script → `database\schema\lifebuddy_schema.sql` → Execute (lightning icon).
3. **Seed:** Open → `database\seed\demo_data.sql` → Execute.
4. **Verify:** Open → `database\queries\sample_crud.sql` (run selected SELECT/JOIN/GROUP queries).

### Option B — MySQL CLI (full path, PowerShell)
Replace `<user>` with your MySQL username (e.g. `root`). You will be prompted for the password (do not hardcode it).

```powershell
$mysql = "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"
& $mysql -u <user> -p -e "SOURCE C:/Users/ADMIN/Desktop/LifeBuddy/database/schema/lifebuddy_schema.sql;"
& $mysql -u <user> -p -e "SOURCE C:/Users/ADMIN/Desktop/LifeBuddy/database/seed/demo_data.sql;"
```

### Option C — If MySQL is not installed (for later)
1. Download **MySQL Installer for Windows** (Community) from the official MySQL site.
2. Install **MySQL Server 8.0** and **MySQL Workbench**; set a root password and keep it private (store in local `.env`, never commit).
3. Ensure service is running (`MySQL80`) and repeat Option A or B.
4. Backend will use `mysql2` with env vars (e.g. `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME=lifebuddy_db`).

## 4. Design principles
- **Normalization:** separate tables for entities/relationships (users, links, preferences, routines/steps/completions, medicines/reminders/logs, contacts, alerts, communication/favourites, situations, devices, activity).
- **Integrity:** PKs on all tables; FKs enforce relationships; `RESTRICT`/`CASCADE`/`SET NULL` chosen by meaning (e.g. cascade dependent records, restrict/guard critical references, set-null for optional/audit refs).
- **Constraints & indexes:** unique keys to prevent duplicates (email, caregiver-user link, user preferences per user, item keys, step ordering, client event ids for idempotent sync); indexes on frequent filters/joins (`user_id/care_user_id`, status, time/schedule columns, composite indexes where useful).
- **Bilingual support:** `utf8mb4` plus paired English/Bengali fields where user-facing content is stored (e.g. labels/instructions/titles/phrases).
- **Security/privacy:** no plaintext secrets in schema/seed (seed uses placeholder hash strings and clearly labelled demo data); sensitive access enforced by app RBAC/ownership using `caregiver_links`.
- **Auditability:** `created_at`/`updated_at` timestamps; `activity_logs` for useful events; SOS stores status, delivery outcome, acknowledgement actor/time.
- **Offline/sync support:** `routine_completions.client_event_id` (unique) and `sos_alerts.client_event_id` for idempotent client-originated events; sync/status fields to avoid silent overwrites.

## 5. Tables — purpose, columns, and relationships

### 5.1 `users`
**Purpose:** All accounts (caregivers and assisted users) distinguished by `role`.
| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| id | BIGINT UNSIGNED | NO | AI | PK |
| role | ENUM('caregiver','user') | NO |  | RBAC role |
| email | VARCHAR(255) | YES |  | Unique; required for caregiver auth |
| password_hash | VARCHAR(255) | YES |  | bcrypt hash (caregiver) |
| pin_hash | VARCHAR(255) | YES |  | bcrypt hash (user PIN) |
| full_name | VARCHAR(150) | NO |  |  |
| display_name | VARCHAR(100) | YES |  | Friendly name |
| status | ENUM('active','inactive') | NO | active |  |
| preferred_language | ENUM('en','bn') | NO | en |  |
| phone_number | VARCHAR(30) | YES |  | Optional |
| created_at/updated_at | TIMESTAMP | NO | current/auto |  |

**Keys/constraints:** PK `id`; UNIQUE `uq_users_email`; indexes `idx_users_role_status`, `idx_users_created_at`; CHECKs to enforce caregiver credentials and user PIN presence by role.  
**Relationships:** referenced by `caregiver_links`, `user_preferences`, `routines`, `medicines`, `emergency_contacts`, `sos_alerts`, `routine_completions`, `medicine_logs`, `favourite_phrases`, `device_tokens`, `activity_logs`, optional custom `situation_steps`.

### 5.2 `caregiver_links`
**Purpose:** Authorization boundary — which caregiver may access which assisted user.
| Key columns | Type/notes |
|---|---|
| id PK | BIGINT UNSIGNED AI |
| caregiver_id FK→users.id | RESTRICT |
| care_user_id FK→users.id | RESTRICT |
| relationship_type | VARCHAR(50) nullable |
| link_status | ENUM active/revoked/pending |
| linked_by FK→users.id | SET NULL |
| timestamps | created_at, updated_at |

**Keys/constraints:** UNIQUE `(caregiver_id, care_user_id)` prevents duplicates; indexes on (caregiver,status) and (care_user,status); CHECK `caregiver_id <> care_user_id`.  
**Relationship:** many-to-many style link between caregiver users and care users (both in `users`).

### 5.3 `user_preferences`
**Purpose:** Per-user accessibility/app settings (one-to-one with assisted user).
| Key columns | Type/notes |
|---|---|
| id PK, user_id FK→users.id (CASCADE, UNIQUE) | one row per user |
| language | ENUM en,bn |
| text_size | ENUM small,medium,large,xlarge |
| contrast_mode | ENUM normal,high |
| speech_rate | DECIMAL(3,2) default 1.00, CHECK 0.50–2.00 |
| voice_enabled, reduced_motion, notifications_enabled | TINYINT(1) flags |

### 5.4 `routines`
**Purpose:** Routine definitions assigned to a care user.
| Key columns | Type/notes |
|---|---|
| id PK | AI |
| care_user_id FK→users.id (CASCADE) | assignee |
| created_by_caregiver_id FK→users.id (RESTRICT) | manager |
| title_en/title_bn, description_en/description_bn | bilingual |
| icon_key, is_active | display/filter |
| timestamps |  |

**Indexes:** (care_user_id,is_active), created_by.

### 5.5 `routine_steps`
**Purpose:** Ordered steps inside a routine.
| Key columns | Type/notes |
|---|---|
| id PK, routine_id FK→routines.id (CASCADE) |  |
| step_order | INT UNSIGNED; UNIQUE with routine_id for stable ordering |
| instruction_en/instruction_bn | bilingual text |
| image_key, audio_hint_key | asset keys |

### 5.6 `routine_completions`
**Purpose:** Completion history/events per step (supports online and offline-synced records).
| Key columns | Type/notes |
|---|---|
| id PK |  |
| routine_id FK, routine_step_id FK, care_user_id FK | all CASCADE |
| completion_status | ENUM completed,skipped,pending_sync |
| completed_at | event time |
| synced_at | server sync time (nullable) |
| source | ENUM online,offline_sync |
| client_event_id | VARCHAR(64) UNIQUE nullable — idempotency for offline sync |
| notes | optional |

**Indexes:** (care_user_id,completed_at), (routine_id,completed_at), status.

### 5.7 `medicines`
**Purpose:** Caregiver-entered medicine/reminder context (no medical advice/diagnosis).
| Key columns | Type/notes |
|---|---|
| id PK, care_user_id FK (CASCADE), created_by_caregiver_id FK (RESTRICT) |  |
| medicine_name | VARCHAR(150) |
| prescribed_instructions, notes | TEXT (caregiver-entered) |
| start_date, end_date | nullable; CHECK end>=start when set |
| is_active | flag |

### 5.8 `medicine_reminders`
**Purpose:** Schedule rules for a medicine.
| Key columns | Type/notes |
|---|---|
| id PK, medicine_id FK→medicines.id (CASCADE) |  |
| reminder_time | TIME |
| frequency | ENUM once,daily,weekly,custom |
| days_of_week | VARCHAR(20) CSV (e.g. MON,TUE) |
| reminder_label, is_active |  |

### 5.9 `medicine_logs`
**Purpose:** Taken/skipped/missed/pending history.
| Key columns | Type/notes |
|---|---|
| id PK, medicine_id FK (CASCADE), reminder_id FK (SET NULL), care_user_id FK (CASCADE) |  |
| scheduled_for | DATETIME |
| status | ENUM taken,skipped,missed,pending |
| responded_at, notes |  |

**Indexes:** (care_user_id,scheduled_for), (medicine_id,scheduled_for), status.

### 5.10 `emergency_contacts`
**Purpose:** Emergency contacts per care user.
| Key columns | Type/notes |
|---|---|
| id PK, care_user_id FK (CASCADE) |  |
| contact_name, relationship_label, phone_number, email | contact info |
| is_primary | TINYINT(1) |

**Indexes:** care_user_id, (care_user_id,is_primary). (App logic should enforce single primary if required.)

### 5.11 `sos_alerts`
**Purpose:** SOS events with **honest** alert, delivery, and acknowledgement tracking.
| Key columns | Type/notes |
|---|---|
| id PK, care_user_id FK (CASCADE) |  |
| emergency_contact_id FK→emergency_contacts.id (SET NULL) | displayed/targeted contact |
| latitude, longitude | DECIMAL nullable |
| location_status | ENUM available,unavailable,denied,disabled |
| alert_status | ENUM created,pending,sent,failed,acknowledged,cancelled |
| delivery_status | ENUM not_applicable,pending,sent,failed,confirmed |
| delivery_channel | VARCHAR(30) default dashboard |
| delivery_message, failure_reason | outcome details |
| triggered_at, acknowledged_at | DATETIME |
| acknowledged_by FK→users.id (SET NULL) | caregiver who acknowledged |
| client_event_id | UNIQUE nullable (dedupe/idempotency) |

**Indexes:** (care_user_id,triggered_at), alert_status, delivery_status.

### 5.12 `communication_items`
**Purpose:** Global picture/word tiles for deterministic communication (bilingual).
| Key columns | Type/notes |
|---|---|
| id PK, item_key UNIQUE | stable key (FOOD, WATER...) |
| category, label_en/label_bn, icon_key | display |
| speak_text_en/speak_text_bn | TTS text |
| sentence_role | ENUM for composition hints |
| sort_order, is_active | ordering/visibility |

### 5.13 `favourite_phrases`
**Purpose:** Saved phrases per care user.
| Key columns | Type/notes |
|---|---|
| id PK, care_user_id FK (CASCADE) | owner |
| communication_item_id FK→communication_items.id (SET NULL) | optional reference |
| selected_item_keys | JSON array of item keys/order |
| phrase_en/phrase_bn | generated/saved text |
| phrase_label, is_active |  |

### 5.14 `situation_steps`
**Purpose:** Predefined global or custom per-user step-by-step guides (deterministic, no AI for safety).
| Key columns | Type/notes |
|---|---|
| id PK |  |
| care_user_id FK→users.id (CASCADE, nullable) | NULL = predefined/global |
| situation_key | groups steps (e.g. WASHING_HANDS) |
| title_en/title_bn, step_order | ordering/display |
| instruction_en/instruction_bn, image_key | bilingual steps |
| is_predefined, is_active | flags |

**Constraints:** UNIQUE `(situation_key, care_user_id, step_order)` (note: in MySQL, multiple NULLs in unique keys are allowed; app/seed must manage predefined rows consistently).

### 5.15 `device_tokens` (optional)
**Purpose:** Store Expo push tokens when push notifications are configured.
| Key columns | Type/notes |
|---|---|
| id PK, user_id FK (CASCADE) |  |
| platform | ENUM android,ios,web |
| expo_push_token | UNIQUE |
| is_active, last_seen_at |  |

### 5.16 `activity_logs` (useful)
**Purpose:** Dashboard history/audit trail of notable events.
| Key columns | Type/notes |
|---|---|
| id PK |  |
| actor_user_id FK (SET NULL), care_user_id FK (SET NULL) | who/for whom |
| event_type, entity_type, entity_id | classification |
| summary, metadata_json | details |
| created_at | event time |

## 6. Relationship summary
- **Users & access:** `users(1) — (0..1) user_preferences`; `users(caregiver) <— caregiver_links —> users(care_user)` (authorized access).
- **Routines:** `users(care_user) 1—* routines 1—* routine_steps`; completions link `routine`, `routine_step`, `care_user`.
- **Medicines:** `users(care_user) 1—* medicines 1—* medicine_reminders`; `medicine_logs` link medicine/reminder/user with time and status.
- **Emergency/SOS:** `users(care_user) 1—* emergency_contacts`; `sos_alerts` belong to care user, optionally reference contact and acknowledging caregiver.
- **Communication:** global `communication_items`; `favourite_phrases` belong to care user and store selected keys/phrases.
- **Situations:** `situation_steps` global (predefined) or per care user (custom).
- **Devices/Activity:** tokens and activity logs reference users as appropriate.

See `database/erd/lifebuddy_erd.mmd` for the ER diagram.

## 7. Data integrity & application rules (must be enforced in backend)
- Only **linked, active** caregivers may access/manage a care user's data (check `caregiver_links`).
- Caregivers must not be treated as care users in restricted flows unless explicitly modelled; validate roles on writes.
- Medicine data is caregiver-entered display/reminder info only (no diagnosis/dose invention).
- SOS status transitions must reflect reality (never mark external delivery confirmed without confirmation).
- Offline sync: use `client_event_id` to dedupe; reject/merge in ways that do not silently overwrite newer server state.
- Maintain primary-contact consistency in application logic if only one primary per user is desired.

## 8. Known limitations / notes
- **Not executed/validated against live DB in this session.** Syntax/logic reviewed for coherence with MySQL 8/InnoDB; runtime verification deferred to environment with DB access (Phase 3+).
- Seed auth hashes are **placeholders** (demo structure) and must be replaced with real bcrypt hashes generated by backend for actual login tests.
- Some higher-level uniqueness (e.g. single primary emergency contact, preventing overlapping medicine log instances) is best enforced with application logic and/or additional targeted constraints/triggers in later refinement if needed.
- `DROP DATABASE IF EXISTS` in schema is appropriate for clean dev/demo setup but destructive if misused — handle with care. 
