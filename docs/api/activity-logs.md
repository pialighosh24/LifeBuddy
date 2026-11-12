# Activity Logs API (`/api/v1`)

Append-only, database-backed activity/audit logging for important events (logins, routine completions, medicine logs, SOS create/acknowledge, emergency contact changes, preference changes, etc.). No APIs to modify/delete logs. Clients cannot forge arbitrary audit records.

## Endpoints
| Method | Endpoint | Auth/Role | Purpose |
|---|---|---|---|
| GET | `/api/v1/care-users/:id/activity` | Bearer, self or linked caregiver | Activity history for a care-user |
| GET | `/api/v1/activity/me` | Bearer | Activity performed by authenticated user |

## Data recorded (schema-supported)
`actor_user_id`, `care_user_id`, `event_type`, `entity_type`, `entity_id`, `summary`, `metadata_json`, `created_at`.

## Security & integrity
- Ownership enforced: caregivers only for actively linked care-users; care-users only own permitted records.
- **No passwords, PINs, tokens, secrets, or full device tokens logged.** Metadata sanitized; sensitive fields excluded.
- Optional/best-effort logging must not break core operations. For safety-critical SOS, persistence and activity-log outcomes are handled/reported separately.
- Parameterized SQL; append-only through application.

## Limitations
Not every operation is instrumented; coverage is best-effort for key Phase 4A/4B/4C events. No unrestricted modification/deletion endpoints.