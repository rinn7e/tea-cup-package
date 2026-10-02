import { type Page, expect, test } from '@playwright/test'

import {
  drag,
  drawer,
  expectClosed,
  expectOpen,
  openDrawer,
  pointIn,
} from './helpers'

const key = 'snapFullscreen'

const activeSnap = (page: Page) =>
  page.locator('[data-test="fullscreen-snap-index"]')

// Top edge of the visible part of the drawer
const visibleTop = async (page: Page) =>
  (await drawer(page, key).boundingBox())?.y ?? 0

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await openDrawer(page, key)
})

test.describe('Snap to full screen', () => {
  test('starts as a short sheet with the overlay', async ({ page }) => {
    await expect(activeSnap(page)).toHaveText('0')
    const viewport = page.viewportSize()?.height ?? 0
    expect(viewport - (await visibleTop(page))).toBeCloseTo(260, 0)
    await expect(page.locator('[data-drawer-overlay]')).toHaveCSS(
      'opacity',
      '1',
    )
  })

  test('goes full screen when dragged up', async ({ page }) => {
    await drag(page, await pointIn(page, key, 40), { dx: 0, dy: -400 })
    await expect(activeSnap(page)).toHaveText('1')
    await expectOpen(page, key)
    expect(await visibleTop(page)).toBe(0)
  })

  test('goes full screen on a handle tap', async ({ page }) => {
    await drawer(page, key).locator('[data-drawer-handle]').click()
    await expect(activeSnap(page)).toHaveText('1')
  })

  test('closes from the short sheet when dragged down', async ({ page }) => {
    await drag(page, await pointIn(page, key, 40), { dx: 0, dy: 200 })
    await expectClosed(page, key)
  })

  test('closes on overlay click', async ({ page }) => {
    await page.mouse.click(10, 10)
    await expectClosed(page, key)
  })
})
