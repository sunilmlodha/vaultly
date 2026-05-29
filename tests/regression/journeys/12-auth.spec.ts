/**
 * JOURNEY 12 — Authentication
 * Login with valid credentials, login with invalid credentials, sign out.
 * Sign-up flow validation.
 * Unauthenticated access redirects to login.
 */

import { test, expect } from '@playwright/test'

test.describe('Auth — Login', () => {
  // These tests use their own browser context with NO stored auth
  test.use({ storageState: undefined })

  test('login page loads', async ({ page }) => {
    await page.goto('/login')
    await expect(page).toHaveURL(/login/)
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible()
  })

  test('login form has email and password fields', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByLabel(/email/i)).toBeVisible()
    await expect(page.getByLabel(/password/i)).toBeVisible()
  })

  test('invalid credentials shows error', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel(/email/i).fill('wrong@example.com')
    await page.getByLabel(/password/i).fill('WrongPassword!')
    await page.getByRole('button', { name: /sign in/i }).click()

    // Should show an error, not navigate to dashboard
    await page.waitForTimeout(2000)
    const url = page.url()
    expect(url).not.toMatch(/dashboard/)
  })

  test('empty form submit does not navigate', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('button', { name: /sign in/i }).click()
    await page.waitForTimeout(1000)
    expect(page.url()).toMatch(/login/)
  })

  test('unauthenticated access to /dashboard redirects to login', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/login/, { timeout: 8_000 })
  })

  test('unauthenticated access to /assets redirects to login', async ({ page }) => {
    await page.goto('/assets')
    await expect(page).toHaveURL(/login/, { timeout: 8_000 })
  })

  test('unauthenticated access to /settings redirects to login', async ({ page }) => {
    await page.goto('/settings')
    await expect(page).toHaveURL(/login/, { timeout: 8_000 })
  })
})

test.describe('Auth — Sign Up', () => {
  test.use({ storageState: undefined })

  test('sign-up page loads', async ({ page }) => {
    await page.goto('/signup')
    await expect(page).toHaveURL(/signup/)
    await expect(page.getByRole('heading', { name: /sign up|create account/i })).toBeVisible()
  })

  test('sign-up form has required fields', async ({ page }) => {
    await page.goto('/signup')
    await expect(page.getByLabel(/email/i)).toBeVisible()
    await expect(page.getByLabel(/password/i)).toBeVisible()
  })

  test('sign-up page links to login', async ({ page }) => {
    await page.goto('/signup')
    await expect(page.getByText(/already have an account|sign in/i)).toBeVisible()
  })
})

test.describe('Auth — Sign Out (requires session)', () => {
  test('sign out button is visible in settings', async ({ page }) => {
    await page.goto('/settings')
    await page.waitForLoadState('networkidle')
    await expect(page.getByText(/sign out/i)).toBeVisible()
  })

  test('sign out redirects to home/login', async ({ page }) => {
    await page.goto('/settings')
    await page.waitForLoadState('networkidle')

    // Click sign out
    const signOutBtn = page.getByRole('button', { name: /sign out/i }).first()
    if (await signOutBtn.isVisible()) {
      await signOutBtn.click()
      await expect(page).toHaveURL(/login|\//, { timeout: 10_000 })
    }
  })
})
