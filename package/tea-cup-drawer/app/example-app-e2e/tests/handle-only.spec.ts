import { test } from '@playwright/test'

import {
  ANIMATION_DURATION,
  drag,
  drawer,
  expectClosed,
  expectOpen,
  openDrawer,
  pointIn,
} from './helpers'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await openDrawer(page, 'handleOnly')
})

test.describe('Handle only', () => {
  test('does not drag from the content', async ({ page }) => {
    await drag(page, await pointIn(page, 'handleOnly', 80), { dx: 0, dy: 300 })
    await page.waitForTimeout(ANIMATION_DURATION)
    await expectOpen(page, 'handleOnly')
  })

  test('drags from the handle', async ({ page }) => {
    const box = await drawer(page, 'handleOnly')
      .locator('[data-drawer-handle]')
      .boundingBox()
    await drag(
      page,
      { x: (box?.x ?? 0) + (box?.width ?? 0) / 2, y: (box?.y ?? 0) + 2 },
      { dx: 0, dy: 300 },
    )
    await expectClosed(page, 'handleOnly')
  })
})
