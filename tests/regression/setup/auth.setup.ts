/**
 * Auth setup — runs once before all regression tests.
 * Logs in with test credentials and saves session state to fixture file.
 * All regression tests load this state so they skip the login step.
 *
 * Set TEST_EMAIL / TEST_PASSWORD environment variables, or use the defaults.
 */

import { test as setup, expect } from '@playwright/test'
import path from 'path'
import fs from 'fs'

const AUTH_FILE = path.join(__dirname, '../fixtures/auth-state.json')

setup('authenticate', async ({ page }) => {
  const email = process.env.TEST_EMAIL || 'test@vaultly.app'
  const password = process.env.TEST_PASSWORD || 'TestPassword123!'

  await page.goto('/login')
  await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible()

  await page.getByLabel(/email/i).fill(email)
  await page.getByLabel(/password/i).fill(password)
  await page.getByRole('button', { name: /sign in/i }).click()

  // Wait for redirect to dashboard
  await page.waitForURL('**/dashboard', { timeout: 15_000 })
  await expect(page).toHaveURL(/dashboard/)

  // Ensure fixtures directory exists
  const dir = path.dirname(AUTH_FILE)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

  await page.context().storageState({ path: AUTH_FILE })
})
