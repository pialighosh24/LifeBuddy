# Authentication API (`/api/v1/auth`)

All responses follow: `{ "success": boolean, "message": string, "data": ... }` (error responses may include `code` and `errors`). **No passwords, PINs, hashes, tokens, or secrets are shown in examples below.**

## Endpoints

| Method | Endpoint | Auth | Role | Purpose |
|---|---|---|---|---|
| POST | `/api/v1/auth/caregiver/register` | No | - | Register caregiver account |
| POST | `/api/v1/auth/caregiver/login` | No | - | Caregiver login (email/password) |
| POST | `/api/v1/auth/user/pin/login` | No | - | Care-user PIN login (suggested path) |
| POST | `/api/v1/auth/user/login` | No | - | Care-user PIN login (compatibility alias) |
| POST | `/api/v1/auth/user/pin-setup` | Yes (Bearer JWT) | `caregiver` | Set/change PIN for a linked care-user (compatibility path; see care-user API) |
| POST | `/api/v1/auth/logout` | Yes (Bearer JWT) | any authenticated | Logout (stateless JWT: client discards token) |
| GET | `/api/v1/auth/me` | Yes (Bearer JWT) | any authenticated | Get authenticated profile |

## 1. POST `/api/v1/auth/caregiver/register`
**Request body**
```json
{
  "email": "caregiver@example.com",
  "password": "at-least-8-chars",
  "fullName": "Full Name",
  "displayName": "Optional",
  "preferredLanguage": "en|bn",
  "phoneNumber": "optional"
}
```
**Success (201)**: message `Caregiver registered successfully`, data contains `token` (JWT) and sanitized `user` (`id, role, email, fullName, displayName, preferredLanguage`), no hashes.  
**Errors**: 400 validation (invalid email/missing fields/weak password), 409 `CONFLICT` duplicate email, 429 rate limited.  
**Security**: email normalized; bcrypt password hash stored; parameterized SQL.

## 2. POST `/api/v1/auth/caregiver/login`
**Request body**: `{ "email": "...", "password": "..." }`  
**Success (200)**: token + sanitized user.  
**Errors**: 401 `INVALID_CREDENTIALS` with generic message `Invalid email or password` (no account-existence leakage for unknown/incorrect/inactive), 400 validation, 429 rate limited.

## 3. POST `/api/v1/auth/user/pin/login` (and `/user/login`)
**Request body**: `{ "careUserId": 123, "pin": "4-8 digits" }`  
**Success (200)**: token + sanitized user (`role: "user"`).  
**Errors**: 401 generic `Invalid user or PIN` (no leakage), 400 validation, 429 rate limited.

## 4. POST `/api/v1/auth/user/pin-setup` (caregiver, linked)
**Auth**: `Authorization: Bearer <token>` (caregiver).  
**Request body**: `{ "careUserId": 123, "pin": "4-8 digits", "fullName?": "...", "displayName?": "...", "preferredLanguage?": "en|bn" }`  
**Success (200)**: sanitized care-user (no PIN/hash).  
**Errors**: 401/403 unauthorized/not linked, 400 validation, 404 care-user not found.  
**Ownership**: caregiver must be actively linked to the care-user.

## 5. POST `/api/v1/auth/logout`
**Auth**: Bearer JWT. **Success (200)**: `Logged out successfully` (stateless JWT; client discards token).

## 6. GET `/api/v1/auth/me`
**Auth**: Bearer JWT. **Success (200)**: authenticated sanitized profile from server-verified active account.

## JWT & middleware behavior
- Missing/malformed/invalid/expired token → 401 `UNAUTHORIZED`.
- Valid token for inactive/nonexistent account rejected on re-check.
- Role enforcement via `authorizeRoles`; ownership/link enforcement on relevant operations.
- Auth endpoints rate-limited (configurable window/max). No internal stack traces or secrets returned.