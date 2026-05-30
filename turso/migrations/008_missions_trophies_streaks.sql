-- Migration 008: Weekly Missions, Vault Trophies, Streaks + XP

-- ── XP on users table ────────────────────────────────────────────────────────
ALTER TABLE users ADD COLUMN total_xp INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN level INTEGER NOT NULL DEFAULT 1;

-- ── Streak tracking ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS streaks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_checkin_date TEXT,            -- 'YYYY-MM-DD'
  freeze_tokens INTEGER NOT NULL DEFAULT 0,
  total_checkins INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ── Mission progress (definitions live in code) ──────────────────────────────
CREATE TABLE IF NOT EXISTS user_missions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  mission_id TEXT NOT NULL,          -- matches definition key in lib/missions.ts
  period TEXT NOT NULL,              -- 'YYYY-WNN' for weekly, 'YYYY-MM' for monthly
  progress INTEGER NOT NULL DEFAULT 0,
  completed INTEGER NOT NULL DEFAULT 0,
  completed_at TEXT,
  xp_awarded INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (user_id, mission_id, period),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_user_missions_user ON user_missions(user_id, period);

-- ── Earned trophies (definitions live in code) ───────────────────────────────
CREATE TABLE IF NOT EXISTS user_trophies (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  trophy_id TEXT NOT NULL,
  earned_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (user_id, trophy_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_user_trophies_user ON user_trophies(user_id);

-- ── XP event log ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS xp_events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  amount INTEGER NOT NULL,
  reason TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
