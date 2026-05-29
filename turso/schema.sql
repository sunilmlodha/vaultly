-- Vaultly — Turso (SQLite) Schema
-- Run this in your Turso database shell:
--   turso db shell vaultly < turso/schema.sql

CREATE TABLE IF NOT EXISTS users (
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

CREATE TABLE IF NOT EXISTS oauth_accounts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_account_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (provider, provider_account_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_oauth_accounts_user ON oauth_accounts(user_id);

CREATE TABLE IF NOT EXISTS households (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'GBP',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS household_members (
  id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL,
  user_id TEXT,
  role TEXT NOT NULL DEFAULT 'partner'
    CHECK (role IN ('owner','partner','child','parent','advisor')),
  invited_email TEXT,
  accepted INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS assets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  household_id TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other'
    CHECK (category IN ('bank_account','investment','pension','property','crypto','insurance','other')),
  value REAL NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'GBP',
  institution TEXT,
  account_number TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS liabilities (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  household_id TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other'
    CHECK (category IN ('mortgage','loan','credit_card','overdraft','other')),
  balance REAL NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'GBP',
  interest_rate REAL,
  monthly_payment REAL,
  institution TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS renewals (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  household_id TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'subscription',
  amount REAL NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'GBP',
  renewal_date TEXT NOT NULL,
  provider TEXT,
  auto_renews INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS goals (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  household_id TEXT NOT NULL,
  name TEXT NOT NULL,
  target_amount REAL NOT NULL DEFAULT 0,
  current_amount REAL NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'GBP',
  target_date TEXT,
  category TEXT NOT NULL DEFAULT 'savings',
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  household_id TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'other',
  blob_url TEXT NOT NULL,
  blob_pathname TEXT NOT NULL,
  file_size INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS employment_records (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  employer_name TEXT NOT NULL,
  employer_name_normalised TEXT,
  role TEXT,
  start_date TEXT NOT NULL,
  end_date TEXT,
  is_current INTEGER NOT NULL DEFAULT 0,
  pension_enrolled INTEGER,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS tracing_requests (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  employment_record_id TEXT,
  service_type TEXT NOT NULL
    CHECK (service_type IN ('pension_tracer','bank_tracer','ns_i','abi','hmrc')),
  employer_name TEXT,
  scheme_name TEXT,
  confidence_score REAL,
  status TEXT NOT NULL DEFAULT 'pending_intake',
  submitted_at TEXT,
  expected_response_by TEXT,
  response_received_at TEXT,
  idempotency_key TEXT UNIQUE NOT NULL,
  reference_number TEXT,
  generated_letter TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS agent_workflows (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  phase TEXT NOT NULL DEFAULT 'intake',
  messages TEXT NOT NULL DEFAULT '[]',
  probable_assets TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  event_type TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  data_ref TEXT,
  outcome TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_assets_household ON assets(household_id);
CREATE INDEX IF NOT EXISTS idx_liabilities_household ON liabilities(household_id);
CREATE INDEX IF NOT EXISTS idx_renewals_household ON renewals(household_id);
CREATE INDEX IF NOT EXISTS idx_goals_household ON goals(household_id);
CREATE INDEX IF NOT EXISTS idx_documents_household ON documents(household_id);
CREATE INDEX IF NOT EXISTS idx_agent_workflows_user ON agent_workflows(user_id);
CREATE INDEX IF NOT EXISTS idx_renewals_date ON renewals(renewal_date);
