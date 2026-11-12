-- Life Buddy - Sample SQL queries (Phase 2)
-- Database: lifebuddy_db
-- Demonstrates SELECT, INSERT, UPDATE, DELETE, JOIN, filtering, sorting, grouping/counting.
-- Use parameterized queries in the backend (never concatenate untrusted input).

USE lifebuddy_db;

-- =========================
-- SELECT (basic + filtering + sorting)
-- =========================

-- 1) Active communication items ordered for mobile display
SELECT id, item_key, category, label_en, label_bn, icon_key, sort_order
FROM communication_items
WHERE is_active = 1
ORDER BY sort_order ASC, id ASC;

-- 2) Routines for a specific care user (filter by care_user_id)
SELECT r.id, r.title_en, r.title_bn, r.is_active, r.updated_at
FROM routines r
WHERE r.care_user_id = 2 AND r.is_active = 1
ORDER BY r.updated_at DESC;

-- 3) SOS alerts for a caregiver's linked users (filter + sort)
SELECT s.id, s.care_user_id, u.full_name AS care_user_name, s.alert_status, s.delivery_status,
       s.location_status, s.latitude, s.longitude, s.triggered_at, s.acknowledged_at
FROM sos_alerts s
JOIN users u ON u.id = s.care_user_id
WHERE s.care_user_id IN (SELECT care_user_id FROM caregiver_links WHERE caregiver_id = 1 AND link_status = 'active')
ORDER BY s.triggered_at DESC;

-- =========================
-- JOIN examples
-- =========================

-- 4) Routine with ordered steps
SELECT r.id AS routine_id, r.title_en, rs.step_order, rs.instruction_en, rs.instruction_bn, rs.image_key
FROM routines r
JOIN routine_steps rs ON rs.routine_id = r.id
WHERE r.care_user_id = 2 AND r.is_active = 1
ORDER BY r.id, rs.step_order;

-- 5) Medicine reminders with medicine and care user details
SELECT m.care_user_id, u.full_name AS care_user_name, m.medicine_name, m.prescribed_instructions,
       mr.reminder_time, mr.frequency, mr.days_of_week, mr.is_active
FROM medicines m
JOIN users u ON u.id = m.care_user_id
JOIN medicine_reminders mr ON mr.medicine_id = m.id
WHERE m.care_user_id = 2 AND m.is_active = 1 AND mr.is_active = 1
ORDER BY mr.reminder_time;

-- 6) SOS alert with emergency contact and acknowledger
SELECT s.id, u.full_name AS care_user_name, s.triggered_at, s.alert_status, s.delivery_status, s.delivery_channel,
       ec.contact_name, ec.phone_number, s.latitude, s.longitude,
       ack.full_name AS acknowledged_by_name, s.acknowledged_at
FROM sos_alerts s
JOIN users u ON u.id = s.care_user_id
LEFT JOIN emergency_contacts ec ON ec.id = s.emergency_contact_id
LEFT JOIN users ack ON ack.id = s.acknowledged_by
WHERE s.care_user_id = 2
ORDER BY s.triggered_at DESC;

-- =========================
-- GROUPING and COUNTING (dashboard overview)
-- =========================

-- 7) Count linked active users for a caregiver
SELECT COUNT(*) AS linked_user_count
FROM caregiver_links
WHERE caregiver_id = 1 AND link_status = 'active';

-- 8) Active routines per care user
SELECT care_user_id, COUNT(*) AS active_routine_count
FROM routines
WHERE is_active = 1
GROUP BY care_user_id
ORDER BY active_routine_count DESC;

-- 9) Medicine log status summary for a care user
SELECT status, COUNT(*) AS total
FROM medicine_logs
WHERE care_user_id = 2
GROUP BY status
ORDER BY total DESC;

-- 10) Recent activity count by event type (last 30 days)
SELECT event_type, COUNT(*) AS event_count
FROM activity_logs
WHERE care_user_id = 2 AND created_at >= (NOW() - INTERVAL 30 DAY)
GROUP BY event_type
ORDER BY event_count DESC;

-- =========================
-- INSERT examples (parameterized in app; literals shown for demo)
-- =========================

-- 11) Insert a new favourite phrase (demo)
INSERT INTO favourite_phrases (care_user_id, selected_item_keys, phrase_en, phrase_bn, phrase_label, is_active)
VALUES (2, JSON_ARRAY('HELP'), 'I need help.', 'আমার সাহায্য দরকার।', 'Demo: Need help', 1);

-- 12) Insert a routine completion (online)
INSERT INTO routine_completions (routine_id, routine_step_id, care_user_id, completion_status, completed_at, synced_at, source, client_event_id)
VALUES (1, 2, 2, 'completed', NOW(), NOW(), 'online', UUID());

-- 13) Insert an SOS alert (created/pending, no location) - honest status
INSERT INTO sos_alerts (care_user_id, emergency_contact_id, latitude, longitude, location_status, alert_status, delivery_status, delivery_channel, delivery_message, client_event_id)
VALUES (2, 1, NULL, NULL, 'denied', 'created', 'pending', 'dashboard', 'Demo: location permission denied; dashboard alert created.', UUID());

-- =========================
-- UPDATE examples
-- =========================

-- 14) Update user accessibility preferences
UPDATE user_preferences
SET language = 'bn', text_size = 'xlarge', speech_rate = 0.85, reduced_motion = 1, updated_at = CURRENT_TIMESTAMP
WHERE user_id = 2;

-- 15) Mark medicine log as taken
UPDATE medicine_logs
SET status = 'taken', responded_at = NOW(), updated_at = CURRENT_TIMESTAMP
WHERE id = 1 AND care_user_id = 2;

-- 16) Acknowledge SOS alert (records who and when)
UPDATE sos_alerts
SET alert_status = 'acknowledged', acknowledged_at = NOW(), acknowledged_by = 1, updated_at = CURRENT_TIMESTAMP
WHERE id = 1;

-- 17) Update delivery status honestly after notification attempt
UPDATE sos_alerts
SET delivery_status = 'failed', alert_status = 'failed', failure_reason = 'Demo: notification channel unavailable', updated_at = CURRENT_TIMESTAMP
WHERE id = 1;

-- =========================
-- DELETE examples (use carefully; respect FK behavior)
-- =========================

-- 18) Soft-deactivate a favourite phrase (preferred over hard delete)
UPDATE favourite_phrases SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = 1 AND care_user_id = 2;

-- 19) Delete a specific routine step (cascade implications understood)
DELETE FROM routine_steps WHERE id = 5 AND routine_id = 1;

-- 20) Delete an inactive device token
DELETE FROM device_tokens WHERE id = 999 AND is_active = 0;

-- Note: Do not run destructive deletes on real data without authorization and backups.
-- End of sample queries
