# Picture-Based Communication Items API (`/api/v1/communication-items`)

Database-backed catalog (no hardcoded/fake item arrays or fake image URLs). `iconKey` is a stored asset/reference key only.

## Endpoints
| Method | Endpoint | Auth/Role | Purpose |
|---|---|---|---|
| GET | `/api/v1/communication-items` | Bearer (authenticated) | List items (`category`, `active=true|false|all`) |
| GET | `/api/v1/communication-items/categories` | Bearer | List active categories with counts |
| GET | `/api/v1/communication-items/:itemId` | Bearer | Retrieve item |
| POST | `/api/v1/communication-items` | Bearer, `caregiver` | Create item (schema-supported global management) |
| PATCH | `/api/v1/communication-items/:itemId` | Bearer, `caregiver` | Update permitted fields |
| DELETE | `/api/v1/communication-items/:itemId` | Bearer, `caregiver` | Deactivate item (`is_active=false`) |

## Schema-supported fields
`itemKey` (unique, uppercase key), `category`, `labelEn/labelBn`, `iconKey`, `speakTextEn/speakTextBn`, `sentenceRole`, `sortOrder`, `isActive`. EN/BN content supported per schema; no invented translations.

## Behavior
- Default list returns active items ordered by `sortOrder,id`. Inactive items handled consistently (`active=all` to include).
- Validation and parameterized SQL used. Caregiver-only for create/update/deactivate; authenticated read access for catalog.

## Limitations
Global catalog (no per-user ownership in schema). Image rendering via local/configured assets is mobile integration concern. No AI-generated content.