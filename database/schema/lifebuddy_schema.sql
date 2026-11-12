-- Life Buddy - MySQL schema (Phase 2 design)
-- Database: lifebuddy_db
-- Engine: InnoDB, Charset: utf8mb4
-- NOTE: Execution against a live MySQL server has NOT been verified in this environment (see docs/PROJECT_PROGRESS.md).
-- Run in MySQL Workbench or mysql CLI with appropriate privileges.

DROP DATABASE IF EXISTS lifebuddy_db;
CREATE DATABASE lifebuddy_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE lifebuddy_db;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ---------------------------------------------------------------------------
-- 1. users
-- Stores caregivers and assisted users in one table (differentiated by role).
-- Caregivers authenticate with email+password_hash. Users authenticate with pin_hash (simplified access).
-- ---------------------------------------------------------------------------
CREATE TABLE users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  role ENUM('caregiver','user') NOT NULL,
  email VARCHAR(255) NULL,
  password_hash VARCHAR(255) NULL,
  pin_hash VARCHAR(255) NULL,
  full_name VARCHAR(150) NOT NULL,
  display_name VARCHAR(100) NULL,
  status ENUM('active','inactive') NOT NULL DEFAULT 'active',
  preferred_language ENUM('en','bn') NOT NULL DEFAULT 'en',
  phone_number VARCHAR(30) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  KEY idx_users_role_status (role, status),
  KEY idx_users_created_at (created_at),
  CONSTRAINT chk_users_caregiver_auth CHECK (
    (role = 'caregiver' AND email IS NOT NULL AND password_hash IS NOT NULL)
    OR (role = 'user')
  ),
  CONSTRAINT chk_users_user_pin CHECK (
    (role = 'user' AND pin_hash IS NOT NULL)
    OR (role = 'caregiver')
  )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 2. caregiver_links
-- Explicit authorization boundary: caregivers may access only linked care users.
-- ---------------------------------------------------------------------------
CREATE TABLE caregiver_links (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  caregiver_id BIGINT UNSIGNED NOT NULL,
  care_user_id BIGINT UNSIGNED NOT NULL,
  relationship_type VARCHAR(50) NULL COMMENT 'e.g. parent, guardian, therapist, family',
  link_status ENUM('active','revoked','pending') NOT NULL DEFAULT 'active',
  linked_by BIGINT UNSIGNED NULL COMMENT 'caregiver/admin user id who created link',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_caregiver_care_user (caregiver_id, care_user_id),
  KEY idx_links_caregiver_status (caregiver_id, link_status),
  KEY idx_links_care_user_status (care_user_id, link_status),
  CONSTRAINT fk_links_caregiver FOREIGN KEY (caregiver_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_links_care_user FOREIGN KEY (care_user_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_links_linked_by FOREIGN KEY (linked_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT chk_links_not_self CHECK (caregiver_id <> care_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 3. user_preferences
-- Accessibility and app preferences per assisted user (one row per user).
-- ---------------------------------------------------------------------------
CREATE TABLE user_preferences (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  language ENUM('en','bn') NOT NULL DEFAULT 'en',
  text_size ENUM('small','medium','large','xlarge') NOT NULL DEFAULT 'large',
  contrast_mode ENUM('normal','high') NOT NULL DEFAULT 'high',
  speech_rate DECIMAL(3,2) NOT NULL DEFAULT 1.00 COMMENT 'e.g. 0.75 slow, 1.00 normal, 1.25 fast',
  voice_enabled TINYINT(1) NOT NULL DEFAULT 1,
  reduced_motion TINYINT(1) NOT NULL DEFAULT 0,
  notifications_enabled TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_preferences_user (user_id),
  CONSTRAINT fk_preferences_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT chk_speech_rate CHECK (speech_rate >= 0.50 AND speech_rate <= 2.00)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 4. routines
-- Daily routines assigned to a care user, managed by authorized caregiver.
-- ---------------------------------------------------------------------------
CREATE TABLE routines (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  care_user_id BIGINT UNSIGNED NOT NULL,
  created_by_caregiver_id BIGINT UNSIGNED NOT NULL,
  title_en VARCHAR(150) NOT NULL,
  title_bn VARCHAR(150) NULL,
  description_en TEXT NULL,
  description_bn TEXT NULL,
  icon_key VARCHAR(80) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_routines_care_user_active (care_user_id, is_active),
  KEY idx_routines_created_by (created_by_caregiver_id),
  CONSTRAINT fk_routines_care_user FOREIGN KEY (care_user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_routines_created_by FOREIGN KEY (created_by_caregiver_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 5. routine_steps
-- Ordered steps within a routine (caregiver can reorder by updating step_order).
-- ---------------------------------------------------------------------------
CREATE TABLE routine_steps (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  routine_id BIGINT UNSIGNED NOT NULL,
  step_order INT UNSIGNED NOT NULL,
  instruction_en VARCHAR(255) NOT NULL,
  instruction_bn VARCHAR(255) NULL,
  image_key VARCHAR(120) NULL COMMENT 'asset/cache key for illustration',
  audio_hint_key VARCHAR(120) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_routine_step_order (routine_id, step_order),
  KEY idx_steps_routine (routine_id),
  CONSTRAINT fk_steps_routine FOREIGN KEY (routine_id) REFERENCES routines(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 6. routine_completions
-- Records step/routine completion events. Supports offline sync via client_event_id (idempotency).
-- ---------------------------------------------------------------------------
CREATE TABLE routine_completions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  routine_id BIGINT UNSIGNED NOT NULL,
  routine_step_id BIGINT UNSIGNED NOT NULL,
  care_user_id BIGINT UNSIGNED NOT NULL,
  completion_status ENUM('completed','skipped','pending_sync') NOT NULL DEFAULT 'completed',
  completed_at DATETIME NOT NULL COMMENT 'event time on device or server',
  synced_at DATETIME NULL COMMENT 'when server received/synced (null if pending)',
  source ENUM('online','offline_sync') NOT NULL DEFAULT 'online',
  client_event_id VARCHAR(64) NULL COMMENT 'UUID from client for offline idempotent sync',
  notes VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_completion_client_event (client_event_id),
  KEY idx_completion_care_user_time (care_user_id, completed_at),
  KEY idx_completion_routine_time (routine_id, completed_at),
  KEY idx_completion_status (completion_status),
  CONSTRAINT fk_completion_routine FOREIGN KEY (routine_id) REFERENCES routines(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_completion_step FOREIGN KEY (routine_step_id) REFERENCES routine_steps(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_completion_care_user FOREIGN KEY (care_user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 7. medicines
-- Medicine records entered by caregiver (reminder/assistance only, not medical advice).
-- ---------------------------------------------------------------------------
CREATE TABLE medicines (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  care_user_id BIGINT UNSIGNED NOT NULL,
  created_by_caregiver_id BIGINT UNSIGNED NOT NULL,
  medicine_name VARCHAR(150) NOT NULL,
  prescribed_instructions TEXT NULL COMMENT 'caregiver-entered only',
  notes TEXT NULL,
  start_date DATE NULL,
  end_date DATE NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_medicines_care_user_active (care_user_id, is_active),
  KEY idx_medicines_dates (start_date, end_date),
  CONSTRAINT fk_medicines_care_user FOREIGN KEY (care_user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_medicines_created_by FOREIGN KEY (created_by_caregiver_id) REFERENCES users(id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT chk_medicine_dates CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 8. medicine_reminders
-- Schedule definitions for a medicine.
-- ---------------------------------------------------------------------------
CREATE TABLE medicine_reminders (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  medicine_id BIGINT UNSIGNED NOT NULL,
  reminder_time TIME NOT NULL,
  frequency ENUM('once','daily','weekly','custom') NOT NULL DEFAULT 'daily',
  days_of_week VARCHAR(20) NULL COMMENT 'CSV: MON,TUE,WED,THU,FRI,SAT,SUN for weekly/custom',
  reminder_label VARCHAR(100) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_reminders_medicine_active (medicine_id, is_active),
  KEY idx_reminders_time (reminder_time),
  CONSTRAINT fk_reminders_medicine FOREIGN KEY (medicine_id) REFERENCES medicines(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 9. medicine_logs
-- Taken/skipped/missed history for reminders.
-- ---------------------------------------------------------------------------
CREATE TABLE medicine_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  medicine_id BIGINT UNSIGNED NOT NULL,
  reminder_id BIGINT UNSIGNED NULL,
  care_user_id BIGINT UNSIGNED NOT NULL,
  scheduled_for DATETIME NOT NULL,
  status ENUM('taken','skipped','missed','pending') NOT NULL DEFAULT 'pending',
  responded_at DATETIME NULL,
  notes VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_medlogs_care_user_time (care_user_id, scheduled_for),
  KEY idx_medlogs_medicine_time (medicine_id, scheduled_for),
  KEY idx_medlogs_status (status),
  CONSTRAINT fk_medlogs_medicine FOREIGN KEY (medicine_id) REFERENCES medicines(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_medlogs_reminder FOREIGN KEY (reminder_id) REFERENCES medicine_reminders(id) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_medlogs_care_user FOREIGN KEY (care_user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 10. emergency_contacts
-- Caregiver-managed emergency contacts per care user.
-- ---------------------------------------------------------------------------
CREATE TABLE emergency_contacts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  care_user_id BIGINT UNSIGNED NOT NULL,
  contact_name VARCHAR(150) NOT NULL,
  relationship_label VARCHAR(80) NULL,
  phone_number VARCHAR(30) NOT NULL,
  email VARCHAR(255) NULL,
  is_primary TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_contacts_care_user (care_user_id),
  KEY idx_contacts_primary (care_user_id, is_primary),
  CONSTRAINT fk_contacts_care_user FOREIGN KEY (care_user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 11. sos_alerts
-- SOS events with honest alert/delivery/acknowledgement status tracking.
-- ---------------------------------------------------------------------------
CREATE TABLE sos_alerts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  care_user_id BIGINT UNSIGNED NOT NULL,
  emergency_contact_id BIGINT UNSIGNED NULL COMMENT 'contact shown/targeted at time of alert',
  latitude DECIMAL(10,7) NULL,
  longitude DECIMAL(10,7) NULL,
  location_status ENUM('available','unavailable','denied','disabled') NOT NULL DEFAULT 'unavailable',
  alert_status ENUM('created','pending','sent','failed','acknowledged','cancelled') NOT NULL DEFAULT 'created',
  delivery_status ENUM('not_applicable','pending','sent','failed','confirmed') NOT NULL DEFAULT 'pending',
  delivery_channel VARCHAR(30) NOT NULL DEFAULT 'dashboard' COMMENT 'dashboard,expo_push,sms,email',
  delivery_message VARCHAR(255) NULL,
  failure_reason VARCHAR(255) NULL,
  triggered_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  acknowledged_at DATETIME NULL,
  acknowledged_by BIGINT UNSIGNED NULL,
  client_event_id VARCHAR(64) NULL COMMENT 'idempotency/dedupe key from client',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_sos_client_event (client_event_id),
  KEY idx_sos_care_user_time (care_user_id, triggered_at),
  KEY idx_sos_alert_status (alert_status),
  KEY idx_sos_delivery_status (delivery_status),
  CONSTRAINT fk_sos_care_user FOREIGN KEY (care_user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_sos_contact FOREIGN KEY (emergency_contact_id) REFERENCES emergency_contacts(id) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_sos_ack_by FOREIGN KEY (acknowledged_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 12. communication_items
-- Picture/word tiles used for deterministic sentence generation (bilingual).
-- ---------------------------------------------------------------------------
CREATE TABLE communication_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  item_key VARCHAR(60) NOT NULL COMMENT 'stable key e.g. FOOD, WATER',
  category VARCHAR(50) NOT NULL DEFAULT 'general',
  label_en VARCHAR(100) NOT NULL,
  label_bn VARCHAR(100) NULL,
  icon_key VARCHAR(120) NULL,
  speak_text_en VARCHAR(255) NOT NULL,
  speak_text_bn VARCHAR(255) NULL,
  sentence_role ENUM('subject','object','need','feeling','action','modifier','yesno','other') NOT NULL DEFAULT 'other',
  sort_order INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_comm_item_key (item_key),
  KEY idx_comm_category_active (category, is_active),
  KEY idx_comm_sort (sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 13. favourite_phrases
-- Saved communication phrases per care user.
-- ---------------------------------------------------------------------------
CREATE TABLE favourite_phrases (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  care_user_id BIGINT UNSIGNED NOT NULL,
  communication_item_id BIGINT UNSIGNED NULL COMMENT 'optional single-item reference',
  selected_item_keys JSON NULL COMMENT 'ordered keys used to build phrase',
  phrase_en TEXT NOT NULL,
  phrase_bn TEXT NULL,
  phrase_label VARCHAR(120) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_fav_care_user_active (care_user_id, is_active),
  CONSTRAINT fk_fav_care_user FOREIGN KEY (care_user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_fav_comm_item FOREIGN KEY (communication_item_id) REFERENCES communication_items(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 14. situation_steps
-- Predefined (global) or custom (care-user specific) step-by-step situation guides.
-- ---------------------------------------------------------------------------
CREATE TABLE situation_steps (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  care_user_id BIGINT UNSIGNED NULL COMMENT 'NULL = predefined/global; set for custom per-user situation',
  situation_key VARCHAR(80) NOT NULL COMMENT 'e.g. WASHING_HANDS, FEELING_LOST',
  title_en VARCHAR(150) NOT NULL,
  title_bn VARCHAR(150) NULL,
  step_order INT UNSIGNED NOT NULL,
  instruction_en TEXT NOT NULL,
  instruction_bn TEXT NULL,
  image_key VARCHAR(120) NULL,
  is_predefined TINYINT(1) NOT NULL DEFAULT 1,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_situation_step (situation_key, care_user_id, step_order),
  KEY idx_situation_key_active (situation_key, is_active),
  KEY idx_situation_user (care_user_id),
  CONSTRAINT fk_situation_care_user FOREIGN KEY (care_user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 15. device_tokens (optional, for Expo Push integration when configured)
-- ---------------------------------------------------------------------------
CREATE TABLE device_tokens (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  platform ENUM('android','ios','web') NOT NULL DEFAULT 'android',
  expo_push_token VARCHAR(255) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  last_seen_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_device_token (expo_push_token),
  KEY idx_device_user_active (user_id, is_active),
  CONSTRAINT fk_device_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 16. activity_logs (useful for dashboard history/audit)
-- ---------------------------------------------------------------------------
CREATE TABLE activity_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  actor_user_id BIGINT UNSIGNED NULL COMMENT 'who performed action (caregiver/user/system-null)',
  care_user_id BIGINT UNSIGNED NULL COMMENT 'related assisted user',
  event_type VARCHAR(80) NOT NULL COMMENT 'e.g. ROUTINE_COMPLETED, MEDICINE_TAKEN, SOS_CREATED',
  entity_type VARCHAR(50) NULL COMMENT 'e.g. routine, medicine, sos_alert',
  entity_id BIGINT UNSIGNED NULL,
  summary VARCHAR(255) NOT NULL,
  metadata_json JSON NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_activity_care_user_time (care_user_id, created_at),
  KEY idx_activity_event_time (event_type, created_at),
  KEY idx_activity_actor (actor_user_id),
  CONSTRAINT fk_activity_actor FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_activity_care_user FOREIGN KEY (care_user_id) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- End of schema
