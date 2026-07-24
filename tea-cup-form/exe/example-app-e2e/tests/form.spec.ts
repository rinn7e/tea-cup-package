import { expect, test } from '@playwright/test'

test.describe('TeaCup Form Example App', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('1. should show the main heading and all field labels', async ({
    page,
  }) => {
    await expect(page.locator('h1')).toHaveText('TeaCup Form Kitchen Sink')
    await expect(page.getByText('Username')).toBeVisible()
    await expect(page.getByText('Tags')).toBeVisible()
    await expect(page.getByText('Country')).toBeVisible()
    await expect(page.getByText('Birthday')).toBeVisible()
    await expect(page.getByText('Radio 1')).toBeVisible()
    await expect(page.getByText('Radio 2')).toBeVisible()
  })

  test('2. should validate username length', async ({ page }) => {
    const usernameInput = page.locator('[data-test="text"]')
    await usernameInput.fill('ab')
    await usernameInput.blur()
    await expect(page.getByText('Username too short')).toBeVisible()

    await usernameInput.fill('abc')
    await usernameInput.blur()
    await expect(page.getByText('Username too short')).not.toBeVisible()
  })

  test('3. should add and remove tags (TextPill)', async ({ page }) => {
    const pillInput = page.locator('[data-test="pill"]')

    // Add tags
    await pillInput.fill('react')
    await pillInput.press('Enter')
    await pillInput.fill('typescript')
    await pillInput.press('Enter')

    await expect(page.getByText('react')).toBeVisible()
    await expect(page.getByText('typescript')).toBeVisible()

    // Remove tag using data-test attribute
    await page.locator('[data-test="pill-remove-react"]').click()
    await expect(page.getByText('react')).not.toBeVisible()
    await expect(page.getByText('typescript')).toBeVisible()
  })

  test('4. should show validation for empty tags on submit attempt', async ({
    page,
  }) => {
    const submitBtn = page.getByRole('button', { name: 'Submit Form' })
    await submitBtn.click()
    await expect(page.getByText('At least one tag required')).toBeVisible()
  })

  test('5. should select an option from the dropdown', async ({ page }) => {
    await page.locator('[data-test="dropdown"]').click()
    await page.locator('[data-test="Cambodia"]').click()
    await expect(page.locator('[data-test="dropdown"]')).toHaveValue(
      'Cambodia',
    )
  })

  test('6. should select a date in the calendar', async ({ page }) => {
    await page.locator('[data-test="calendar"]').click()
    // Select the 15th of the current month
    await page.locator('.react-datepicker__day--015').first().click()
    const value = await page.locator('[data-test="calendar"]').inputValue()
    expect(value).not.toBe('')
  })

  test('7. should toggle checkbox options', async ({ page }) => {
    await expect(page.locator('[data-test="checkbox-checkbox-Option 1"]')).toBeVisible()
    await expect(page.locator('[data-test="checkbox-checkbox-Option 2"]')).toBeVisible()

    // Check Option 1 using data-test
    await page.locator('[data-test="checkbox-checkbox-Option 1"]').click()
    // Option 2 is already checked initially in update.ts
    await page.locator('[data-test="checkbox-checkbox-Option 2"]').click()
  })

  test('8. should select radio options and display descriptions', async ({
    page,
  }) => {
    await expect(page.getByText('First description')).toBeVisible()
    await expect(page.getByText('Second description')).toBeVisible()

    // Select Radio 1 using data-test
    await page.locator('[data-test="radio-radio-r1"]').click()
    // Select Radio 2 using data-test
    await page.locator('[data-test="radio-radio-r2"]').click()
  })

  test('9. should handle file uploads and preview', async ({ page }) => {
    await page.locator('[data-test="file"]').setInputFiles({
      name: 'test.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('hello world'),
    })

    await expect(page.getByText('test.txt')).toBeVisible()
    await expect(page.getByText('PLAIN')).toBeVisible()
  })

  test('10. should remove an uploaded file', async ({ page }) => {
    // Add file first
    await page.locator('[data-test="file"]').setInputFiles({
      name: 'delete-me.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('...'),
    })

    await expect(page.getByText('delete-me.txt')).toBeVisible()

    // Click remove button using data-test
    await page.locator('[data-test="file-remove-delete-me.txt"]').click()
    await expect(page.getByText('delete-me.txt')).not.toBeVisible()
  })

  test('11. should trigger all validations on invalid submit attempt', async ({
    page,
  }) => {
    const submitBtn = page.getByRole('button', { name: 'Submit Form' })
    await submitBtn.click()

    await expect(page.getByText('Username too short')).toBeVisible()
    await expect(page.getByText('At least one tag required')).toBeVisible()
    await expect(page.getByText('Please select a country')).toBeVisible()
    await expect(page.getByText('Birthday is required')).toBeVisible()
    await expect(page.getByText('At least one file required')).toBeVisible()
  })

  test('12. should submit the form successfully when all fields are valid', async ({
    page,
  }) => {
    // Fill Username
    await page.locator('[data-test="text"]').fill('rinne')

    // Add Tag
    await page.locator('[data-test="pill"]').fill('playwright')
    await page.locator('[data-test="pill"]').press('Enter')

    // Check Checkbox
    await page.locator('[data-test="checkbox-checkbox-Option 1"]').click()

    // Select Radio 1
    await page.locator('[data-test="radio-radio-r1"]').click()

    // Select Country
    await page.locator('[data-test="dropdown"]').click()
    await page.locator('[data-test="USA"]').click()
    await expect(page.locator('[data-test="dropdown"]')).toHaveValue('USA')

    // Select Date
    await page.locator('[data-test="calendar"]').click()
    await page.locator('.react-datepicker__day--020').first().click()
    await expect(page.locator('[data-test="calendar"]')).not.toHaveValue('')

    // Upload File
    await page.locator('[data-test="file"]').setInputFiles({
      name: 'manual.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('pdf content'),
    })

    // Submit
    const submitBtn = page.getByRole('button', { name: 'Submit Form' })
    await expect(submitBtn).not.toHaveClass(/cursor-not-allowed/)
    await submitBtn.click()

    // Verify payload output
    await expect(page.getByText('Payload Output')).toBeVisible()
    await expect(page.locator('pre')).toContainText('"text": "rinne"')
    await expect(page.locator('pre')).toContainText('"pill": [')
    await expect(page.locator('pre')).toContainText('"playwright"')
    await expect(page.locator('pre')).toContainText('"checkbox": [')
    await expect(page.locator('pre')).toContainText('"radio": "r1"')
    await expect(page.locator('pre')).toContainText('"dropdown": "USA"')
    await expect(page.locator('pre')).toContainText('"manual.pdf"')
  })
})
