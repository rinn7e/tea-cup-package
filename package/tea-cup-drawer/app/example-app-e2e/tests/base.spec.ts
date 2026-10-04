import { expect, test } from '@playwright/test'

import {
  ANIMATION_DURATION,
  content,
  drag,
  drawer,
  expectClosed,
  expectOpen,
  openDrawer,
  pointIn,
  state,
} from './helpers'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test.describe('Base', () => {
  test('opens through Mounting and AnimateIn', async ({ page }) => {
    await expectClosed(page, 'basic')
    await page.locator('[data-test="trigger-basic"]').click()
    await expect(drawer(page, 'basic')).toHaveAttribute(
      'data-state',
      /Mounting|AnimateIn/,
    )
    await expectOpen(page, 'basic')
    await expect(drawer(page, 'basic')).toHaveAttribute('data-state', 'Visible')
  })

  test('closes on overlay click', async ({ page }) => {
    await openDrawer(page, 'basic')
    await page.mouse.click(10, 10)
    await expectClosed(page, 'basic')
  })

  test('closes with the Close button', async ({ page }) => {
    await openDrawer(page, 'basic')
    await page.locator('[data-test="close-basic"]').click()
    await expect(state(page, 'basic')).toHaveText('AnimateOut')
    await expectClosed(page, 'basic')
  })

  test('gives focus back to the trigger once closed', async ({ page }) => {
    await openDrawer(page, 'basic')
    await expect(drawer(page, 'basic')).toBeFocused()
    await page.locator('[data-test="close-basic"]').click()
    await expectClosed(page, 'basic')
    await expect(page.locator('[data-test="trigger-basic"]')).toBeFocused()
  })

  test('leaves keys to its owner: Escape does not close it', async ({
    page,
  }) => {
    await openDrawer(page, 'basic')
    await page.keyboard.press('Escape')
    await page.waitForTimeout(ANIMATION_DURATION)
    await expectOpen(page, 'basic')
  })

  test('locks the body scroll while open', async ({ page }) => {
    const overflow = () => page.evaluate(() => document.body.style.overflow)
    await openDrawer(page, 'basic')
    expect(await overflow()).toBe('hidden')
    await page.locator('[data-test="close-basic"]').click()
    await expectClosed(page, 'basic')
    expect(await overflow()).toBe('')
  })

  test('closes when dragged down', async ({ page }) => {
    await openDrawer(page, 'basic')
    await drag(page, await pointIn(page, 'basic'), { dx: 0, dy: 300 })
    await expectClosed(page, 'basic')
  })

  test('follows the pointer while dragging', async ({ page }) => {
    await openDrawer(page, 'basic')
    await drag(
      page,
      await pointIn(page, 'basic'),
      { dx: 0, dy: 40 },
      { release: false },
    )
    await expect(drawer(page, 'basic')).toHaveAttribute(
      'data-state',
      'Dragging',
    )
    await expect(drawer(page, 'basic')).toHaveCSS('--drawer-translate', '40px')
    await page.mouse.up()
  })

  test('does not drag when pulled up from rest', async ({ page }) => {
    await openDrawer(page, 'basic')
    // Pulling an open drawer further open is left to the content (scroll)
    await drag(
      page,
      await pointIn(page, 'basic'),
      { dx: 0, dy: -300 },
      { release: false },
    )
    await expect(drawer(page, 'basic')).toHaveAttribute('data-state', 'Visible')
    await page.mouse.up()
    await expectOpen(page, 'basic')
  })

  test('rubber-bands past the open position during a drag', async ({
    page,
  }) => {
    await openDrawer(page, 'basic')
    const start = await pointIn(page, 'basic')
    await drag(page, start, { dx: 0, dy: 20 }, { release: false })
    await page.mouse.move(start.x, start.y - 200, { steps: 5 })
    const translate = await drawer(page, 'basic').evaluate((el) =>
      parseFloat(el.style.getPropertyValue('--drawer-translate')),
    )
    // Pulled 200px up, but resisted to a fraction of it
    expect(translate).toBeLessThan(0)
    expect(translate).toBeGreaterThan(-40)
    await page.mouse.up()
    await expect(state(page, 'basic')).toHaveText('Settling')
    await expectOpen(page, 'basic')
  })

  test('springs back after a short slow drag', async ({ page }) => {
    await openDrawer(page, 'basic')
    await drag(
      page,
      await pointIn(page, 'basic'),
      { dx: 0, dy: 20 },
      { steps: 10, stepDelay: 40 },
    )
    await expectOpen(page, 'basic')
  })

  test('closes when dragged down and cancelled', async ({ page }) => {
    await openDrawer(page, 'basic')
    await drag(
      page,
      await pointIn(page, 'basic'),
      { dx: 0, dy: 300 },
      { release: false },
    )
    await page.dispatchEvent('[data-drawer]', 'contextmenu')
    await page.mouse.up()
    await expectClosed(page, 'basic')
  })

  test('tells the parent about closes it decided itself', async ({ page }) => {
    await openDrawer(page, 'basic')
    await drag(page, await pointIn(page, 'basic'), { dx: 0, dy: 300 })
    await expectClosed(page, 'basic')
    await expect(page.locator('[data-test="open-log"] li')).toHaveText([
      'basic closed',
      'basic opened',
    ])
  })

  test('a tap on the content does not close it', async ({ page }) => {
    await openDrawer(page, 'basic')
    await content(page, 'basic').locator('h2').click()
    await expectOpen(page, 'basic')
  })
})
