-- Migration 004: Renewal Negotiation Agent
-- Adds negotiation_status to renewals + stores per-renewal chat history

ALTER TABLE renewals ADD COLUMN negotiation_status TEXT;

CREATE TABLE IF NOT EXISTS renewal_negotiations (
  id          TEXT PRIMARY KEY,
  renewal_id  TEXT NOT NULL,
  user_id     TEXT NOT NULL,
  household_id TEXT NOT NULL,
  messages    TEXT NOT NULL DEFAULT '[]',
  draft_letter TEXT,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL,
  FOREIGN KEY (renewal_id) REFERENCES renewals(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_renewal_negotiations_renewal ON renewal_negotiations(renewal_id);
CREATE INDEX IF NOT EXISTS idx_renewal_negotiations_user    ON renewal_negotiations(user_id);
