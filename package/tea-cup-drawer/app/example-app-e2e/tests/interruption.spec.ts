import { expect, test } from '@playwright/test'

import { drawer, expectClosed, expectOpen, openDrawer, state } from './helpers'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test.describe('Interruptions', () => {
  test('closing while opening reverses to closed', async ({ page }) => {
    await page.locator('[data-test="trigger-basic"]').click()
    await expect(state(page, 'basic')).toHaveText('AnimateIn')
    // Overlay tap
    await page.mouse.click(10, 10)
    await expect(state(page, 'basic')).toHaveText('AnimateOut')
    await expectClosed(page, 'basic')
  })

  test('a drawer over a non-modal one closes on its own', async ({ page }) => {
    await openDrawer(page, 'nonModal')
    await page.locator('[data-test="trigger-basic"]').click()
    await expectOpen(page, 'basic')
    // Overlay tap
    await page.mouse.click(10, 10)
    await expectClosed(page, 'basic')
    await expectOpen(page, 'nonModal')
  })

  test('a drawer closing underneath keeps the focus of a newer one', async ({
    page,
  }) => {
    await openDrawer(page, 'basic')
    await page.locator('[data-test="close-basic"]').click()
    await expect(state(page, 'basic')).toHaveText('AnimateOut')
    // Opened while the first one is still sliding away
    await page.locator('[data-test="trigger-top"]').click()
    await expectClosed(page, 'basic')
    await expectOpen(page, 'top')
    await expect(drawer(page, 'top')).toBeFocused()
    await page.locator('[data-test="close-top"]').click()
    await expectClosed(page, 'top')
  })
})
