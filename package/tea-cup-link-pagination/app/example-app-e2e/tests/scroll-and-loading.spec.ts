import { type Page, expect, test } from '@playwright/test'

// The chat list's scroll container (`ScrollPort`).
const chatList = (page: Page) =>
  page.locator('[data-link-pagin-container="room-general"]')

const olderPage = /\/api\/rooms\/room-general\/chats\?.*before_timestamp/
const firstPage =
  /\/api\/rooms\/room-general\/chats(\?(?!.*before_timestamp)(?!.*after_timestamp).*)?$/

const openRoom = async (page: Page) => {
  await page.goto('/rooms/room-general')
  await expect(page.getByTestId('room-chat-page')).toBeVisible({
    timeout: 10_000,
  })
  await expect(
    chatList(page).locator('.custom-ui-wrapper').first(),
  ).toBeVisible({ timeout: 10_000 })
  // The initial scroll hides the list until it is done.
  await expect(chatList(page)).toHaveClass(/opacity-100/)
}

type Anchor = { key: string; offset: number }

// The first row wholly in view and its offset from the container's top.
const readAnchor = (page: Page): Promise<Anchor> =>
  chatList(page).evaluate((container) => {
    const containerTop = container.getBoundingClientRect().top
    const rows = [...container.querySelectorAll('.custom-ui-wrapper')]
    const row = rows.find((r) => r.getBoundingClientRect().top >= containerTop)
    if (!row) throw new Error('no row in view')
    return {
      key: row.id,
      offset: row.getBoundingClientRect().top - containerTop,
    }
  })

const offsetOf = (page: Page, key: string): Promise<number> =>
  chatList(page).evaluate((container, rowKey) => {
    const row = document.getElementById(rowKey)
    if (!row) throw new Error(`row ${rowKey} is gone`)
    return (
      row.getBoundingClientRect().top - container.getBoundingClientRect().top
    )
  }, key)

const nextFrames = (page: Page) =>
  page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  )

const rowCount = (page: Page) =>
  chatList(page).locator('.custom-ui-wrapper').count()

test.describe('Scroll anchoring and load failures', () => {
  test('the list anchors itself (native scroll anchoring is off)', async ({
    page,
  }) => {
    await openRoom(page)
    const overflowAnchor = await chatList(page).evaluate((el) =>
      getComputedStyle(el).getPropertyValue('overflow-anchor'),
    )
    expect(overflowAnchor).toBe('none')
  })

  test('loading older history after growth below the view keeps the view still', async ({
    page,
  }) => {
    // Hold the older page back so the growth surely happens before it lands.
    let releaseOlder: () => void = () => {}
    const olderHeld = new Promise<void>((resolve) => {
      releaseOlder = resolve
    })
    await page.route(olderPage, async (route) => {
      await olderHeld
      await route.continue()
    })

    await openRoom(page)
    const before = await rowCount(page)

    // Scroll to the top (the older page is requested), let the scroll event
    // pass, then grow the newest row, far below the view, with no scroll event.
    await chatList(page).evaluate((el) => {
      el.scrollTop = 0
    })
    await nextFrames(page)
    await chatList(page).evaluate((container) => {
      const rows = container.querySelectorAll('.custom-ui-wrapper')
      const newest = rows[rows.length - 1]
      const spacer = document.createElement('div')
      spacer.style.height = '250px'
      newest.appendChild(spacer)
    })
    await nextFrames(page)
    const anchor = await readAnchor(page)

    releaseOlder()
    await expect.poll(() => rowCount(page)).toBeGreaterThan(before)
    await nextFrames(page)

    expect(
      Math.abs((await offsetOf(page, anchor.key)) - anchor.offset),
    ).toBeLessThanOrEqual(1)
  })

  test('a row above the view growing late keeps the view still', async ({
    page,
  }) => {
    await openRoom(page)
    const before = await rowCount(page)
    await chatList(page).evaluate((el) => {
      el.scrollTop = 0
    })
    await expect.poll(() => rowCount(page)).toBeGreaterThan(before)
    // Settle, then move the older page above the view.
    await nextFrames(page)
    await chatList(page).evaluate((el) => {
      el.scrollTop += 400
    })
    await nextFrames(page)
    const anchor = await readAnchor(page)

    // Like a late image in the prepended page: a row wholly above the view grows.
    await chatList(page).evaluate((container) => {
      const containerTop = container.getBoundingClientRect().top
      const rows = [...container.querySelectorAll('.custom-ui-wrapper')]
      const above = rows.find(
        (r) => r.getBoundingClientRect().bottom < containerTop,
      )
      if (!above) throw new Error('no row above the view')
      const spacer = document.createElement('div')
      spacer.style.height = '250px'
      above.appendChild(spacer)
    })
    await nextFrames(page)

    expect(
      Math.abs((await offsetOf(page, anchor.key)) - anchor.offset),
    ).toBeLessThanOrEqual(1)
  })

  test('a failed first load shows the error and retries', async ({ page }) => {
    await page.route(firstPage, (route) =>
      route.fulfill({ status: 503, body: 'unavailable' }),
    )
    await page.goto('/rooms/room-general')
    await expect(page.getByText(`Couldn't load.`)).toBeVisible({
      timeout: 10_000,
    })

    await page.unroute(firstPage)
    await chatList(page).getByRole('button', { name: 'Retry' }).click()
    await expect(
      chatList(page).locator('.custom-ui-wrapper').first(),
    ).toBeVisible()
    await expect(page.getByText(`Couldn't load.`)).toHaveCount(0)
  })

  test('a failed older page shows a retry that loads it', async ({ page }) => {
    await page.route(olderPage, (route) =>
      route.fulfill({ status: 503, body: 'unavailable' }),
    )
    await openRoom(page)
    const before = await rowCount(page)
    await chatList(page).evaluate((el) => {
      el.scrollTop = 0
    })
    await expect(page.getByText(`Couldn't load older items.`)).toBeVisible()
    expect(await rowCount(page)).toBe(before)

    await page.unroute(olderPage)
    await chatList(page).getByRole('button', { name: 'Retry' }).click()
    await expect.poll(() => rowCount(page)).toBeGreaterThan(before)
    await expect(page.getByText(`Couldn't load older items.`)).toHaveCount(0)
  })
})
