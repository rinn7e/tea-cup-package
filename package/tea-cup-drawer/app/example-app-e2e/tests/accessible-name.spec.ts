import { expect, test } from '@playwright/test'

import { drawer, expectClosed, expectOpen, openDrawer } from './helpers'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

test.describe('Accessible name', () => {
  test('is the title of the content, with its description', async ({
    page,
  }) => {
    await openDrawer(page, 'basic')
    const dialog = page.getByRole('dialog', { name: 'Basic drawer' })
    await expect(dialog).toHaveAttribute('id', 'tea-cup-drawer-basic')
    await expect(dialog).toHaveAccessibleDescription(
      await page.locator('#drawer-description-basic').innerText(),
    )
  })

  test('follows a title that changes with the payload', async ({ page }) => {
    await openDrawer(page, 'actions')
    await expect(drawer(page, 'actions')).toHaveAccessibleName(
      'Actions for message A',
    )
    // Overlay tap
    await page.mouse.click(10, 10)
    await expectClosed(page, 'actions')
    // Message B opens the same drawer with another payload
    await page.locator('[data-test="trigger-actions-b"]').click()
    await expectOpen(page, 'actions')
    await expect(drawer(page, 'actions')).toHaveAccessibleName(
      'Actions for message B',
    )
  })

  test('is a fixed text', async ({ page }) => {
    await openDrawer(page, 'feedback')
    await expect(drawer(page, 'feedback')).toHaveAccessibleName('Send feedback')
  })
})
