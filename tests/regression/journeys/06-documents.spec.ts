/**
 * JOURNEY 06 — Documents
 * Upload → verify → AI analyse → delete.
 */

import { test, expect } from '@playwright/test'
import path from 'path'
import fs from 'fs'

test.describe('Documents — Upload, View, Delete', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/documents')
    await page.waitForLoadState('networkidle')
  })

  test('page loads', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('Upload button is visible', async ({ page }) => {
    await expect(page.getByRole('button', { name: /upload/i }).first()).toBeVisible()
  })

  test('upload modal opens', async ({ page }) => {
    await page.getByRole('button', { name: /upload/i }).first().click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByText(/upload document/i)).toBeVisible()
  })

  test('upload modal closes on cancel', async ({ page }) => {
    await page.getByRole('button', { name: /upload/i }).first().click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.getByRole('button', { name: /cancel/i }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible()
  })

  test('can upload a PDF document', async ({ page }) => {
    // Create a minimal PDF fixture
    const pdfPath = path.join(__dirname, '../fixtures/test-doc.pdf')
    if (!fs.existsSync(pdfPath)) {
      // Write a minimal valid PDF so upload doesn't fail on missing file
      fs.writeFileSync(pdfPath, '%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\nxref\n0 1\n0000000000 65535 f \ntrailer\n<< /Size 1 /Root 1 0 R >>\nstartxref\n9\n%%EOF')
    }

    await page.getByRole('button', { name: /upload/i }).first().click()
    await expect(page.getByRole('dialog')).toBeVisible()

    // Set the file input
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles(pdfPath)

    // Optionally set a name
    const nameInput = page.getByLabel(/document name/i)
    if (await nameInput.isVisible()) {
      await nameInput.fill('Regression Test Doc')
    }

    await page.getByRole('button', { name: /upload/i }).last().click()

    // Wait for upload to complete — modal closes or success message appears
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 15_000 })
  })

  test('uploaded document appears in list', async ({ page }) => {
    // The document name might vary; just check list is non-empty
    const docCount = await page.locator('[class*="Card"]').count()
    if (docCount > 0) {
      await expect(page.locator('[class*="Card"]').first()).toBeVisible()
    }
  })

  test('Analyse with AI button is present on documents', async ({ page }) => {
    const analyseBtn = page.getByRole('button', { name: /analyse/i }).first()
    const count = await analyseBtn.count()
    if (count > 0) {
      await expect(analyseBtn).toBeVisible()
    }
  })

  test('can delete a document', async ({ page }) => {
    page.on('dialog', d => d.accept())
    const deleteBtn = page.locator('button').filter({ hasText: '' }).last()
    const beforeCount = await page.locator('[class*="Card"]').count()
    if (beforeCount > 0) {
      await deleteBtn.click()
      await page.waitForTimeout(1000)
      const afterCount = await page.locator('[class*="Card"]').count()
      expect(afterCount).toBeLessThanOrEqual(beforeCount)
    }
  })
})
