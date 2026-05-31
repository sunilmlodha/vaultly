export interface EMIHealth {
  totalMonthlyEMI: number;
  estimatedMonthlyIncome: number;
  emiToIncomeRatio: number;
  status: 'healthy' | 'caution' | 'danger' | 'critical';
  statusColour: string;
  statusEmoji: string;
  message: string;
  advice: string;
}

export function calculateEMIHealth(
  monthlyEMIs: number[],
  annualIncome: number
): EMIHealth {
  const totalMonthlyEMI = monthlyEMIs.reduce((sum, emi) => sum + emi, 0);
  const estimatedMonthlyIncome = annualIncome / 12;
  const emiToIncomeRatio =
    estimatedMonthlyIncome > 0
      ? (totalMonthlyEMI / estimatedMonthlyIncome) * 100
      : 0;

  let status: EMIHealth['status'];
  let statusColour: string;
  let statusEmoji: string;
  let message: string;
  let advice: string;

  if (emiToIncomeRatio < 35) {
    status = 'healthy';
    statusColour = 'text-emerald-600';
    statusEmoji = '✅';
    message = 'Your EMI load is manageable';
    advice =
      'Great job! Keep maintaining a healthy EMI-to-income ratio. Consider investing the surplus.';
  } else if (emiToIncomeRatio < 50) {
    status = 'caution';
    statusColour = 'text-amber-500';
    statusEmoji = '⚠️';
    message = 'EMIs are eating into your budget';
    advice =
      'Try to avoid taking on new loans. Focus on paying down existing EMIs to improve your financial flexibility.';
  } else if (emiToIncomeRatio < 65) {
    status = 'danger';
    statusColour = 'text-orange-500';
    statusEmoji = '🔶';
    message = 'High EMI burden — consider refinancing';
    advice =
      'Your EMI burden is high. Look into refinancing options or making partial prepayments to reduce your monthly obligations.';
  } else {
    status = 'critical';
    statusColour = 'text-red-600';
    statusEmoji = '🚨';
    message = 'Critical: EMIs exceed safe limits';
    advice =
      'Immediate action needed. Seek financial counselling, consider loan restructuring, and avoid any new credit obligations.';
  }

  return {
    totalMonthlyEMI,
    estimatedMonthlyIncome,
    emiToIncomeRatio,
    status,
    statusColour,
    statusEmoji,
    message,
    advice,
  };
}

export function estimateMonthlyIncome(
  assets: Array<{ category: string; value: number }>
): number {
  const liquidCategories = [
    'savings',
    'cash',
    'fixed deposit',
    'fd',
    'liquid fund',
    'money market',
    'current account',
    'checking',
  ];

  const liquidTotal = assets
    .filter((asset) =>
      liquidCategories.some((cat) =>
        asset.category.toLowerCase().includes(cat)
      )
    )
    .reduce((sum, asset) => sum + asset.value, 0);

  return liquidTotal / 6;
}

export interface EMIOptimisation {
  type: 'refinance' | 'prepay' | 'consolidate';
  title: string;
  description: string;
  estimatedMonthlySaving: number;
}

export function getEMIOptimisations(
  emis: Array<{
    name: string;
    monthlyEMI: number;
    interestRate: number;
    balance: number;
  }>
): EMIOptimisation[] {
  const suggestions: EMIOptimisation[] = [];

  if (emis.length === 0) return suggestions;

  // Refinance: flag the loan with the highest interest rate (above 10%)
  const sortedByRate = [...emis].sort(
    (a, b) => b.interestRate - a.interestRate
  );
  const highRateLoan = sortedByRate[0];
  if (highRateLoan && highRateLoan.interestRate > 10) {
    const refinanceRate = highRateLoan.interestRate - 2;
    const estimatedSaving = Math.round(
      (highRateLoan.balance * (highRateLoan.interestRate - refinanceRate)) /
        100 /
        12
    );
    suggestions.push({
      type: 'refinance',
      title: `Refinance your ${highRateLoan.name}`,
      description: `Your ${highRateLoan.name} carries an interest rate of ${highRateLoan.interestRate}%. Refinancing at a lower rate could reduce your monthly outgo significantly.`,
      estimatedMonthlySaving: estimatedSaving,
    });
  }

  // Prepay: flag the loan with the smallest balance (quick win)
  const sortedByBalance = [...emis].sort((a, b) => a.balance - b.balance);
  const smallestLoan = sortedByBalance[0];
  if (smallestLoan && smallestLoan.balance > 0) {
    const estimatedSaving = Math.round(smallestLoan.monthlyEMI);
    suggestions.push({
      type: 'prepay',
      title: `Prepay your ${smallestLoan.name}`,
      description: `Your ${smallestLoan.name} has the smallest outstanding balance of ₹${smallestLoan.balance.toLocaleString('en-IN')}. Prepaying this loan eliminates one EMI entirely and frees up monthly cash flow.`,
      estimatedMonthlySaving: estimatedSaving,
    });
  }

  // Consolidate: suggest if there are 3+ loans
  if (emis.length >= 3) {
    const totalEMI = emis.reduce((sum, e) => sum + e.monthlyEMI, 0);
    const avgRate =
      emis.reduce((sum, e) => sum + e.interestRate, 0) / emis.length;
    const consolidatedRate = Math.max(avgRate - 1.5, 8);
    const totalBalance = emis.reduce((sum, e) => sum + e.balance, 0);
    const consolidatedEMI = Math.round(
      (totalBalance * (consolidatedRate / 100 / 12)) /
        (1 - Math.pow(1 + consolidatedRate / 100 / 12, -60))
    );
    const estimatedSaving = Math.max(totalEMI - consolidatedEMI, 0);
    suggestions.push({
      type: 'consolidate',
      title: 'Consolidate your loans',
      description: `You have ${emis.length} active loans. Consolidating them into a single loan at a lower blended rate can simplify repayment and reduce your total monthly EMI burden.`,
      estimatedMonthlySaving: estimatedSaving,
    });
  }

  return suggestions.slice(0, 3);
}
