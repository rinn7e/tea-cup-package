import { type Page, expect, test } from '@playwright/test'

import { clickInTop, container, expectIdleAt, panels } from './helpers'

const key = 'settings'

const path = (page: Page) => page.locator('[data-test="settings-path"]')

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await expectIdleAt(page, key, 0)
})

test.describe('Settings (free navigation)', () => {
  test('goes forward and back freely', async ({ page }) => {
    await clickInTop(page, key, 'settings-go-General')
    await expectIdleAt(page, key, 1)
    await clickInTop(page, key, 'settings-go-About')
    await expectIdleAt(page, key, 2)
    await clickInTop(page, key, 'settings-go-Licenses')
    await expectIdleAt(page, key, 3)
    await expect(path(page)).toHaveText('Settings › General › About › Licenses')

    await clickInTop(page, key, 'settings-back')
    await expectIdleAt(page, key, 2)
    await expect(path(page)).toHaveText('Settings › General › About')
    await clickInTop(page, key, 'settings-back')
    await expectIdleAt(page, key, 1)
    // Sideways into another page of the same level
    await clickInTop(page, key, 'settings-go-Language')
    await expectIdleAt(page, key, 2)
    await expect(path(page)).toHaveText('Settings › General › Language')
  })

  test('Top goes back to the root in one slide', async ({ page }) => {
    await clickInTop(page, key, 'settings-go-General')
    await clickInTop(page, key, 'settings-go-About')
    await clickInTop(page, key, 'settings-go-Licenses')
    await expectIdleAt(page, key, 3)
    await clickInTop(page, key, 'settings-top')
    await expect(container(page, key)).toHaveAttribute('data-state', 'Popping')
    // Only the old top and the root are rendered: the pages in between are
    // never shown
    await expect(
      panels(page, key).evaluateAll((elements) =>
        elements.map((e) => e.getAttribute('data-screen-depth')),
      ),
    ).resolves.toEqual(['0', '3'])
    await expectIdleAt(page, key, 0)
    await expect(path(page)).toHaveText('Settings')
  })

  test('no back or top button on the root, no top button one level down', async ({
    page,
  }) => {
    await expect(page.locator('[data-test="settings-back"]')).toHaveCount(0)
    await clickInTop(page, key, 'settings-go-Privacy')
    await expectIdleAt(page, key, 1)
    await expect(page.locator('[data-test="settings-back"]')).toBeVisible()
    await expect(page.locator('[data-test="settings-top"]')).toHaveCount(0)
  })

  test('rapid clicks end in a consistent state', async ({ page }) => {
    await page.evaluate(async () => {
      const clickTop = (test: string) =>
        document
          .querySelector<HTMLElement>(
            `#settings-screen-stack > [data-screen-role="Top"] [data-test="${test}"]`,
          )
          ?.click()
      const wait = () => new Promise((resolve) => setTimeout(resolve, 30))
      clickTop('settings-go-Notifications')
      await wait()
      clickTop('settings-go-Sounds')
      await wait()
      clickTop('settings-back')
      await wait()
      clickTop('settings-go-Sounds')
    })
    await expectIdleAt(page, key, 2)
    await expect(path(page)).toHaveText('Settings › Notifications › Sounds')
  })
})
