/**
 * Transaction categorisation engine.
 *
 * Classifies a transaction into a SpendingCategory based on merchant name
 * and/or description string. Runs entirely at the application layer — no
 * ML, no external calls — so it works on both real TrueLayer data and
 * seeded mock transactions.
 */

export type SpendingCategory =
  | 'income'
  | 'housing'
  | 'council_tax'
  | 'utilities'
  | 'broadband_phone'
  | 'groceries'
  | 'childcare'
  | 'kids_activities'
  | 'transport'
  | 'insurance'
  | 'subscriptions'
  | 'shopping'
  | 'dining_out'
  | 'entertainment'
  | 'healthcare'
  | 'travel'
  | 'savings_transfer'
  | 'financial'
  | 'other'

export interface CategoryMeta {
  label: string
  icon: string
  color: string
  /** true = money going out (used for expense totalling) */
  isExpense: boolean
}

export const CATEGORY_META: Record<SpendingCategory, CategoryMeta> = {
  income:           { label: 'Income',            icon: '💰', color: '#22c55e', isExpense: false },
  housing:          { label: 'Housing',            icon: '🏠', color: '#6366f1', isExpense: true  },
  council_tax:      { label: 'Council Tax',        icon: '🏛️', color: '#8b5cf6', isExpense: true  },
  utilities:        { label: 'Utilities',          icon: '🔌', color: '#f59e0b', isExpense: true  },
  broadband_phone:  { label: 'Broadband & Phone',  icon: '📡', color: '#06b6d4', isExpense: true  },
  groceries:        { label: 'Groceries',          icon: '🛒', color: '#10b981', isExpense: true  },
  childcare:        { label: 'Childcare',          icon: '👶', color: '#f43f5e', isExpense: true  },
  kids_activities:  { label: 'Kids & Activities',  icon: '⚽', color: '#fb923c', isExpense: true  },
  transport:        { label: 'Transport',          icon: '🚗', color: '#a78bfa', isExpense: true  },
  insurance:        { label: 'Insurance',          icon: '🛡️', color: '#64748b', isExpense: true  },
  subscriptions:    { label: 'Subscriptions',      icon: '📺', color: '#ec4899', isExpense: true  },
  shopping:         { label: 'Shopping',           icon: '🛍️', color: '#f97316', isExpense: true  },
  dining_out:       { label: 'Dining Out',         icon: '🍽️', color: '#eab308', isExpense: true  },
  entertainment:    { label: 'Entertainment',      icon: '🎬', color: '#84cc16', isExpense: true  },
  healthcare:       { label: 'Healthcare',         icon: '💊', color: '#0ea5e9', isExpense: true  },
  travel:           { label: 'Travel',             icon: '✈️', color: '#3b82f6', isExpense: true  },
  savings_transfer: { label: 'Savings',            icon: '🏦', color: '#14b8a6', isExpense: false },
  financial:        { label: 'Financial',          icon: '💳', color: '#94a3b8', isExpense: true  },
  other:            { label: 'Other',              icon: '📎', color: '#cbd5e1', isExpense: true  },
}

/** Ordered list of categories for display (income/savings first, then expenses by priority) */
export const CATEGORY_ORDER: SpendingCategory[] = [
  'income', 'savings_transfer',
  'housing', 'council_tax', 'utilities', 'broadband_phone',
  'groceries', 'childcare', 'kids_activities',
  'transport', 'insurance', 'subscriptions',
  'shopping', 'dining_out', 'entertainment', 'healthcare', 'travel',
  'financial', 'other',
]

/**
 * Categorise a transaction from its description and optional merchant name.
 *
 * Matching is case-insensitive. Most specific patterns are checked first.
 * Falls back to 'other' when nothing matches.
 */
export function categorizeTransaction(
  description: string,
  merchantName?: string | null,
): SpendingCategory {
  const raw = `${merchantName ?? ''} ${description}`.toLowerCase()

  // ── Income ────────────────────────────────────────────────────────────────
  if (/\bsalary\b|\bwages\b|\bbacs credit\b|\bpayroll\b|employer payment|pay credit/.test(raw)) return 'income'
  if (/\bdividend\b|\binterest credit\b|\btax refund\b|\buniversal credit\b|\bchild benefit\b/.test(raw)) return 'income'

  // ── Savings transfers ─────────────────────────────────────────────────────
  if (/savings transfer|transfer to sav|to isa|isa deposit|isa transfer|isa top.?up/.test(raw)) return 'savings_transfer'
  if (/instant saver|easy access|regular saver/.test(raw)) return 'savings_transfer'

  // ── Financial (CC payments, loans) ───────────────────────────────────────
  if (/credit card payment|cc payment|barclaycard payment|mbna payment|amex payment|capital one/.test(raw)) return 'financial'
  if (/loan repayment|personal loan|overdraft fee|bank charge/.test(raw)) return 'financial'

  // ── Housing / Mortgage ────────────────────────────────────────────────────
  if (/mortgage|nationwide repay|halifax repay|santander repay|lloyds mortgage|natwest mortgage/.test(raw)) return 'housing'
  if (/barclays mortgage|virgin money mortgage|hsbc mortgage/.test(raw)) return 'housing'

  // ── Council Tax ───────────────────────────────────────────────────────────
  if (/council tax|london borough|district council|city council/.test(raw)) return 'council_tax'

  // ── Utilities ─────────────────────────────────────────────────────────────
  if (/british gas|bg sync|bg energy|edf energy|\be\.on\b|eon next|octopus energy|bulb energy|ovo energy/.test(raw)) return 'utilities'
  if (/thames water|severn trent|united utilities|yorkshire water|anglian water|southern water/.test(raw)) return 'utilities'
  if (/scottish power|npower|shell energy|so energy|green energy|renewable energy/.test(raw)) return 'utilities'

  // ── Broadband & Phone ─────────────────────────────────────────────────────
  if (/\bbt group\b|\bbt broadband\b|virgin media|sky broadband|talktalk|now broadband|hyperoptic/.test(raw)) return 'broadband_phone'
  if (/vodafone|o2 uk|\bee mobile\b|three mobile|giffgaff|iphone plan|apple one/.test(raw)) return 'broadband_phone'

  // ── Groceries ─────────────────────────────────────────────────────────────
  if (/\btesco\b|\bsainsbury\b|\basda\b|\bmorrisons\b|\bwaitrose\b/.test(raw)) return 'groceries'
  if (/\blidl\b|\baldi\b|co-op food|coop food|iceland food|farmfoods|ocado|hello fresh|oddbox/.test(raw)) return 'groceries'
  if (/m&s food|marks & spencer food|marks and spencer food/.test(raw)) return 'groceries'

  // ── Childcare ─────────────────────────────────────────────────────────────
  if (/childcare|nursery|creche|after.?school club|breakfast club|childminder|bright horizons|little stars|happy days nursery/.test(raw)) return 'childcare'

  // ── Kids & Activities ─────────────────────────────────────────────────────
  if (/swimming lesson|swim school|swim class|football club|tennis lesson|gymnastics|dance class|karate/.test(raw)) return 'kids_activities'
  if (/scouts|brownies|cubs|beavers|rainbows|school trip|school uniform|smyths|the entertainer/.test(raw)) return 'kids_activities'

  // ── Transport ─────────────────────────────────────────────────────────────
  if (/\bbp\b|shell fuel|esso|texaco|jet fuel|moto fuel|welcome break|extra msc fuel/.test(raw)) return 'transport'
  if (/\btfl\b|\boyster\b|tube ticket|national rail|avanti|great western|lner|southeastern rail|thameslink|southern rail/.test(raw)) return 'transport'
  if (/uber(?! eats)|\bcab\b|\btaxi\b|addison lee|enterprise rent|hertz rent|zipcar|e-scooter/.test(raw)) return 'transport'
  if (/car park|ncp park|parking|\bmot \b|halfords|kwik fit|mr tyre|car service|auto centre/.test(raw)) return 'transport'

  // ── Insurance ─────────────────────────────────────────────────────────────
  if (/direct line|aviva|axa insurance|zurich|admiral|esure|churchill|more than insurance/.test(raw)) return 'insurance'
  if (/legal & general|l&g life|prudential|royal london|vitality|bupa|private health|life insurance|car insurance|home insurance/.test(raw)) return 'insurance'

  // ── Subscriptions / Streaming ─────────────────────────────────────────────
  if (/netflix|spotify|amazon prime|disney\+|apple tv|youtube premium|sky cinema|now tv/.test(raw)) return 'subscriptions'
  if (/google one|icloud storage|microsoft 365|adobe cc|duolingo plus/.test(raw)) return 'subscriptions'

  // ── Dining Out ────────────────────────────────────────────────────────────
  if (/mcdonald|burger king|\bkfc\b|\bsubway\b|\bgreggs\b|pret a manger|costa coffee|starbucks|cafe nero|caffe/.test(raw)) return 'dining_out'
  if (/just eat|deliveroo|uber eats|dominos|papa john|pizza hut/.test(raw)) return 'dining_out'
  if (/\brestaurant\b|wagamama|nandos|pizza express|prezzo|zizzi|ask italian|harvester|toby carvery/.test(raw)) return 'dining_out'

  // ── Shopping (general retail, clothing) ───────────────────────────────────
  if (/\bamazon\b|\bebay\b|argos |john lewis|marks & spencer|m&s clothing/.test(raw)) return 'shopping'
  if (/\bnext\b|\bzara\b|\bh&m\b|\bprimark\b|river island|asos|very\.co|boohoo|matalan|george at asda/.test(raw)) return 'shopping'
  if (/boots\.com|boots pharmacy|superdrug|wilko|\bb&m\b|home bargains/.test(raw)) return 'shopping'
  if (/\bikea\b|\bdunelm\b|\bb&q\b|\bwickes\b|homebase|screwfix|toolstation|robert dyas/.test(raw)) return 'shopping'
  if (/currys|ao\.com|very |littlewoods/.test(raw)) return 'shopping'

  // ── Entertainment ─────────────────────────────────────────────────────────
  if (/odeon|vue cinema|cineworld|picturehouse|bfi imax/.test(raw)) return 'entertainment'
  if (/theatre|concert|ticketmaster|eventbrite|stubhub|seetickets/.test(raw)) return 'entertainment'
  if (/puregym|david lloyd|virgin active|anytime fitness|gym membership/.test(raw)) return 'entertainment'
  if (/steam games|playstation|xbox |nintendo|app store|google play|epic games/.test(raw)) return 'entertainment'

  // ── Healthcare ────────────────────────────────────────────────────────────
  if (/nhs prescription|pharmacy|\bchemist\b|dental|dentist|optician|specsavers|vision express/.test(raw)) return 'healthcare'
  if (/\bgp \b|\bdoctor\b|private clinic|physio|osteopath|counselling|therapy/.test(raw)) return 'healthcare'

  // ── Travel ───────────────────────────────────────────────────────────────
  if (/holiday|booking\.com|airbnb|expedia|lastminute|easyjet|ryanair|british airways|jet2|tui|thomas cook/.test(raw)) return 'travel'
  if (/heathrow|gatwick|stansted|luton airport|eurotunnel|eurostar|travelodge|premier inn|holiday inn/.test(raw)) return 'travel'

  return 'other'
}
