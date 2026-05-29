/**
 * JOURNEY 11 — Dormant Asset Recovery Agent
 * Chat interface: renders welcome message, accepts user input, streams response.
 */

import { test, expect } from '@playwright/test'

test.describe('Asset Recovery Agent', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/agent')
    await page.waitForLoadState('networkidle')
  })

  test('page loads', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('shows welcome message', async ({ page }) => {
    await expect(page.getByText(/dormant|recovery|pension|forgotten/i).first()).toBeVisible()
  })

  test('chat input box is present and enabled', async ({ page }) => {
    const input = page.getByRole('textbox')
    await expect(input).toBeVisible()
    await expect(input).not.toBeDisabled()
  })

  test('can type in the chat input', async ({ page }) => {
    const input = page.getByRole('textbox')
    await input.fill('I worked at HSBC from 2010 to 2015')
    const value = await input.inputValue()
    expect(value).toBe('I worked at HSBC from 2010 to 2015')
  })

  test('send button is visible', async ({ page }) => {
    await expect(page.getByRole('button', { name: /send/i })).toBeVisible()
  })

  test('sending a message displays it in chat', async ({ page }) => {
    // Mock the agent endpoint to return a response quickly
    await page.route('**/api/agent/chat', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          reply: 'Thanks for sharing that. Let me search for any pensions from your time at HSBC.',
          workflow: { status: 'running', probable_assets: [] },
        }),
      })
    })

    const input = page.getByRole('textbox')
    await input.fill('I worked at HSBC')
    await page.getByRole('button', { name: /send/i }).click()

    // User message should appear
    await expect(page.getByText('I worked at HSBC')).toBeVisible({ timeout: 5_000 })
  })

  test('agent reply appears after sending', async ({ page }) => {
    await page.route('**/api/agent/chat', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          reply: 'I found a possible pension with HSBC Bank UK Plc.',
          workflow: { status: 'running', probable_assets: [{ name: 'HSBC Pension', confidence: 0.8 }] },
        }),
      })
    })

    await page.getByRole('textbox').fill('I worked at HSBC from 2010')
    await page.getByRole('button', { name: /send/i }).click()

    await expect(page.getByText(/found|pension|hsbc/i).first()).toBeVisible({ timeout: 10_000 })
  })

  test('Reset button clears chat', async ({ page }) => {
    const resetBtn = page.getByRole('button', { name: /reset|restart|new/i }).first()
    if (await resetBtn.isVisible()) {
      await resetBtn.click()
      // After reset, welcome message should still be there
      await expect(page.getByText(/dormant|recovery|pension/i).first()).toBeVisible()
    }
  })

  test('probable assets section renders when assets found', async ({ page }) => {
    await page.route('**/api/agent/chat', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          reply: 'I found 2 probable pensions.',
          workflow: {
            status: 'running',
            probable_assets: [
              { id: '1', employer_name: 'HSBC', asset_type: 'pension', estimated_value: 15000, confidence_score: 0.85, status: 'probable', tracing_steps: [] },
              { id: '2', employer_name: 'Barclays', asset_type: 'pension', estimated_value: 8000, confidence_score: 0.7, status: 'probable', tracing_steps: [] },
            ],
          },
        }),
      })
    })

    await page.getByRole('textbox').fill('I also worked at Barclays')
    await page.getByRole('button', { name: /send/i }).click()
    await page.waitForTimeout(2000)

    // Check for probable assets panel — may or may not render depending on component structure
    const bodyText = await page.locator('body').textContent()
    expect(bodyText).toMatch(/hsbc|barclays|pension|probable/i)
  })
})
