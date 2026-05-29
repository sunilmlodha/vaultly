import { describe, it, expect } from 'vitest'
import { categorizeTransaction, CATEGORY_META, CATEGORY_ORDER, type SpendingCategory } from '@/lib/categorize'

// ── categorizeTransaction() ──────────────────────────────────────────────────
describe('categorizeTransaction()', () => {
  // Income
  it('classifies salary credits as income', () => {
    expect(categorizeTransaction('BACS CREDIT SALARY', 'Employer Ltd')).toBe('income')
  })
  it('classifies payroll as income', () => {
    expect(categorizeTransaction('PAYROLL PAYMENT', null)).toBe('income')
  })
  it('classifies dividends as income', () => {
    expect(categorizeTransaction('DIVIDEND FROM HOLDINGS', null)).toBe('income')
  })
  it('classifies universal credit as income', () => {
    expect(categorizeTransaction('UNIVERSAL CREDIT', null)).toBe('income')
  })

  // Savings
  it('classifies ISA deposits as savings_transfer', () => {
    expect(categorizeTransaction('ISA DEPOSIT', null)).toBe('savings_transfer')
  })
  it('classifies savings transfer by description', () => {
    expect(categorizeTransaction('SAVINGS TRANSFER', null)).toBe('savings_transfer')
  })

  // Housing
  it('classifies mortgage payments as housing', () => {
    expect(categorizeTransaction('NATIONWIDE MORTGAGE REPAYMENT', null)).toBe('housing')
  })
  it('classifies Halifax mortgage as housing', () => {
    expect(categorizeTransaction('HALIFAX REPAY', null)).toBe('housing')
  })

  // Council tax
  it('classifies council tax as council_tax', () => {
    expect(categorizeTransaction('COUNCIL TAX DD', 'City Council')).toBe('council_tax')
  })

  // Utilities
  it('classifies Octopus Energy as utilities', () => {
    expect(categorizeTransaction('OCTOPUS ENERGY', null)).toBe('utilities')
  })
  it('classifies British Gas as utilities', () => {
    expect(categorizeTransaction('BRITISH GAS', null)).toBe('utilities')
  })
  it('classifies water company as utilities', () => {
    expect(categorizeTransaction('THAMES WATER', null)).toBe('utilities')
  })

  // Broadband/phone
  it('classifies BT Broadband as broadband_phone', () => {
    expect(categorizeTransaction('BT BROADBAND DIRECT DEBIT', null)).toBe('broadband_phone')
  })
  it('classifies Vodafone as broadband_phone', () => {
    expect(categorizeTransaction('VODAFONE UK', null)).toBe('broadband_phone')
  })
  it('classifies O2 as broadband_phone', () => {
    expect(categorizeTransaction('O2 UK DIRECT DEBIT', null)).toBe('broadband_phone')
  })

  // Groceries
  it('classifies Tesco as groceries', () => {
    expect(categorizeTransaction('TESCO STORES', 'Tesco')).toBe('groceries')
  })
  it('classifies Sainsbury as groceries', () => {
    expect(categorizeTransaction("SAINSBURY'S", null)).toBe('groceries')
  })
  it('classifies Lidl as groceries', () => {
    expect(categorizeTransaction('LIDL GB', null)).toBe('groceries')
  })
  it('classifies Ocado as groceries', () => {
    expect(categorizeTransaction('OCADO RETAIL', null)).toBe('groceries')
  })

  // Childcare
  it('classifies nursery as childcare', () => {
    expect(categorizeTransaction('LITTLE STARS NURSERY', null)).toBe('childcare')
  })
  it('classifies childminder as childcare', () => {
    expect(categorizeTransaction('CHILDMINDER FEE', null)).toBe('childcare')
  })

  // Kids activities
  it('classifies swimming lessons as kids_activities', () => {
    expect(categorizeTransaction('SWIM SCHOOL PAYMENT', null)).toBe('kids_activities')
  })
  it('classifies football club as kids_activities', () => {
    expect(categorizeTransaction('FOOTBALL CLUB FEE', null)).toBe('kids_activities')
  })

  // Transport
  it('classifies TfL as transport', () => {
    expect(categorizeTransaction('TFL TRAVEL', 'TfL')).toBe('transport')
  })
  it('classifies Uber (not Uber Eats) as transport', () => {
    expect(categorizeTransaction('UBER TRIP', 'Uber')).toBe('transport')
  })
  it('classifies fuel stations as transport', () => {
    expect(categorizeTransaction('SHELL FUEL', 'Shell')).toBe('transport')
  })
  it('classifies car parking as transport', () => {
    expect(categorizeTransaction('NCP CAR PARK', null)).toBe('transport')
  })

  // Insurance
  it('classifies Direct Line as insurance', () => {
    expect(categorizeTransaction('DIRECT LINE INSURANCE', null)).toBe('insurance')
  })
  it('classifies life insurance as insurance', () => {
    expect(categorizeTransaction('LIFE INSURANCE PREMIUM', null)).toBe('insurance')
  })

  // Subscriptions
  it('classifies Netflix as subscriptions', () => {
    expect(categorizeTransaction('NETFLIX.COM', 'Netflix')).toBe('subscriptions')
  })
  it('classifies Spotify as subscriptions', () => {
    expect(categorizeTransaction('SPOTIFY AB', 'Spotify')).toBe('subscriptions')
  })
  it('classifies Apple iCloud as subscriptions', () => {
    expect(categorizeTransaction('ICLOUD STORAGE', null)).toBe('subscriptions')
  })

  // Dining out
  it('classifies McDonald\'s as dining_out', () => {
    expect(categorizeTransaction("MCDONALD'S", null)).toBe('dining_out')
  })
  it('classifies Deliveroo as dining_out', () => {
    expect(categorizeTransaction('DELIVEROO', null)).toBe('dining_out')
  })
  it('classifies Uber Eats as dining_out (not transport)', () => {
    expect(categorizeTransaction('UBER EATS ORDER', null)).toBe('dining_out')
  })
  it('classifies Starbucks as dining_out', () => {
    expect(categorizeTransaction('STARBUCKS', null)).toBe('dining_out')
  })

  // Shopping
  it('classifies Amazon as shopping', () => {
    expect(categorizeTransaction('AMAZON.CO.UK', 'Amazon')).toBe('shopping')
  })
  it('classifies ASOS as shopping', () => {
    expect(categorizeTransaction('ASOS', null)).toBe('shopping')
  })
  it('classifies IKEA as shopping', () => {
    expect(categorizeTransaction('IKEA UK', null)).toBe('shopping')
  })

  // Entertainment
  it('classifies Odeon as entertainment', () => {
    expect(categorizeTransaction('ODEON CINEMAS', null)).toBe('entertainment')
  })
  it('classifies gym membership as entertainment', () => {
    expect(categorizeTransaction('PUREGYM MEMBERSHIP', null)).toBe('entertainment')
  })
  it('classifies PlayStation as entertainment', () => {
    expect(categorizeTransaction('PLAYSTATION NETWORK', null)).toBe('entertainment')
  })

  // Healthcare
  it('classifies NHS prescription as healthcare', () => {
    expect(categorizeTransaction('NHS PRESCRIPTION', null)).toBe('healthcare')
  })
  it('classifies dentist as healthcare', () => {
    expect(categorizeTransaction('DENTAL PRACTICE', null)).toBe('healthcare')
  })
  it('classifies Specsavers as healthcare', () => {
    expect(categorizeTransaction('SPECSAVERS OPTICIANS', null)).toBe('healthcare')
  })

  // Travel
  it('classifies easyJet as travel', () => {
    expect(categorizeTransaction('EASYJET BOOKING', null)).toBe('travel')
  })
  it('classifies Airbnb as travel', () => {
    expect(categorizeTransaction('AIRBNB RESERVATION', null)).toBe('travel')
  })
  it('classifies Travelodge as travel', () => {
    expect(categorizeTransaction('TRAVELODGE HOTEL', null)).toBe('travel')
  })

  // Financial
  it('classifies credit card payment as financial', () => {
    expect(categorizeTransaction('CREDIT CARD PAYMENT', null)).toBe('financial')
  })
  it('classifies Amex payment as financial', () => {
    expect(categorizeTransaction('AMEX PAYMENT', null)).toBe('financial')
  })

  // Other / fallback
  it('falls back to other for unrecognised merchants', () => {
    expect(categorizeTransaction('RANDOM MERCHANT XYZ', null)).toBe('other')
  })
  it('is case-insensitive', () => {
    expect(categorizeTransaction('netflix', null)).toBe('subscriptions')
    expect(categorizeTransaction('NETFLIX', null)).toBe('subscriptions')
  })
  it('uses merchantName when it provides better signal', () => {
    expect(categorizeTransaction('12345 TXN', 'Tesco')).toBe('groceries')
  })
})

// ── CATEGORY_META ─────────────────────────────────────────────────────────────
describe('CATEGORY_META', () => {
  const categories: SpendingCategory[] = [
    'income', 'housing', 'council_tax', 'utilities', 'broadband_phone',
    'groceries', 'childcare', 'kids_activities', 'transport', 'insurance',
    'subscriptions', 'shopping', 'dining_out', 'entertainment', 'healthcare',
    'travel', 'savings_transfer', 'financial', 'other',
  ]

  it('has a meta entry for every SpendingCategory', () => {
    for (const cat of categories) {
      expect(CATEGORY_META[cat]).toBeDefined()
    }
  })

  it('every meta entry has label, icon, color, isExpense', () => {
    for (const cat of categories) {
      const meta = CATEGORY_META[cat]
      expect(meta.label).toBeTruthy()
      expect(meta.icon).toBeTruthy()
      expect(meta.color).toMatch(/^#/)
      expect(typeof meta.isExpense).toBe('boolean')
    }
  })

  it('income and savings_transfer are not expenses', () => {
    expect(CATEGORY_META.income.isExpense).toBe(false)
    expect(CATEGORY_META.savings_transfer.isExpense).toBe(false)
  })

  it('housing, groceries, shopping etc. are expenses', () => {
    expect(CATEGORY_META.housing.isExpense).toBe(true)
    expect(CATEGORY_META.groceries.isExpense).toBe(true)
    expect(CATEGORY_META.shopping.isExpense).toBe(true)
  })
})

// ── CATEGORY_ORDER ────────────────────────────────────────────────────────────
describe('CATEGORY_ORDER', () => {
  it('contains all 19 SpendingCategories', () => {
    expect(CATEGORY_ORDER).toHaveLength(19)
  })

  it('has income first', () => {
    expect(CATEGORY_ORDER[0]).toBe('income')
  })

  it('has savings_transfer second', () => {
    expect(CATEGORY_ORDER[1]).toBe('savings_transfer')
  })

  it('has no duplicates', () => {
    const unique = new Set(CATEGORY_ORDER)
    expect(unique.size).toBe(CATEGORY_ORDER.length)
  })
})
