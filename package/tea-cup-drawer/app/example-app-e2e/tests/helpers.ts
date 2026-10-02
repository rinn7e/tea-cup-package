import { type Locator, type Page, expect } from '@playwright/test'

// Longer than the 500ms transitions of the example drawers
export const ANIMATION_DURATION = 700

export const content = (page: Page, key: string): Locator =>
  page.locator(`[data-test="content-${key}"]`)

export const state = (page: Page, key: string): Locator =>
  page.locator(`[data-test="state-${key}"]`)

export const drawer = (page: Page, key: string): Locator =>
  page.locator(`#tea-cup-drawer-${key}`)

export const expectClosed = async (page: Page, key: string) => {
  await expect(state(page, key)).toHaveText('Invisible')
  await expect(content(page, key)).toHaveCount(0)
}

export const expectOpen = async (page: Page, key: string) => {
  await expect(state(page, key)).toHaveText('Visible')
  await expect(content(page, key)).toBeVisible()
}

export const openDrawer = async (page: Page, key: string) => {
  await expectClosed(page, key)
  await page.locator(`[data-test="trigger-${key}"]`).click()
  await expectOpen(page, key)
}

type Point = { x: number; y: number }

// A point inside the drawer, `offset` px away from its leading edge
export const pointIn = async (
  page: Page,
  key: string,
  offset: number = 60,
): Promise<Point> => {
  const box = await drawer(page, key).boundingBox()
  if (box === null) {
    throw new Error(`drawer ${key} is not rendered`)
  } else {
    return { x: box.x + box.width / 2, y: box.y + offset }
  }
}

// Press at `from`, move by `(dx, dy)` and release. `stepDelay` > 0 makes the
// gesture slow (below the flick velocity).
export const drag = async (
  page: Page,
  from: Point,
  delta: { dx: number; dy: number },
  options: { steps?: number; stepDelay?: number; release?: boolean } = {},
) => {
  const steps = options.steps ?? 5
  const stepDelay = options.stepDelay ?? 0
  await page.mouse.move(from.x, from.y)
  await page.mouse.down()
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(
      from.x + (delta.dx * i) / steps,
      from.y + (delta.dy * i) / steps,
    )
    if (stepDelay > 0) {
      await page.waitForTimeout(stepDelay)
    } else {
      // Fast gesture
    }
  }
  if (options.release ?? true) {
    await page.mouse.up()
  } else {
    // Caller ends the gesture
  }
}
