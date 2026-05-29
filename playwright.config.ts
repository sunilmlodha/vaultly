import { defineConfig, devices } from '@playwright/test'

/**
 * Vaultly Regression Pack — Playwright config
 * Run: npx playwright test --config=playwright.config.ts
 * UI mode: npx playwright test --ui
 * CI mode: CI=true npx playwright test
 */
export default defineConfig({
  testDir: './tests/regression',
  outputDir: './tests/regression/results',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: false, // journeys share auth state — run sequentially
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [
    ['html', { outputFolder: 'tests/regression/reports/html', open: 'never' }],
    ['json', { outputFile: 'tests/regression/reports/results.json' }],
    ['list'],
  ],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
    storageState: 'tests/regression/fixtures/auth-state.json',
  },
  projects: [
    // Auth setup — runs first, saves session to fixture file
    {
      name: 'setup',
      testMatch: '**/setup/auth.setup.ts',
      use: { storageState: undefined },
    },
    // Main regression suite
    {
      name: 'regression',
      dependencies: ['setup'],
      use: { ...devices['Desktop Chrome'] },
    },
    // Mobile viewport regression
    {
      name: 'regression-mobile',
      dependencies: ['setup'],
      use: { ...devices['iPhone 14'] },
      testMatch: '**/journeys/dashboard.spec.ts',
    },
  ],
  webServer: process.env.CI
    ? {
        command: 'npm run start',
        url: 'http://localhost:3000',
        reuseExistingServer: false,
        timeout: 120_000,
      }
    : {
        command: 'npm run dev',
        url: 'http://localhost:3000',
        reuseExistingServer: true,
        timeout: 60_000,
      },
})
