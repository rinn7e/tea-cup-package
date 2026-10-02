import { expect, test } from '@playwright/test'

import { expectClosed, expectOpen, state } from './helpers'

const payloadText = (page: import('@playwright/test').Page) =>
  page.locator('[data-test="payload-text"]')

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test.describe('Payload', () => {
  test('renders the payload it was opened with', async ({ page }) => {
    await page.locator('[data-test="fruit-Banana"]').click()
    await expectOpen(page, 'payload')
    await expect(payloadText(page)).toHaveText('Banana')
  })

  test('keeps the payload while animating out', async ({ page }) => {
    await page.locator('[data-test="fruit-Banana"]').click()
    await expectOpen(page, 'payload')
    await page.locator('[data-test="close-payload"]').click()
    await expect(state(page, 'payload')).toHaveText('AnimateOut')
    await expect(payloadText(page)).toHaveText('Banana')
    await expectClosed(page, 'payload')
  })

  test('reverses with the new payload when reopened while closing', async ({
    page,
  }) => {
    await page.locator('[data-test="fruit-Banana"]').click()
    await expectOpen(page, 'payload')
    await page.locator('[data-test="close-payload"]').click()
    await expect(state(page, 'payload')).toHaveText('AnimateOut')
    // The closing drawer lets clicks through to the page
    await page.locator('[data-test="fruit-Cherry"]').click()
    await expect(state(page, 'payload')).toHaveText(/AnimateIn|Visible/)
    await expect(payloadText(page)).toHaveText('Cherry')
    await expectOpen(page, 'payload')
  })
})
