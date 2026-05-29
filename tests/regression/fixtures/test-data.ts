/**
 * Shared test data and helper functions for the regression suite.
 */

export const TEST_ASSET = {
  name: 'Regression Test ISA',
  category: 'isa_cash',
  value: '5000',
  currency: 'GBP',
  institution: 'Test Bank',
}

export const TEST_LIABILITY = {
  name: 'Regression Test Loan',
  category: 'loan',
  balance: '12000',
  currency: 'GBP',
  institution: 'Test Lender',
  interestRate: '5.5',
  monthlyPayment: '200',
}

export const TEST_GOAL = {
  name: 'Regression Holiday Fund',
  category: 'holiday',
  targetAmount: '3000',
  currentAmount: '500',
  currency: 'GBP',
}

export const TEST_RENEWAL = {
  name: 'Regression Netflix',
  category: 'subscription',
  amount: '17.99',
  currency: 'GBP',
  provider: 'Netflix Inc',
}

export const TEST_FAMILY_EMAIL = 'regression-member@vaultly.test'

/** Unique suffix to prevent test data from clashing across runs */
export const RUN_ID = Date.now().toString().slice(-6)

export function withRunId(name: string): string {
  return `${name} [${RUN_ID}]`
}
