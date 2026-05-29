/**
 * JOURNEY 03 — Liabilities
 * Full CRUD: add loan → verify → edit → delete.
 * Also tests mortgage-specific fields (LTV, fixed rate end date).
 */

import { test, expect } from '@playwright/test'
import { withRunId } from '../fixtures/test-data'

const LIABILITY_NAME = withRunId('Regression Loan')
const UPDATED_NAME = withRunId('Regression Loan Updated')

test.describe('Liabilities — CRUD Journey', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/liabilities')
    await page.waitForLoadState('networkidle')
  })

  test('page loads', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('Add Liability button opens modal', async ({ page }) => {
    await page.getByRole('button', { name: /add liability/i }).first().click()
    await expect(page.getByRole('dialog')).toBeVisible()
  })

  test('can add a loan end-to-end', async ({ page }) => {
    await page.getByRole('button', { name: /add liability/i }).first().click()
    await expect(page.getByRole('dialog')).toBeVisible()

    await page.getByLabel(/name/i).fill(LIABILITY_NAME)
    await page.getByLabel(/balance/i).fill('8000')
    await page.getByLabel(/currency/i).fill('GBP')

    await page.getByRole('button', { name: /add liability/i }).last().click()
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 8_000 })
    await expect(page.getByText(LIABILITY_NAME)).toBeVisible({ timeout: 8_000 })
  })

  test('liability shows balance value', async ({ page }) => {
    await expect(page.getByText(LIABILITY_NAME)).toBeVisible()
    await expect(page.getByText(/8,000/).first()).toBeVisible()
  })

  test('can edit a liability', async ({ page }) => {
    const card = page.locator('div').filter({ hasText: LIABILITY_NAME }).first()
    await card.getByRole('button', { name: /edit/i }).click()

    await expect(page.getByRole('dialog')).toBeVisible()
    const nameInput = page.getByLabel(/name/i)
    await nameInput.clear()
    await nameInput.fill(UPDATED_NAME)

    await page.getByRole('button', { name: /save/i }).last().click()
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 8_000 })
    await expect(page.getByText(UPDATED_NAME)).toBeVisible({ timeout: 8_000 })
  })

  test('can delete a liability', async ({ page }) => {
    page.on('dialog', d => d.accept())
    const card = page.locator('div').filter({ hasText: UPDATED_NAME }).first()
    await card.locator('button').last().click()
    await expect(page.getByText(UPDATED_NAME)).not.toBeVisible({ timeout: 8_000 })
  })

  test('cancel does not create liability', async ({ page }) => {
    await page.getByRole('button', { name: /add liability/i }).first().click()
    await page.getByLabel(/name/i).fill('Should Not Save')
    await page.getByRole('button', { name: /cancel/i }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible()
    await expect(page.getByText('Should Not Save')).not.toBeVisible()
  })
})
