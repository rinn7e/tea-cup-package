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
    await expect(page.getByText('Selections')).toBeVisible()
  })

  test('2. should validate username length', async ({ page }) => {
    const usernameInput = page.getByPlaceholder('Enter your username')
    await usernameInput.fill('ab')
    await usernameInput.blur()
    await expect(page.getByText('Username too short')).toBeVisible()

    await usernameInput.fill('abc')
    await usernameInput.blur()
    await expect(page.getByText('Username too short')).not.toBeVisible()
  })

  test('3. should add and remove tags (TextPill)', async ({ page }) => {
    const pillInput = page.getByPlaceholder('Add tags (Enter to add)')

    // Add tags
    await pillInput.fill('react')
    await pillInput.press('Enter')
    await pillInput.fill('typescript')
    await pillInput.press('Enter')

    await expect(page.getByText('react')).toBeVisible()
    await expect(page.getByText('typescript')).toBeVisible()

    // Remove tag
    await page
      .getByText('react', { exact: true })
      .locator('..')
      .getByRole('button')
      .click()
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
    await page.getByPlaceholder('Select a value').click()
    await page.getByText('Cambodia').click()
    await expect(page.getByPlaceholder('Select a value')).toHaveValue(
      'Cambodia',
    )
  })

  test('6. should select a date in the calendar', async ({ page }) => {
    await page.getByPlaceholder('Select date').click()
    // Select the 15th of the current month
    await page.locator('.react-datepicker__day--015').first().click()
    const value = await page.getByPlaceholder('Select date').inputValue()
    expect(value).not.toBe('')
  })

  test('7. should handle file uploads and preview', async ({ page }) => {
    await page.locator('input[type="file"]').setInputFiles({
      name: 'test.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('hello world'),
    })

    await expect(page.getByText('test.txt')).toBeVisible()
    await expect(page.getByText('PLAIN')).toBeVisible()
  })

  test('8. should remove an uploaded file', async ({ page }) => {
    // Add file first
    await page.locator('input[type="file"]').setInputFiles({
      name: 'delete-me.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('...'),
    })

    await expect(page.getByText('delete-me.txt')).toBeVisible()

    // Click remove button (the one next to the file name)
    await page
      .locator('button')
      .filter({ has: page.locator('svg line') })
      .last()
      .click()
    await expect(page.getByText('delete-me.txt')).not.toBeVisible()
  })

  test('9. should trigger all validations on invalid submit attempt', async ({
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

  test('10. should submit the form successfully when all fields are valid', async ({
    page,
  }) => {
    // Fill Username
    await page.getByPlaceholder('Enter your username').fill('rinne')

    // Add Tag
    await page.getByPlaceholder('Add tags (Enter to add)').fill('playwright')
    await page.getByPlaceholder('Add tags (Enter to add)').press('Enter')

    // Select Country
    await page.getByPlaceholder('Select a value').click()
    await page.getByText('USA').click()
    await expect(page.getByPlaceholder('Select a value')).toHaveValue('USA')

    // Select Date
    await page.getByPlaceholder('Select date').click()
    await page.locator('.react-datepicker__day--020').first().click()
    await expect(page.getByPlaceholder('Select date')).not.toHaveValue('')

    // Upload File
    await page.locator('input[type="file"]').setInputFiles({
      name: 'manual.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('pdf content'),
    })

    // Check Checkbox
    await page.getByText('Option 1').click()

    // Submit
    const submitBtn = page.getByRole('button', { name: 'Submit Form' })
    await expect(submitBtn).not.toHaveClass(/cursor-not-allowed/)
    await submitBtn.click()

    // Verify payload output
    await expect(page.getByText('Payload Output')).toBeVisible()
    await expect(page.locator('pre')).toContainText('"text": "rinne"')
    await expect(page.locator('pre')).toContainText('"pill": [')
    await expect(page.locator('pre')).toContainText('"playwright"')
    await expect(page.locator('pre')).toContainText('"dropdown": "USA"')
    await expect(page.locator('pre')).toContainText('"manual.pdf"')
  })
})
