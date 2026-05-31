-- Migration 010: Enterprise Financial Wellness Platform
-- Run: turso db shell vaultly < turso/migrations/010_enterprise_wellness.sql

-- ── Organisations (employers) ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS organisations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,          -- join URL: /join/[slug]
  logo_url TEXT,
  plan TEXT NOT NULL DEFAULT 'starter'
    CHECK (plan IN ('starter','growth','enterprise')),
  max_employees INTEGER NOT NULL DEFAULT 50,
  primary_colour TEXT DEFAULT '#6366f1',
  -- Pension settings
  pension_provider TEXT,
  pension_match_pct REAL,             -- employer match percentage
  pension_max_match_pct REAL,         -- cap on employer matching
  -- Benefits
  salary_sacrifice_enabled INTEGER NOT NULL DEFAULT 0,
  share_scheme_name TEXT,
  share_scheme_deadline TEXT,
  -- Billing
  billing_email TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── Organisation members ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS org_members (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'employee'
    CHECK (role IN ('owner','admin','hr','employee')),
  invited_by TEXT,
  joined_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (org_id, user_id),
  FOREIGN KEY (org_id) REFERENCES organisations(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_org_members_org ON org_members(org_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user ON org_members(user_id);

-- ── Invite tokens ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS org_invites (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  token TEXT UNIQUE NOT NULL,
  email TEXT,                          -- optional: pre-approved email
  role TEXT NOT NULL DEFAULT 'employee',
  used_by TEXT,
  used_at TEXT,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (org_id) REFERENCES organisations(id) ON DELETE CASCADE
);

-- ── Weekly wellness check-ins ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wellness_checkins (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  org_id TEXT,
  week TEXT NOT NULL,                  -- 'YYYY-WNN'
  stress_score INTEGER NOT NULL CHECK (stress_score BETWEEN 1 AND 5),
  checked_finances INTEGER NOT NULL DEFAULT 0,
  win TEXT,                            -- optional free text
  focus TEXT,                          -- optional free text
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (user_id, week),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_checkins_org ON wellness_checkins(org_id, week);
CREATE INDEX IF NOT EXISTS idx_checkins_user ON wellness_checkins(user_id);

-- ── Organisation benefits ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS org_benefits (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  details TEXT NOT NULL DEFAULT '{}',  -- JSON
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (org_id) REFERENCES organisations(id) ON DELETE CASCADE
);
