import { test as setup, expect } from '@playwright/test'
import path from 'path'
import fs from 'fs'

const AUTH_FILE = path.join(__dirname, '../fixtures/auth-state.json')

setup('authenticate', async ({ page }) => {
  const email = process.env.TEST_EMAIL || 'test@vaultly.app'
  const password = process.env.TEST_PASSWORD || 'TestPassword123!'

  await page.goto('/login')
  await page.waitForLoadState('networkidle')

  // Dismiss cookie banner if present
  const acceptBtn = page.getByRole('button', { name: /accept all/i })
    .or(page.getByRole('button', { name: /essential only/i }))
  if (await acceptBtn.first().isVisible({ timeout: 3000 }).catch(() => false)) {
    await acceptBtn.first().click()
    await page.waitForTimeout(500)
  }

  // Page heading is "Welcome back"
  await expect(page.getByText(/welcome back/i)).toBeVisible({ timeout: 10000 })

  // Fill email + password
  await page.getByPlaceholder('you@example.com').fill(email)
  await page.getByPlaceholder('••••••••').fill(password)
  await page.getByRole('button', { name: /sign in/i }).click()

  // Wait for redirect to dashboard
  await page.waitForURL('**/dashboard', { timeout: 20000 })
  await expect(page).toHaveURL(/dashboard/)

  // Save session
  const dir = path.dirname(AUTH_FILE)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  await page.context().storageState({ path: AUTH_FILE })
  console.log('✅ Auth session saved to', AUTH_FILE)
})
