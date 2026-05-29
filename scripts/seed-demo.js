/**
 * scripts/seed-demo.js
 *
 * Seed a realistic 12-month UK household demo dataset.
 *
 * Profile: The Johnson family — 2 adults, 2 kids (ages 5 & 8)
 *   London suburb homeowner, primary earner is a software developer.
 *
 * Accounts created:
 *   1. Lloyds Bank Current Account (primary)   → Asset / Bank Account
 *   2. Barclays Bank Current Account (bills)   → Asset / Bank Account
 *   3. Nationwide Savings Account              → Asset / Savings
 *   4. Nationwide Cash ISA                     → Asset / Savings
 *   5. MBNA Credit Card                        → Liability / Credit Card
 *   6. Barclaycard Credit Card                 → Liability / Credit Card
 *
 * Usage:
 *   cd /Users/sunillodha/Downloads/vaultly
 *   node scripts/seed-demo.js [household-id]
 *
 *   Defaults to sunilmlodha@gmail.com's household.
 *   Pass --reset to wipe existing demo data first.
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createClient } = require('@libsql/client')
const { randomUUID } = require('crypto')
const fs = require('fs')
const path = require('path')

// ─── Load env ────────────────────────────────────────────────────────────────
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local')
  if (!fs.existsSync(envPath)) throw new Error('.env.local not found')
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const m = line.match(/^([A-Z_]+)=(.+)$/)
    if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  })
}
loadEnv()

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
})

// ─── Args ─────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2)
const RESET = args.includes('--reset')
const HOUSEHOLD_ID = args.find(a => !a.startsWith('--')) ?? 'af18d0bf-ae2e-4d31-9329-a18180267f4d'
const USER_ID = 'user-demo-johnson'

// ─── Date helpers ─────────────────────────────────────────────────────────────
const TODAY = new Date('2026-05-29')

function isoDate(y, m, d) {
  return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`
}

/** Generate a list of months: [{ year, month }] for the past 12 months */
function last12Months() {
  const months = []
  for (let i = 11; i >= 0; i--) {
    const d = new Date(TODAY)
    d.setDate(1)
    d.setMonth(d.getMonth() - i)
    months.push({ year: d.getFullYear(), month: d.getMonth() + 1 })
  }
  return months
}

/** Jitter an amount by ±variance% */
function jitter(base, variancePct = 0.08) {
  const delta = base * variancePct * (Math.random() * 2 - 1)
  return Math.round((base + delta) * 100) / 100
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate()
}

// ─── Categorise (inline — mirrors lib/categorize.ts) ─────────────────────────
function categorize(description, merchant) {
  const raw = `${merchant ?? ''} ${description}`.toLowerCase()
  if (/salary|wages|bacs credit|employer payment|pay credit/.test(raw)) return 'income'
  if (/savings transfer|to isa|isa deposit|transfer to sav/.test(raw)) return 'savings_transfer'
  if (/credit card payment|barclaycard payment|mbna payment/.test(raw)) return 'financial'
  if (/mortgage/.test(raw)) return 'housing'
  if (/council tax|london borough/.test(raw)) return 'council_tax'
  if (/british gas|edf energy|octopus|thames water|ovo energy/.test(raw)) return 'utilities'
  if (/bt broadband|virgin media|vodafone|o2 uk|giffgaff/.test(raw)) return 'broadband_phone'
  if (/tesco|sainsbury|asda|morrisons|waitrose|lidl|aldi|ocado/.test(raw)) return 'groceries'
  if (/childcare|nursery|bright horizons/.test(raw)) return 'childcare'
  if (/swim|football club|scouts|brownies|smyths|school trip/.test(raw)) return 'kids_activities'
  if (/shell fuel|\bbp\b|esso|tfl|oyster|national rail|uber(?! eats)|parking|kwik fit/.test(raw)) return 'transport'
  if (/aviva|direct line|zurich|legal general|l&g|car insurance|life insurance|home insurance/.test(raw)) return 'insurance'
  if (/netflix|spotify|amazon prime|disney|apple music|now tv/.test(raw)) return 'subscriptions'
  if (/mcdonald|costa|starbucks|deliveroo|just eat|uber eats|restaurant|nandos|wagamama/.test(raw)) return 'dining_out'
  if (/amazon|argos|john lewis|next|zara|h&m|primark|boots|ikea|b&q|dunelm|currys/.test(raw)) return 'shopping'
  if (/cinema|odeon|vue|puregym|theatre|ticketmaster|steam games|playstation/.test(raw)) return 'entertainment'
  if (/nhs|dentist|pharmacy|optician|specsavers|physio/.test(raw)) return 'healthcare'
  if (/holiday|airbnb|booking\.com|easyjet|ryanair|heathrow|travelodge|premier inn/.test(raw)) return 'travel'
  return 'other'
}

// ─── IDs ──────────────────────────────────────────────────────────────────────
const CONN_ID = 'demo-conn-johnson-001'

const ACCOUNTS = {
  lloyds: { id: 'demo-acc-lloyds-current', name: 'Lloyds Current Account', type: 'TRANSACTION', bank: 'Lloyds Bank', side: 'asset', category: 'bank_account', balance: 2847.53 },
  barclays: { id: 'demo-acc-barclays-current', name: 'Barclays Current Account', type: 'TRANSACTION', bank: 'Barclays Bank', side: 'asset', category: 'bank_account', balance: 634.21 },
  nationwide_sav: { id: 'demo-acc-nationwide-savings', name: 'Nationwide Instant Saver', type: 'SAVINGS', bank: 'Nationwide BS', side: 'asset', category: 'savings', balance: 18750.00 },
  nationwide_isa: { id: 'demo-acc-nationwide-isa', name: 'Nationwide Cash ISA', type: 'SAVINGS', bank: 'Nationwide BS', side: 'asset', category: 'savings', balance: 32400.00 },
  mbna: { id: 'demo-acc-mbna-cc', name: 'MBNA Credit Card', type: 'CREDIT_CARD', bank: 'MBNA Ltd', side: 'liability', category: 'credit_card', balance: 1847.62 },
  barclaycard: { id: 'demo-acc-barclaycard-cc', name: 'Barclaycard Rewards', type: 'CREDIT_CARD', bank: 'Barclaycard', side: 'liability', category: 'credit_card', balance: 2134.85 },
}

// ─── Transaction generators ────────────────────────────────────────────────────

function monthlyTransactions(year, month) {
  const txs = []
  const days = daysInMonth(year, month)
  const isWinter = (month >= 11 || month <= 2)
  const isSummer = (month >= 6 && month <= 8)

  function tx(accId, desc, merchant, amount, day) {
    return {
      id: randomUUID(),
      connection_id: CONN_ID,
      household_id: HOUSEHOLD_ID,
      account_id: accId,
      external_tx_id: `${accId}-${year}-${month}-${desc.replace(/\s+/g,'-').slice(0,20)}-${day}`,
      merchant_name: merchant,
      description: desc,
      amount,
      currency: 'GBP',
      date: isoDate(year, month, Math.min(day, days)),
      category: categorize(desc, merchant),
    }
  }

  const A = ACCOUNTS

  // ═══════════════════════════════════════════════════════════════
  // LLOYDS CURRENT ACCOUNT (primary)
  // ═══════════════════════════════════════════════════════════════

  // Salary — 25th
  txs.push(tx(A.lloyds.id, 'EMPLOYER PAYMENT SALARY', 'Accenture Ltd', 4250.00, 25))

  // Mortgage DD — 1st
  txs.push(tx(A.lloyds.id, 'NATIONWIDE MORTGAGE DD', 'Nationwide BS', -1350.00, 1))

  // Nursery/childcare — 1st
  txs.push(tx(A.lloyds.id, 'BRIGHT HORIZONS NURSERY DD', 'Bright Horizons', -345.00, 1))

  // Transfer to savings — 5th
  txs.push(tx(A.lloyds.id, 'SAVINGS TRANSFER NATIONWIDE', null, -500.00, 5))

  // Transfer to ISA — 6th
  txs.push(tx(A.lloyds.id, 'ISA DEPOSIT NATIONWIDE', null, -200.00, 6))

  // MBNA credit card payment — 15th
  txs.push(tx(A.lloyds.id, 'MBNA CREDIT CARD PAYMENT', 'MBNA Ltd', -850.00, 15))

  // Tesco grocery shops (3× per month)
  ;[6, 13, 20].forEach(d => {
    txs.push(tx(A.lloyds.id, `TESCO STORES ${year}-${month}`, 'Tesco', -jitter(74, 0.15), d))
  })
  // Extra small Tesco top-up
  txs.push(tx(A.lloyds.id, 'TESCO EXPRESS SHOREDITCH', 'Tesco Express', -jitter(18, 0.2), randInt(2, 28)))

  // Sainsbury's shop (1× per month)
  txs.push(tx(A.lloyds.id, "SAINSBURY'S SUPERSTORE", "Sainsbury's", -jitter(88, 0.12), randInt(8, 22)))

  // Waitrose (1× per month — online)
  txs.push(tx(A.lloyds.id, 'WAITROSE & PARTNERS', 'Waitrose', -jitter(62, 0.15), randInt(10, 25)))

  // BP/Shell fuel (2× per month)
  txs.push(tx(A.lloyds.id, 'BP CONNECT LONDON', 'BP', -jitter(68, 0.1), randInt(5, 12)))
  txs.push(tx(A.lloyds.id, 'SHELL STATION CROYDON', 'Shell', -jitter(65, 0.1), randInt(18, 26)))

  // TfL Oyster top-up (2× per month)
  txs.push(tx(A.lloyds.id, 'TFL CONTACTLESS TUBE', 'TfL', -jitter(34, 0.1), randInt(3, 10)))
  txs.push(tx(A.lloyds.id, 'TFL CONTACTLESS TUBE', 'TfL', -jitter(34, 0.1), randInt(15, 22)))

  // National Rail commute (varies)
  txs.push(tx(A.lloyds.id, 'NATIONAL RAIL TICKET', 'National Rail', -jitter(28, 0.2), randInt(7, 14)))

  // School uniform/supplies (Aug-Sep)
  if (month === 8) {
    txs.push(tx(A.lloyds.id, 'NEXT BACK TO SCHOOL', 'Next', -jitter(95, 0.1), randInt(10, 20)))
    txs.push(tx(A.lloyds.id, 'M&S SCHOOL UNIFORM', 'Marks & Spencer', -jitter(72, 0.1), randInt(15, 25)))
  }

  // ═══════════════════════════════════════════════════════════════
  // BARCLAYS CURRENT ACCOUNT (bills / secondary)
  // ═══════════════════════════════════════════════════════════════

  // Gas — seasonally variable
  const gasAmt = isWinter ? jitter(132, 0.08) : jitter(68, 0.1)
  txs.push(tx(A.barclays.id, 'BRITISH GAS DD', 'British Gas', -gasAmt, 3))

  // Electricity — seasonally variable
  const elecAmt = isWinter ? jitter(92, 0.08) : jitter(54, 0.1)
  txs.push(tx(A.barclays.id, 'EDF ENERGY DD', 'EDF Energy', -elecAmt, 3))

  // Water
  txs.push(tx(A.barclays.id, 'THAMES WATER DD', 'Thames Water', -48.00, 15))

  // Broadband
  txs.push(tx(A.barclays.id, 'BT BROADBAND DD', 'BT Group', -52.00, 20))

  // Mobile phone
  txs.push(tx(A.barclays.id, 'O2 UK DD', 'O2 UK', -35.00, 22))

  // Council Tax — April to January (10 months, Feb-Mar free)
  if (!(month === 2 || month === 3)) {
    txs.push(tx(A.barclays.id, 'LONDON BOROUGH COUNCIL TAX DD', 'Southwark Council', -188.00, 1))
  }

  // Car insurance — monthly DD
  txs.push(tx(A.barclays.id, 'AVIVA CAR INSURANCE DD', 'Aviva', -89.00, 1))

  // Life insurance
  txs.push(tx(A.barclays.id, 'LEGAL & GENERAL LIFE DD', 'Legal & General', -45.00, 1))

  // Home insurance
  txs.push(tx(A.barclays.id, 'ZURICH HOME INSURANCE DD', 'Zurich', -32.00, 1))

  // Kids swimming lessons — 2nd Saturday-ish
  txs.push(tx(A.barclays.id, 'SWIM ENGLAND WATFORD POOL', 'Swim England', -34.00, 10))

  // Kids football club
  txs.push(tx(A.barclays.id, 'WHITFIELD FC JUNIOR ACADEMY', 'Whitfield FC', -28.00, 10))

  // Streaming subscriptions
  txs.push(tx(A.barclays.id, 'NETFLIX DD', 'Netflix', -17.99, 12))
  txs.push(tx(A.barclays.id, 'SPOTIFY DD', 'Spotify', -9.99, 15))
  txs.push(tx(A.barclays.id, 'AMAZON PRIME DD', 'Amazon Prime', -8.99, 20))
  txs.push(tx(A.barclays.id, 'DISNEY+ MONTHLY', 'Disney+', -4.99, 22))

  // Barclaycard payment — 15th
  txs.push(tx(A.barclays.id, 'BARCLAYCARD PAYMENT', 'Barclaycard', -650.00, 15))

  // School breakfast club (term time = Sep-Dec, Jan-Apr, May)
  if (!(month === 7 || month === 8)) {
    txs.push(tx(A.barclays.id, 'PARKSIDE PRIMARY BREAKFAST CLUB', null, -jitter(48, 0.1), 1))
  }

  // ═══════════════════════════════════════════════════════════════
  // NATIONWIDE SAVINGS ACCOUNT
  // ═══════════════════════════════════════════════════════════════

  // Monthly transfer in
  txs.push(tx(A.nationwide_sav.id, 'TRANSFER FROM LLOYDS SAVINGS', null, 500.00, 6))

  // Quarterly interest (Sep, Dec, Mar, Jun)
  if ([9, 12, 3, 6].includes(month)) {
    txs.push(tx(A.nationwide_sav.id, 'NATIONWIDE INTEREST CREDIT', 'Nationwide BS', jitter(52, 0.05), daysInMonth(year, month)))
  }

  // ═══════════════════════════════════════════════════════════════
  // NATIONWIDE CASH ISA
  // ═══════════════════════════════════════════════════════════════

  // Monthly ISA contribution
  txs.push(tx(A.nationwide_isa.id, 'ISA TRANSFER IN', null, 200.00, 6))

  // Annual ISA interest (April)
  if (month === 4) {
    txs.push(tx(A.nationwide_isa.id, 'NATIONWIDE ISA INTEREST PAYMENT', 'Nationwide BS', 648.00, daysInMonth(year, month)))
  }

  // ═══════════════════════════════════════════════════════════════
  // MBNA CREDIT CARD (Amazon, general shopping, extras)
  // ═══════════════════════════════════════════════════════════════

  // Amazon orders (2-3× per month)
  txs.push(tx(A.mbna.id, 'AMAZON MARKETPLACE', 'Amazon', -jitter(48, 0.3), randInt(3, 10)))
  txs.push(tx(A.mbna.id, 'AMAZON MARKETPLACE', 'Amazon', -jitter(31, 0.3), randInt(12, 20)))
  if (Math.random() > 0.4) {
    txs.push(tx(A.mbna.id, 'AMAZON MARKETPLACE', 'Amazon', -jitter(26, 0.3), randInt(22, 28)))
  }

  // Argos
  if (Math.random() > 0.6) {
    txs.push(tx(A.mbna.id, 'ARGOS STORES', 'Argos', -jitter(55, 0.25), randInt(5, 25)))
  }

  // Boots pharmacy/toiletries
  txs.push(tx(A.mbna.id, 'BOOTS PHARMACY', 'Boots', -jitter(38, 0.2), randInt(8, 20)))

  // Petrol on motorway (monthly)
  txs.push(tx(A.mbna.id, 'MOTO SERVICES LEIGH DELAMERE', 'Moto', -jitter(72, 0.1), randInt(6, 24)))

  // NHS prescription (every 3 months)
  if ([6, 9, 12, 3].includes(month)) {
    txs.push(tx(A.mbna.id, 'NHS PRESCRIPTION CHARGE', 'NHS', -9.90, randInt(5, 20)))
  }

  // Dentist (twice a year — July and January)
  if (month === 7 || month === 1) {
    txs.push(tx(A.mbna.id, 'BUPA DENTAL CENTRE', 'BUPA', -65.00, randInt(5, 20)))
    txs.push(tx(A.mbna.id, 'BUPA DENTAL CENTRE CHILDS', 'BUPA', -32.00, randInt(5, 20)))
  }

  // Specsavers (annual — October)
  if (month === 10) {
    txs.push(tx(A.mbna.id, 'SPECSAVERS OPTICIANS', 'Specsavers', -195.00, randInt(10, 20)))
  }

  // Payment from Lloyds — shows as credit on CC
  txs.push(tx(A.mbna.id, 'PAYMENT FROM LLOYDS CURRENT', null, 850.00, 15))

  // ═══════════════════════════════════════════════════════════════
  // BARCLAYCARD CREDIT CARD (dining, clothing, entertainment, travel)
  // ═══════════════════════════════════════════════════════════════

  // Dining out (3-4× per month)
  const restaurants = [
    ['WAGAMAMA WATERLOO', 'Wagamama'], ["NANDO'S CLAPHAM", "Nando's"],
    ['PIZZA EXPRESS BRIXTON', 'Pizza Express'], ['THE PIG & WHISTLE PUB', null],
    ['DISHOOM KING CROSS', 'Dishoom'], ['HONEST BURGER SOUTH BANK', 'Honest Burgers'],
    ['ITSU SUSHI', 'Itsu'], ['YO! SUSHI VICTORIA', "YO! Sushi"],
  ]
  for (let i = 0; i < 3; i++) {
    const r = restaurants[randInt(0, restaurants.length - 1)]
    txs.push(tx(A.barclaycard.id, r[0], r[1], -jitter(62, 0.25), randInt(i * 9 + 1, i * 9 + 9)))
  }

  // Takeaway / deliveries (2× per month)
  const takeaways = [
    ['DELIVEROO ORDER', 'Deliveroo'], ['JUST EAT ORDER', 'Just Eat'],
    ['UBER EATS ORDER', 'Uber Eats'], ['DOMINOS PIZZA ONLINE', "Domino's"],
  ]
  for (let i = 0; i < 2; i++) {
    const t = takeaways[randInt(0, takeaways.length - 1)]
    txs.push(tx(A.barclaycard.id, t[0], t[1], -jitter(34, 0.2), randInt(i * 14 + 1, i * 14 + 14)))
  }

  // Coffee shops (4× per month)
  const coffees = [['COSTA COFFEE', 'Costa Coffee'], ['STARBUCKS', 'Starbucks'], ["PRET A MANGER", 'Pret A Manger']]
  for (let i = 0; i < 4; i++) {
    const c = coffees[randInt(0, coffees.length - 1)]
    txs.push(tx(A.barclaycard.id, c[0], c[1], -jitter(7.5, 0.15), randInt(i * 7 + 1, i * 7 + 7)))
  }

  // Clothing (M&S, Next, Zara — 1-2× per month)
  if (Math.random() > 0.3) {
    const clothingStores = [
      ['NEXT RETAIL CROYDON', 'Next'], ['ZARA OXFORD ST', 'Zara'],
      ['H&M STORES', 'H&M'], ['MARKS & SPENCER CLOTHING', 'Marks & Spencer'],
      ['PRIMARK STORES', 'Primark'],
    ]
    const cs = clothingStores[randInt(0, clothingStores.length - 1)]
    txs.push(tx(A.barclaycard.id, cs[0], cs[1], -jitter(78, 0.25), randInt(5, 25)))
  }

  // Entertainment (cinema 1-2× per month, gym quarterly)
  if (Math.random() > 0.5) {
    txs.push(tx(A.barclaycard.id, 'ODEON CINEMAS', 'Odeon', -jitter(42, 0.15), randInt(10, 20)))
  }

  // PureGym membership
  txs.push(tx(A.barclaycard.id, 'PUREGYM MONTHLY', 'PureGym', -22.99, 8))

  // Summer holiday (July-Aug only)
  if (month === 7) {
    txs.push(tx(A.barclaycard.id, 'EASYJET BOOKING', 'easyJet', -648.00, 5))
    txs.push(tx(A.barclaycard.id, 'BOOKING.COM HOTEL MALLORCA', 'Booking.com', -892.00, 5))
    txs.push(tx(A.barclaycard.id, 'CURRENCY EXCHANGE HEATHROW', null, -350.00, 18))
  }
  if (month === 8) {
    txs.push(tx(A.barclaycard.id, 'PREMIER INN EDINBURGH', 'Premier Inn', -189.00, randInt(5, 15)))
  }

  // Kids school trip (Oct and May)
  if (month === 10 || month === 5) {
    txs.push(tx(A.barclaycard.id, 'SCHOOL TRIP PAYMENT ONLINE', null, -jitter(68, 0.1), randInt(5, 15)))
  }

  // Christmas spending (November-December)
  if (month === 11) {
    txs.push(tx(A.barclaycard.id, 'SMYTHS TOYS SUPERSTORE', 'Smyths Toys', -jitter(145, 0.15), randInt(15, 25)))
    txs.push(tx(A.barclaycard.id, 'JOHN LEWIS DEPARTMENT STORE', 'John Lewis', -jitter(210, 0.15), randInt(20, 28)))
  }
  if (month === 12) {
    txs.push(tx(A.barclaycard.id, 'AMAZON MARKETPLACE XMAS', 'Amazon', -jitter(320, 0.2), randInt(5, 15)))
    txs.push(tx(A.barclaycard.id, 'M&S FOOD CHRISTMAS', 'Marks & Spencer', -jitter(185, 0.1), 23))
  }

  // Easter extras (April)
  if (month === 4) {
    txs.push(tx(A.barclaycard.id, 'CADBURY WORLD TICKETS', null, -jitter(88, 0.05), randInt(5, 15)))
  }

  // Payment from Barclays
  txs.push(tx(A.barclaycard.id, 'PAYMENT FROM BARCLAYS CURRENT', null, 650.00, 15))

  return txs
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🌱 Seeding demo household data...')
  console.log(`   Household: ${HOUSEHOLD_ID}`)

  // Run migration 003 first (idempotent)
  try {
    await client.execute('ALTER TABLE ob_transactions ADD COLUMN category TEXT')
    console.log('✓  Added category column')
  } catch {
    // Already exists — fine
  }
  try {
    await client.execute('CREATE INDEX IF NOT EXISTS idx_ob_transactions_category ON ob_transactions(household_id, category)')
  } catch { /* ignore */ }

  if (RESET) {
    console.log('🗑️  Resetting existing demo data...')
    await client.execute({ sql: 'DELETE FROM ob_transactions WHERE connection_id = ?', args: [CONN_ID] })
    await client.execute({ sql: 'DELETE FROM open_banking_accounts WHERE connection_id = ?', args: [CONN_ID] })
    await client.execute({ sql: 'DELETE FROM open_banking_connections WHERE id = ?', args: [CONN_ID] })
    // Remove linked assets/liabilities
    for (const acc of Object.values(ACCOUNTS)) {
      await client.execute({ sql: 'DELETE FROM assets WHERE ob_account_id = ?', args: [acc.id] })
      await client.execute({ sql: 'DELETE FROM liabilities WHERE ob_account_id = ?', args: [acc.id] })
    }
    console.log('   Done.')
  }

  const now = new Date().toISOString()
  const consentExpires = new Date('2027-05-29').toISOString()

  // ── 1. Create connection ──────────────────────────────────────────────────
  await client.execute({
    sql: `INSERT OR IGNORE INTO open_banking_connections
          (id, household_id, user_id, provider, bank_id, bank_name, access_token, refresh_token,
           token_expires_at, consent_expires_at, status, last_synced_at, created_at, updated_at)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    args: [
      CONN_ID, HOUSEHOLD_ID, USER_ID,
      'truelayer', 'mock-demo', 'Demo Household (UK Family)',
      'demo-access-token', 'demo-refresh-token',
      consentExpires, consentExpires,
      'active', now, now, now,
    ],
  })
  console.log('✓  Connection created')

  // ── 2. Create accounts + linked assets/liabilities ────────────────────────
  for (const [key, acc] of Object.entries(ACCOUNTS)) {
    await client.execute({
      sql: `INSERT OR IGNORE INTO open_banking_accounts
            (id, connection_id, household_id, external_account_id, account_type,
             account_name, currency, balance, last_synced_at, created_at)
            VALUES (?,?,?,?,?,?,?,?,?,?)`,
      args: [
        acc.id, CONN_ID, HOUSEHOLD_ID,
        `ext-${acc.id}`, acc.type,
        acc.name, 'GBP', acc.balance,
        now, now,
      ],
    })

    if (acc.side === 'asset') {
      const assetId = `demo-asset-${key}`
      await client.execute({
        sql: `INSERT OR IGNORE INTO assets
              (id, household_id, name, category, value, currency, notes, ob_account_id, created_at, updated_at)
              VALUES (?,?,?,?,?,?,?,?,?,?)`,
        args: [
          assetId, HOUSEHOLD_ID,
          acc.name, acc.category,
          acc.balance, 'GBP',
          `Live balance synced from ${acc.bank}`,
          acc.id, now, now,
        ],
      })
    } else {
      const liabId = `demo-liab-${key}`
      await client.execute({
        sql: `INSERT OR IGNORE INTO liabilities
              (id, household_id, name, category, balance, currency, interest_rate, notes, ob_account_id, created_at, updated_at)
              VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
        args: [
          liabId, HOUSEHOLD_ID,
          acc.name, acc.category,
          acc.balance, 'GBP',
          key === 'mbna' ? 22.9 : 19.9,
          `Live balance synced from ${acc.bank}`,
          acc.id, now, now,
        ],
      })
    }
  }
  console.log('✓  6 accounts + assets/liabilities created')

  // ── 3. Generate and insert transactions ───────────────────────────────────
  const months = last12Months()
  let totalTxs = 0

  for (const { year, month } of months) {
    const txs = monthlyTransactions(year, month)
    totalTxs += txs.length

    for (const tx of txs) {
      await client.execute({
        sql: `INSERT OR IGNORE INTO ob_transactions
              (id, connection_id, household_id, account_id, external_tx_id,
               merchant_name, description, amount, currency, date, category, created_at)
              VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
        args: [
          tx.id, tx.connection_id, tx.household_id, tx.account_id,
          tx.external_tx_id, tx.merchant_name, tx.description,
          tx.amount, tx.currency, tx.date, tx.category, now,
        ],
      })
    }

    process.stdout.write(`   ${year}-${String(month).padStart(2,'0')}: ${txs.length} transactions\n`)
  }

  console.log(`\n✅ Done! ${totalTxs} transactions inserted across 12 months.`)
  console.log('   Visit /spending to see the analytics dashboard.')
  process.exit(0)
}

main().catch(err => {
  console.error('❌ Seed failed:', err)
  process.exit(1)
})
