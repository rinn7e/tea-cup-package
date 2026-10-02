import { expect, test } from '@playwright/test'

import {
  ANIMATION_DURATION,
  drag,
  expectClosed,
  expectOpen,
  openDrawer,
} from './helpers'

const scrollArea = (page: import('@playwright/test').Page) =>
  page.locator('[data-test="scroll-area"]')

const pointInList = async (page: import('@playwright/test').Page) => {
  const box = await scrollArea(page).boundingBox()
  return { x: (box?.x ?? 0) + 100, y: (box?.y ?? 0) + 40 }
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await openDrawer(page, 'scroll')
})

test.describe('Scrollable content', () => {
  test('a swipe on scrolled content does not drag the drawer', async ({
    page,
  }) => {
    await scrollArea(page).evaluate((el) => (el.scrollTop = 300))
    await drag(page, await pointInList(page), { dx: 0, dy: 300 })
    await page.waitForTimeout(ANIMATION_DURATION)
    await expectOpen(page, 'scroll')
  })

  test('a swipe on content scrolled to the top drags the drawer', async ({
    page,
  }) => {
    await expect
      .poll(() => scrollArea(page).evaluate((el) => el.scrollTop))
      .toBe(0)
    await drag(page, await pointInList(page), { dx: 0, dy: 300 })
    await expectClosed(page, 'scroll')
  })
})
