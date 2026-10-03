import { type Locator, type Page, expect } from '@playwright/test'

export const stackState = (page: Page, key: string): Locator =>
  page.locator(`[data-test="stack-state-${key}"]`)

export const container = (page: Page, key: string): Locator =>
  page.locator(`#${key}-screen-stack`)

// The panel of the screen on show
export const topPanel = (page: Page, key: string): Locator =>
  container(page, key).locator(':scope > [data-screen-role="Top"]')

export const panels = (page: Page, key: string): Locator =>
  container(page, key).locator(':scope > [data-screen-depth]')

export const expectIdleAt = async (page: Page, key: string, depth: number) => {
  await expect(stackState(page, key)).toHaveText(`Idle @ ${depth}`)
  await expect(panels(page, key)).toHaveCount(1)
}

export const log = (page: Page): Locator => page.locator('[data-test="log"] li')

export const openMenu = async (page: Page) => {
  await page.locator('[data-test="trigger-menu"]').click()
  await expect(page.locator('[data-test="state-menu"]')).toHaveText('Visible')
  await expectIdleAt(page, 'menu', 0)
}

// Click inside the screen on show (the outgoing one is inert)
export const clickInTop = async (page: Page, key: string, test: string) => {
  await topPanel(page, key).locator(`[data-test="${test}"]`).click()
}

// Rendered height (px) of a locator
export const heightOf = async (locator: Locator): Promise<number> => {
  const box = await locator.boundingBox()
  if (box === null) {
    throw new Error('not rendered')
  } else {
    return box.height
  }
}
