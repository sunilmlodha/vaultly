-- Migration 009: Referral / Monetisation Engine
-- Run: turso db shell vaultly < turso/migrations/009_referrals.sql

-- ── Partner definitions (seeded below) ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS referral_partners (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN (
    'investment','pension','mortgage','savings','insurance','crypto','other'
  )),
  logo_url TEXT,
  base_url TEXT NOT NULL,       -- partner's affiliate base URL
  utm_source TEXT DEFAULT 'vaultly',
  commission_gbp REAL,          -- estimated commission per conversion
  description TEXT,
  cta TEXT NOT NULL,            -- call to action button label
  risk_warning TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ── Nudges shown to users ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS referral_nudges (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  partner_id TEXT NOT NULL,
  trigger_key TEXT NOT NULL,    -- which rule fired
  trigger_data TEXT NOT NULL DEFAULT '{}',  -- JSON snapshot of the data
  shown_at TEXT,
  clicked_at TEXT,
  dismissed_at TEXT,
  converted_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (partner_id) REFERENCES referral_partners(id)
);

CREATE INDEX IF NOT EXISTS idx_nudges_user ON referral_nudges(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_nudges_trigger ON referral_nudges(trigger_key, created_at);

-- ── Seed partners ─────────────────────────────────────────────────────────────
INSERT OR IGNORE INTO referral_partners
  (id, name, category, base_url, commission_gbp, description, cta, risk_warning)
VALUES
  -- Investments
  ('hl', 'Hargreaves Lansdown', 'investment',
   'https://www.hl.co.uk/?utm_source=vaultly', 150,
   'The UK''s largest investment platform. ISAs, SIPPs, funds and shares.',
   'Open an HL account', 'Investments can fall as well as rise. You may get back less than you invest.'),

  ('vanguard', 'Vanguard', 'investment',
   'https://www.vanguardinvestor.co.uk/?utm_source=vaultly', 80,
   'Low-cost index funds and ETFs. Ideal for long-term wealth building.',
   'Start investing with Vanguard', 'The value of investments can go down as well as up.'),

  ('investengine', 'InvestEngine', 'investment',
   'https://investengine.com/?utm_source=vaultly', 60,
   '0% platform fee on DIY ETF portfolios. Commission-free investing.',
   'Invest commission-free', 'Investments can lose value. Capital at risk.'),

  ('nutmeg', 'Nutmeg', 'investment',
   'https://www.nutmeg.com/?utm_source=vaultly', 120,
   'Managed ISAs and pensions. Fully automated, built for you.',
   'Try Nutmeg', 'Your capital is at risk. Investments can fall as well as rise.'),

  -- Pensions
  ('pensionbee', 'PensionBee', 'pension',
   'https://www.pensionbee.com/?utm_source=vaultly', 200,
   'Combine all your old pensions into one easy plan. Takes 5 minutes.',
   'Consolidate my pensions', 'Pension values can go down. You may get back less than you put in.'),

  ('ajbell', 'AJ Bell', 'pension',
   'https://www.ajbell.co.uk/?utm_source=vaultly', 150,
   'Award-winning SIPP with low fees and wide fund choice.',
   'Open a SIPP', 'Investments can fall in value. You may get back less than invested.'),

  -- Mortgages
  ('habito', 'Habito', 'mortgage',
   'https://www.habito.com/?utm_source=vaultly', 400,
   'Free online mortgage broker. Compare thousands of deals in minutes.',
   'Compare mortgage deals', null),

  ('mojo', 'Mojo Mortgages', 'mortgage',
   'https://www.mojomortgages.com/?utm_source=vaultly', 350,
   'Award-winning mortgage broker. Find your best rate in minutes.',
   'Find my best rate', null),

  -- Savings
  ('marcus', 'Marcus by Goldman Sachs', 'savings',
   'https://www.marcus.co.uk/?utm_source=vaultly', 30,
   'Easy-access savings with a competitive interest rate. No fees.',
   'Open a Marcus account', null),

  ('chip', 'Chip', 'savings',
   'https://www.chipapp.co.uk/?utm_source=vaultly', 25,
   'Smart savings app. Automatically moves money to savings for you.',
   'Save smarter with Chip', null),

  -- Insurance
  ('comparemarket', 'Compare the Market', 'insurance',
   'https://www.comparethemarket.com/?utm_source=vaultly', 50,
   'Compare hundreds of insurance quotes in minutes.',
   'Compare insurance quotes', null),

  ('gocompare', 'GoCompare', 'insurance',
   'https://www.gocompare.com/?utm_source=vaultly', 40,
   'Compare car, home, and travel insurance from leading UK insurers.',
   'Get quotes', null);
