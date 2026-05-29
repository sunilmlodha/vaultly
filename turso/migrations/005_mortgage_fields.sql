-- Migration 005: Mortgage optimisation fields
-- Run once via: turso db shell vaultly < turso/migrations/005_mortgage_fields.sql

-- Add mortgage-specific columns to liabilities
ALTER TABLE liabilities ADD COLUMN property_value REAL;
ALTER TABLE liabilities ADD COLUMN original_loan_amount REAL;
ALTER TABLE liabilities ADD COLUMN fixed_rate_end_date TEXT;
ALTER TABLE liabilities ADD COLUMN mortgage_term_years INTEGER;

-- Index for remortgage window queries
CREATE INDEX IF NOT EXISTS idx_liabilities_fixed_rate_end ON liabilities(fixed_rate_end_date);
