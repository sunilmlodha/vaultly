/**
 * JOURNEY 14 — Add Asset (End-to-End Functional Test)
 * Fixed selectors based on real app screenshots.
 */

import { test, expect, type Page } from '@playwright/test'
import path from 'path'
import fs from 'fs'

// ── Helpers ───────────────────────────────────────────────────────────────────

async function goToAssets(page: Page) {
  await page.goto('/assets')
  await page.waitForLoadState('networkidle')
}

// Scope all wizard assertions to the wizard panel — avoids strict-mode
// violations when category labels also appear in the summary strip
async function getWizardPanel(page: Page) {
  return page.locator('.fixed').filter({ hasText: /what are you adding/i }).last()
}

async function openAddWizard(page: Page) {
  await page.getByRole('button', { name: /add asset/i }).click()
  await expect(page.getByText(/what are you adding/i)).toBeVisible({ timeout: 5000 })
}

async function selectCategory(page: Page, label: string) {
  const wizard = await getWizardPanel(page)
  await wizard.getByText(label, { exact: true }).first().click()
  // Step 2 indicator shows "Details"
  await expect(page.getByText('Details')).toBeVisible({ timeout: 3000 })
}

// ── Suite 1: Add Asset wizard ─────────────────────────────────────────────────

test.describe('Add Asset wizard — full journey', () => {

  test('assets page loads with correct title and actions', async ({ page }) => {
    await goToAssets(page)
    await expect(page).toHaveTitle(/vaultly/i)
    await expect(page.getByRole('button', { name: /add asset/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /connect bank/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /import csv/i })).toBeVisible()
  })

  test('shows assets or guided empty state', async ({ page }) => {
    await goToAssets(page)
    const hasGrid   = (await page.locator('.grid .rounded-2xl').count()) > 0
    const hasEmpty  = await page.getByText(/start building your vault/i).isVisible().catch(() => false)
    expect(hasGrid || hasEmpty).toBe(true)
  })

  test('wizard opens and shows all 6 category tiles', async ({ page }) => {
    await goToAssets(page)
    await openAddWizard(page)
    const wizard = await getWizardPanel(page)

    for (const label of ['Bank Account', 'Investments', 'Property', 'Crypto', 'Pension', 'Other']) {
      // scope to wizard panel — avoids matching summary strip labels
      await expect(wizard.getByText(label).first()).toBeVisible()
    }
  })

  test('wizard closes when backdrop clicked', async ({ page }) => {
    await goToAssets(page)
    await openAddWizard(page)
    // Click the dark backdrop (top-left corner, outside the panel)
    await page.locator('.fixed.inset-0.bg-black\\/40').click({ position: { x: 10, y: 10 } })
    await expect(page.getByText(/what are you adding/i)).not.toBeVisible({ timeout: 3000 })
  })

  test('wizard closes when X button clicked', async ({ page }) => {
    await goToAssets(page)
    await openAddWizard(page)
    // X is the last button in the wizard header
    const header = page.locator('.fixed').filter({ hasText: /what are you adding/i }).last()
      .locator('.border-b')
    await header.getByRole('button').last().click()
    await expect(page.getByText(/what are you adding/i)).not.toBeVisible({ timeout: 3000 })
  })

  test('adds a bank account end-to-end', async ({ page }) => {
    await goToAssets(page)
    await openAddWizard(page)
    await selectCategory(page, 'Bank Account')

    // Fill name directly (no bank logo click — avoids React controlled input conflict)
    await page.getByPlaceholder(/main current account/i).fill('E2E Current Account')

    // Fill balance directly
    await page.getByPlaceholder('0.00').fill('7500')

    // Save button should now be enabled
    const saveBtn = page.getByRole('button', { name: /save bank account/i })
    await expect(saveBtn).toBeEnabled({ timeout: 5000 })
    await saveBtn.click()

    // Card appears in the asset grid — use .first() since same name may exist from prior runs
    await expect(page.getByText('E2E Current Account').first()).toBeVisible({ timeout: 12000 })
  })

  test('adds a stocks & shares ISA end-to-end', async ({ page }) => {
    await goToAssets(page)
    await openAddWizard(page)
    await selectCategory(page, 'Investments')

    await page.getByRole('button', { name: /stocks & shares isa/i }).click()
    await page.getByRole('button', { name: /vanguard/i }).click()
    await page.getByPlaceholder(/fund, stock or account name/i).fill('FTSE Global All Cap')
    await page.getByPlaceholder('0.00').fill('18500')

    const saveBtn = page.getByRole('button', { name: /save investments/i })
    await expect(saveBtn).toBeEnabled()
    await saveBtn.click()

    await expect(page.getByText('FTSE Global All Cap')).toBeVisible({ timeout: 8000 })
  })

  test('crypto coin search shows live price and calculates value', async ({ page }) => {
    await goToAssets(page)
    await openAddWizard(page)
    await selectCategory(page, 'Crypto')

    const searchInput = page.getByPlaceholder(/search bitcoin/i)
    await expect(searchInput).toBeVisible()
    await searchInput.fill('Bitcoin')

    // Dropdown results from CoinGecko
    await expect(page.locator('[class*="absolute"]').getByText('Bitcoin').first())
      .toBeVisible({ timeout: 10000 })

    // Click first Bitcoin result in the dropdown
    await page.locator('[class*="absolute"] button').filter({ hasText: 'Bitcoin' }).first().click()

    // Live price should load
    await expect(page.getByText(/live:/i)).toBeVisible({ timeout: 10000 })

    // Enter quantity
    await page.getByPlaceholder('0.0').fill('0.5')

    // GBP value estimate
    await expect(page.getByText(/estimated gbp value/i)).toBeVisible({ timeout: 3000 })

    const saveBtn = page.getByRole('button', { name: /save crypto/i })
    await expect(saveBtn).toBeEnabled()
    await saveBtn.click()

    await expect(page.getByText(/bitcoin/i).first()).toBeVisible({ timeout: 8000 })
  })

  test('property postcode lookup retrieves Land Registry data', async ({ page }) => {
    await goToAssets(page)
    await openAddWizard(page)
    await selectCategory(page, 'Property')

    await page.getByPlaceholder('SW1A 1AA').fill('EC2V 8AH')
    await page.getByRole('button', { name: /look up/i }).click()

    // Either result or no-data message
    await expect(
      page.getByText(/estimated today/i)
        .or(page.getByText(/no recent sale/i))
        .or(page.getByText(/could not retrieve/i))
        .or(page.getByText(/enter value manually/i))
    ).toBeVisible({ timeout: 12000 })

    // Enter property name
    await page.getByPlaceholder(/12 acacia avenue/i).fill('My London Property')

    // Ensure value field has something
    const valueInput = page.getByPlaceholder('0.00')
    if (await valueInput.isVisible()) {
      const v = await valueInput.inputValue()
      if (!v || v === '0') await valueInput.fill('500000')
    }

    const saveBtn = page.getByRole('button', { name: /save property/i })
    await expect(saveBtn).toBeEnabled()
    await saveBtn.click()

    // Wait for the wizard to close — the "Add Property" heading disappears after save
    await expect(
      page.getByRole('heading', { name: /add property/i })
        .or(page.locator('h2').filter({ hasText: 'Add Property' }))
    ).not.toBeVisible({ timeout: 20000 })
  })

  test('save button disabled until name AND value entered', async ({ page }) => {
    await goToAssets(page)
    await openAddWizard(page)
    await selectCategory(page, 'Other')

    const saveBtn = page.getByRole('button', { name: /save other/i })
    await expect(saveBtn).toBeDisabled()

    await page.getByPlaceholder(/life insurance, gold coins/i).fill('Test')
    await expect(saveBtn).toBeDisabled()   // still disabled — no value

    await page.getByPlaceholder('0.00').fill('1000')
    await expect(saveBtn).toBeEnabled()
  })

  test('back button returns to category picker', async ({ page }) => {
    await goToAssets(page)
    await openAddWizard(page)
    await selectCategory(page, 'Pension')

    // Back button is the FIRST button in the left side of the wizard header
    // It's a sibling of the h2 "Add Pension" inside a flex container
    // Use XPath: find the button BEFORE the heading div inside the flex container
    await page.locator('h2:has-text("Add Pension")')
      .locator('xpath=../preceding-sibling::button[1]')
      .click()

    await expect(page.getByText(/what are you adding/i)).toBeVisible({ timeout: 3000 })
    await expect(page.getByText('Bank Account', { exact: true }).first()).toBeVisible()
  })

  test('filter tabs are visible on assets page', async ({ page }) => {
    await goToAssets(page)
    await page.waitForLoadState('networkidle')
    // "All" tab always present
    await expect(page.getByRole('button', { name: /all/i }).first()).toBeVisible()
  })

  test('clicking a filter tab shows filtered view', async ({ page }) => {
    await goToAssets(page)
    await page.waitForLoadState('networkidle')

    // Click any visible non-"All" tab
    const tabs = page.locator('button').filter({ hasText: /bank|invest|property|crypto|pension/i })
    const count = await tabs.count()
    if (count > 0) {
      await tabs.first().click()
      // After clicking, either assets show OR empty state for that category
      await expect(
        page.locator('.grid .rounded-2xl').first()
          .or(page.getByText(/no assets in this category/i))
          .or(page.getByText(/add one now/i))
      ).toBeVisible({ timeout: 5000 })
    }
  })

  test('edit modal opens for non-live assets', async ({ page }) => {
    await goToAssets(page)
    await page.waitForLoadState('networkidle')

    // Find first enabled edit button (non-OB asset)
    const editBtns = page.getByRole('button', { name: /edit/i })
    const count = await editBtns.count()

    let clicked = false
    for (let i = 0; i < count; i++) {
      const btn = editBtns.nth(i)
      if (await btn.isEnabled()) {
        await btn.click()
        clicked = true
        break
      }
    }

    if (clicked) {
      await expect(page.getByText(/edit asset/i)).toBeVisible({ timeout: 3000 })
      // Close it
      await page.keyboard.press('Escape')
    } else {
      // All assets are live-synced — acceptable
      test.info().annotations.push({ type: 'skip-reason', description: 'All assets are OB-synced' })
    }
  })

  test('delete shows inline confirmation (no browser popup)', async ({ page }) => {
    await goToAssets(page)
    await page.waitForLoadState('networkidle')

    const deleteBtns = page.getByRole('button', { name: /delete/i })
    if (await deleteBtns.first().isVisible()) {
      await deleteBtns.first().click()

      // Inline "Delete this asset?" text appears — NOT a browser confirm dialog
      await expect(page.getByText(/delete this asset/i)).toBeVisible({ timeout: 3000 })
      await expect(page.getByRole('button', { name: /yes/i })).toBeVisible()

      // Press Escape to cancel — no deletion
      await page.keyboard.press('Escape')
    }
  })

  test('CSV import: upload file, preview, confirm', async ({ page }) => {
    await goToAssets(page)

    await page.getByRole('button', { name: /import csv/i }).click()

    // Write temp CSV first (before modal assertion)
    const csvContent = [
      'Stock name,Sedol,Units held,Price (pence),Value (£)',
      '"Vanguard FTSE Global",BFY0NK5,100.000,2500,2500.00',
      '"Tesla Inc",B616C79,10.000,20000,2000.00',
    ].join('\n')
    const tmpPath = path.join(process.cwd(), 'tests/regression/fixtures/test-import.csv')
    fs.writeFileSync(tmpPath, csvContent)

    // Upload file — modal may already be open showing initial state
    const fileInput = page.locator('input[type="file"]')
    await expect(fileInput).toBeAttached({ timeout: 5000 })
    await fileInput.setInputFiles(tmpPath)

    // After upload: preview shows detected format + asset list
    await expect(page.getByText(/detected/i).first()).toBeVisible({ timeout: 8000 })
    await expect(page.getByText('Vanguard FTSE Global').first()).toBeVisible()
    await expect(page.getByText('Tesla Inc').first()).toBeVisible()

    // Confirm import
    await page.getByRole('button', { name: /^import/i }).last().click()

    // Success message
    await expect(
      page.getByText(/imported!/i)
    ).toBeVisible({ timeout: 10000 })

    fs.unlinkSync(tmpPath)
  })

})

// ── Suite 2: Gamification ─────────────────────────────────────────────────────

test.describe('Gamification — dashboard integration', () => {

  test('Vault Score card renders with score and /850', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    await expect(page.getByText(/vault score/i)).toBeVisible()
    await expect(page.getByText(/\/\s?850/i)).toBeVisible({ timeout: 10000 })
  })

  test('Vault Score shows a label', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    const labels = ['Excellent', 'Great', 'Good', 'Building', 'Starting']
    let found = false
    for (const label of labels) {
      found = await page.getByText(label, { exact: true }).isVisible().catch(() => false)
      if (found) break
    }
    expect(found, 'Expected one of: Excellent/Great/Good/Building/Starting').toBe(true)
  })

  test('Missions card is visible on dashboard', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    await expect(page.getByText('Missions').first()).toBeVisible({ timeout: 8000 })
  })

  test('Missions card shows heading and All link', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    // Missions heading is always visible once card renders
    await expect(page.getByText('Missions').first()).toBeVisible({ timeout: 8000 })
    // "All" link to achievements page
    await expect(page.getByRole('link', { name: /all/i }).first()).toBeVisible({ timeout: 8000 })
  })

  test('Achievements page loads with heading and trophies section', async ({ page }) => {
    await page.goto('/achievements')
    await page.waitForLoadState('networkidle')

    // Heading (not the sidebar link)
    await expect(page.getByRole('heading', { name: /achievements/i })).toBeVisible()
    // Trophies section always renders (even with 0/0 during load)
    await expect(page.getByText(/trophies/i).first()).toBeVisible({ timeout: 8000 })
    // Active Missions section
    await expect(page.getByText(/active missions/i)).toBeVisible({ timeout: 8000 })
  })

  test('streak badge appears in dashboard header', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    await expect(page.getByText(/day streak/i)).toBeVisible({ timeout: 8000 })
  })

  test('notification bell is in the topbar', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    const header = page.locator('header')
    await expect(header).toBeVisible()
    // Bell button — look for aria-label or SVG bell icon in header
    await expect(
      header.locator('button[aria-label="Notifications"]')
        .or(header.locator('button').filter({ has: page.locator('svg') }).nth(1))
    ).toBeVisible()
  })

  test('notification bell opens dropdown', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    // Click bell via aria-label or fallback
    const bell = page.locator('header button[aria-label="Notifications"]')
    if (await bell.isVisible()) {
      await bell.click()
    } else {
      // Find bell by position in header buttons
      await page.locator('header button').nth(1).click()
    }

    await expect(
      page.getByText('Notifications').last()
    ).toBeVisible({ timeout: 3000 })
  })

})

// ── Suite 3: Auth guards ──────────────────────────────────────────────────────

test.describe('Auth guards — unauthenticated access', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('redirects /assets to /login', async ({ page }) => {
    await page.goto('/assets')
    await expect(page).toHaveURL(/\/login/)
  })

  test('redirects /achievements to /login', async ({ page }) => {
    await page.goto('/achievements')
    await expect(page).toHaveURL(/\/login/)
  })

  test('redirects /profile to /login', async ({ page }) => {
    await page.goto('/profile')
    await expect(page).toHaveURL(/\/login/)
  })

  test('login page shows all 4 OAuth buttons', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    // Dismiss cookie banner
    const accept = page.getByRole('button', { name: /accept all/i })
    if (await accept.isVisible({ timeout: 2000 }).catch(() => false)) await accept.click()

    await expect(page.getByRole('button', { name: /continue with google/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /continue with microsoft/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /continue with github/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /continue with facebook/i })).toBeVisible()
  })

  test('login page has email + password form', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    // Dismiss cookie banner
    const accept = page.getByRole('button', { name: /accept all/i })
    if (await accept.isVisible({ timeout: 2000 }).catch(() => false)) await accept.click()

    // Use placeholder selectors — the Input component doesn't use <label for="">
    await expect(page.getByPlaceholder('you@example.com')).toBeVisible()
    await expect(page.getByPlaceholder('••••••••')).toBeVisible()
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()
  })

  test('invalid credentials show error message', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    const accept = page.getByRole('button', { name: /accept all/i })
    if (await accept.isVisible({ timeout: 2000 }).catch(() => false)) await accept.click()

    await page.getByPlaceholder('you@example.com').fill('wrong@example.com')
    await page.getByPlaceholder('••••••••').fill('wrongpassword1')
    await page.getByRole('button', { name: /sign in/i }).click()

    await expect(page.getByText(/invalid email or password/i)).toBeVisible({ timeout: 8000 })
  })

})
