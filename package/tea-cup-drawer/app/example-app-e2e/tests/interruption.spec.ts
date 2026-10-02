import { expect, test } from '@playwright/test'

import { expectClosed, expectOpen, openDrawer, state } from './helpers'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test.describe('Interruptions', () => {
  test('closing while opening reverses to closed', async ({ page }) => {
    await page.locator('[data-test="trigger-basic"]').click()
    await expect(state(page, 'basic')).toHaveText('AnimateIn')
    await page.keyboard.press('Escape')
    await expect(state(page, 'basic')).toHaveText('AnimateOut')
    await expectClosed(page, 'basic')
  })

  test('stacked drawers close one at a time on Escape', async ({ page }) => {
    await openDrawer(page, 'nonModal')
    await page.locator('[data-test="trigger-basic"]').click()
    await expectOpen(page, 'basic')
    await page.keyboard.press('Escape')
    await expectClosed(page, 'basic')
    await expectOpen(page, 'nonModal')
  })
})
