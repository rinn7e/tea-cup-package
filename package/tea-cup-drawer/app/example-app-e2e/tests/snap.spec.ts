import { expect, test } from '@playwright/test'

import {
  drag,
  drawer,
  expectClosed,
  expectOpen,
  openDrawer,
  pointIn,
} from './helpers'

const activeSnap = (page: import('@playwright/test').Page) =>
  page.locator('[data-test="active-snap-index"]')

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await openDrawer(page, 'snap')
})

test.describe('Snap points', () => {
  test('opens at the initial snap point', async ({ page }) => {
    await expect(activeSnap(page)).toHaveText('1')
    await expect(drawer(page, 'snap')).toHaveCSS('--drawer-translate', '50%')
  })

  test('moves to a snap point set by the parent', async ({ page }) => {
    await page.locator('[data-test="set-snap-2"]').click()
    await expect(activeSnap(page)).toHaveText('2')
    await expectOpen(page, 'snap')
    await expect(drawer(page, 'snap')).toHaveCSS('--drawer-translate', '0%')
  })

  test('cycles to the next snap point on a handle tap', async ({ page }) => {
    await drawer(page, 'snap').locator('[data-drawer-handle]').click()
    await expect(activeSnap(page)).toHaveText('2')
  })

  test('jumps to the top on a flick up', async ({ page }) => {
    await drag(page, await pointIn(page, 'snap'), { dx: 0, dy: -200 })
    await expect(activeSnap(page)).toHaveText('2')
    await expectOpen(page, 'snap')
  })

  test('snaps to the closest point after a slow drag', async ({ page }) => {
    // From 50% down to ~148px visible
    const box = await drawer(page, 'snap').boundingBox()
    const height = box?.height ?? 0
    const distance = height * 0.5 - 148
    await drag(
      page,
      await pointIn(page, 'snap'),
      { dx: 0, dy: distance },
      { steps: 20, stepDelay: 40 },
    )
    await expect(activeSnap(page)).toHaveText('0')
    await expectOpen(page, 'snap')
  })

  test('closes on a strong flick down', async ({ page }) => {
    await drag(page, await pointIn(page, 'snap'), { dx: 0, dy: 300 })
    await expectClosed(page, 'snap')
  })

  test('reopens at the initial snap point', async ({ page }) => {
    await page.locator('[data-test="set-snap-2"]').click()
    await expect(activeSnap(page)).toHaveText('2')
    await page.locator('[data-test="close-snap"]').click()
    await expectClosed(page, 'snap')
    await openDrawer(page, 'snap')
    await expect(activeSnap(page)).toHaveText('1')
  })
})
