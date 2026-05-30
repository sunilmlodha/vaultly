// UK property valuation using HM Land Registry Price Paid Data (free, no key)
// + ONS regional HPI annual growth estimate

export interface PropertySale {
  address: string
  postcode: string
  price: number
  date: string          // ISO date of last sale
  propertyType: string  // D=Detached, S=Semi-detached, T=Terraced, F=Flat
}

export interface PropertyEstimate {
  lastSale: PropertySale | null
  estimatedValue: number | null
  yearsSinceSale: number | null
  annualGrowthPct: number     // applied HPI growth rate
  confidence: 'high' | 'medium' | 'low'
  disclaimer: string
}

// ONS regional annual house price growth (approximate 5-year average to 2024)
// Source: ONS UK House Price Index
const REGIONAL_HPI: Record<string, number> = {
  // London postcodes
  E: 3.8, EC: 3.2, N: 4.1, NW: 4.3, SE: 4.0, SW: 3.9, W: 3.5, WC: 3.1,
  // South East
  AL: 4.2, BN: 4.5, BR: 4.3, CB: 5.1, CM: 4.8, CT: 4.6, DA: 4.4,
  EN: 4.5, GU: 4.3, HP: 4.1, KT: 4.0, LU: 5.2, ME: 4.7, MK: 5.3,
  OX: 4.4, RG: 4.2, RH: 4.5, SL: 4.1, SM: 4.2, SN: 4.8, SO: 4.3,
  SP: 4.1, SS: 5.0, TN: 4.8, TW: 4.0,
  // South West
  BA: 4.6, BH: 4.3, BS: 5.5, DT: 3.9, EX: 4.2, GL: 4.8, PL: 3.8,
  TA: 3.7, TQ: 3.5, TR: 3.6,
  // East Midlands
  DE: 5.1, LE: 5.3, LN: 4.4, NG: 5.2, NN: 4.9, PE: 4.6,
  // West Midlands
  B: 5.4, CV: 4.8, DY: 4.9, ST: 4.3, TF: 4.5, WR: 4.7, WS: 4.8, WV: 4.6,
  // Yorkshire
  BD: 4.8, DN: 4.5, HD: 4.7, HG: 4.3, HU: 4.2, HX: 4.8, LS: 5.6,
  S: 5.1, WF: 5.0, YO: 4.6,
  // North West
  BB: 4.9, BL: 4.7, CH: 4.6, CW: 4.8, FY: 4.1, L: 5.3, LA: 4.0,
  M: 6.1, OL: 5.0, PR: 4.8, SK: 5.0, WA: 5.1, WN: 4.9,
  // North East
  DH: 4.2, DL: 3.9, NE: 4.5, SR: 3.8, TS: 3.6,
  // East
  CO: 4.9, IP: 5.0, NR: 5.1, SG: 5.0,
  // Wales
  CF: 5.2, LD: 3.5, LL: 3.8, NP: 4.6, SA: 4.1, SY: 3.9,
  // Scotland
  AB: 3.2, DD: 4.1, EH: 5.8, FK: 4.3, G: 5.0, IV: 2.8, KA: 3.9,
  KY: 4.5, ML: 4.2, PA: 3.7, PH: 3.5, TD: 3.1,
  // Northern Ireland
  BT: 4.8,
}

function getHPIRate(postcode: string): number {
  const prefix = postcode.replace(/\s/g, '').match(/^[A-Z]{1,2}/)?.[0] ?? ''
  return REGIONAL_HPI[prefix] ?? 4.5  // UK national average fallback
}

export async function lookupProperty(postcode: string): Promise<PropertyEstimate> {
  const clean = postcode.replace(/\s/g, '').toUpperCase()
  const formatted = clean.length > 3
    ? `${clean.slice(0, -3)} ${clean.slice(-3)}`
    : clean

  try {
    // Land Registry Price Paid Data API (free, no auth)
    const url = `https://landregistry.data.gov.uk/data/ppi/transaction-record.json` +
      `?propertyAddress.postcode=${encodeURIComponent(formatted)}` +
      `&_pageSize=5&_sort=-transactionDate`

    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    })

    if (!res.ok) throw new Error(`Land Registry returned ${res.status}`)
    const data = await res.json()

    const items = data?.result?.items
    if (!items || items.length === 0) {
      return {
        lastSale: null, estimatedValue: null, yearsSinceSale: null,
        annualGrowthPct: getHPIRate(postcode), confidence: 'low',
        disclaimer: 'No recent sale found for this postcode. Enter the value manually.',
      }
    }

    const latest = items[0]
    const price = Number(latest.pricePaid)
    const saleDate = latest.transactionDate?.['@value'] ?? latest.transactionDate ?? ''
    const address = [
      latest.propertyAddress?.paon,
      latest.propertyAddress?.street,
      latest.propertyAddress?.town,
    ].filter(Boolean).join(', ')

    const propType: Record<string, string> = {
      D: 'Detached', S: 'Semi-detached', T: 'Terraced', F: 'Flat/Maisonette', O: 'Other'
    }

    const lastSale: PropertySale = {
      address: address || formatted,
      postcode: formatted,
      price,
      date: saleDate,
      propertyType: propType[latest.propertyType] ?? 'Unknown',
    }

    // Estimate current value using regional HPI
    const annualGrowthPct = getHPIRate(postcode)
    const yearsSinceSale = saleDate
      ? (Date.now() - new Date(saleDate).getTime()) / (1000 * 60 * 60 * 24 * 365.25)
      : 5

    const growthMultiplier = Math.pow(1 + annualGrowthPct / 100, yearsSinceSale)
    const estimatedValue = Math.round(price * growthMultiplier)

    const confidence = yearsSinceSale < 2 ? 'high' : yearsSinceSale < 5 ? 'medium' : 'low'
    const disclaimer = `Estimated using ${annualGrowthPct.toFixed(1)}% regional annual growth (ONS HPI). ` +
      `Last sold ${Math.round(yearsSinceSale)} year${yearsSinceSale > 1 ? 's' : ''} ago. ` +
      `Actual value may differ — consider a professional valuation.`

    return { lastSale, estimatedValue, yearsSinceSale, annualGrowthPct, confidence, disclaimer }
  } catch (err) {
    console.error('[property-lookup]', err)
    return {
      lastSale: null, estimatedValue: null, yearsSinceSale: null,
      annualGrowthPct: getHPIRate(postcode), confidence: 'low',
      disclaimer: 'Could not retrieve Land Registry data. Enter the value manually.',
    }
  }
}
