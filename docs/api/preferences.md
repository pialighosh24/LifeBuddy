# Profile & Accessibility Preferences API (`/api/v1/profile`, `/api/v1/care-users/:id/preferences`)

All responses follow: `{ "success": boolean, "message": string, "data": ... }`. No passwords, PINs, hashes, tokens, or secrets are returned.

## Endpoints

| Method | Endpoint | Auth | Role/Access | Purpose |
|---|---|---|---|---|
| GET | `/api/v1/profile` | Bearer JWT | Authenticated user (self) | Retrieve authenticated user's profile |
| PATCH | `/api/v1/profile` | Bearer JWT | Authenticated user (self) | Update permitted profile fields |
| GET | `/api/v1/care-users/:id/preferences` | Bearer JWT | Care-user (self) or linked caregiver | Retrieve preferences (creates defaults if missing) |
| PUT | `/api/v1/care-users/:id/preferences` | Bearer JWT | Care-user (self) or linked caregiver | Update permitted accessibility preferences |

## 1. GET `/api/v1/profile`
**Auth:** `Authorization: Bearer <token>`  
**Success (200):** `data.profile` sanitized (`id, role, email, fullName, displayName, status, preferredLanguage, phoneNumber, createdAt, updatedAt`).  
**Errors:** 401 missing/invalid/expired token.

## 2. PATCH `/api/v1/profile`
**Auth:** Bearer JWT (self).  
**Permitted body fields (any subset):**
```json
{
  "fullName": "string (2-150)",
  "displayName": "string|null (<=100)",
  "preferredLanguage": "en|bn",
  "phoneNumber": "string|null (<=30)"
}
```
**Success (200):** updated sanitized profile.  
**Errors:** 400 validation/no permitted fields, 401 unauthorized.

## 3. GET `/api/v1/care-users/:id/preferences`
**Params:** `id` = care-user id (integer).  
**Access:** care-user may access own preferences (`id == self`); caregiver may access only for **actively linked** care-users.  
**Behavior:** returns existing preferences or creates schema-default preferences if none exist.  
**Success (200):**
```json
{
  "data": {
    "preferences": {
      "id": 1,
      "userId": 123,
      "language": "en|bn",
      "textSize": "small|medium|large|xlarge",
      "contrastMode": "normal|high",
      "speechRate": 1.0,
      "voiceEnabled": true,
      "reducedMotion": false,
      "notificationsEnabled": true,
      "createdAt": "...",
      "updatedAt": "..."
    }
  }
}
```
**Errors:** 400 invalid id, 401, 403 forbidden/not linked/cross-user.

## 4. PUT `/api/v1/care-users/:id/preferences`
**Access/ownership:** same as GET preferences.  
**Permitted body fields (any subset, validated against actual DB schema):**
```json
{
  "language": "en|bn",
  "textSize": "small|medium|large|xlarge",
  "contrastMode": "normal|high",
  "speechRate": 0.5-2.0,
  "voiceEnabled": true,
  "reducedMotion": true,
  "notificationsEnabled": true
}
```
**Success (200):** updated preferences.  
**Errors:** 400 validation/invalid values/no permitted fields, 401, 403 ownership violation.

## Notes
- Only fields supported by `user_preferences` table are accepted; no invented columns.
- All queries parameterized; ownership/link checks enforced server-side (client IDs not trusted).