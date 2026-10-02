import { expect, test } from '@playwright/test'

import { expectClosed, openDrawer, state } from './helpers'

const key = 'feedback'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await openDrawer(page, key)
})

test.describe('Side by side (parent only, no payload)', () => {
  test('the form is kept across close and reopen', async ({ page }) => {
    await page.locator('[data-test="rating-4"]').click()
    // Typing only changes parent state; a stale memo would not show it
    await page.locator('[data-test="feedback-comment"]').fill('half done')
    await expect(page.locator('[data-test="feedback-comment"]')).toHaveValue(
      'half done',
    )

    await page.keyboard.press('Escape')
    await expectClosed(page, key)
    await openDrawer(page, key)

    await expect(page.locator('[data-test="feedback-comment"]')).toHaveValue(
      'half done',
    )
    await expect(page.locator('[data-test="rating-4"]')).toHaveAttribute(
      'data-selected',
      'true',
    )
  })

  test('submit clears the form only once the drawer is fully closed', async ({
    page,
  }) => {
    await page.locator('[data-test="rating-5"]').click()
    await page.locator('[data-test="feedback-comment"]').fill('great')
    await page.locator('[data-test="feedback-submit"]').click()

    // Still sliding away: the form must not have been cleared yet
    await expect(state(page, key)).toHaveText('AnimateOut')
    await expect(page.locator('[data-test="feedback-comment"]')).toHaveValue(
      'great',
    )
    await expectClosed(page, key)

    await openDrawer(page, key)
    await expect(page.locator('[data-test="feedback-comment"]')).toHaveValue('')
  })

  test('a reply arriving after the drawer closed still reaches the parent', async ({
    page,
  }) => {
    await page.locator('[data-test="rating-3"]').click()
    await page.locator('[data-test="feedback-comment"]').fill('ok')
    await page.locator('[data-test="feedback-submit"]').click()

    await expectClosed(page, key)
    await expect(page.locator('[data-test="feedback-last-sent"]')).toHaveText(
      '3★ ok',
    )
  })
})
