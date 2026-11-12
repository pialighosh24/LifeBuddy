# Care-User Management API (`/api/v1/care-users`)

All endpoints require **Bearer JWT** authentication and **`caregiver`** role. Responses follow the standard `{ success, message, data }` format. No passwords, PINs, hashes, tokens, or secrets are returned.

## Ownership & access rules (enforced server-side)
- Caregivers can access/manage **only care-users linked to them** via active `caregiver_links`.
- Cross-caregiver access is rejected (403).
- Client-supplied IDs are not trusted without ownership/role verification.
- Link invariant enforced in backend logic: `caregiver_id != care_user_id` (DB CHECK removed for MySQL 8 compatibility).
- Care-user records must have role `user`; duplicate links handled safely (unique pair constraint → conflict).
- Parameterized SQL used; permitted update fields only.

## Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/v1/care-users` | Create care-user profile and link to authenticated caregiver |
| GET | `/api/v1/care-users` | List linked care-users for authenticated caregiver |
| GET | `/api/v1/care-users/:id` | Get linked care-user details |
| PATCH | `/api/v1/care-users/:id` | Update permitted profile fields for linked care-user |
| POST | `/api/v1/care-users/:id/pin` | Set/change PIN for linked care-user (bcrypt hashed) |

## 1. POST `/api/v1/care-users`
**Request body**
```json
{
  "fullName": "Care User Name",
  "displayName": "optional",
  "preferredLanguage": "en|bn",
  "phoneNumber": "optional",
  "relationshipType": "optional (e.g. guardian)"
}
```
**Success (201)**: `data.careUser` (sanitized: id, role `user`, name fields, status, language, timestamps). Creates user and active caregiver link.  
**Errors**: 400 validation/invalid link, 401/403 auth/role, 409 duplicate/conflict.

## 2. GET `/api/v1/care-users`
**Success (200)**: `data.careUsers` array of linked care-users with link metadata (`relationshipType`, `linkStatus`, `linkedAt`). Only caller's linked users returned.

## 3. GET `/api/v1/care-users/:id`
**Params**: `id` (care-user id, integer).  
**Success (200)**: `data.careUser` with link metadata.  
**Errors**: 403 if not linked to caregiver, 400 invalid id.

## 4. PATCH `/api/v1/care-users/:id`
**Permitted fields**: `fullName`, `displayName`, `preferredLanguage` (`en|bn`), `phoneNumber`, `status` (`active|inactive`).  
**Success (200)**: updated sanitized care-user.  
**Errors**: 400 no permitted fields/validation, 403 not linked/unauthorized.

## 5. POST `/api/v1/care-users/:id/pin`
**Request body**: `{ "pin": "4-8 digits", "fullName?": "...", "displayName?": "...", "preferredLanguage?": "en|bn" }`  
**Success (200)**: sanitized care-user (PIN/hash never returned). PIN stored as bcrypt hash.  
**Errors**: 400 validation, 401/403 auth/role/not linked.  
**Notes**: only authorized linked caregiver may set/change PIN; PIN login rate-limited.

## Error/validation behavior
- 401 missing/invalid/expired token, 403 insufficient role or ownership violation, 404 where applicable, 400 validation errors with field details, 429 on rate limiting (auth routes), 500 generic server error (no internal details leaked).