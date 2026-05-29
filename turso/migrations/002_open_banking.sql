-- Migration 002: Open Banking
-- Run once via: turso db shell vaultly < turso/migrations/002_open_banking.sql

-- 1. Extend existing tables
ALTER TABLE assets ADD COLUMN ob_account_id TEXT;
ALTER TABLE liabilities ADD COLUMN ob_account_id TEXT;

-- 2. Bank connections (one per bank per household)
CREATE TABLE IF NOT EXISTS open_banking_connections (
  id TEXT PRIMARY KEY,
  household_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'truelayer',
  bank_id TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  bank_logo_url TEXT,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expires_at TEXT NOT NULL,
  consent_expires_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  last_synced_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 3. Individual accounts within a connection
CREATE TABLE IF NOT EXISTS open_banking_accounts (
  id TEXT PRIMARY KEY,
  connection_id TEXT NOT NULL,
  household_id TEXT NOT NULL,
  external_account_id TEXT NOT NULL,
  account_type TEXT NOT NULL,
  account_name TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'GBP',
  balance REAL NOT NULL DEFAULT 0,
  linked_asset_id TEXT,
  linked_liability_id TEXT,
  last_synced_at TEXT,
  created_at TEXT NOT NULL
);

-- 4. Transaction store for recurring payment detection
CREATE TABLE IF NOT EXISTS ob_transactions (
  id TEXT PRIMARY KEY,
  connection_id TEXT NOT NULL,
  household_id TEXT NOT NULL,
  account_id TEXT NOT NULL,
  external_tx_id TEXT NOT NULL,
  merchant_name TEXT,
  description TEXT NOT NULL,
  amount REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'GBP',
  date TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_ob_connections_household ON open_banking_connections(household_id);
CREATE INDEX IF NOT EXISTS idx_ob_accounts_connection ON open_banking_accounts(connection_id);
CREATE INDEX IF NOT EXISTS idx_ob_accounts_household ON open_banking_accounts(household_id);
CREATE INDEX IF NOT EXISTS idx_ob_transactions_household ON ob_transactions(household_id);
CREATE INDEX IF NOT EXISTS idx_ob_transactions_date ON ob_transactions(date);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ob_transactions_unique ON ob_transactions(connection_id, external_tx_id);
