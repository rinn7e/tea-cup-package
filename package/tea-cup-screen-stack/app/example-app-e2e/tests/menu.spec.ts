import { expect, test } from '@playwright/test'

import {
  clickInTop,
  container,
  expectIdleAt,
  heightOf,
  log,
  openMenu,
  panels,
  stackState,
  topPanel,
} from './helpers'

const key = 'menu'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
  await openMenu(page)
})

test.describe('Drawer + screen stack', () => {
  test('push slides the new screen in and shows a back button', async ({
    page,
  }) => {
    await expect(page.locator('[data-test="screen-back"]')).toHaveCount(0)
    await clickInTop(page, key, 'move-to')
    // Both screens are rendered while sliding
    await expect(container(page, key)).toHaveAttribute('data-state', 'Pushing')
    await expect(panels(page, key)).toHaveCount(2)
    await expectIdleAt(page, key, 1)
    await expect(topPanel(page, key)).toHaveAttribute('data-screen-depth', '1')
    await expect(page.locator('[data-test="screen-move-to"]')).toBeVisible()
    await expect(page.locator('[data-test="screen-main"]')).toHaveCount(0)
    await expect(page.locator('[data-test="screen-back"]')).toBeVisible()
  })

  test('pop slides back to the previous screen', async ({ page }) => {
    await clickInTop(page, key, 'move-to')
    await expectIdleAt(page, key, 1)
    await clickInTop(page, key, 'screen-back')
    await expect(container(page, key)).toHaveAttribute('data-state', 'Popping')
    await expectIdleAt(page, key, 0)
    await expect(page.locator('[data-test="screen-main"]')).toBeVisible()
    await expect(page.locator('[data-test="screen-back"]')).toHaveCount(0)
  })

  test('the container takes the height of the screen on show', async ({
    page,
  }) => {
    const mainHeight = await heightOf(container(page, key))
    expect(mainHeight).toBeCloseTo(await heightOf(topPanel(page, key)), 0)

    await clickInTop(page, key, 'move-to')
    await expectIdleAt(page, key, 1)
    // Grows again once the folders have loaded
    await expect(page.locator('[data-test="folders"]')).toBeVisible()
    await expect
      .poll(async () =>
        Math.abs(
          (await heightOf(container(page, key))) -
            (await heightOf(topPanel(page, key))),
        ),
      )
      .toBeLessThan(1)
    expect(await heightOf(container(page, key))).toBeGreaterThan(mainHeight)
  })

  test('the screen returned to keeps its state, popped screens lose theirs', async ({
    page,
  }) => {
    await clickInTop(page, key, 'move-to')
    await expectIdleAt(page, key, 1)
    await page.locator('[data-test="folder-search"]').fill('for')
    await clickInTop(page, key, 'new-folder')
    await expectIdleAt(page, key, 2)
    await clickInTop(page, key, 'screen-back')
    await expectIdleAt(page, key, 1)
    // Still in the stack: the search is kept
    await expect(page.locator('[data-test="folder-search"]')).toHaveValue('for')

    await clickInTop(page, key, 'screen-back')
    await expectIdleAt(page, key, 0)
    await clickInTop(page, key, 'move-to')
    await expectIdleAt(page, key, 1)
    // Popped before: a fresh screen
    await expect(page.locator('[data-test="folder-search"]')).toHaveValue('')
  })

  test('a late message for a popped screen is dropped', async ({ page }) => {
    await clickInTop(page, key, 'move-to')
    await expectIdleAt(page, key, 1)
    await expect(page.locator('[data-test="folders-loading"]')).toBeVisible()
    await clickInTop(page, key, 'screen-back')
    await expectIdleAt(page, key, 0)
    // The folder request (2s) answers after the screen has fully slid away;
    // while it is still sliding away it would receive it
    await expect(log(page)).toHaveText(['dropped MoveToMsg: screen gone'])
    await expect(page.locator('[data-test="screen-main"]')).toBeVisible()
  })

  test('a reply reaches its screen while another screen is on top', async ({
    page,
  }) => {
    await clickInTop(page, key, 'move-to')
    await expectIdleAt(page, key, 1)
    await expect(page.locator('[data-test="folders-loading"]')).toBeVisible()
    // Go deeper before the folder request answers
    await clickInTop(page, key, 'new-folder')
    await expectIdleAt(page, key, 2)
    // The answer (2s after the push) lands in "Move to" underneath, by its
    // key, not dropped
    await page.waitForTimeout(2200)
    await expect(log(page)).toHaveCount(0)
    await clickInTop(page, key, 'screen-back')
    await expectIdleAt(page, key, 1)
    await expect(page.locator('[data-test="folders"]')).toBeVisible()
    await expect(page.locator('[data-test="folders-loading"]')).toHaveCount(0)
  })

  test('the parent intercepts screen messages: create pops back', async ({
    page,
  }) => {
    await clickInTop(page, key, 'move-to')
    await expectIdleAt(page, key, 1)
    await clickInTop(page, key, 'new-folder')
    await expectIdleAt(page, key, 2)
    await page.locator('[data-test="new-folder-name"]').fill('Work')
    await clickInTop(page, key, 'create-folder')
    await expectIdleAt(page, key, 1)
    await expect(log(page).first()).toHaveText('created folder Work')
  })

  test('picking a folder closes the whole drawer', async ({ page }) => {
    await clickInTop(page, key, 'move-to')
    await clickInTop(page, key, 'folder-Forums')
    await expect(page.locator('[data-test="state-menu"]')).toHaveText(
      'Invisible',
    )
    await expect(log(page)).toHaveText(['moved to Forums'])
  })

  test('the overlay closes the whole drawer from a deep screen, which stays while sliding away', async ({
    page,
  }) => {
    await clickInTop(page, key, 'move-to')
    await expectIdleAt(page, key, 1)
    await clickInTop(page, key, 'new-folder')
    await expectIdleAt(page, key, 2)
    // Overlay tap
    await page.mouse.click(10, 10)
    await expect(page.locator('[data-test="state-menu"]')).toHaveText(
      'AnimateOut',
    )
    await expect(page.locator('[data-test="screen-new-folder"]')).toBeVisible()
    await expect(page.locator('[data-test="state-menu"]')).toHaveText(
      'Invisible',
    )
    await expect(stackState(page, key)).toHaveText('—')
  })

  test('reopening starts at the first screen', async ({ page }) => {
    await clickInTop(page, key, 'move-to')
    await expectIdleAt(page, key, 1)
    // Overlay tap
    await page.mouse.click(10, 10)
    await expect(page.locator('[data-test="state-menu"]')).toHaveText(
      'Invisible',
    )
    await openMenu(page)
    await expect(page.locator('[data-test="screen-main"]')).toBeVisible()
  })

  test('rapid pushes and pops end in a consistent state', async ({ page }) => {
    await page.evaluate(async () => {
      const clickTop = (test: string) =>
        document
          .querySelector<HTMLElement>(
            `#menu-screen-stack > [data-screen-role="Top"] [data-test="${test}"]`,
          )
          ?.click()
      const wait = () => new Promise((resolve) => setTimeout(resolve, 30))
      clickTop('move-to')
      await wait()
      clickTop('new-folder')
      await wait()
      clickTop('screen-back')
      await wait()
      clickTop('screen-back')
    })
    await expectIdleAt(page, key, 0)
    await expect(page.locator('[data-test="screen-main"]')).toBeVisible()
    await expect(topPanel(page, key)).not.toHaveAttribute('style', /translate/)
  })

  test('focus moves to the new screen after a push', async ({ page }) => {
    await clickInTop(page, key, 'move-to')
    await expectIdleAt(page, key, 1)
    await expect(page.locator('#menu-screen-1')).toBeFocused()
  })
})
