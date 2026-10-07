import { type Page, expect, test } from '@playwright/test'

import {
  ANIMATION_DURATION,
  drag,
  drawer,
  expectClosed,
  expectOpen,
  pointIn,
  state,
} from './helpers'

// Every `data-state` the drawer goes through, from the first frame
// (installed before the app runs, so a state shown only once is caught too)
const recordStates = async (page: Page) => {
  await page.addInitScript(() => {
    const states: string[] = []
    ;(window as unknown as { drawerStates: string[] }).drawerStates = states
    const record = () => {
      const value = document
        .getElementById('tea-cup-drawer-skipAnimation')
        ?.getAttribute('data-state')
      if (value === undefined || value === null) {
        // Not rendered (closed)
      } else if (states[states.length - 1] !== value) {
        states.push(value)
      } else {
        // Unchanged
      }
    }
    new MutationObserver(record).observe(document, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['data-state'],
    })
  })
}

const recordedStates = (page: Page): Promise<string[]> =>
  page.evaluate(
    () => (window as unknown as { drawerStates: string[] }).drawerStates,
  )

const openAtOnce = async (page: Page) => {
  await expectClosed(page, 'skipAnimation')
  await page.locator('[data-test="trigger-skipAnimation-at-once"]').click()
  await expectOpen(page, 'skipAnimation')
}

test.describe('skipAnimation', () => {
  test.beforeEach(async ({ page }) => {
    await recordStates(page)
    await page.goto('/')
  })

  test('"Open at once" is Visible at once, never sliding in', async ({
    page,
  }) => {
    await openAtOnce(page)
    await page.waitForTimeout(ANIMATION_DURATION)
    expect(await recordedStates(page)).toEqual(['Visible'])
    await expect(drawer(page, 'skipAnimation')).toHaveCSS(
      '--drawer-translate',
      '0px',
    )
  })

  test('"Open at once" takes the focus and locks the body', async ({
    page,
  }) => {
    await openAtOnce(page)
    await expect(drawer(page, 'skipAnimation')).toBeFocused()
    expect(
      await page.evaluate(() => getComputedStyle(document.body).overflow),
    ).toBe('hidden')
  })

  test('"Open" still slides in', async ({ page }) => {
    await expectClosed(page, 'skipAnimation')
    await page.locator('[data-test="trigger-skipAnimation"]').click()
    await expectOpen(page, 'skipAnimation')
    expect(await recordedStates(page)).toEqual([
      'Mounting',
      'AnimateIn',
      'Visible',
    ])
  })

  test('closes with its animation and gives the focus back', async ({
    page,
  }) => {
    await openAtOnce(page)
    await page.locator('[data-test="close-skipAnimation"]').click()
    await expect(state(page, 'skipAnimation')).toHaveText('AnimateOut')
    await expectClosed(page, 'skipAnimation')
    expect(
      await page.evaluate(() => getComputedStyle(document.body).overflow),
    ).toBe('visible')
    await expect(
      page.locator('[data-test="trigger-skipAnimation-at-once"]'),
    ).toBeFocused()
  })

  test('closes when dragged right', async ({ page }) => {
    await openAtOnce(page)
    // For 500ms after opening a swipe is left to the content (vaul's
    // `openTime`), even without the slide-in
    await page.waitForTimeout(ANIMATION_DURATION)
    await drag(page, await pointIn(page, 'skipAnimation'), { dx: 300, dy: 0 })
    await expectClosed(page, 'skipAnimation')
  })
})
