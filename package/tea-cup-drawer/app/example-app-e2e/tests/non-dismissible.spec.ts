import { test } from '@playwright/test'

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
  await openDrawer(page, 'nonDismissible')
})

test.describe('Non-dismissible', () => {
  test('does not close on overlay click', async ({ page }) => {
    await page.mouse.click(10, 10)
    await page.waitForTimeout(ANIMATION_DURATION)
    await expectOpen(page, 'nonDismissible')
  })

  test('does not close on Escape', async ({ page }) => {
    await page.keyboard.press('Escape')
    await page.waitForTimeout(ANIMATION_DURATION)
    await expectOpen(page, 'nonDismissible')
  })

  test('does not close when dragged down', async ({ page }) => {
    await drag(page, await pointIn(page, 'nonDismissible'), { dx: 0, dy: 300 })
    await page.waitForTimeout(ANIMATION_DURATION)
    await expectOpen(page, 'nonDismissible')
  })

  test('closes with the dismiss button', async ({ page }) => {
    await page.locator('[data-test="dismiss-button"]').click()
    await expectClosed(page, 'nonDismissible')
  })
})
