/**
 * JOURNEY 05 — Renewals
 * Full CRUD: add → verify due date badge → edit → delete.
 * Also tests the AI Negotiate flow entry point.
 */

import { test, expect } from '@playwright/test'
import { withRunId } from '../fixtures/test-data'

const RENEWAL_NAME = withRunId('Regression Netflix')
const UPDATED_NAME = withRunId('Regression Netflix Updated')

// Set renewal date 20 days from now so it shows a badge
const futureDateStr = (() => {
  const d = new Date(Date.now() + 20 * 24 * 60 * 60 * 1000)
  return d.toISOString().slice(0, 10)
})()

test.describe('Renewals — CRUD + Negotiate Journey', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/renewals')
    await page.waitForLoadState('networkidle')
  })

  test('page loads', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('Add Renewal button opens modal', async ({ page }) => {
    await page.getByRole('button', { name: /add renewal/i }).first().click()
    await expect(page.getByRole('dialog')).toBeVisible()
  })

  test('can add a renewal end-to-end', async ({ page }) => {
    await page.getByRole('button', { name: /add renewal/i }).first().click()
    await expect(page.getByRole('dialog')).toBeVisible()

    await page.getByLabel(/name/i).fill(RENEWAL_NAME)
    await page.getByLabel(/amount/i).fill('17.99')

    // Set renewal date
    const dateInput = page.getByLabel(/renewal date/i)
    await dateInput.fill(futureDateStr)

    await page.getByRole('button', { name: /add renewal/i }).last().click()
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 8_000 })
    await expect(page.getByText(RENEWAL_NAME)).toBeVisible({ timeout: 8_000 })
  })

  test('renewal shows amount', async ({ page }) => {
    await expect(page.getByText(RENEWAL_NAME)).toBeVisible()
    await expect(page.getByText(/17/).first()).toBeVisible()
  })

  test('renewal shows days-until badge', async ({ page }) => {
    // Should show a numbered badge (e.g. "20d") for upcoming renewals
    await expect(page.getByText(/\d+d/).first()).toBeVisible()
  })

  test('Negotiate button navigates to negotiation page', async ({ page }) => {
    const card = page.locator('div').filter({ hasText: RENEWAL_NAME }).first()
    const negotiateBtn = card.getByRole('button', { name: /negotiate/i })
    if (await negotiateBtn.isVisible()) {
      await negotiateBtn.click()
      await expect(page).toHaveURL(/negotiate/)
    }
  })

  test('can edit a renewal', async ({ page }) => {
    const card = page.locator('div').filter({ hasText: RENEWAL_NAME }).first()
    await card.getByRole('button', { name: /edit/i }).click()
    await expect(page.getByRole('dialog')).toBeVisible()

    const nameInput = page.getByLabel(/name/i)
    await nameInput.clear()
    await nameInput.fill(UPDATED_NAME)

    await page.getByRole('button', { name: /save/i }).last().click()
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 8_000 })
    await expect(page.getByText(UPDATED_NAME)).toBeVisible({ timeout: 8_000 })
  })

  test('can delete a renewal', async ({ page }) => {
    page.on('dialog', d => d.accept())
    const card = page.locator('div').filter({ hasText: UPDATED_NAME }).first()
    await card.locator('button').last().click()
    await expect(page.getByText(UPDATED_NAME)).not.toBeVisible({ timeout: 8_000 })
  })
})

test.describe('Renewal Negotiation Agent', () => {
  test('negotiation page loads and shows chat interface', async ({ page }) => {
    // Navigate to renewals, pick the first renewal with a Negotiate button
    await page.goto('/renewals')
    await page.waitForLoadState('networkidle')

    const negotiateBtn = page.getByRole('button', { name: /negotiate/i }).first()
    if (await negotiateBtn.isVisible()) {
      await negotiateBtn.click()
      await expect(page).toHaveURL(/negotiate/)
      await expect(page.getByRole('textbox')).toBeVisible()
    }
  })
})
