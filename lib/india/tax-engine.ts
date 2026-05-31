// India Tax Optimisation Engine — FY 2024-25
// Uses Indian Income Tax Act slabs, deductions, and exemptions

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export interface TaxInputs {
  /** Annual gross income in INR */
  grossIncome: number;
  /** Total invested under Section 80C (EPF + PPF + ELSS + LIC + tuition + home loan principal etc.) */
  section80CInvested: number;
  /** Additional NPS contribution under Section 80CCD(1B) */
  npsContribution: number;
  /** HRA received from employer (annual) */
  hraReceived: number;
  /** Monthly rent paid */
  rentPaid: number;
  /** Whether the rented city is a metro (Mumbai, Delhi, Chennai, Kolkata) */
  isMetroCity: boolean;
  /** Interest on home loan under Section 24(b) */
  homeLoanInterest: number;
  /** Home loan principal (included in section80CInvested, tracked separately for clarity) */
  homeLoanPrincipal: number;
  /** Regime the user is currently filing under */
  currentRegime: 'old' | 'new';
}

export interface TaxResult {
  taxableIncome: number;
  estimatedTax: number;
  /** Effective tax rate as a percentage (0–100) */
  effectiveRate: number;
  savings80C: {
    invested: number;
    limit: number;
    remaining: number;
    potentialSaving: number;
  };
  savingsNPS: {
    invested: number;
    additionalAllowed: number;
    potentialSaving: number;
  };
  savingsHRA: {
    exemption: number;
  };
  savingsHomeLoan: {
    deduction: number;
  };
  totalPotentialSaving: number;
  /** One-line personalised recommendation */
  recommendation: string;
  regime: 'old' | 'new';
  recommendedRegime: 'old' | 'new';
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const SECTION_80C_LIMIT = 150_000; // ₹1,50,000
export const NPS_ADDITIONAL_LIMIT = 50_000; // ₹50,000 under 80CCD(1B)
export const STANDARD_DEDUCTION_OLD = 50_000;
export const STANDARD_DEDUCTION_NEW = 75_000;
export const HOME_LOAN_INTEREST_LIMIT = 200_000; // ₹2,00,000 under Section 24(b)

export const SECTION_80C_ITEMS: Array<{
  id: string;
  label: string;
  maxAmount: number;
  description: string;
}> = [
  {
    id: 'epf',
    label: 'Employee Provident Fund (EPF)',
    maxAmount: 150_000,
    description: "Employee's contribution to EPF — mandatory for salaried employees, tax-free on maturity.",
  },
  {
    id: 'ppf',
    label: 'Public Provident Fund (PPF)',
    maxAmount: 150_000,
    description: 'Government-backed 15-year scheme with 7.1% p.a. interest, fully EEE (exempt-exempt-exempt).',
  },
  {
    id: 'elss',
    label: 'Equity Linked Savings Scheme (ELSS)',
    maxAmount: 150_000,
    description: 'Mutual fund with 3-year lock-in, highest potential returns among 80C options.',
  },
  {
    id: 'lic',
    label: 'Life Insurance Premium (LIC / others)',
    maxAmount: 150_000,
    description: 'Premiums paid for life insurance policies on self, spouse, or dependent children.',
  },
  {
    id: 'tuition',
    label: 'Tuition Fees',
    maxAmount: 150_000,
    description: 'Tuition fees paid for full-time education of up to 2 children in India.',
  },
  {
    id: 'home_loan_principal',
    label: 'Home Loan Principal Repayment',
    maxAmount: 150_000,
    description: 'Principal component of EMI for self-occupied or let-out residential property.',
  },
  {
    id: 'nsc',
    label: 'National Savings Certificate (NSC)',
    maxAmount: 150_000,
    description: '5-year post-office instrument with 7.7% p.a. interest; accrued interest is also deductible.',
  },
  {
    id: 'scss',
    label: 'Senior Citizens Savings Scheme (SCSS)',
    maxAmount: 150_000,
    description: 'For investors aged 60+; 5-year tenure with 8.2% p.a. interest (highest among small savings).',
  },
  {
    id: 'sukanya',
    label: 'Sukanya Samriddhi Yojana (SSY)',
    maxAmount: 150_000,
    description: "Girl-child savings scheme with 8.2% p.a. interest, fully EEE — ideal for daughter's higher education or marriage.",
  },
];

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Compute tax on taxable income using Indian slab rates.
 * Marginal relief / rebate under Section 87A is applied:
 *   - Old regime: income ≤ ₹5L → full rebate (tax = 0)
 *   - New regime: income ≤ ₹7L → full rebate (tax = 0)
 * Health & Education cess: 4% on tax.
 */
function applySlabs(
  taxableIncome: number,
  regime: 'old' | 'new',
): number {
  if (taxableIncome <= 0) return 0;

  let tax = 0;

  if (regime === 'old') {
    // Old regime slabs (FY 2024-25)
    if (taxableIncome > 1_000_000) {
      tax += (taxableIncome - 1_000_000) * 0.3;
      taxableIncome = 1_000_000;
    }
    if (taxableIncome > 500_000) {
      tax += (taxableIncome - 500_000) * 0.2;
      taxableIncome = 500_000;
    }
    if (taxableIncome > 250_000) {
      tax += (taxableIncome - 250_000) * 0.05;
    }

    // Section 87A rebate — old regime: net taxable ≤ ₹5L
    if (taxableIncome <= 500_000) {
      tax = 0;
    }
  } else {
    // New regime slabs (FY 2024-25)
    if (taxableIncome > 1_500_000) {
      tax += (taxableIncome - 1_500_000) * 0.3;
      taxableIncome = 1_500_000;
    }
    if (taxableIncome > 1_200_000) {
      tax += (taxableIncome - 1_200_000) * 0.2;
      taxableIncome = 1_200_000;
    }
    if (taxableIncome > 900_000) {
      tax += (taxableIncome - 900_000) * 0.15;
      taxableIncome = 900_000;
    }
    if (taxableIncome > 600_000) {
      tax += (taxableIncome - 600_000) * 0.1;
      taxableIncome = 600_000;
    }
    if (taxableIncome > 300_000) {
      tax += (taxableIncome - 300_000) * 0.05;
    }

    // Section 87A rebate — new regime: net taxable ≤ ₹7L
    if (taxableIncome <= 700_000) {
      tax = 0;
    }
  }

  // Health & Education cess @ 4%
  tax = tax * 1.04;

  return Math.round(tax);
}

/**
 * Compute taxable income for the old regime after all deductions.
 */
function computeOldRegimeTaxableIncome(inputs: TaxInputs): number {
  let income = inputs.grossIncome;

  // Standard deduction
  income -= STANDARD_DEDUCTION_OLD;

  // Section 80C (capped at ₹1.5L)
  const deduction80C = Math.min(inputs.section80CInvested, SECTION_80C_LIMIT);
  income -= deduction80C;

  // Section 80CCD(1B) — NPS additional (capped at ₹50K)
  const deductionNPS = Math.min(inputs.npsContribution, NPS_ADDITIONAL_LIMIT);
  income -= deductionNPS;

  // HRA exemption (only if rent is paid)
  if (inputs.rentPaid > 0 && inputs.hraReceived > 0) {
    const hraExemption = computeHRAExemption(inputs);
    income -= hraExemption;
  }

  // Section 24(b) — home loan interest (capped at ₹2L for self-occupied)
  const homeLoanInterestDeduction = Math.min(inputs.homeLoanInterest, HOME_LOAN_INTEREST_LIMIT);
  income -= homeLoanInterestDeduction;

  return Math.max(0, income);
}

/**
 * Compute taxable income for the new regime — very few deductions allowed.
 * Standard deduction is ₹75,000; no 80C, NPS (via payroll employer is allowed
 * but employee additional 80CCD(1B) is not), no HRA, no home loan interest.
 */
function computeNewRegimeTaxableIncome(inputs: TaxInputs): number {
  const income = inputs.grossIncome - STANDARD_DEDUCTION_NEW;
  return Math.max(0, income);
}

/**
 * HRA exemption = minimum of:
 *   (a) HRA received
 *   (b) Rent paid − 10% of basic salary (approx: we treat grossIncome * 40% as basic)
 *   (c) 50% of basic (metro) or 40% of basic (non-metro)
 */
function computeHRAExemption(inputs: TaxInputs): number {
  if (inputs.rentPaid <= 0 || inputs.hraReceived <= 0) return 0;

  const annualRent = inputs.rentPaid * 12;
  // Basic salary approximation: 40% of gross income
  const basicSalary = inputs.grossIncome * 0.4;

  const a = inputs.hraReceived;
  const b = Math.max(0, annualRent - 0.1 * basicSalary);
  const c = inputs.isMetroCity ? 0.5 * basicSalary : 0.4 * basicSalary;

  return Math.min(a, b, c);
}

// ---------------------------------------------------------------------------
// Main exported function
// ---------------------------------------------------------------------------

export function calculateTax(inputs: TaxInputs): TaxResult {
  // Compute taxable incomes under both regimes
  const oldTaxableIncome = computeOldRegimeTaxableIncome(inputs);
  const newTaxableIncome = computeNewRegimeTaxableIncome(inputs);

  const oldTax = applySlabs(oldTaxableIncome, 'old');
  const newTax = applySlabs(newTaxableIncome, 'new');

  // Determine which regime is more beneficial
  const recommendedRegime: 'old' | 'new' = oldTax <= newTax ? 'old' : 'new';

  // Use selected regime for result
  const regime = inputs.currentRegime;
  const taxableIncome = regime === 'old' ? oldTaxableIncome : newTaxableIncome;
  const estimatedTax = regime === 'old' ? oldTax : newTax;
  const effectiveRate =
    inputs.grossIncome > 0
      ? parseFloat(((estimatedTax / inputs.grossIncome) * 100).toFixed(2))
      : 0;

  // ---------------------------------------------------------------------------
  // Potential savings breakdown
  // ---------------------------------------------------------------------------

  // 80C
  const invested80C = Math.min(inputs.section80CInvested, SECTION_80C_LIMIT);
  const remaining80C = Math.max(0, SECTION_80C_LIMIT - invested80C);
  // Marginal tax rate approximation for saving calculations
  const marginalRate = inputs.grossIncome > 1_000_000 ? 0.312 : inputs.grossIncome > 500_000 ? 0.208 : 0.052;
  const potentialSaving80C = regime === 'old' ? Math.round(remaining80C * marginalRate) : 0;

  // NPS
  const investedNPS = Math.min(inputs.npsContribution, NPS_ADDITIONAL_LIMIT);
  const additionalNPSAllowed = Math.max(0, NPS_ADDITIONAL_LIMIT - investedNPS);
  const potentialSavingNPS = regime === 'old' ? Math.round(additionalNPSAllowed * marginalRate) : 0;

  // HRA
  const hraExemption = regime === 'old' ? computeHRAExemption(inputs) : 0;

  // Home loan interest deduction
  const homeLoanDeduction =
    regime === 'old'
      ? Math.min(inputs.homeLoanInterest, HOME_LOAN_INTEREST_LIMIT)
      : 0;

  const totalPotentialSaving = potentialSaving80C + potentialSavingNPS;

  // ---------------------------------------------------------------------------
  // One-line recommendation
  // ---------------------------------------------------------------------------
  let recommendation: string;

  if (inputs.currentRegime !== recommendedRegime) {
    const saving = Math.abs(oldTax - newTax);
    recommendation = `Switch to the ${recommendedRegime} regime to save approximately ₹${saving.toLocaleString('en-IN')} in tax this year.`;
  } else if (regime === 'old' && remaining80C > 0) {
    recommendation = `Invest ₹${remaining80C.toLocaleString('en-IN')} more under Section 80C (e.g., ELSS or PPF) to save up to ₹${potentialSaving80C.toLocaleString('en-IN')} in tax.`;
  } else if (regime === 'old' && additionalNPSAllowed > 0) {
    recommendation = `Contribute ₹${additionalNPSAllowed.toLocaleString('en-IN')} to NPS under 80CCD(1B) to save an additional ₹${potentialSavingNPS.toLocaleString('en-IN')} in tax.`;
  } else if (regime === 'old' && inputs.rentPaid > 0 && inputs.hraReceived === 0) {
    recommendation = 'Claim HRA exemption by submitting rent receipts to your employer to reduce your taxable income.';
  } else if (regime === 'new') {
    recommendation = 'Under the new regime, focus on salary restructuring (NPS employer contribution) to further reduce your tax liability.';
  } else {
    recommendation = 'Your tax planning looks optimised — review annually as income grows.';
  }

  return {
    taxableIncome,
    estimatedTax,
    effectiveRate,
    savings80C: {
      invested: invested80C,
      limit: SECTION_80C_LIMIT,
      remaining: remaining80C,
      potentialSaving: potentialSaving80C,
    },
    savingsNPS: {
      invested: investedNPS,
      additionalAllowed: additionalNPSAllowed,
      potentialSaving: potentialSavingNPS,
    },
    savingsHRA: {
      exemption: hraExemption,
    },
    savingsHomeLoan: {
      deduction: homeLoanDeduction,
    },
    totalPotentialSaving,
    recommendation,
    regime,
    recommendedRegime,
  };
}

// ---------------------------------------------------------------------------
// 80C recommendations
// ---------------------------------------------------------------------------

/**
 * Returns an array of suggestions based on how much of the ₹1,50,000
 * Section 80C limit remains to be invested.
 */
export function get80CRecommendations(invested: number): string[] {
  const remaining = Math.max(0, SECTION_80C_LIMIT - Math.min(invested, SECTION_80C_LIMIT));

  if (remaining === 0) {
    return ['Your Section 80C limit of ₹1,50,000 is fully utilised — great tax planning!'];
  }

  const suggestions: string[] = [];
  const formattedRemaining = remaining.toLocaleString('en-IN');

  suggestions.push(
    `You have ₹${formattedRemaining} remaining under Section 80C. Consider the following options:`,
  );

  if (remaining >= 500) {
    suggestions.push(
      `ELSS (Equity Linked Savings Scheme): Invest up to ₹${formattedRemaining} for market-linked returns with a 3-year lock-in — the shortest among 80C instruments.`,
    );
  }

  if (remaining >= 500) {
    suggestions.push(
      `PPF (Public Provident Fund): Park up to ₹${formattedRemaining} in a government-backed scheme offering 7.1% p.a. tax-free returns over 15 years.`,
    );
  }

  if (remaining >= 1_000) {
    suggestions.push(
      `NSC (National Savings Certificate): A safe, fixed-return post-office instrument — accrued interest also qualifies for 80C in subsequent years.`,
    );
  }

  if (remaining >= 1_000) {
    suggestions.push(
      `Increase your VPF (Voluntary Provident Fund) contribution through your employer to utilise the remaining ₹${formattedRemaining} with zero market risk.`,
    );
  }

  if (remaining >= 1_000) {
    suggestions.push(
      `If you have a daughter under 10 years, open a Sukanya Samriddhi Yojana account and invest up to ₹${formattedRemaining} at 8.2% p.a., fully tax-free.`,
    );
  }

  return suggestions;
}
