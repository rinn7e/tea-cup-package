import { type Page, expect, test } from '@playwright/test'

import { drag, drawer, expectOpen, openDrawer, pointIn } from './helpers'

// How much of the drawer is on screen (px)
const visibleHeight = async (page: Page): Promise<number> => {
  const box = await drawer(page, 'measuredSnap').boundingBox()
  const viewport = page.viewportSize()
  if (box === null || viewport === null) {
    throw new Error('drawer measuredSnap is not rendered')
  } else {
    return viewport.height - box.y
  }
}

const compactHeight = async (page: Page): Promise<number> => {
  const box = await page
    .locator('[data-test="compact-measuredSnap"]')
    .boundingBox()
  if (box === null) {
    throw new Error('compact part is not rendered')
  } else {
    return box.height
  }
}

// The drawer rests with exactly the compact part on screen
const expectAtCompact = async (page: Page) => {
  await expectOpen(page, 'measuredSnap')
  await expect
    .poll(async () => (await visibleHeight(page)) - (await compactHeight(page)))
    .toBeLessThan(2)
  await expect
    .poll(async () => (await visibleHeight(page)) - (await compactHeight(page)))
    .toBeGreaterThan(-2)
}

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await openDrawer(page, 'measuredSnap')
})

test.describe('Measured snap point', () => {
  test('opens at the measured height of the compact part', async ({ page }) => {
    await expectAtCompact(page)
  })

  test('follows the compact part when it grows and shrinks', async ({
    page,
  }) => {
    const before = await visibleHeight(page)
    await page.locator('[data-test="add-line"]').click()
    await page.locator('[data-test="add-line"]').click()
    await expectAtCompact(page)
    expect(await visibleHeight(page)).toBeGreaterThan(before + 20)

    await page.locator('[data-test="remove-line"]').click()
    await page.locator('[data-test="remove-line"]').click()
    await expectAtCompact(page)
    expect(Math.abs((await visibleHeight(page)) - before)).toBeLessThan(2)
  })

  test('stays at full screen when the compact part changes', async ({
    page,
  }) => {
    await drag(page, await pointIn(page, 'measuredSnap', 10), {
      dx: 0,
      dy: -500,
    })
    await expectOpen(page, 'measuredSnap')
    const full = await visibleHeight(page)
    expect(full).toBeGreaterThan(500)

    await page.locator('[data-test="add-line"]').click()
    await expectOpen(page, 'measuredSnap')
    expect(Math.abs((await visibleHeight(page)) - full)).toBeLessThan(2)
  })
})
