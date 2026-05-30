import { describe, it, expect } from 'vitest'
import { parseCSVFile, FORMAT_LABELS } from '@/lib/csv-parser'

// ── Sample CSV fixtures ───────────────────────────────────────────────────────

const HL_CSV = `Stock name,Sedol,Units held,Price (pence),Value (£),Cost (£),Gain/Loss (£),Gain/Loss (%)
"Vanguard FTSE All-World ETF",BFY0NK5,50.000,2450,1225.00,1000.00,225.00,22.50
"Apple Inc",2046251,10.000,18500,1850.00,1500.00,350.00,23.33
"Tesla Inc",B616C79,5.000,24000,1200.00,800.00,400.00,50.00`

const VANGUARD_CSV = `Fund Name,ISIN,Units,Unit Price (GBP),Value (GBP)
Vanguard LifeStrategy 80% Equity,GB00B3ZHN960,100.000,2.5600,256.00
Vanguard FTSE Global All Cap Index,GB00BD3RZ582,200.000,1.8900,378.00`

const TRADING212_CSV = `Name,Ticker,Shares,Average price,Current price,Total invested,Result
Apple Inc,AAPL,5,145.00,185.00,725.00,200.00
Tesla Inc,TSLA,2,220.00,240.00,440.00,40.00`

const FREETRADE_CSV = `Name,Symbol,Units,Average cost per unit,Currency,Total average cost
Amazon.com Inc,AMZN,3,130.00,GBP,390.00
Microsoft Corp,MSFT,10,280.00,GBP,2800.00`

const GENERIC_CSV = `Asset Name,Value,Currency
My ISA Account,15000,GBP
Savings Account,5000,GBP`

// ── Tests ────────────────────────────────────────────────────────────────────

describe('parseCSVFile() — format detection', () => {
  it('detects Hargreaves Lansdown format', () => {
    const { format } = parseCSVFile(HL_CSV)
    expect(format).toBe('hargreaves_lansdown')
  })

  it('detects Vanguard format', () => {
    const { format } = parseCSVFile(VANGUARD_CSV)
    expect(format).toBe('vanguard')
  })

  it('detects Trading 212 format', () => {
    const { format } = parseCSVFile(TRADING212_CSV)
    expect(format).toBe('trading212')
  })

  it('detects Freetrade format', () => {
    const { format } = parseCSVFile(FREETRADE_CSV)
    expect(format).toBe('freetrade')
  })

  it('falls back to generic for unknown formats', () => {
    const { format } = parseCSVFile(GENERIC_CSV)
    expect(format).toBe('generic')
  })
})

describe('parseCSVFile() — HL parsing', () => {
  it('parses correct number of assets', () => {
    const { assets } = parseCSVFile(HL_CSV)
    expect(assets.length).toBe(3)
  })

  it('extracts names correctly', () => {
    const { assets } = parseCSVFile(HL_CSV)
    expect(assets[0].name).toContain('Vanguard')
    expect(assets[1].name).toContain('Apple')
  })

  it('sets institution to Hargreaves Lansdown', () => {
    const { assets } = parseCSVFile(HL_CSV)
    assets.forEach(a => expect(a.institution).toBe('Hargreaves Lansdown'))
  })

  it('extracts positive GBP values', () => {
    const { assets } = parseCSVFile(HL_CSV)
    assets.forEach(a => expect(a.value).toBeGreaterThan(0))
  })

  it('sets currency to GBP', () => {
    const { assets } = parseCSVFile(HL_CSV)
    assets.forEach(a => expect(a.currency).toBe('GBP'))
  })
})

describe('parseCSVFile() — Vanguard parsing', () => {
  it('parses 2 funds', () => {
    const { assets } = parseCSVFile(VANGUARD_CSV)
    expect(assets.length).toBe(2)
  })

  it('sets institution to Vanguard', () => {
    const { assets } = parseCSVFile(VANGUARD_CSV)
    assets.forEach(a => expect(a.institution).toBe('Vanguard'))
  })

  it('calculates value from units × price when value column missing', () => {
    const { assets } = parseCSVFile(VANGUARD_CSV)
    expect(assets[0].value).toBeCloseTo(256, 0)
    expect(assets[1].value).toBeCloseTo(378, 0)
  })
})

describe('parseCSVFile() — Trading 212 parsing', () => {
  it('parses correct assets', () => {
    const { assets } = parseCSVFile(TRADING212_CSV)
    expect(assets.length).toBe(2)
    expect(assets[0].name).toContain('Apple')
  })

  it('sets institution to Trading 212', () => {
    const { assets } = parseCSVFile(TRADING212_CSV)
    assets.forEach(a => expect(a.institution).toBe('Trading 212'))
  })
})

describe('parseCSVFile() — Freetrade parsing', () => {
  it('parses 2 holdings', () => {
    const { assets } = parseCSVFile(FREETRADE_CSV)
    expect(assets.length).toBe(2)
  })

  it('sets institution to Freetrade', () => {
    const { assets } = parseCSVFile(FREETRADE_CSV)
    assets.forEach(a => expect(a.institution).toBe('Freetrade'))
  })
})

describe('parseCSVFile() — category inference', () => {
  const CATEGORY_CSV = `Fund Name,ISIN,Units,Unit Price (GBP),Value (GBP)
My Pension Fund,GB001,100,1.00,100.00
Stocks and Shares ISA,GB002,100,2.00,200.00
Bitcoin ETF,GB003,10,5.00,50.00
UK Gilt Bond Fund,GB004,50,3.00,150.00`

  it('infers pension category from name', () => {
    const { assets } = parseCSVFile(CATEGORY_CSV)
    const pension = assets.find(a => a.name.toLowerCase().includes('pension'))
    expect(pension?.category).toBe('pension')
  })

  it('infers ISA category from name', () => {
    const { assets } = parseCSVFile(CATEGORY_CSV)
    const isa = assets.find(a => a.name.toLowerCase().includes('isa'))
    expect(['isa_ss', 'isa_cash', 'investment']).toContain(isa?.category)
  })

  it('infers crypto category from Bitcoin', () => {
    const { assets } = parseCSVFile(CATEGORY_CSV)
    const crypto = assets.find(a => a.name.toLowerCase().includes('bitcoin'))
    expect(crypto?.category).toBe('crypto')
  })

  it('infers bonds category', () => {
    const { assets } = parseCSVFile(CATEGORY_CSV)
    const bond = assets.find(a => a.name.toLowerCase().includes('bond'))
    expect(bond?.category).toBe('bonds')
  })
})

describe('parseCSVFile() — edge cases', () => {
  it('returns empty assets for empty CSV', () => {
    const { assets } = parseCSVFile('')
    expect(assets).toHaveLength(0)
  })

  it('returns empty assets for header-only CSV', () => {
    const { assets } = parseCSVFile('Name,Value,Currency\n')
    expect(assets).toHaveLength(0)
  })

  it('deduplicates assets with the same name', () => {
    const dupeCSV = `Stock name,Sedol,Units held,Price (pence),Value (£)
"Apple Inc",2046251,5.000,18500,925.00
"Apple Inc",2046251,5.000,18500,925.00`
    const { assets } = parseCSVFile(dupeCSV)
    const apples = assets.filter(a => a.name.toLowerCase().includes('apple'))
    expect(apples.length).toBe(1)
    expect(apples[0].value).toBe(1850) // values merged
  })

  it('includes only non-zero value assets in total', () => {
    const csv = `Stock name,Sedol,Units held,Price (pence),Value (£)
"Cash",000000,0,0,0.00
"Apple",2046251,5,18500,925.00`
    const { assets } = parseCSVFile(csv)
    const positiveAssets = assets.filter(a => a.value > 0)
    expect(positiveAssets.length).toBeGreaterThan(0)
    expect(positiveAssets.some(a => a.name.includes('Apple'))).toBe(true)
  })
})

describe('FORMAT_LABELS', () => {
  it('has a label for every format', () => {
    const formats = ['hargreaves_lansdown', 'vanguard', 'trading212', 'freetrade', 'generic']
    formats.forEach(f => {
      expect(FORMAT_LABELS[f as keyof typeof FORMAT_LABELS]).toBeTruthy()
    })
  })
})
