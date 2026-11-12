# Favourite Communication Phrases API (`/api/v1`)

## Endpoints
| Method | Endpoint | Auth/Role | Purpose |
|---|---|---|---|
| POST | `/api/v1/care-users/:id/favourites` | Bearer, `user` (self) | Add favourite (item ref or phrase) |
| GET | `/api/v1/care-users/:id/favourites` | Bearer, self or linked caregiver | List favourites |
| DELETE | `/api/v1/favourites/:favouriteId` | Bearer, `user` (owner) | Remove favourite |

## Request (add)
`communicationItemId` (optional, must exist & active) and/or `phraseEn` (required if not derivable), optional `phraseBn`, `phraseLabel`, `selectedItemKeys` (array, stored as JSON per schema).

## Rules
- Care-user manages own favourites; linked caregivers may retrieve if authorized. Cross-user access rejected.
- Duplicates prevented in service logic (by communication item or same phrase for user). Referenced communication items validated.
- Parameterized SQL; no invented schema fields. Use real DB records only.