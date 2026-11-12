# Smart Situation Assistant API (`/api/v1/situations`)

Database-backed retrieval of predefined/custom situation steps (no hardcoded instruction arrays, no dynamic AI safety advice).

## Endpoints
| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| GET | `/api/v1/situations` | Bearer | List available situations (grouped by `situationKey`) |
| GET | `/api/v1/situations/:situationKey` | Bearer | Retrieve situation with ordered steps |
| GET | `/api/v1/situations/:situationKey/steps` | Bearer | Retrieve ordered steps only |

Query: `active=all` to include inactive where applicable.

## Schema-supported behavior
- Steps stored in `situation_steps` (key, titles, step_order, EN/BN instructions, image_key, predefined/custom, active). Results ordered by `step_order`.
- For care-user requests, custom user-specific situation steps (if present) take precedence over global predefined for same key; caregivers see global/predefined list.
- Language content available in EN/BN fields as stored (no invented translations). Safety instructions remain simple, sequential, and conservative as stored data.

## Limitations
- No category column in schema (category filtering not supported). Caregiver-managed CRUD not implemented in this phase (retrieval-focused per requirements). No automatic danger detection.