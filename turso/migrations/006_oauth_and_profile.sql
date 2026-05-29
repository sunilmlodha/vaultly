-- Migration 006: OAuth providers + extended user profile
-- Run with: turso db shell vaultly < turso/migrations/006_oauth_and_profile.sql

-- ─────────────────────────────────────────────────────────────
-- 1. Recreate users table with password_hash nullable
--    + new profile columns (phone, bio, date_of_birth, notification_prefs)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users_new (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,                          -- NULL for OAuth-only users
  full_name TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  phone TEXT,
  bio TEXT,
  date_of_birth TEXT,
  notification_prefs TEXT NOT NULL DEFAULT '{}',
  currency TEXT NOT NULL DEFAULT 'GBP',
  household_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO users_new
  (id, email, password_hash, full_name, avatar_url, currency, household_id, created_at, updated_at)
SELECT
  id, email, password_hash, full_name, avatar_url, currency, household_id, created_at, updated_at
FROM users;

DROP TABLE users;
ALTER TABLE users_new RENAME TO users;

-- ─────────────────────────────────────────────────────────────
-- 2. OAuth accounts — one row per (user × provider)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS oauth_accounts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL,               -- 'google' | 'microsoft-entra-id' | 'facebook' | 'github'
  provider_account_id TEXT NOT NULL,    -- provider's unique user id
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (provider, provider_account_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_oauth_accounts_user ON oauth_accounts(user_id);
