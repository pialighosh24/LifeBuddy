# Emergency Contacts API (`/api/v1`)

All responses follow `{ "success", "message", "data" }`. No secrets/tokens returned.

## Endpoints
| Method | Endpoint | Auth/Role | Purpose |
|---|---|---|---|
| POST | `/api/v1/care-users/:id/emergency-contacts` | Bearer, `caregiver` (linked) | Create contact for linked care-user |
| GET | `/api/v1/care-users/:id/emergency-contacts` | Bearer, self or linked caregiver | List contacts |
| GET | `/api/v1/emergency-contacts/:contactId` | Bearer, authorized | Retrieve contact |
| PATCH | `/api/v1/emergency-contacts/:contactId` | Bearer, `caregiver` (linked) | Update contact |
| DELETE | `/api/v1/emergency-contacts/:contactId` | Bearer, `caregiver` (linked) | Delete contact safely |

## Fields (actual schema)
`contactName` (required), `relationshipLabel`, `phoneNumber` (required, validated), `email` (optional, validated), `isPrimary` (boolean). No invented columns.

## Ownership & rules
- Caregivers manage only actively linked care-users; care-users may view own permitted contacts.
- Primary contact handled consistently in transactions (setting primary clears others; remaining contact promoted on delete when needed).
- Parameterized SQL, validation, 401/403/404/400 as appropriate.

## Example request
```json
{ "contactName": "Family Member", "relationshipLabel": "Parent", "phoneNumber": "+8801700000000", "email": "person@example.test", "isPrimary": true }
```