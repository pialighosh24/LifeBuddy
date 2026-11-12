# SOS Alerts API (`/api/v1`)

**Safety-critical:** Creating an SOS record means only that the server **saved** the alert in the database. This phase does **not** contact emergency services and does **not** confirm SMS/email/push delivery. Responses must not claim external delivery or emergency-service contact.

## Endpoints
| Method | Endpoint | Auth/Role | Purpose |
|---|---|---|---|
| POST | `/api/v1/sos` | Bearer, `user` (self) | Create SOS alert (saved to DB) |
| GET | `/api/v1/care-users/:id/sos-alerts` | Bearer, self or linked caregiver | List alerts/history for care-user |
| GET | `/api/v1/care-users/:id/sos-history` | Bearer, self or linked caregiver | Same as alerts (history view) |
| GET | `/api/v1/sos/:alertId` | Bearer, authorized | Retrieve alert |
| PATCH | `/api/v1/sos/:alertId/acknowledge` | Bearer, `caregiver` (linked) | Acknowledge alert |
| PATCH | `/api/v1/sos/:alertId/resolve` | Bearer, `caregiver` (linked) | Resolve (schema-limited; see below) |

## Create SOS request (schema-supported)
```json
{ "latitude": 23.81, "longitude": 90.41, "locationStatus": "available|unavailable|denied|disabled", "emergencyContactId": 1, "clientEventId": "optional-idempotency-key" }
```
- Latitude/longitude stored only when both valid and provided together.
- No user-authored free-text message field in current schema; no invented columns.

## Status/behavior (actual schema)
- `alert_status` enum: `created,pending,sent,failed,acknowledged,cancelled` (no `RESOLVED` in schema).
- Acknowledge sets `acknowledged`, records `acknowledged_at` and `acknowledged_by` (authorized linked caregiver) via conditional/transactional update (409 on duplicate/final-state conflicts).
- `resolve` endpoint currently returns 400 as **unsupported by schema** (no enum invention). `delivery_status/channel/message` reflect dashboard persistence only; **external delivery not confirmed**.

## Ownership & safety
- Care-user creates only for self; caregivers access/acknowledge only for actively linked care-users; cross-user access rejected (403). IDs validated and ownership-checked. Parameterized SQL.
- Coordinates validated; location not exposed to unauthorized users. If DB unavailable, request fails and alert is not reported as saved/transmitted.

## Limitations
No verified SMS/email/Expo Push/emergency-service integration in this phase. Idempotency supported via `client_event_id` unique key when provided.