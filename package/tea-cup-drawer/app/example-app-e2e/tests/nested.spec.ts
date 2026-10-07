import { type Page, expect, test } from '@playwright/test'

import { content, drawer, expectOpen, openDrawer } from './helpers'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

const handleOf = (page: Page, key: string) =>
  content(page, key).locator('[data-drawer-handle]').first()

test.describe('A drawer shown inside another', () => {
  test('each handle sits on its own drawer’s edge', async ({ page }) => {
    await openDrawer(page, 'nested')
    await expectOpen(page, 'nestedSheet')

    // The sheet is shown inside the page's drawer
    await expect(
      drawer(page, 'nested').locator('#tea-cup-drawer-nestedSheet'),
    ).toHaveCount(1)

    // The page's: a vertical bar on its inner (left) edge
    const pageHandle = handleOf(page, 'nested')
    await expect(pageHandle).toHaveAttribute('data-drawer-handle', 'right')
    await expect(pageHandle).toHaveCSS('position', 'absolute')
    const pageBox = await pageHandle.boundingBox()
    expect(pageBox?.width).toBe(5)

    // The sheet's: a horizontal bar at its top, in the flow, not styled as
    // the page's
    const sheetHandle = handleOf(page, 'nestedSheet')
    await expect(sheetHandle).toHaveAttribute('data-drawer-handle', 'bottom')
    await expect(sheetHandle).toHaveCSS('position', 'relative')
    const sheetBox = await sheetHandle.boundingBox()
    expect(sheetBox?.height).toBe(5)
    expect(sheetBox?.width).toBeGreaterThan(5)
  })
})
