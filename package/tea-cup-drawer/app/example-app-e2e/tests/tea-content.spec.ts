import { expect, test } from '@playwright/test'

import { expectClosed, openDrawer, state } from './helpers'

const key = 'actions'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await openDrawer(page, key)
})

test.describe('TEA content (internal) and parent state', () => {
  test('the menu is a TEA component routed by the parent', async ({ page }) => {
    await page.locator('[data-test="action-move-to"]').click()
    await expect(
      page.locator('[data-test="action-menu-move-to"]'),
    ).toBeVisible()
    await page.locator('[data-test="folder-search"]').fill('arc')
    await expect(
      page.locator('[data-test^="folder-"]:not([data-test="folder-search"])'),
    ).toHaveText(['Archive'])
  })

  test('the menu state lives in the payload: kept while closing, reset on reopen', async ({
    page,
  }) => {
    await page.locator('[data-test="action-move-to"]').click()
    // Overlay tap
    await page.mouse.click(10, 10)
    await expect(state(page, key)).toHaveText('AnimateOut')
    await expect(
      page.locator('[data-test="action-menu-move-to"]'),
    ).toBeVisible()
    await expectClosed(page, key)

    await openDrawer(page, key)
    await expect(page.locator('[data-test="action-menu-main"]')).toBeVisible()
  })

  test('the draft lives in the parent: memo re-renders on change, kept after closing', async ({
    page,
  }) => {
    const draft = page.locator('[data-test="draft"]')
    // Typing only changes parent state; a stale memo would not show it
    await draft.fill('call me later')
    await expect(draft).toHaveValue('call me later')

    // Overlay tap
    await page.mouse.click(10, 10)
    await expectClosed(page, key)
    await openDrawer(page, key)
    await expect(page.locator('[data-test="draft"]')).toHaveValue(
      'call me later',
    )
  })

  test('picking a folder is handled by the parent in the same step', async ({
    page,
  }) => {
    await page.locator('[data-test="action-move-to"]').click()
    await page.locator('[data-test="folder-Projects"]').click()
    await expectClosed(page, key)
    await expect(page.locator('[data-test="open-log"] li')).toHaveText([
      'actions closed',
      'moved to Projects',
      'actions opened',
    ])
  })
  test('a reply for a menu reopened for another message does not reach the new menu', async ({
    page,
  }) => {
    // Opened for message A (beforeEach); its folder request starts
    await expect(page.locator('[data-test="menu-message"]')).toHaveText(
      'Message A',
    )
    await page.locator('[data-test="action-move-to"]').click()
    await expect(page.locator('[data-test="folders-loading"]')).toBeVisible()

    // Reopen for message B while A is still sliding away
    // Overlay tap
    await page.mouse.click(10, 10)
    await expect(state(page, key)).toHaveText('AnimateOut')
    await page.evaluate(() =>
      document
        .querySelector<HTMLElement>('[data-test="trigger-actions-b"]')
        ?.click(),
    )
    await expect(page.locator('[data-test="menu-message"]')).toHaveText(
      'Message B',
    )

    // A's folders answer (keyed "A"): dropped, B still has to load its own
    await page.waitForTimeout(1200)
    await page.locator('[data-test="action-move-to"]').click()
    await expect(page.locator('[data-test="folders-loading"]')).toBeVisible()
    await expect(page.locator('[data-test="folder-Archive"]')).toBeVisible()
  })
})
