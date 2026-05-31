/**
 * India-specific EPF (Employee Provident Fund) Tracing Extension
 * Helps users locate and estimate balances across past EPF accounts
 */

// ─── Interfaces ─────────────────────────────────────────────────────────────

export interface EPFAccount {
  id: string;
  employerName: string;
  uan: string | null; // Universal Account Number
  estimatedBalance: number | null;
  joinDate: string;
  exitDate: string | null;
  status: 'active' | 'dormant' | 'transferred' | 'unknown';
  membershipId: string | null;
}

export interface EPFTracingResult {
  accounts: EPFAccount[];
  totalEstimatedBalance: number;
  dormantCount: number;
  uanStatus: 'linked' | 'not_linked' | 'unknown';
  actionRequired: string[];
  epfoPortalUrl: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

export const EPFO_RESOURCES = {
  portal: 'https://unifiedportal-mem.epfindia.gov.in',
  uanActivation: 'https://unifiedportal-mem.epfindia.gov.in/memberinterface/',
  claimForm: 'https://unifiedportal-mem.epfindia.gov.in/memberinterface/',
  grievance: 'https://epfigms.gov.in',
} as const;

/** EPFO declared annual interest rate (as a decimal) */
const EPFO_ANNUAL_INTEREST_RATE = 0.08;

/** Number of months in a year */
const MONTHS_PER_YEAR = 12;

/** Employee EPF contribution rate */
const EMPLOYEE_EPF_RATE = 0.12;

/**
 * Years of service threshold beyond which an account with no recorded
 * transfer is flagged as dormant.
 */
const DORMANT_THRESHOLD_YEARS = 2;

// ─── Helper utilities ────────────────────────────────────────────────────────

/**
 * Calculate the difference in fractional years between two ISO date strings.
 * If `endDate` is null the current date is used (ongoing employment).
 */
function yearsBetween(startDate: string, endDate: string | null): number {
  const start = new Date(startDate).getTime();
  const end = endDate ? new Date(endDate).getTime() : Date.now();
  const msPerYear = 365.25 * 24 * 60 * 60 * 1000;
  return Math.max(0, (end - start) / msPerYear);
}

/**
 * Returns true when an exit date is more than `DORMANT_THRESHOLD_YEARS` ago.
 */
function isExitOlderThanThreshold(exitDate: string): boolean {
  const exitMs = new Date(exitDate).getTime();
  const thresholdMs = DORMANT_THRESHOLD_YEARS * 365.25 * 24 * 60 * 60 * 1000;
  return Date.now() - exitMs > thresholdMs;
}

/**
 * Generate a deterministic-looking (but not cryptographic) account id from
 * an employer name and its index position in the history list.
 */
function generateAccountId(employerName: string, index: number): string {
  const slug = employerName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 20);
  return `epf-${slug}-${index}`;
}

// ─── Core functions ──────────────────────────────────────────────────────────

/**
 * Calculate the estimated EPF corpus accumulated over a period of service.
 *
 * Formula:
 *   Monthly EPF contribution = 12% of monthlyBasicSalary (employee share that
 *   goes into the PF account; the employer's 8.33% goes mainly to EPS/pension
 *   and is excluded from the lump-sum PF balance estimate).
 *
 *   We compound the monthly contributions at the EPFO declared annual interest
 *   rate using a future-value-of-annuity formula:
 *     FV = PMT * [((1 + r)^n - 1) / r]
 *   where r = monthly interest rate and n = total months.
 *
 * @param monthlyBasicSalary - Gross basic salary per month in INR
 * @param yearsOfService     - Duration of employment in years (fractional ok)
 * @returns Estimated EPF balance in INR
 */
export function calculateEPFEstimate(
  monthlyBasicSalary: number,
  yearsOfService: number,
): number {
  if (monthlyBasicSalary <= 0 || yearsOfService <= 0) return 0;

  const monthlyContribution = EMPLOYEE_EPF_RATE * monthlyBasicSalary;
  const monthlyRate = EPFO_ANNUAL_INTEREST_RATE / MONTHS_PER_YEAR;
  const totalMonths = Math.round(yearsOfService * MONTHS_PER_YEAR);

  if (totalMonths === 0) return 0;

  // Future value of a regular annuity (end-of-period contributions)
  const fv =
    monthlyContribution * ((Math.pow(1 + monthlyRate, totalMonths) - 1) / monthlyRate);

  return Math.round(fv);
}

/**
 * Trace potential EPF accounts from an employment history and build a
 * consolidated result with action items.
 *
 * @param employmentHistory - Array of employment records
 * @returns EPFTracingResult with per-account details and summary
 */
export function traceEPFFromEmployment(
  employmentHistory: Array<{
    employerName: string;
    startDate: string;
    endDate: string | null;
    isCurrentEmployer: boolean;
  }>,
): EPFTracingResult {
  const accounts: EPFAccount[] = [];
  const actionRequired: string[] = [];

  for (let i = 0; i < employmentHistory.length; i++) {
    const emp = employmentHistory[i];
    const yearsOfService = yearsBetween(emp.startDate, emp.endDate);

    // Determine account status
    let status: EPFAccount['status'];
    if (emp.isCurrentEmployer) {
      status = 'active';
    } else if (emp.endDate && isExitOlderThanThreshold(emp.endDate)) {
      // Past employer, exit was more than 2 years ago — likely dormant unless
      // the user transferred. We flag it as dormant conservatively.
      status = 'dormant';
    } else if (emp.endDate) {
      // Recently left — transfer window still open; treat as unknown
      status = 'unknown';
    } else {
      status = 'unknown';
    }

    // Estimate balance only when service duration is meaningful.
    // We use a rough median basic salary assumption when no salary data is
    // available. For a more accurate figure the caller should use
    // calculateEPFEstimate() directly with the actual salary.
    let estimatedBalance: number | null = null;
    if (yearsOfService >= 0.5) {
      // Significant service: use a conservative median basic salary of
      // INR 25,000/month as a placeholder. Employers with >2 years of service
      // are highlighted with an action item.
      const medianBasic = 25_000;
      estimatedBalance = calculateEPFEstimate(medianBasic, yearsOfService);
    }

    const account: EPFAccount = {
      id: generateAccountId(emp.employerName, i),
      employerName: emp.employerName,
      uan: null, // UAN is fetched externally via EPFO portal
      estimatedBalance,
      joinDate: emp.startDate,
      exitDate: emp.endDate,
      status,
      membershipId: null, // Populated after EPFO lookup
    };

    accounts.push(account);

    // Collect action items
    if (status === 'dormant') {
      actionRequired.push(
        `Initiate PF transfer or withdrawal for dormant account at "${emp.employerName}" ` +
          `(exit: ${emp.endDate}).`,
      );
    }

    if (yearsOfService > DORMANT_THRESHOLD_YEARS && !emp.isCurrentEmployer) {
      actionRequired.push(
        `Verify PF transfer was completed for "${emp.employerName}" — ` +
          `${yearsOfService.toFixed(1)} years of service recorded.`,
      );
    }
  }

  // Deduplication guard: add a reminder to check UAN linkage
  const hasMultipleAccounts = accounts.length > 1;
  if (hasMultipleAccounts) {
    actionRequired.push(
      'Link all past member IDs to your UAN on the EPFO Unified Portal to consolidate accounts.',
    );
  }

  const totalEstimatedBalance = accounts.reduce(
    (sum, acc) => sum + (acc.estimatedBalance ?? 0),
    0,
  );

  const dormantCount = accounts.filter((a) => a.status === 'dormant').length;

  // UAN status: unknown until the user verifies on the portal
  const uanStatus: EPFTracingResult['uanStatus'] = 'unknown';

  if (actionRequired.length === 0) {
    actionRequired.push(
      'Log in to the EPFO Unified Portal to verify your UAN and confirm account balances.',
    );
  }

  return {
    accounts,
    totalEstimatedBalance,
    dormantCount,
    uanStatus,
    actionRequired,
    epfoPortalUrl: EPFO_RESOURCES.portal,
  };
}
