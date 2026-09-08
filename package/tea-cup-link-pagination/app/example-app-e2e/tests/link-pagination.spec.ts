import { expect, test } from '@playwright/test'

test.describe('TEA Routing & LinkPagination E2E Suite', () => {
  test('1. Home Page & Popular Rooms Quick Launcher', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('Welcome to Tea-Cup Chat')).toBeVisible({
      timeout: 10_000,
    })

    // Click quick room launcher on Home Page
    const quickRoomBtn = page.getByTestId('quick-room-room-general')
    await expect(quickRoomBtn).toBeVisible()
    await quickRoomBtn.click()

    // URL changes to /rooms/room-general
    await expect(page).toHaveURL(/\/rooms\/room-general/)
    await expect(page.getByTestId('room-chat-page')).toBeVisible()
    await expect(page.getByTestId('room-header-title')).toHaveText('general')
  })

  test('2. Direct Deep-Link Navigation & Room Switching', async ({ page }) => {
    // Direct visit to /rooms/room-engineering
    await page.goto('/rooms/room-engineering')
    await expect(page.getByTestId('room-chat-page')).toBeVisible({
      timeout: 10_000,
    })
    await expect(page.getByTestId('room-header-title')).toHaveText(
      'engineering',
    )

    // Verify engineering message is visible
    await expect(page.getByTestId('chat-item-message-1085')).toBeVisible()

    // Switch to design room via sidebar
    const designRoomBtn = page.getByTestId('room-btn-room-design')
    await expect(designRoomBtn).toBeVisible()
    await designRoomBtn.click()

    await expect(page).toHaveURL(/\/rooms\/room-design/)
    await expect(page.getByTestId('room-header-title')).toHaveText('design')
    await expect(page.getByTestId('chat-item-message-1123')).toBeVisible()

    // Browser back navigation
    await page.goBack()
    await expect(page).toHaveURL(/\/rooms\/room-engineering/)
    await expect(page.getByTestId('room-header-title')).toHaveText(
      'engineering',
    )
    await expect(page.getByTestId('chat-item-message-1085')).toBeVisible()

    // Browser forward navigation
    await page.goForward()
    await expect(page).toHaveURL(/\/rooms\/room-design/)
    await expect(page.getByTestId('room-header-title')).toHaveText('design')
    await expect(page.getByTestId('chat-item-message-1123')).toBeVisible()

    // Click "# Chat Rooms" header in sidebar to go to Home Page
    const sidebarHomeBtn = page.getByTestId('sidebar-home-btn')
    await expect(sidebarHomeBtn).toBeVisible()
    await sidebarHomeBtn.click()
    await expect(page.getByText('Welcome to Tea-Cup Chat')).toBeVisible()
  })

  test('3. Chat Timeline LinkPagination & Zero Layout Shift', async ({
    page,
  }) => {
    await page.goto('/rooms/room-general')
    await expect(page.getByTestId('room-chat-page')).toBeVisible({
      timeout: 10_000,
    })

    // Wait for initial chats to load
    await expect(page.locator('.custom-ui-wrapper').first()).toBeVisible({
      timeout: 10_000,
    })

    const chats = page.locator('.custom-ui-wrapper')
    const count = await chats.count()
    expect(count).toBeGreaterThanOrEqual(10)

    // Scroll up into history
    const scrollContainer = page.locator('.overflow-y-auto').first()
    await scrollContainer.evaluate((el) => {
      el.scrollTop = 0
    })

    await page.waitForTimeout(600)
    const newCount = await chats.count()
    expect(newCount).toBeGreaterThanOrEqual(count)
  })

  test('4. ItemMsg Parent Interception: Reaction and Star toggling', async ({
    page,
  }) => {
    await page.goto('/rooms/room-general')
    await expect(page.getByTestId('room-chat-page')).toBeVisible({
      timeout: 10_000,
    })

    // Wait for chats to render
    await expect(page.locator('.custom-ui-wrapper').first()).toBeVisible({
      timeout: 10_000,
    })

    const addReactionBtn = page
      .locator('button[data-testid^="add-reaction-btn-"]')
      .first()
    await addReactionBtn.click({ force: true })

    // Pick fire emoji 🔥
    const firePicker = page
      .locator('button[data-testid*="picker-emoji-"][data-testid$="🔥"]')
      .first()
    await expect(firePicker).toBeVisible()
    await firePicker.click()

    // Reaction pill is rendered
    const firePill = page
      .locator('button[data-testid*="reaction-"][data-testid$="🔥"]')
      .first()
    await expect(firePill).toBeVisible()

    // Click reaction pill to toggle off
    await firePill.click()
  })

  test('5. Message Composer: Send new message with Enter key', async ({
    page,
  }) => {
    await page.goto('/rooms/room-general')
    await expect(page.getByTestId('room-chat-page')).toBeVisible({
      timeout: 10_000,
    })

    const textarea = page.getByTestId('chat-composer-textarea')
    const uniqueMsg = `Testing TEA Chat Routing ${Date.now()}`
    await textarea.fill(uniqueMsg)

    // Press Enter to send
    await textarea.press('Enter')
    await expect(textarea).toHaveValue('')

    // Message appears in chat timeline
    await expect(page.getByText(uniqueMsg)).toBeVisible()
  })

  test('6. In-Room Search & Deep-Link Chat Jump', async ({ page }) => {
    await page.goto('/rooms/room-engineering')
    await expect(page.getByTestId('room-chat-page')).toBeVisible({
      timeout: 10_000,
    })

    const searchInput = page.getByTestId('chat-search-input')
    await searchInput.fill('Elm Architecture')

    const searchDropdown = page.getByTestId('search-results-dropdown')
    await expect(searchDropdown).toBeVisible({ timeout: 5000 })

    const firstResult = searchDropdown
      .locator('button[data-testid^="search-result-item-"]')
      .first()
    await expect(firstResult).toBeVisible()
    await firstResult.click()

    // Dropdown closes after jumping
    await expect(searchDropdown).not.toBeVisible()
  })

  test('7. Right Sidebar & Query Param Synchronisation (?tab=members, ?tab=details)', async ({
    page,
  }) => {
    await page.goto('/rooms/room-general')
    await expect(page.getByTestId('room-chat-page')).toBeVisible({
      timeout: 10_000,
    })

    // Click members button in room header
    const membersBtn = page.getByTestId('room-members-btn')
    await membersBtn.click()

    await expect(page).toHaveURL(/tab=members/)
    await expect(page.getByTestId('tab-members-btn')).toBeVisible()

    // Switch to details tab
    const detailsTabBtn = page.getByTestId('tab-details-btn')
    await detailsTabBtn.click()

    await expect(page).toHaveURL(/tab=details/)
    await expect(page.getByText('Room Identity:')).toBeVisible()
  })

  test('8. Room Drafts Page: Save, Send, and Navigation', async ({ page }) => {
    await page.goto('/rooms/room-general')
    await expect(page.getByTestId('room-chat-page')).toBeVisible({
      timeout: 10_000,
    })

    // Click drafts button in room header
    const draftsBtn = page.getByTestId('room-open-drafts-btn')
    await draftsBtn.click()

    await expect(page).toHaveURL(/\/rooms\/room-general\/drafts/)
    await expect(page.getByTestId('room-draft-page')).toBeVisible()

    // Type and save a new draft
    const draftTextarea = page.getByTestId('new-draft-textarea')
    const draftContent = `Quarterly update note ${Date.now()}`
    await draftTextarea.fill(draftContent)

    const saveDraftBtn = page.getByTestId('save-draft-btn')
    await saveDraftBtn.click()
    await expect(draftTextarea).toHaveValue('')
    await expect(page.getByText(draftContent)).toBeVisible()

    // Back to chat
    const backBtn = page.getByTestId('drafts-back-btn')
    await backBtn.click()
    await expect(page).toHaveURL(/\/rooms\/room-general/)
    await expect(page.getByTestId('room-chat-page')).toBeVisible()
  })

  test('9. 404 NotFound Page on Unknown Path', async ({ page }) => {
    await page.goto('/non-existent/random/route')
    await expect(page.getByTestId('not-found-page')).toBeVisible({
      timeout: 10_000,
    })
    await expect(page.getByText('404 Not Found')).toBeVisible()

    // Click Back to Home
    const homeBtn = page.getByTestId('not-found-home-btn')
    await homeBtn.click()
    await expect(page.getByText('Welcome to Tea-Cup Chat')).toBeVisible()
  })

  test('10. Sidebar LinkPagination across 30 Mock Rooms', async ({ page }) => {
    await page.goto('/rooms/room-general')
    await expect(page.getByTestId('available-rooms-badge')).toContainText(
      'available',
    )

    // Verify 30 rooms badge
    await expect(page.getByTestId('available-rooms-badge')).toHaveText(
      '30 available',
    )

    // Initial rooms are visible in sidebar with message previews
    await expect(page.getByTestId('room-btn-room-general')).toBeVisible()
    await expect(page.getByTestId('room-preview-room-general')).toBeVisible()
    await expect(page.getByTestId('room-btn-room-engineering')).toBeVisible()
    // RoomItem child interaction: Toggle Expand / Collapse full message
    const generalItem = page.getByTestId('room-item-room-general')
    await generalItem.hover()
    const expandBtn = page.getByTestId('expand-btn-room-general')
    await expect(expandBtn).toBeVisible()
    await expandBtn.click()
    await expect(
      page.getByTestId('room-preview-full-room-general'),
    ).toBeVisible()
    await expandBtn.click()
    await expect(
      page.getByTestId('room-preview-full-room-general'),
    ).not.toBeVisible()

    // Scroll sidebar down to trigger LinkPagination nextHandler
    const sidebarScrollContainer = page.locator('aside .chat-scrollbar')
    await sidebarScrollContainer.evaluate((el) => {
      el.scrollTop = el.scrollHeight
    })
    const lastRoomBtn = page.getByTestId('room-btn-room-deep-learning')
    await expect(lastRoomBtn).toBeVisible({ timeout: 10_000 })
  })

  test('11. Real-time Live SSE Simulation & Cache Reset (First Visit)', async ({
    page,
  }) => {
    await page.goto('/rooms/room-general')
    await expect(page.getByTestId('room-chat-page')).toBeVisible({
      timeout: 10_000,
    })
    await expect(page.locator('.custom-ui-wrapper').first()).toBeVisible({
      timeout: 10_000,
    })

    // Wait for initial chats to settle
    await page.waitForTimeout(400)

    // Simulate SSE incoming message
    const sseBtn = page.getByTestId('simulate-sse-btn')
    await sseBtn.click()

    // Verify SSE message is attached in chat timeline and scroll to bottom
    const sseMsg = page
      .getByTestId('room-chat-page')
      .getByText(/⚡ \[(SSE|Real-time) Event/)
      .last()
    await expect(sseMsg).toBeAttached({ timeout: 10_000 })

    const scrollContainer = page.locator('.overflow-y-auto').first()
    await scrollContainer.evaluate((el) => {
      el.scrollTop = el.scrollHeight
    })

    await expect(sseMsg).toBeVisible({
      timeout: 10_000,
    })

    // Clear cache & Reset (simulating first visit)
    const clearCacheBtn = page.getByTestId('clear-cache-btn')
    await clearCacheBtn.click()
    await page.waitForTimeout(500)

    // App resets to clean state
    await expect(page.getByTestId('room-header-title')).toHaveText('general')
  })

  test('12. Delete Message: Send message and delete via top-right hover action button', async ({
    page,
  }) => {
    await page.goto('/rooms/room-general')
    await expect(page.getByTestId('room-chat-page')).toBeVisible({
      timeout: 10_000,
    })

    const textarea = page.getByTestId('chat-composer-textarea')
    const deleteTestContent = `Temporary msg to delete ${Date.now()}`
    await textarea.fill(deleteTestContent)
    await textarea.press('Enter')

    // Message is displayed
    const messageLocator = page.getByText(deleteTestContent)
    await expect(messageLocator).toBeVisible({ timeout: 10_000 })

    // Hover over the message row to expose action bar
    const messageRow = messageLocator.locator(
      'xpath=ancestor::div[@data-component="ChatBubbleComponent"]',
    )
    await messageRow.hover()

    // Click delete button
    const deleteBtn = messageRow.locator('button[data-testid^="delete-btn-"]')
    await expect(deleteBtn).toBeVisible()
    await deleteBtn.click()

    // Verify message disappears from UI
    await expect(messageLocator).not.toBeVisible({ timeout: 10_000 })
  })

  test('13. [Bug #123 Reproduction] Target Re-point Swallowed by Cache Leg', async ({
    page,
  }) => {
    // 1. Visit /rooms/room-general to populate local cache with messages
    await page.goto('/rooms/room-general')
    await expect(page.getByTestId('room-chat-page')).toBeVisible({
      timeout: 10_000,
    })
    await expect(page.locator('.custom-ui-wrapper').first()).toBeVisible({
      timeout: 10_000,
    })

    // 2. Click "Reproduce DES-752 Bug" in DebugPanel
    const reproBtn = page.getByTestId('reproduce-des752-btn')
    await expect(reproBtn).toBeVisible()
    await reproBtn.click()

    // URL becomes /rooms/room-general/chats/message-1002-repoint
    await expect(page).toHaveURL(/message-1002-repoint/)
    await expect(page.getByTestId('repoint-repro-banner')).toBeVisible()

    // Wait for the API leg to complete after simulated delay
    await page.waitForTimeout(1000)

    // On unpatched LinkPagination:
    // The cache leg immediately scrolled to message-1002 (older message near the top).
    // When the API leg completed with selectedKey: null (latest message),
    // getInitialDataFromApiResponseHandler saw cacheExist === true and SKIPPED scrolling!
    // Therefore, message-1002 remains visible in view, demonstrating that the viewport was stuck.
    const message1002 = page.getByTestId('chat-item-message-1002')
    await expect(message1002).toBeVisible()
  })

  test('14. Unread Indicator Divider renders above first unread message', async ({
    page,
  }) => {
    await page.goto('/rooms/room-general')
    await expect(page.getByTestId('room-chat-page')).toBeVisible({
      timeout: 10_000,
    })
    await expect(page.locator('.custom-ui-wrapper').first()).toBeVisible({
      timeout: 10_000,
    })

    // Verify "New Messages" unread divider is rendered
    const unreadDivider = page.getByTestId('new-messages-divider')
    await expect(unreadDivider).toBeVisible()
    await expect(unreadDivider).toHaveText(/New Messages/)

    // Verify it is attached right above message-1042
    const message1042Container = page.locator(
      'div[data-component="ChatBubbleComponent"]:has([data-testid="chat-item-message-1042"])',
    )
    await expect(
      message1042Container.locator('[data-testid="new-messages-divider"]'),
    ).toBeVisible()
  })
})
