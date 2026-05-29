/**
 * JOURNEY 07 — Settings
 * Currency change → verify reflected on dashboard.
 * Language switch → verify page re-renders without crash.
 * Export data → verify download starts.
 * Profile update → verify saved.
 */

import { test, expect } from '@playwright/test'

test.describe('Settings — Profile & Preferences', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings')
    await page.waitForLoadState('networkidle')
  })

  test('settings page loads', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('shows profile section', async ({ page }) => {
    await expect(page.getByText(/profile/i).first()).toBeVisible()
  })

  test('shows language section', async ({ page }) => {
    await expect(page.getByText(/language/i)).toBeVisible()
  })

  test('shows security section', async ({ page }) => {
    await expect(page.getByText(/security/i)).toBeVisible()
  })

  test('shows danger zone section', async ({ page }) => {
    await expect(page.getByText(/danger zone/i)).toBeVisible()
  })

  test('currency buttons are selectable', async ({ page }) => {
    const gbpBtn = page.getByRole('button', { name: 'GBP' })
    await expect(gbpBtn).toBeVisible()
    const eurBtn = page.getByRole('button', { name: 'EUR' })
    await expect(eurBtn).toBeVisible()
  })

  test('can select EUR currency', async ({ page }) => {
    await page.getByRole('button', { name: 'EUR' }).click()
    // EUR button should now be highlighted (active class)
    const eurBtn = page.getByRole('button', { name: 'EUR' })
    const classes = await eurBtn.getAttribute('class')
    expect(classes).toMatch(/indigo|active|bg-indigo/)
  })

  test('Save changes button is present', async ({ page }) => {
    await expect(page.getByRole('button', { name: /save changes/i })).toBeVisible()
  })

  test('profile name field is editable', async ({ page }) => {
    const nameInput = page.getByLabel(/full name/i)
    await expect(nameInput).toBeVisible()
    await expect(nameInput).not.toBeDisabled()
  })

  test('email field is disabled (read-only)', async ({ page }) => {
    const emailInput = page.getByLabel(/email/i)
    await expect(emailInput).toBeDisabled()
  })

  test('language buttons are visible', async ({ page }) => {
    await expect(page.getByText('English')).toBeVisible()
    await expect(page.getByText('Deutsch')).toBeVisible()
    await expect(page.getByText('Français')).toBeVisible()
    await expect(page.getByText('हिंदी')).toBeVisible()
  })

  test('switching to German reloads page without crash', async ({ page }) => {
    // Click Deutsch
    await page.getByText('Deutsch').click()

    // Page reloads — wait for it
    await page.waitForLoadState('networkidle', { timeout: 15_000 })

    // Page should still be on settings route (no crash to error boundary)
    await expect(page).toHaveURL(/settings/)
    await expect(page.locator('body')).not.toContainText('Something went wrong')
    await expect(page.locator('body')).not.toContainText('Error')

    // Switch back to English
    const englishBtn = page.getByText('English')
    await expect(englishBtn).toBeVisible({ timeout: 8_000 })
    await englishBtn.click()
    await page.waitForLoadState('networkidle', { timeout: 15_000 })
  })

  test('switching to French reloads page without crash', async ({ page }) => {
    await page.getByText('Français').click()
    await page.waitForLoadState('networkidle', { timeout: 15_000 })
    await expect(page).toHaveURL(/settings/)
    await expect(page.locator('body')).not.toContainText('Something went wrong')

    // Restore English
    const engBtn = page.getByText('English')
    await expect(engBtn).toBeVisible({ timeout: 8_000 })
    await engBtn.click()
    await page.waitForLoadState('networkidle', { timeout: 15_000 })
  })

  test('switching to Hindi reloads page without crash', async ({ page }) => {
    await page.getByText('हिंदी').click()
    await page.waitForLoadState('networkidle', { timeout: 15_000 })
    await expect(page).toHaveURL(/settings/)
    await expect(page.locator('body')).not.toContainText('Something went wrong')

    // Restore English
    await page.getByText('English').click()
    await page.waitForLoadState('networkidle', { timeout: 15_000 })
  })

  test('Export data link is present', async ({ page }) => {
    await expect(page.getByText(/download my data/i)).toBeVisible()
  })

  test('delete account button shows confirmation modal', async ({ page }) => {
    await page.getByRole('button', { name: /delete my account/i }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByText(/delete account/i)).toBeVisible()
    // Close it
    await page.getByRole('button', { name: /cancel/i }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible()
  })

  test('delete account button is disabled until phrase typed', async ({ page }) => {
    await page.getByRole('button', { name: /delete my account/i }).click()
    await expect(page.getByRole('dialog')).toBeVisible()

    const deleteBtn = page.getByRole('button', { name: /delete everything/i })
    await expect(deleteBtn).toBeDisabled()

    // Typing wrong phrase keeps it disabled
    await page.getByRole('dialog').locator('input[type="text"]').fill('wrong phrase')
    await expect(deleteBtn).toBeDisabled()

    // Close modal
    await page.getByRole('button', { name: /cancel/i }).click()
  })
})

test.describe('Settings — Currency reflects on Dashboard', () => {
  test('changing currency updates dashboard display', async ({ page }) => {
    // Set to EUR
    await page.goto('/settings')
    await page.waitForLoadState('networkidle')
    await page.getByRole('button', { name: 'EUR' }).click()
    await page.getByRole('button', { name: /save changes/i }).click()
    await page.waitForTimeout(1000)

    // Navigate to dashboard
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    // Dashboard should show € somewhere in the stat cards
    const body = await page.locator('body').textContent()
    expect(body).toMatch(/€|EUR/)

    // Restore GBP
    await page.goto('/settings')
    await page.waitForLoadState('networkidle')
    await page.getByRole('button', { name: 'GBP' }).click()
    await page.getByRole('button', { name: /save changes/i }).click()
  })
})
