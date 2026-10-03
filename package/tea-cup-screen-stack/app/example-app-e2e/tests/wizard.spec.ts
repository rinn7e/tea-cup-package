import { expect, test } from '@playwright/test'

import {
  clickInTop,
  container,
  expectIdleAt,
  heightOf,
  panels,
} from './helpers'

const key = 'wizard'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await expectIdleAt(page, key, 0)
})

test.describe('Standalone wizard', () => {
  test('next pushes, back pops, and each step keeps its input', async ({
    page,
  }) => {
    await page.locator('[data-test="wizard-email"]').fill('ada@example.com')
    await clickInTop(page, key, 'wizard-next')
    await expectIdleAt(page, key, 1)
    await page.locator('[data-test="wizard-plan-Pro"]').check()
    await clickInTop(page, key, 'wizard-next')
    await expectIdleAt(page, key, 2)
    await expect(page.locator('[data-test="wizard-summary-text"]')).toHaveText(
      'ada@example.com on Pro',
    )

    await clickInTop(page, key, 'wizard-back')
    await expectIdleAt(page, key, 1)
    await expect(page.locator('[data-test="wizard-plan-Pro"]')).toBeChecked()
    await clickInTop(page, key, 'wizard-back')
    await expectIdleAt(page, key, 0)
    await expect(page.locator('[data-test="wizard-email"]')).toHaveValue(
      'ada@example.com',
    )
  })

  test('the height follows the step on show', async ({ page }) => {
    const accountHeight = await heightOf(container(page, key))
    await page.locator('[data-test="wizard-email"]').fill('ada@example.com')
    await clickInTop(page, key, 'wizard-next')
    await expectIdleAt(page, key, 1)
    await expect
      .poll(() => heightOf(container(page, key)))
      .toBeGreaterThan(accountHeight)
  })

  test('restart slides back to an empty first step in one go', async ({
    page,
  }) => {
    await page.locator('[data-test="wizard-email"]').fill('ada@example.com')
    await clickInTop(page, key, 'wizard-next')
    await clickInTop(page, key, 'wizard-next')
    await expectIdleAt(page, key, 2)
    await clickInTop(page, key, 'wizard-restart')
    // One back slide from the summary to the first step; the plan step in
    // between is never shown
    await expect(container(page, key)).toHaveAttribute('data-state', 'Popping')
    await expect(panels(page, key)).toHaveCount(2)
    await expect(
      panels(page, key).evaluateAll((elements) =>
        elements.map((e) => e.getAttribute('data-screen-depth')),
      ),
    ).resolves.toEqual(['0', '2'])
    await expect(page.locator('[data-test="wizard-plan"]')).toHaveCount(0)
    await expectIdleAt(page, key, 0)
    await expect(page.locator('[data-test="wizard-email"]')).toHaveValue('')
  })

  test('focus is not taken from the rest of the page', async ({ page }) => {
    await page.locator('[data-test="wizard-email"]').fill('ada@example.com')
    await clickInTop(page, key, 'wizard-next')
    // Focus moves elsewhere before the transition ends
    await page.locator('[data-test="trigger-menu"]').focus()
    await expectIdleAt(page, key, 1)
    await expect(page.locator('[data-test="trigger-menu"]')).toBeFocused()
  })
})
