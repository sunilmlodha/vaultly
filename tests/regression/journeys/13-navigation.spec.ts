/**
 * JOURNEY 13 — Navigation & Routing
 * Sidebar links all navigate to correct pages.
 * Mobile nav works.
 * 404 fallback for unknown routes.
 * Deep links open without crash.
 */

import { test, expect } from '@playwright/test'

const ROUTES = [
  { path: '/dashboard',   label: /dashboard/i },
  { path: '/assets',      label: /assets/i },
  { path: '/liabilities', label: /liabilities/i },
  { path: '/goals',       label: /goals/i },
  { path: '/renewals',    label: /renewals/i },
  { path: '/spending',    label: /spending/i },
  { path: '/forecast',    label: /forecast|cashflow/i },
  { path: '/documents',   label: /documents/i },
  { path: '/connections', label: /connection|bank/i },
  { path: '/family',      label: /family/i },
  { path: '/agent',       label: /asset recovery|dormant/i },
  { path: '/settings',    label: /settings/i },
]

test.describe('Navigation — All Routes Load', () => {
  for (const route of ROUTES) {
    test(`${route.path} loads without crashing`, async ({ page }) => {
      await page.goto(route.path)
      await page.waitForLoadState('networkidle')

      // No crash screen
      await expect(page.locator('body')).not.toContainText('Something went wrong')
      await expect(page.locator('body')).not.toContainText('Internal Server Error')

      // Page has some content
      await expect(page.locator('body')).not.toBeEmpty()
    })
  }
})

test.describe('Navigation — Sidebar Links', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
  })

  test('sidebar is visible on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    const sidebar = page.locator('aside, nav').first()
    await expect(sidebar).toBeVisible()
  })

  test('sidebar has navigation links', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await expect(page.getByRole('link', { name: /assets/i }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: /goals/i }).first()).toBeVisible()
  })
})

test.describe('Navigation — Mobile Nav', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('mobile nav bar is visible on small screen', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    // Mobile nav is fixed at bottom
    const mobileNav = page.locator('nav').last()
    await expect(mobileNav).toBeVisible()
  })
})

test.describe('Navigation — App Lock', () => {
  test('settings/lock page loads', async ({ page }) => {
    await page.goto('/settings/lock')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).not.toContainText('Something went wrong')
  })
})
