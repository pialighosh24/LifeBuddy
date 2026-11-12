# Medicines, Reminders & Medicine History API (`/api/v1`)

All responses follow `{ "success": boolean, "message": string, "data": ... }`. No secrets/tokens returned.

**Safety:** Life Buddy is a reminder/tracking application, not a medical decision-making system. Backend stores caregiver-provided information only. **No diagnosis, no medicine/dosage recommendations, no advice to start/stop medication, no interpretation of skipped events as medical advice.** This phase provides **backend reminder data/scheduling information and logs only** (no claim of mobile push/local device notifications working).

## Auth & ownership rules
- **Caregivers:** may create/manage medicine records, reminders, and schedules **only for actively linked care-users**. Must verify ownership of medicine/reminder IDs.
- **Care-users:** may view own medicines/reminders and permitted history/logs (and record logs for self) when authorized; cannot access other users’ data. Cross-user/cross-caregiver access rejected (403).
- All client-supplied IDs validated; ownership/link enforced server-side. Parameterized SQL used.

## Endpoints

| Method | Endpoint | Auth/Role | Purpose |
|---|---|---|---|
| POST | `/api/v1/care-users/:id/medicines` | Bearer, `caregiver` (linked) | Create medicine record for linked care-user |
| GET | `/api/v1/care-users/:id/medicines` | Bearer, self or linked caregiver | List medicines for authorized care-user |
| GET | `/api/v1/care-users/:id/medicine-history` | Bearer, self or linked caregiver | Retrieve medicine history (logs joined with medicine name) |
| GET | `/api/v1/medicines/:medicineId` | Bearer, authorized | Retrieve medicine (with reminders) |
| PATCH | `/api/v1/medicines/:medicineId` | Bearer, `caregiver` (linked) | Update medicine details |
| DELETE | `/api/v1/medicines/:medicineId` | Bearer, `caregiver` (linked) | Deactivate medicine (default) or delete safely with `?hard=true` |
| POST | `/api/v1/medicines/:medicineId/reminders` | Bearer, `caregiver` | Create reminder |
| GET | `/api/v1/medicines/:medicineId/reminders` | Bearer, authorized | List reminders (schedule info) |
| PATCH | `/api/v1/medicines/:medicineId/reminders/:reminderId` | Bearer, `caregiver` | Update reminder |
| DELETE | `/api/v1/medicines/:medicineId/reminders/:reminderId` | Bearer, `caregiver` | Delete reminder (default) or `?deactivate=true` |
| POST | `/api/v1/medicines/:medicineId/logs` | Bearer, authorized | Record medicine event (taken/skipped/missed/pending) |
| GET | `/api/v1/medicines/:medicineId/logs` | Bearer, authorized | Retrieve logs for a medicine |

## Request bodies (actual schema-supported fields)

**Create medicine**: `medicineName` (required), `prescribedInstructions`, `notes`, `startDate`, `endDate`, `isActive`.  
**Update medicine**: permitted subset of above.  
**Create/update reminder**: `reminderTime` (`HH:MM`/`HH:MM:SS`), `frequency` (`once|daily|weekly|custom`), `daysOfWeek` (e.g. `MON,TUE`), `reminderLabel`, `isActive`.  
**Create log**: `status` (`taken|skipped|missed|pending`), `scheduledFor` (datetime, required), optional `reminderId`, `respondedAt`, `notes`.

## Validation & responses
- Date/time and enum validation enforced; `endDate >= startDate` respected.
- Scheduled reminder data vs confirmed log status are distinct (`medicine_reminders` vs `medicine_logs.status/scheduled_for/responded_at`).
- Errors: 400 validation/invalid reminder ownership, 401, 403 unauthorized/cross-user, 404 not found where applicable.

## Notes
- No push/local device notifications implemented in backend; mobile integration is a later phase. No medical advice generated.