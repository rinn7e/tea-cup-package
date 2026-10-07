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
})

const toggle = '[data-test="toggle-lock-dragLock"]'

test.describe('Drag lock', () => {
  test('a locked drawer is not dragged; unlocked, it closes', async ({
    page,
  }) => {
    await openDrawer(page, 'dragLock')

    await page.locator(toggle).click()
    await expect(page.locator(toggle)).toHaveText('Unlock dragging')
    await drag(page, await pointIn(page, 'dragLock'), { dx: 0, dy: 300 })
    await page.waitForTimeout(ANIMATION_DURATION)
    await expectOpen(page, 'dragLock')

    await page.locator(toggle).click()
    await expect(page.locator(toggle)).toHaveText('Lock dragging')
    await drag(page, await pointIn(page, 'dragLock'), { dx: 0, dy: 300 })
    await expectClosed(page, 'dragLock')
  })

  test('a locked drawer still closes with its Close button', async ({
    page,
  }) => {
    await openDrawer(page, 'dragLock')
    await page.locator(toggle).click()
    await page.locator('[data-test="close-dragLock"]').click()
    await expectClosed(page, 'dragLock')
  })
})
