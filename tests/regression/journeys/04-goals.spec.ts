/**
 * JOURNEY 04 — Goals
 * Full CRUD: add → verify progress bar → trigger AI coach → edit → delete.
 */

import { test, expect } from '@playwright/test'
import { withRunId } from '../fixtures/test-data'

const GOAL_NAME = withRunId('Regression Holiday')
const UPDATED_NAME = withRunId('Regression Holiday Updated')

test.describe('Goals — CRUD + AI Coach Journey', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/goals')
    await page.waitForLoadState('networkidle')
  })

  test('page loads', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('Add Goal button opens modal', async ({ page }) => {
    await page.getByRole('button', { name: /add goal/i }).first().click()
    await expect(page.getByRole('dialog')).toBeVisible()
  })

  test('can add a goal end-to-end', async ({ page }) => {
    await page.getByRole('button', { name: /add goal/i }).first().click()
    await expect(page.getByRole('dialog')).toBeVisible()

    await page.getByLabel(/goal name/i).fill(GOAL_NAME)
    await page.getByLabel(/target/i).first().fill('3000')
    await page.getByLabel(/saved so far/i).fill('750')

    await page.getByRole('button', { name: /add goal/i }).last().click()
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 8_000 })
    await expect(page.getByText(GOAL_NAME)).toBeVisible({ timeout: 8_000 })
  })

  test('progress bar shows correct percentage', async ({ page }) => {
    await expect(page.getByText(GOAL_NAME)).toBeVisible()
    // 750/3000 = 25%
    await expect(page.getByText('25%')).toBeVisible()
  })

  test('shows current and target amounts', async ({ page }) => {
    await expect(page.getByText(/750/).first()).toBeVisible()
    await expect(page.getByText(/3,000/).first()).toBeVisible()
  })

  test('AI Coach button triggers loading state', async ({ page }) => {
    const card = page.locator('div').filter({ hasText: GOAL_NAME }).first()
    await card.getByRole('button', { name: /coach/i }).click()
    // Should show loading or coach result
    const coachArea = page.getByText(/coach|loading|tip|on track|savings/i).first()
    await expect(coachArea).toBeVisible({ timeout: 15_000 })
  })

  test('can edit a goal', async ({ page }) => {
    const card = page.locator('div').filter({ hasText: GOAL_NAME }).first()
    await card.getByRole('button', { name: /edit/i }).click()
    await expect(page.getByRole('dialog')).toBeVisible()

    const nameInput = page.getByLabel(/goal name/i)
    await nameInput.clear()
    await nameInput.fill(UPDATED_NAME)

    await page.getByRole('button', { name: /save/i }).last().click()
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 8_000 })
    await expect(page.getByText(UPDATED_NAME)).toBeVisible({ timeout: 8_000 })
  })

  test('can delete a goal', async ({ page }) => {
    page.on('dialog', d => d.accept())
    const card = page.locator('div').filter({ hasText: UPDATED_NAME }).first()
    await card.locator('button').last().click()
    await expect(page.getByText(UPDATED_NAME)).not.toBeVisible({ timeout: 8_000 })
  })
})
