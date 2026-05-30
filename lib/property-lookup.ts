// UK property valuation using HM Land Registry Price Paid Data (free, no key)
// + ONS regional HPI annual growth estimate

export interface PropertySale {
  address: string
  postcode: string
  price: number
  date: string          // YYYY-MM-DD normalised
  displayDate: string   // e.g. "November 2024"
  propertyType: string  // Detached | Semi-detached | Terraced | Flat | Other
}

export interface PropertyEstimate {
  sales: PropertySale[]            // all recent sales at this postcode
  selectedSale: PropertySale | null
  estimatedValue: number | null
  yearsSinceSale: number | null
  annualGrowthPct: number
  confidence: 'high' | 'medium' | 'low'
  disclaimer: string
}

// ONS regional annual house price growth (5-year average to 2024)
const REGIONAL_HPI: Record<string, number> = {
  E: 3.8, EC: 3.2, N: 4.1, NW: 4.3, SE: 4.0, SW: 3.9, W: 3.5, WC: 3.1,
  AL: 4.2, BN: 4.5, BR: 4.3, CB: 5.1, CM: 4.8, CT: 4.6, DA: 4.4,
  EN: 4.5, GU: 4.3, HP: 4.1, KT: 4.0, LU: 5.2, ME: 4.7, MK: 5.3,
  OX: 4.4, RG: 4.2, RH: 4.5, SL: 4.1, SM: 4.2, SN: 4.8, SO: 4.3,
  SP: 4.1, SS: 5.0, TN: 4.8, TW: 4.0,
  BA: 4.6, BH: 4.3, BS: 5.5, DT: 3.9, EX: 4.2, GL: 4.8, PL: 3.8,
  TA: 3.7, TQ: 3.5, TR: 3.6,
  DE: 5.1, LE: 5.3, LN: 4.4, NG: 5.2, NN: 4.9, PE: 4.6,
  B: 5.4, CV: 4.8, DY: 4.9, ST: 4.3, TF: 4.5, WR: 4.7, WS: 4.8, WV: 4.6,
  BD: 4.8, DN: 4.5, HD: 4.7, HG: 4.3, HU: 4.2, HX: 4.8, LS: 5.6,
  S: 5.1, WF: 5.0, YO: 4.6,
  BB: 4.9, BL: 4.7, CH: 4.6, CW: 4.8, FY: 4.1, L: 5.3, LA: 4.0,
  M: 6.1, OL: 5.0, PR: 4.8, SK: 5.0, WA: 5.1, WN: 4.9,
  DH: 4.2, DL: 3.9, NE: 4.5, SR: 3.8, TS: 3.6,
  CO: 4.9, IP: 5.0, NR: 5.1, SG: 5.0,
  CF: 5.2, LD: 3.5, LL: 3.8, NP: 4.6, SA: 4.1, SY: 3.9,
  AB: 3.2, DD: 4.1, EH: 5.8, FK: 4.3, G: 5.0, IV: 2.8, KA: 3.9,
  KY: 4.5, ML: 4.2, PA: 3.7, PH: 3.5, TD: 3.1,
  BT: 4.8,
}

function getHPIRate(postcode: string): number {
  const prefix = postcode.replace(/\s/g, '').match(/^[A-Z]{1,2}/)?.[0] ?? ''
  return REGIONAL_HPI[prefix] ?? 4.5
}

// Robustly parse a date from any format the Land Registry API might return
function parseDate(raw: unknown): string {
  if (!raw) return ''

  let str: string
  if (typeof raw === 'object' && raw !== null) {
    // JSON-LD formats: { "@value": "..." } or { "value": "..." }
    str = (raw as Record<string, unknown>)['@value'] as string
      ?? (raw as Record<string, unknown>)['value'] as string
      ?? ''
  } else {
    str = String(raw)
  }

  if (!str) return ''

  // Already ISO YYYY-MM-DD or YYYY-MM-DDThh:mm:ss
  const isoMatch = str.match(/^(\d{4}-\d{2}-\d{2})/)
  if (isoMatch) return isoMatch[1]

  // Try JS Date parsing as fallback
  const d = new Date(str)
  if (!isNaN(d.getTime())) {
    return d.toISOString().slice(0, 10)
  }

  return str
}

function formatDisplayDate(isoDate: string): string {
  if (!isoDate || isoDate.length < 7) return isoDate
  try {
    const [y, m] = isoDate.split('-')
    const d = new Date(Number(y), Number(m) - 1, 1)
    return d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
  } catch {
    return isoDate
  }
}

function buildAddress(addr: Record<string, string | undefined>): string {
  // saon = Secondary Addressable Object Name (e.g. flat/apartment number)
  // paon = Primary Addressable Object Name (e.g. house number or block name)
  return [addr?.saon, addr?.paon, addr?.street, addr?.town]
    .filter(Boolean)
    .map(s => String(s).toUpperCase())
    .join(', ')
}

function estimateValue(sale: PropertySale, postcode: string): {
  estimatedValue: number
  yearsSinceSale: number
  annualGrowthPct: number
  confidence: 'high' | 'medium' | 'low'
  disclaimer: string
} {
  const annualGrowthPct = getHPIRate(postcode)
  const yearsSinceSale = sale.date
    ? (Date.now() - new Date(sale.date).getTime()) / (1000 * 60 * 60 * 24 * 365.25)
    : 5

  const growthMultiplier = Math.pow(1 + annualGrowthPct / 100, yearsSinceSale)
  const estimatedValue = Math.round(sale.price * growthMultiplier)

  const confidence: 'high' | 'medium' | 'low' =
    yearsSinceSale < 2 ? 'high' : yearsSinceSale < 5 ? 'medium' : 'low'

  const yearsLabel = yearsSinceSale < 1
    ? 'less than a year ago'
    : `${Math.round(yearsSinceSale)} year${yearsSinceSale >= 1.5 ? 's' : ''} ago`

  const disclaimer =
    `Estimated using ${annualGrowthPct.toFixed(1)}% regional annual growth (ONS HPI). ` +
    `Last sold ${yearsLabel}. Actual value may differ significantly — consider a professional RICS valuation.`

  return { estimatedValue, yearsSinceSale, annualGrowthPct, confidence, disclaimer }
}

export async function lookupProperty(postcode: string): Promise<PropertyEstimate> {
  const clean = postcode.replace(/\s/g, '').toUpperCase()
  const formatted = clean.length > 3
    ? `${clean.slice(0, -3)} ${clean.slice(-3)}`
    : clean

  const noData: PropertyEstimate = {
    sales: [], selectedSale: null, estimatedValue: null, yearsSinceSale: null,
    annualGrowthPct: getHPIRate(postcode), confidence: 'low',
    disclaimer: 'No recent sale found for this postcode. Enter the value manually.',
  }

  try {
    const url =
      `https://landregistry.data.gov.uk/data/ppi/transaction-record.json` +
      `?propertyAddress.postcode=${encodeURIComponent(formatted)}` +
      `&_pageSize=10&_sort=-transactionDate`

    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(10000),
    })

    if (!res.ok) throw new Error(`Land Registry ${res.status}`)
    const data = await res.json()

    const items: Record<string, unknown>[] = data?.result?.items ?? []
    if (items.length === 0) return noData

    const propType: Record<string, string> = {
      D: 'Detached', S: 'Semi-detached', T: 'Terraced', F: 'Flat/Maisonette', O: 'Other',
    }

    // Build a deduplicated list — one entry per unique address, keeping the most recent sale
    const seen = new Set<string>()
    const sales: PropertySale[] = []

    for (const item of items) {
      const addr = item.propertyAddress as Record<string, string | undefined> | undefined
      const address = buildAddress(addr ?? {}) || formatted
      if (seen.has(address)) continue
      seen.add(address)

      const rawDate = (item.transactionDate as unknown)
      const date = parseDate(rawDate)
      const price = Number(item.pricePaid)
      if (!price || isNaN(price)) continue

      sales.push({
        address,
        postcode: formatted,
        price,
        date,
        displayDate: formatDisplayDate(date),
        propertyType: propType[item.propertyType as string] ?? 'Property',
      })
    }

    if (sales.length === 0) return noData

    // Use most recent sale as default selection
    const selectedSale = sales[0]
    const est = estimateValue(selectedSale, postcode)

    return {
      sales,
      selectedSale,
      ...est,
    }
  } catch (err) {
    console.error('[property-lookup]', err)
    return {
      sales: [], selectedSale: null, estimatedValue: null, yearsSinceSale: null,
      annualGrowthPct: getHPIRate(postcode), confidence: 'low',
      disclaimer: 'Could not retrieve Land Registry data. Please enter the value manually.',
    }
  }
}

// Re-estimate when a different sale is selected
export function estimateForSale(sale: PropertySale, postcode: string) {
  return estimateValue(sale, postcode)
}
