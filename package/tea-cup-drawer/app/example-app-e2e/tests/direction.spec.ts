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
  test('the handle sits on the inner edge, along it', async ({ page }) => {
    // Distance (px) between the handle and the edge it should sit on
    const handleGap = async (key: string) => {
      await openDrawer(page, key)
      const d = await drawer(page, key).boundingBox()
      const h = await drawer(page, key)
        .locator('[data-drawer-handle]')
        .boundingBox()
      if (d === null || h === null) {
        throw new Error(`${key}: not rendered`)
      } else {
        return {
          top: h.y - d.y,
          bottom: d.y + d.height - (h.y + h.height),
          left: h.x - d.x,
          right: d.x + d.width - (h.x + h.width),
          isVertical: h.height > h.width,
        }
      }
    }

    // Bottom (basic): horizontal, at the top
    const basic = await handleGap('basic')
    expect(basic.isVertical).toBe(false)
    expect(basic.top).toBeLessThan(20)
    await page.locator('[data-test="close-basic"]').click()

    const top = await handleGap('top')
    expect(top.isVertical).toBe(false)
    expect(top.bottom).toBeLessThan(20)
    await page.locator('[data-test="close-top"]').click()

    const left = await handleGap('left')
    expect(left.isVertical).toBe(true)
    expect(left.right).toBeLessThan(20)
    await page.locator('[data-test="close-left"]').click()

    const right = await handleGap('right')
    expect(right.isVertical).toBe(true)
    expect(right.left).toBeLessThan(20)
  })
})
