import { expect, test } from '@playwright/test'

import {
  ANIMATION_DURATION,
  drag,
  expectClosed,
  expectOpen,
  openDrawer,
  pointIn,
} from './helpers'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await openDrawer(page, 'nonModal')
})

test.describe('Non-modal', () => {
  test('has no overlay and does not lock the page', async ({ page }) => {
    await expect(page.locator('[data-drawer-overlay]')).toHaveCount(0)
    expect(await page.evaluate(() => document.body.style.overflow)).toBe('')
  })

  test('keeps the page behind interactive', async ({ page }) => {
    await page.locator('[data-test="trigger-basic"]').click()
    await expectOpen(page, 'basic')
  })

  test('expands to the next snap point when dragged up', async ({ page }) => {
    await expect(page.locator('[data-test="non-modal-snap-index"]')).toHaveText(
      '0',
    )
    await drag(page, await pointIn(page, 'nonModal', 40), { dx: 0, dy: -300 })
    await expect(page.locator('[data-test="non-modal-snap-index"]')).toHaveText(
      '1',
    )
  })

  test('is not dismissed by a swipe down', async ({ page }) => {
    await drag(page, await pointIn(page, 'nonModal', 40), { dx: 0, dy: 300 })
    await page.waitForTimeout(ANIMATION_DURATION)
    await expectOpen(page, 'nonModal')
  })

  test('hides from the page', async ({ page }) => {
    await page.locator('[data-test="hide-nonModal"]').click()
    await expectClosed(page, 'nonModal')
  })
})
