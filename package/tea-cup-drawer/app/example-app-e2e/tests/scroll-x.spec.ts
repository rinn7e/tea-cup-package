import { type Page, expect, test } from '@playwright/test'

import {
  drag,
  drawer,
  expectClosed,
  expectOpen,
  openDrawer,
  pointIn,
} from './helpers'

test.beforeEach(async ({ page }) => {
  await page.goto('/')
})

// The middle of an element of the drawer
const centerOf = async (page: Page, testId: string) => {
  const box = await page.locator(`[data-test="${testId}"]`).boundingBox()
  if (box === null) {
    throw new Error(`${testId} is not rendered`)
  } else {
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
  }
}

const scrollTo = (page: Page, testId: string, left: number) =>
  page
    .locator(`[data-test="${testId}"]`)
    .evaluate((el, value) => el.scrollTo({ left: value }), left)

test.describe('Sideways content in a right drawer', () => {
  test('a swipe right on the table at its left edge leaves the drawer', async ({
    page,
  }) => {
    await openDrawer(page, 'scrollX')
    // At its left edge: the swipe is still the table's
    await drag(page, await centerOf(page, 'scroll-x-area'), {
      dx: 250,
      dy: 0,
    })
    await expectOpen(page, 'scrollX')
  })

  test('a swipe right on a scrolled table leaves the drawer in place', async ({
    page,
  }) => {
    await openDrawer(page, 'scrollX')
    await scrollTo(page, 'scroll-x-area', 150)
    await drag(
      page,
      await centerOf(page, 'scroll-x-area'),
      { dx: 250, dy: 0 },
      { release: false },
    )
    // The gesture is the table's: the drawer doesn't follow the pointer
    await expect(drawer(page, 'scrollX')).toHaveAttribute(
      'data-state',
      'Visible',
    )
    await page.mouse.up()
    await expectOpen(page, 'scrollX')
  })

  test('a scrolled code block takes the swipe too', async ({ page }) => {
    await openDrawer(page, 'scrollX')
    await scrollTo(page, 'scroll-x-code', 100)
    await drag(page, await centerOf(page, 'scroll-x-code'), {
      dx: 250,
      dy: 0,
    })
    await expectOpen(page, 'scrollX')
  })

  test('a scrolled table only takes swipes that start on it', async ({
    page,
  }) => {
    await openDrawer(page, 'scrollX')
    await scrollTo(page, 'scroll-x-area', 150)
    // On the title, above the table
    await drag(page, await pointIn(page, 'scrollX', 40), { dx: 250, dy: 0 })
    await expectClosed(page, 'scrollX')
  })

  test('a swipe left (further open) is left to the content', async ({
    page,
  }) => {
    await openDrawer(page, 'scrollX')
    await drag(
      page,
      await centerOf(page, 'scroll-x-area'),
      { dx: -150, dy: 0 },
      { release: false },
    )
    await expect(drawer(page, 'scrollX')).toHaveAttribute(
      'data-state',
      'Visible',
    )
    await page.mouse.up()
    await expectOpen(page, 'scrollX')
  })
})
