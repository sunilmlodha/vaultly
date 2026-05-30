-- Migration 007: Vault Score, AI Narratives, Notifications
-- Run with: turso db shell vaultly < turso/migrations/007_gamification.sql

-- ── Vault Score history ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vault_scores (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  score INTEGER NOT NULL,                     -- 0–850
  net_worth_momentum INTEGER NOT NULL DEFAULT 0,  -- component scores
  emergency_buffer    INTEGER NOT NULL DEFAULT 0,
  goal_velocity       INTEGER NOT NULL DEFAULT 0,
  debt_health         INTEGER NOT NULL DEFAULT 0,
  renewal_control     INTEGER NOT NULL DEFAULT 0,
  engagement          INTEGER NOT NULL DEFAULT 0,
  net_worth_snapshot  REAL NOT NULL DEFAULT 0,    -- net worth at time of calc
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_vault_scores_user ON vault_scores(user_id, created_at);

-- ── AI Wealth Narratives ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wealth_narratives (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  month TEXT NOT NULL,       -- 'YYYY-MM'
  content TEXT NOT NULL,
  headline TEXT NOT NULL DEFAULT '',
  score_at_time INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (user_id, month),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_narratives_user ON wealth_narratives(user_id, month);

-- ── In-app Notifications ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN (
    'vault_score','narrative','renewal','goal','milestone','system'
  )),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  action_url TEXT,
  read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read, created_at);

-- ── Web Push Subscriptions ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (user_id, endpoint),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
