-- Migration 003: Add category column to ob_transactions
ALTER TABLE ob_transactions ADD COLUMN category TEXT;
CREATE INDEX IF NOT EXISTS idx_ob_transactions_category ON ob_transactions(household_id, category);
