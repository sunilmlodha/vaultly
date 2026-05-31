/**
 * SIP (Systematic Investment Plan) Calculator Library
 * For Indian mutual fund investment calculations
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Expected annual return rates by fund category (in percentage).
 * Based on long-term historical data for Indian mutual funds.
 */
export const CATEGORY_RETURNS: Record<string, number> = {
  equity: 12,   // Long-term historical NIFTY 50
  elss: 12,     // Equity Linked Savings Scheme (80C eligible)
  index: 11,    // Index funds (NIFTY 50 / NIFTY 100)
  hybrid: 10,   // Balanced / hybrid funds
  debt: 7,      // Debt / bond funds
  liquid: 6.5,  // Liquid / money market funds
};

/**
 * 80C deduction limit under Indian Income Tax Act (INR)
 */
const SECTION_80C_LIMIT = 150000;

// ---------------------------------------------------------------------------
// Types / Interfaces
// ---------------------------------------------------------------------------

export type SIPProjection = { year: number; invested: number; value: number }[];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns the monthly interest rate from an annual percentage.
 */
function monthlyRate(annualReturnPct: number): number {
  return annualReturnPct / 100 / 12;
}

// ---------------------------------------------------------------------------
// 1. calculateSIPReturns
// ---------------------------------------------------------------------------

/**
 * Calculates the future value of a regular monthly SIP investment.
 *
 * Uses the SIP Future Value formula:
 *   FV = P * [((1 + r)^n - 1) / r] * (1 + r)
 * where r = monthly rate, n = total months.
 *
 * XIRR is simply the annualReturnPct because the investment earns at that rate
 * (no partial-year distortion for whole-year SIPs).
 */
export function calculateSIPReturns(params: {
  monthlyAmount: number;
  annualReturnPct: number;
  years: number;
}): {
  totalInvested: number;
  estimatedValue: number;
  wealthGained: number;
  xirr: number;
} {
  const { monthlyAmount, annualReturnPct, years } = params;
  const r = monthlyRate(annualReturnPct);
  const n = years * 12;

  const totalInvested = monthlyAmount * n;

  let estimatedValue: number;
  if (r === 0) {
    estimatedValue = totalInvested;
  } else {
    estimatedValue = monthlyAmount * (((Math.pow(1 + r, n) - 1) / r) * (1 + r));
  }

  const wealthGained = estimatedValue - totalInvested;

  return {
    totalInvested: Math.round(totalInvested),
    estimatedValue: Math.round(estimatedValue),
    wealthGained: Math.round(wealthGained),
    xirr: annualReturnPct,
  };
}

// ---------------------------------------------------------------------------
// 2. calculateSIPRequired
// ---------------------------------------------------------------------------

/**
 * Calculates the monthly SIP amount required to reach a target corpus.
 *
 * Inverts the SIP Future Value formula:
 *   P = FV * r / [((1 + r)^n - 1) * (1 + r)]
 */
export function calculateSIPRequired(params: {
  targetAmount: number;
  years: number;
  annualReturnPct: number;
}): { monthlySIP: number } {
  const { targetAmount, years, annualReturnPct } = params;
  const r = monthlyRate(annualReturnPct);
  const n = years * 12;

  let monthlySIP: number;
  if (r === 0) {
    monthlySIP = targetAmount / n;
  } else {
    monthlySIP = (targetAmount * r) / ((Math.pow(1 + r, n) - 1) * (1 + r));
  }

  return { monthlySIP: Math.ceil(monthlySIP) };
}

// ---------------------------------------------------------------------------
// 3. calculateLumpsumReturns
// ---------------------------------------------------------------------------

/**
 * Calculates the future value of a one-time (lumpsum) investment.
 *
 * Uses compound interest formula:
 *   FV = P * (1 + r)^n
 * where r = annual rate, n = years.
 */
export function calculateLumpsumReturns(params: {
  principal: number;
  annualReturnPct: number;
  years: number;
}): { estimatedValue: number; wealthGained: number } {
  const { principal, annualReturnPct, years } = params;
  const r = annualReturnPct / 100;

  const estimatedValue = principal * Math.pow(1 + r, years);
  const wealthGained = estimatedValue - principal;

  return {
    estimatedValue: Math.round(estimatedValue),
    wealthGained: Math.round(wealthGained),
  };
}

// ---------------------------------------------------------------------------
// 5. getSIPProjection
// ---------------------------------------------------------------------------

/**
 * Returns a year-by-year breakdown of invested amount vs portfolio value
 * for a SIP over the given duration.
 */
export function getSIPProjection(
  monthlyAmount: number,
  annualReturnPct: number,
  years: number,
): SIPProjection {
  const r = monthlyRate(annualReturnPct);
  const projection: SIPProjection = [];

  for (let year = 1; year <= years; year++) {
    const n = year * 12;
    const invested = monthlyAmount * n;
    let value: number;

    if (r === 0) {
      value = invested;
    } else {
      value = monthlyAmount * (((Math.pow(1 + r, n) - 1) / r) * (1 + r));
    }

    projection.push({
      year,
      invested: Math.round(invested),
      value: Math.round(value),
    });
  }

  return projection;
}

// ---------------------------------------------------------------------------
// 7. get80CSIPRecommendation
// ---------------------------------------------------------------------------

/**
 * Recommends an ELSS SIP amount to fully utilise the Section 80C deduction limit.
 *
 * Returns null if the 80C limit is already exhausted.
 *
 * @param currentInvestment - Total 80C-eligible investments already made (annual, INR)
 */
export function get80CSIPRecommendation(
  currentInvestment: number,
): { fundType: string; amount: number; reason: string } | null {
  const remaining = SECTION_80C_LIMIT - currentInvestment;

  if (remaining <= 0) {
    return null;
  }

  const monthlySIP = Math.ceil(remaining / 12);

  return {
    fundType: "ELSS",
    amount: monthlySIP,
    reason: `Investing ₹${monthlySIP.toLocaleString("en-IN")}/month in ELSS will help you utilise the remaining ₹${remaining.toLocaleString("en-IN")} of your Section 80C deduction limit of ₹1,50,000, potentially saving tax on that amount.`,
  };
}
