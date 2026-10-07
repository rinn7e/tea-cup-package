import { devices, expect, test } from '@playwright/test'

import { expectClosed, expectOpen, state } from './helpers'

// iOS Safari: the body lock pins the body (`position: fixed`), which is where
// a page scrolling inside its own container used to lose its scroll
test.use({ ...devices['iPhone 13'], browserName: 'webkit' })

const pageScroll = (page: import('@playwright/test').Page) =>
  page.locator('[data-test="page-scroll"]')

const scrollTop = (page: import('@playwright/test').Page) =>
  pageScroll(page).evaluate((el) => el.scrollTop)

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test.describe('Body scroll lock on iOS Safari', () => {
  test("keeps the page's own scroll while a drawer is open", async ({
    page,
  }) => {
    await pageScroll(page).evaluate((el) => el.scrollTo({ top: 600 }))
    expect(await scrollTop(page)).toBe(600)

    await page.locator('[data-test="trigger-snap"]').click()
    await expectOpen(page, 'snap')
    // Pinned, but the page's container keeps its height and its scroll
    expect(await page.evaluate(() => document.body.style.position)).toBe(
      'fixed',
    )
    expect(await scrollTop(page)).toBe(600)

    await page.locator('[data-test="close-snap"]').click()
    await expect(state(page, 'snap')).toHaveText('AnimateOut')
    await expectClosed(page, 'snap')
    expect(await page.evaluate(() => document.body.style.position)).toBe('')
    expect(await scrollTop(page)).toBe(600)
  })
})
