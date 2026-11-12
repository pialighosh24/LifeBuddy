# Device Token Management API (`/api/v1/devices`)

Prepares backend for future mobile push notifications. **Device token registration does not mean push notifications are implemented.** No Expo Push delivery or notification success is claimed.

## Endpoints
| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| POST | `/api/v1/devices/register` | Bearer (authenticated user) | Register/update own device token |
| GET | `/api/v1/devices` | Bearer (self) | List own registered devices |
| DELETE | `/api/v1/devices/:deviceId` | Bearer (self) | Deactivate/unregister own device |

## Request (register)
```json
{ "expoPushToken": "ExponentPushToken[...]", "platform": "android|ios|web" }
```
`platform` validated against schema enum.

## Security & behavior
- Users manage **only their own** tokens; cannot register/unregister on behalf of others. Cross-user attempts rejected (403).
- Unique token behavior enforced (`expo_push_token` unique). Re-registering same token updates/reactivates for owner (rotation-safe); claiming another user's token rejected.
- **Full device tokens are not unnecessarily returned** (responses/listing use masked token) and **never logged**.
- Parameterized SQL; no invented fields.

## Limitations
No actual notification delivery in this phase; mobile integration will handle push sending. Unregister deactivates token (`is_active=false`) to preserve history safely.