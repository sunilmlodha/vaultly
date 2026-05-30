// Smart CSV importer — auto-detects HL, Vanguard, Trading 212, Freetrade, generic

export interface ParsedAsset {
  name: string
  category: string
  value: number
  currency: string
  institution: string
  notes: string
}

export type CSVFormat = 'hargreaves_lansdown' | 'vanguard' | 'trading212' | 'freetrade' | 'generic'

function parseCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '"') { inQuotes = !inQuotes; continue }
    if (c === ',' && !inQuotes) { result.push(current.trim()); current = ''; continue }
    current += c
  }
  result.push(current.trim())
  return result
}

function parseCSV(text: string): string[][] {
  return text
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0)
    .map(parseCsvLine)
}

function cleanNumber(s: string): number {
  const n = parseFloat(s.replace(/[£$€,\s%]/g, ''))
  return isNaN(n) ? 0 : Math.abs(n)
}

// ── Format detectors ──────────────────────────────────────────────────────────

function detectFormat(headers: string[]): CSVFormat {
  const h = headers.map(h => h.toLowerCase())
  const joined = h.join(' ')

  if (joined.includes('sedol') || joined.includes('units held') || joined.includes('stock name'))
    return 'hargreaves_lansdown'
  if (joined.includes('isin') && joined.includes('fund name') && (joined.includes('units') || joined.includes('shares')))
    return 'vanguard'
  if (joined.includes('ticker') && joined.includes('shares') && joined.includes('result'))
    return 'trading212'
  if (joined.includes('symbol') && joined.includes('average cost per unit'))
    return 'freetrade'
  return 'generic'
}

function categoryFromName(name: string): string {
  const n = name.toLowerCase()
  if (n.includes('pension') || n.includes('retirement') || n.includes('sipp')) return 'pension'
  if (n.includes('isa') && n.includes('cash')) return 'isa_cash'
  if (n.includes('isa') || n.includes('stocks & shares')) return 'isa_ss'
  if (n.includes('bitcoin') || n.includes('ethereum') || n.includes('crypto') || n.includes('coin')) return 'crypto'
  if (n.includes('bond') || n.includes('gilt') || n.includes('fixed income')) return 'bonds'
  if (n.includes('etf') || n.includes('exchange traded') || n.includes('tracker')) return 'etf'
  if (n.includes('fund') || n.includes('trust') || n.includes('equity') || n.includes('growth')) return 'investment'
  if (n.includes('cash') || n.includes('savings')) return 'bank_account'
  return 'investment'
}

// ── Format-specific parsers ───────────────────────────────────────────────────

function parseHL(rows: string[][], headers: string[]): ParsedAsset[] {
  const nameIdx = headers.findIndex(h => h.toLowerCase().includes('stock name') || h.toLowerCase().includes('account'))
  const valueIdx = headers.findIndex(h => h.toLowerCase().includes('value'))
  const unitsIdx = headers.findIndex(h => h.toLowerCase().includes('unit'))

  return rows.map(row => {
    const name = row[nameIdx] || row[0] || 'Unknown'
    const value = cleanNumber(row[valueIdx] || row[row.length - 1])
    if (value === 0 && !row[unitsIdx]) return null
    return {
      name: name.replace(/^"|"$/g, ''),
      category: categoryFromName(name),
      value,
      currency: 'GBP',
      institution: 'Hargreaves Lansdown',
      notes: `Imported from HL CSV`,
    }
  }).filter(Boolean) as ParsedAsset[]
}

function parseVanguard(rows: string[][], headers: string[]): ParsedAsset[] {
  const nameIdx = headers.findIndex(h => h.toLowerCase().includes('fund name'))
  const valueIdx = headers.findIndex(h => h.toLowerCase().includes('value') || h.toLowerCase().includes('worth'))
  const unitsIdx = headers.findIndex(h => h.toLowerCase().includes('unit') || h.toLowerCase().includes('share'))
  const priceIdx = headers.findIndex(h => h.toLowerCase().includes('price'))

  return rows.map(row => {
    const name = row[nameIdx] || row[0]
    let value = cleanNumber(row[valueIdx] || '0')
    if (value === 0 && unitsIdx >= 0 && priceIdx >= 0) {
      value = cleanNumber(row[unitsIdx]) * cleanNumber(row[priceIdx])
    }
    if (!name || value === 0) return null
    return {
      name, category: categoryFromName(name), value,
      currency: 'GBP', institution: 'Vanguard', notes: 'Imported from Vanguard CSV',
    }
  }).filter(Boolean) as ParsedAsset[]
}

function parseTrading212(rows: string[][], headers: string[]): ParsedAsset[] {
  const nameIdx = headers.findIndex(h => h.toLowerCase() === 'name' || h.toLowerCase().includes('company'))
  const sharesIdx = headers.findIndex(h => h.toLowerCase() === 'shares')
  const priceIdx = headers.findIndex(h => h.toLowerCase().includes('current price') || h.toLowerCase().includes('price'))
  const valueIdx = headers.findIndex(h => h.toLowerCase().includes('total') || h.toLowerCase().includes('value'))

  return rows.map(row => {
    const name = row[nameIdx] || row[0]
    let value = cleanNumber(row[valueIdx] || '0')
    if (value === 0 && sharesIdx >= 0 && priceIdx >= 0) {
      value = cleanNumber(row[sharesIdx]) * cleanNumber(row[priceIdx])
    }
    if (!name || value === 0) return null
    return {
      name, category: categoryFromName(name), value,
      currency: 'GBP', institution: 'Trading 212', notes: 'Imported from Trading 212 CSV',
    }
  }).filter(Boolean) as ParsedAsset[]
}

function parseFreetrade(rows: string[][], headers: string[]): ParsedAsset[] {
  const nameIdx = headers.findIndex(h => h.toLowerCase() === 'name')
  const unitsIdx = headers.findIndex(h => h.toLowerCase() === 'units' || h.toLowerCase().includes('shares'))
  const priceIdx = headers.findIndex(h => h.toLowerCase().includes('current') || h.toLowerCase().includes('price'))
  const currencyIdx = headers.findIndex(h => h.toLowerCase() === 'currency')
  const totalIdx = headers.findIndex(h => h.toLowerCase().includes('total') || h.toLowerCase().includes('value'))

  return rows.map(row => {
    const name = row[nameIdx] || row[0]
    let value = cleanNumber(row[totalIdx] || '0')
    if (value === 0 && unitsIdx >= 0 && priceIdx >= 0) {
      value = cleanNumber(row[unitsIdx]) * cleanNumber(row[priceIdx])
    }
    const currency = (currencyIdx >= 0 ? row[currencyIdx] : 'GBP').trim() || 'GBP'
    if (!name || value === 0) return null
    return {
      name, category: categoryFromName(name), value,
      currency, institution: 'Freetrade', notes: 'Imported from Freetrade CSV',
    }
  }).filter(Boolean) as ParsedAsset[]
}

function parseGeneric(rows: string[][], headers: string[]): ParsedAsset[] {
  // Try to find name + value columns by common header names
  const nameIdx = headers.findIndex(h =>
    ['name', 'asset', 'fund', 'stock', 'holding', 'description', 'account'].some(k => h.toLowerCase().includes(k))
  )
  const valueIdx = headers.findIndex(h =>
    ['value', 'amount', 'balance', 'worth', 'total', 'market value'].some(k => h.toLowerCase().includes(k))
  )
  const currencyIdx = headers.findIndex(h => h.toLowerCase() === 'currency' || h.toLowerCase() === 'ccy')

  if (nameIdx < 0 || valueIdx < 0) return []

  return rows.map(row => {
    const name = row[nameIdx]
    const value = cleanNumber(row[valueIdx])
    const currency = (currencyIdx >= 0 ? row[currencyIdx] : 'GBP').trim() || 'GBP'
    if (!name || value === 0) return null
    return {
      name, category: categoryFromName(name), value,
      currency, institution: 'Imported', notes: 'Imported from CSV',
    }
  }).filter(Boolean) as ParsedAsset[]
}

// ── Main export ───────────────────────────────────────────────────────────────

export function parseCSVFile(text: string): { format: CSVFormat; assets: ParsedAsset[]; rawHeaders: string[] } {
  const all = parseCSV(text)
  if (all.length < 2) return { format: 'generic', assets: [], rawHeaders: [] }

  // Skip metadata rows at top (HL has account summary rows before the data)
  let headerIdx = 0
  for (let i = 0; i < Math.min(10, all.length); i++) {
    if (all[i].length >= 3 && all[i].some(c => c.length > 0 && isNaN(cleanNumber(c)))) {
      headerIdx = i
      break
    }
  }

  const headers = all[headerIdx].map(h => h.replace(/^"|"$/g, '').trim())
  const rows = all.slice(headerIdx + 1).filter(r => r.length >= 2 && r.some(c => c.trim()))
  const format = detectFormat(headers)

  let assets: ParsedAsset[] = []
  if (format === 'hargreaves_lansdown') assets = parseHL(rows, headers)
  else if (format === 'vanguard')        assets = parseVanguard(rows, headers)
  else if (format === 'trading212')      assets = parseTrading212(rows, headers)
  else if (format === 'freetrade')       assets = parseFreetrade(rows, headers)
  else                                   assets = parseGeneric(rows, headers)

  // Deduplicate by name, merge values
  const merged = new Map<string, ParsedAsset>()
  for (const a of assets) {
    const key = a.name.toLowerCase()
    if (merged.has(key)) {
      merged.get(key)!.value += a.value
    } else {
      merged.set(key, { ...a })
    }
  }

  return { format, assets: Array.from(merged.values()), rawHeaders: headers }
}

export const FORMAT_LABELS: Record<CSVFormat, string> = {
  hargreaves_lansdown: 'Hargreaves Lansdown',
  vanguard: 'Vanguard',
  trading212: 'Trading 212',
  freetrade: 'Freetrade',
  generic: 'Generic CSV',
}
