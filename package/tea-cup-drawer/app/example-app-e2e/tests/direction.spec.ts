import { expect, test } from '@playwright/test'

import {
  drag,
  drawer,
  expectClosed,
  expectOpen,
  openDrawer,
  pointIn,
} from './helpers'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test.describe('Directions', () => {
  test('top drawer is attached to the top and closes upward', async ({
    page,
  }) => {
    await openDrawer(page, 'top')
    const box = await drawer(page, 'top').boundingBox()
    expect(box?.y).toBe(0)
    await drag(page, await pointIn(page, 'top', 80), { dx: 0, dy: -200 })
    await expectClosed(page, 'top')
  })

  test('top drawer does not close when dragged down', async ({ page }) => {
    await openDrawer(page, 'top')
    await drag(page, await pointIn(page, 'top', 80), { dx: 0, dy: 200 })
    await expectOpen(page, 'top')
  })

  test('left drawer closes when swiped left', async ({ page }) => {
    await openDrawer(page, 'left')
    const box = await drawer(page, 'left').boundingBox()
    expect(box?.x).toBe(0)
    await drag(page, await pointIn(page, 'left'), { dx: -250, dy: 0 })
    await expectClosed(page, 'left')
  })

  test('left drawer does not close when swiped right', async ({ page }) => {
    await openDrawer(page, 'left')
    await drag(page, await pointIn(page, 'left'), { dx: 250, dy: 0 })
    await expectOpen(page, 'left')
  })

  test('right drawer closes when swiped right', async ({ page }) => {
    await openDrawer(page, 'right')
    const box = await drawer(page, 'right').boundingBox()
    const viewport = page.viewportSize()
    expect((box?.x ?? 0) + (box?.width ?? 0)).toBe(viewport?.width)
    await drag(page, await pointIn(page, 'right'), { dx: 250, dy: 0 })
    await expectClosed(page, 'right')
  })
})
