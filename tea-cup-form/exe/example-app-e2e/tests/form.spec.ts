import { expect, test } from '@playwright/test'

test.describe('TeaCup Form Example App', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('1. should show the main heading and all field labels', async ({
    page,
  }) => {
    await expect(
      page.getByRole('heading', { name: 'TeaCup Form Kitchen Sink' }),
    ).toBeVisible()
    await expect(page.getByText('Username')).toBeVisible()
    await expect(page.getByText('Tags')).toBeVisible()
    await expect(page.getByText('Country')).toBeVisible()
    await expect(page.getByText('Birthday')).toBeVisible()
    await expect(page.getByText('Assigned Users').first()).toBeVisible()
    await expect(page.getByText('File').first()).toBeVisible()
    await expect(page.getByText('Time Period').first()).toBeVisible()
  })

  test('2. should validate username length', async ({ page }) => {
    const usernameInput = page.locator('[data-test="text"]')
    await usernameInput.focus()
    await usernameInput.fill('ab')
    await usernameInput.blur()

    await expect(page.getByText('Username too short')).toBeVisible()
  })

  test('3. should add and remove tags (TextPill)', async ({ page }) => {
    const pillInput = page.locator('[data-test="pill"]')

    // Add first tag
    await pillInput.fill('tag1')
    await pillInput.press('Enter')
    await expect(page.getByText('tag1')).toBeVisible()

    // Add second tag
    await pillInput.fill('tag2')
    await pillInput.press('Enter')
    await expect(page.getByText('tag2')).toBeVisible()

    // Remove first tag using data-test attribute
    const removeBtn = page.locator('[data-test="pill-remove-tag1"]')
    await removeBtn.click()
    await expect(page.getByText('tag1')).not.toBeVisible()
    await expect(page.getByText('tag2')).toBeVisible()
  })

  test('4. should show validation for empty tags on submit attempt', async ({
    page,
  }) => {
    // Attempt submit with empty tags
    const submitBtn = page.getByRole('button', { name: 'Submit Form' })
    await submitBtn.click()
    await expect(page.getByText('At least one tag required')).toBeVisible()
  })

  test('5. should select an option from the dropdown', async ({ page }) => {
    const dropdown = page.locator('[data-test="dropdown"]')
    await dropdown.click()
    await page.locator('[data-test="Cambodia"]').click()
    await expect(dropdown).toHaveValue('Cambodia')
  })

  test('6. should select a date in the calendar', async ({ page }) => {
    const calendarInput = page.locator('[data-test="calendar"]')
    await calendarInput.click()
    await page.locator('.react-datepicker__day--015').first().click()
    await expect(calendarInput).not.toHaveValue('')
  })

  test('7. should toggle checkbox options', async ({ page }) => {
    const option1 = page.locator('[data-test="checkbox-checkbox-Option 1"]')
    await option1.click()
    await expect(option1).toBeVisible()
  })

  test('8. should select radio options and display descriptions', async ({
    page,
  }) => {
    const radio1 = page.locator('[data-test="radio-radio-r1"]')
    const radio2 = page.locator('[data-test="radio-radio-r2"]')

    await radio1.click()
    await expect(page.getByText('First description')).toBeVisible()

    await radio2.click()
    await expect(page.getByText('Second description')).toBeVisible()
  })

  test('9. should handle file uploads and preview', async ({ page }) => {
    const fileInput = page.locator('[data-test="file"]')

    await fileInput.setInputFiles({
      name: 'test-document.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('dummy pdf content'),
    })

    await expect(page.getByText('test-document.pdf')).toBeVisible()
  })

  test('10. should remove an uploaded file', async ({ page }) => {
    const fileInput = page.locator('[data-test="file"]')

    await fileInput.setInputFiles({
      name: 'file-to-remove.png',
      mimeType: 'image/png',
      buffer: Buffer.from('dummy png content'),
    })

    await expect(page.getByText('file-to-remove.png')).toBeVisible()

    const removeBtn = page.locator('[data-test="file-remove-file-to-remove.png"]')
    await removeBtn.click()
    await expect(page.getByText('file-to-remove.png')).not.toBeVisible()
  })

  test('11. should trigger all validations on invalid submit attempt', async ({
    page,
  }) => {
    // Click submit without filling required fields
    const submitBtn = page.getByRole('button', { name: 'Submit Form' })
    await submitBtn.click()

    // Required error tooltips / messages should appear
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

    // Select Combobox User
    const comboboxInput = page.locator('[data-test="combobox"]')
    await comboboxInput.focus()
    await comboboxInput.fill('Alice')
    const option = page.locator('[data-test="combobox-option-u1"]')
    await expect(option).toBeVisible({ timeout: 10000 })
    await option.click()
    await expect(page.getByText('Alice Smith')).toBeVisible()

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
    await expect(page.locator('pre')).toContainText('"combobox": [')
    await expect(page.locator('pre')).toContainText('"Alice Smith"')
    await expect(page.locator('pre')).toContainText('"manual.pdf"')
    await expect(page.locator('pre')).toContainText('"slider": 30')
  })

  test('13. should search and select user in combobox field', async ({
    page,
  }) => {
    const comboboxInput = page.locator('[data-test="combobox"]')
    await comboboxInput.focus()
    await comboboxInput.fill('Alice')

    // Wait for search result option to appear with exact data-test selector
    const option = page.locator('[data-test="combobox-option-u1"]')
    await expect(option).toBeVisible({ timeout: 10000 })
    await expect(option).toContainText('Alice Smith')
    await option.click()

    // Verify tag chip is added
    await expect(page.getByText('Alice Smith')).toBeVisible()

    // Remove item using exact data-test selector
    const removeBtn = page.locator('[data-test="combobox-remove-u1"]')
    await expect(removeBtn).toBeVisible()
    await removeBtn.click()

    // Verify tag chip is removed
    await expect(page.getByText('Alice Smith')).not.toBeVisible()
  })

  test('14. should interact with slider field and update value', async ({
    page,
  }) => {
    const sliderTrack = page.locator('[data-test="slider"]')
    await expect(sliderTrack).toBeVisible()

    const sliderValueBadge = page.locator('[data-test="slider-value-slider"]')
    await expect(sliderValueBadge).toContainText('30 days')

    // Click track at offset position to change value
    await sliderTrack.click({ position: { x: 200, y: 4 } })
    await expect(sliderValueBadge).not.toContainText('30 days')
  })
})
