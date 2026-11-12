# Routines, Steps & Completions API (`/api/v1`)

All responses follow `{ "success": boolean, "message": string, "data": ... }`. No secrets/tokens returned.

## Auth & ownership rules
- **Caregiver (linked):** can create/manage routine definitions, steps, and view completions/progress for **actively linked** care-users only.
- **Care-user (self):** can view own assigned routines, record/view own completions and progress; **cannot modify routine definitions/steps** unless explicitly permitted (not permitted here).
- All IDs validated; ownership/link checked server-side (client IDs not trusted). Parameterized SQL and transactions used for multi-step operations (create with steps, step add/reorder/delete).

## Endpoints

| Method | Endpoint | Auth/Role | Purpose |
|---|---|---|---|
| POST | `/api/v1/care-users/:id/routines` | Bearer, `caregiver` (linked) | Create routine for linked care-user (optional initial steps) |
| GET | `/api/v1/care-users/:id/routines` | Bearer, self care-user or linked caregiver | List routines for authorized care-user |
| GET | `/api/v1/care-users/:id/routine-progress` | Bearer, self or linked caregiver | Routine progress for date/period (`date`, `from`, `to` query supported) |
| GET | `/api/v1/routines/:routineId` | Bearer, authorized | Retrieve routine with ordered steps |
| PATCH | `/api/v1/routines/:routineId` | Bearer, `caregiver` (linked) | Update routine details |
| DELETE | `/api/v1/routines/:routineId` | Bearer, `caregiver` (linked) | Delete routine safely (cascades steps/completions per schema) |
| POST | `/api/v1/routines/:routineId/steps` | Bearer, `caregiver` | Add routine step |
| PATCH | `/api/v1/routines/:routineId/steps/reorder` | Bearer, `caregiver` | Reorder steps (full ordered list of all step IDs) |
| PATCH | `/api/v1/routines/:routineId/steps/:stepId` | Bearer, `caregiver` | Update step details (and optional move via reorder logic) |
| DELETE | `/api/v1/routines/:routineId/steps/:stepId` | Bearer, `caregiver` | Delete step and re-sequence remaining steps |
| POST | `/api/v1/routines/:routineId/completions` | Bearer, authorized user/caregiver for routine | Record completion of a routine step |
| GET | `/api/v1/routines/:routineId/completions` | Bearer, authorized | Retrieve completion history |

## Key request bodies (actual schema-supported fields)

**Create routine** `POST /care-users/:id/routines`
```json
{
  "titleEn": "Morning routine",
  "titleBn": "optional",
  "descriptionEn": "optional",
  "descriptionBn": "optional",
  "iconKey": "optional",
  "isActive": true,
  "steps": [{ "instructionEn": "Brush teeth", "instructionBn": "optional", "imageKey": "optional", "audioHintKey": "optional" }]
}
```

**Add/update step**: `instructionEn` (required for add), `instructionBn`, `imageKey`, `audioHintKey`, optional `stepOrder` (add).  
**Reorder**: `{ "orderedStepIds": [3,1,2] }` must include exactly all step IDs once.  
**Record completion** `POST /routines/:routineId/completions`
```json
{
  "routineStepId": 10,
  "completionStatus": "completed|skipped|pending_sync",
  "completedAt": "ISO datetime",
  "source": "online|offline_sync",
  "clientEventId": "optional idempotency key",
  "notes": "optional"
}
```

## Responses
- Routine payloads include routine fields and ordered `steps` where applicable.
- Progress response returns per-routine counts/percent/status for requested date (default today) based on actual completion records.
- Errors: 400 validation/invalid ownership of step/order, 401 auth, 403 role/ownership, 404 not found (where applicable), 409 conflict (e.g. duplicate client event id handled idempotently when possible).

## Safety/consistency
- Step ordering maintained consistently (unique `routine_id, step_order` respected via transactional resequencing).
- Completions validated against routine/care-user ownership; unrelated completion history not deleted except by routine cascade on routine delete (schema-defined). Duplicate `client_event_id` handled safely.