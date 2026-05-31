-- Migration 012: Account Aggregator consent tracking
-- Run: turso db shell vaultly < turso/migrations/012_aa_consents.sql

CREATE TABLE IF NOT EXISTS aa_consents (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  consent_handle TEXT UNIQUE NOT NULL,
  consent_id TEXT,
  fi_types TEXT NOT NULL DEFAULT '[]',   -- JSON array
  status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING','READY','REJECTED','REVOKED','EXPIRED')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_aa_consents_user ON aa_consents(user_id);
CREATE INDEX IF NOT EXISTS idx_aa_consents_handle ON aa_consents(consent_handle);
