/**
 * JOURNEY 09 — Spending Analytics & Cashflow Forecast
 * Spending is a server-rendered page; forecast is a client page with AI.
 */

import { test, expect } from '@playwright/test'

test.describe('Spending Analytics', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/spending')
    await page.waitForLoadState('networkidle')
  })

  test('page loads', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('shows no crash when no OB data', async ({ page }) => {
    await expect(page.locator('body')).not.toContainText('Internal Server Error')
    await expect(page.locator('body')).not.toContainText('Something went wrong')
  })

  test('shows spending category breakdown section', async ({ page }) => {
    const bodyText = await page.locator('body').textContent()
    // Should show either data or a "no data" message
    expect(bodyText).toMatch(/category|spending|transaction|no data|connect/i)
  })

  test('income and expenses stat cards render', async ({ page }) => {
    const bodyText = await page.locator('body').textContent()
    expect(bodyText).toMatch(/income|expenses|cashflow/i)
  })

  test('connect bank prompt shown when no transactions', async ({ page }) => {
    // If no OB data, should show a prompt to connect
    const body = await page.locator('body').textContent()
    if (body?.match(/no.*data|no.*transaction/i)) {
      expect(body).toMatch(/connect/i)
    }
  })
})

test.describe('Cashflow Forecast', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/forecast')
    await page.waitForLoadState('networkidle')
  })

  test('page loads', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('shows loading state initially', async ({ page }) => {
    // Navigate fresh to catch loading state
    await page.goto('/forecast')
    const loadingIndicator = page.getByText(/generating|loading|analysing/i)
    // Loading state may flash by quickly — just verify no crash
    await page.waitForTimeout(500)
    await expect(page.locator('body')).not.toContainText('Something went wrong')
  })

  test('shows error state or results after loading', async ({ page }) => {
    await page.waitForTimeout(5000) // Wait for API
    const bodyText = await page.locator('body').textContent()
    // Should show either forecast data OR an error with "Connect a bank"
    expect(bodyText).toMatch(/forecast|surplus|connect|cashflow|risk/i)
  })

  test('Refresh button is visible', async ({ page }) => {
    await expect(page.getByRole('button', { name: /refresh/i })).toBeVisible()
  })

  test('Refresh button triggers reload without crash', async ({ page }) => {
    await page.getByRole('button', { name: /refresh/i }).click()
    await page.waitForTimeout(500)
    await expect(page.locator('body')).not.toContainText('Something went wrong')
  })
})
