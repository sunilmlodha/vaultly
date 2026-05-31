-- Migration 011: India Assets
-- Adds India-specific financial tracking tables for Tijori app
--
-- New asset categories added in this migration (handled in application code):
--   'ppf'       - Public Provident Fund
--   'epf'       - Employee Provident Fund
--   'nps'       - National Pension System
--   'elss'      - Equity Linked Savings Scheme
--   'fd'        - Fixed Deposit
--   'rd'        - Recurring Deposit
--   'sgb'       - Sovereign Gold Bond
--   'sukanya'   - Sukanya Samriddhi Yojana
--   'nsc'       - National Savings Certificate
--   'ulip'      - Unit Linked Insurance Plan
--
-- NOTE: SQLite does not support ALTER COLUMN or modifying CHECK constraints
-- on existing tables. The categories above are recognised by the application
-- layer and stored in the existing `assets.category` column as free-form TEXT.
-- No DDL change is required for the column itself.

-- ─────────────────────────────────────────────────────────────────────────────
-- Table: india_tax_records
-- Tracks annual income-tax deduction details per user per financial year.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS india_tax_records (
    id                    TEXT    PRIMARY KEY,
    user_id               TEXT    NOT NULL,
    financial_year        TEXT    NOT NULL,   -- e.g. '2024-25'
    gross_income          REAL    NOT NULL DEFAULT 0,
    section_80c_invested  REAL    NOT NULL DEFAULT 0,
    section_80c_limit     REAL    NOT NULL DEFAULT 150000,
    nps_80ccd             REAL    NOT NULL DEFAULT 0,
    hra_exemption         REAL    NOT NULL DEFAULT 0,
    home_loan_interest    REAL    NOT NULL DEFAULT 0,
    estimated_tax_saving  REAL    NOT NULL DEFAULT 0,
    created_at            TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at            TEXT    NOT NULL DEFAULT (datetime('now')),
    UNIQUE (user_id, financial_year),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_india_tax_records_user_id
    ON india_tax_records (user_id);

CREATE INDEX IF NOT EXISTS idx_india_tax_records_financial_year
    ON india_tax_records (financial_year);

-- ─────────────────────────────────────────────────────────────────────────────
-- Table: emi_records
-- Tracks loan EMIs associated with a household.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS emi_records (
    id                  TEXT    PRIMARY KEY,
    user_id             TEXT    NOT NULL,
    household_id        TEXT    NOT NULL,
    name                TEXT    NOT NULL,   -- e.g. 'Home Loan EMI', 'Car Loan'
    monthly_emi         REAL    NOT NULL,
    outstanding_balance REAL    NOT NULL DEFAULT 0,
    interest_rate       REAL,
    created_at          TEXT    NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id)     REFERENCES users(id)      ON DELETE CASCADE,
    FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_emi_records_user_id
    ON emi_records (user_id);

CREATE INDEX IF NOT EXISTS idx_emi_records_household_id
    ON emi_records (household_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Table: sip_records
-- Tracks Systematic Investment Plan (SIP) entries per household.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sip_records (
    id             TEXT    PRIMARY KEY,
    user_id        TEXT    NOT NULL,
    household_id   TEXT    NOT NULL,
    fund_name      TEXT    NOT NULL,
    monthly_amount REAL    NOT NULL,
    current_value  REAL    NOT NULL DEFAULT 0,
    units          REAL,
    folio_number   TEXT,
    amc            TEXT,               -- Asset Management Company
    category       TEXT    DEFAULT 'equity'
                           CHECK (category IN ('equity','debt','hybrid','elss','liquid','index')),
    started_date   TEXT,
    created_at     TEXT    NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id)     REFERENCES users(id)      ON DELETE CASCADE,
    FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sip_records_user_id
    ON sip_records (user_id);

CREATE INDEX IF NOT EXISTS idx_sip_records_household_id
    ON sip_records (household_id);

CREATE INDEX IF NOT EXISTS idx_sip_records_category
    ON sip_records (category);
