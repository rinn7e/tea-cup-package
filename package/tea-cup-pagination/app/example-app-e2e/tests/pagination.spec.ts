import { expect, test } from '@playwright/test'

test.describe('Tea-Cup Pagination Showcase E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    // Wait for the initial product grid to render
    await expect(page.locator('[data-test="products-grid"]')).toBeVisible({
      timeout: 10_000,
    })
  })

  test('Test 1: Initial Page Load displays page 1 items and pagination state', async ({
    page,
  }) => {
    // 6 items on page 1 by default
    const cards = page.locator('[data-test^="product-card-"]')
    await expect(cards).toHaveCount(6)

    // Previous button must be disabled on page 1
    const prevBtn = page.locator('[data-test="prev-page-btn"]')
    await expect(prevBtn).toBeDisabled()

    // Next button must be enabled
    const nextBtn = page.locator('[data-test="next-page-btn"]')
    await expect(nextBtn).toBeEnabled()

    // Page 1 button must have aria-current="page"
    const page1Btn = page.locator('[data-test="page-btn-1"]')
    await expect(page1Btn).toHaveAttribute('aria-current', 'page')
  })

  test('Test 2: Numeric Page Navigation switches pages and updates active state', async ({
    page,
  }) => {
    // Navigate to page 2
    const page2Btn = page.locator('[data-test="page-btn-2"]')
    await page2Btn.click()

    // Wait for page 2 button to be active
    await expect(page2Btn).toHaveAttribute('aria-current', 'page')

    // Previous button should now be enabled
    const prevBtn = page.locator('[data-test="prev-page-btn"]')
    await expect(prevBtn).toBeEnabled()

    // Cards on page 2 should be visible
    const cards = page.locator('[data-test^="product-card-"]')
    await expect(cards).toHaveCount(6)

    // Navigate to page 3
    const page3Btn = page.locator('[data-test="page-btn-3"]')
    await page3Btn.click()
    await expect(page3Btn).toHaveAttribute('aria-current', 'page')
  })

  test('Test 3: Next and Previous Button stepping', async ({ page }) => {
    const nextBtn = page.locator('[data-test="next-page-btn"]')
    const prevBtn = page.locator('[data-test="prev-page-btn"]')

    // Click Next -> moves to page 2
    await nextBtn.click()
    await expect(page.locator('[data-test="page-btn-2"]')).toHaveAttribute(
      'aria-current',
      'page',
    )

    // Click Next again -> moves to page 3
    await nextBtn.click()
    await expect(page.locator('[data-test="page-btn-3"]')).toHaveAttribute(
      'aria-current',
      'page',
    )

    // Click Previous -> returns to page 2
    await prevBtn.click()
    await expect(page.locator('[data-test="page-btn-2"]')).toHaveAttribute(
      'aria-current',
      'page',
    )
  })

  test('Test 4: Boundary Handling disables Next on last page', async ({
    page,
  }) => {
    // Navigate to last page (page 8)
    const page8Btn = page.locator('[data-test="page-btn-8"]')
    await page8Btn.click()
    await expect(page8Btn).toHaveAttribute('aria-current', 'page')

    // Next button must be disabled on the last page
    const nextBtn = page.locator('[data-test="next-page-btn"]')
    await expect(nextBtn).toBeDisabled()

    // Previous button must still be enabled
    const prevBtn = page.locator('[data-test="prev-page-btn"]')
    await expect(prevBtn).toBeEnabled()
  })

  test('Test 5: Items-Per-Page Limit Switch adjusts grid count and total pages', async ({
    page,
  }) => {
    const limitSelect = page.locator('[data-test="limit-select"]')

    // Switch to 12 items per page
    await limitSelect.selectOption('12')
    await expect(page.locator('[data-test^="product-card-"]')).toHaveCount(12)

    // Total pages should now be 4 (48 / 12)
    await expect(page.locator('[data-test="page-btn-4"]')).toBeVisible()
    await expect(page.locator('[data-test="page-btn-5"]')).toHaveCount(0)

    // Switch to 24 items per page
    await limitSelect.selectOption('24')
    await expect(page.locator('[data-test^="product-card-"]')).toHaveCount(24)

    // Total pages should now be 2 (48 / 24)
    await expect(page.locator('[data-test="page-btn-2"]')).toBeVisible()
    await expect(page.locator('[data-test="page-btn-3"]')).toHaveCount(0)
  })

  test('Test 6: Category Tab Filtering filters products and resets to page 1', async ({
    page,
  }) => {
    // Move to page 2 first
    await page.locator('[data-test="page-btn-2"]').click()
    await expect(page.locator('[data-test="page-btn-2"]')).toHaveAttribute(
      'aria-current',
      'page',
    )

    // Switch to 'audio' tab
    const audioTab = page.locator('[data-test="tab-audio"]')
    await audioTab.click()

    // Should reset to page 1
    await expect(page.locator('[data-test="page-btn-1"]')).toHaveAttribute(
      'aria-current',
      'page',
    )

    // All displayed cards must be in the audio category
    const cards = page.locator('[data-test^="product-card-"]')
    const count = await cards.count()
    expect(count).toBeGreaterThan(0)
    for (let i = 0; i < count; i++) {
      await expect(cards.nth(i)).toHaveAttribute('data-category', 'audio')
    }
  })

  test('Test 7: Search Filtering and Reset Filters', async ({ page }) => {
    const searchInput = page.locator('[data-test="search-input"]')

    // Type query matching drone
    await searchInput.fill('drone')
    await expect(
      page.locator('[data-test="product-card-prod-25"]'),
    ).toBeVisible()
    await expect(page.locator('[data-test^="product-card-"]')).toHaveCount(1)

    // Click Reset Filters
    const resetBtn = page.locator('[data-test="reset-filters-btn"]')
    await resetBtn.click()

    // Search input should be cleared and full grid restored
    await expect(searchInput).toHaveValue('')
    await expect(page.locator('[data-test^="product-card-"]')).toHaveCount(6)
  })

  test('Test 8: Item Actions (Favorite in-place & Delete triggering page refetch)', async ({
    page,
  }) => {
    const firstCard = page.locator('[data-test^="product-card-"]').first()
    await expect(firstCard).toBeVisible()
    const firstCardTestId = await firstCard.getAttribute('data-test')

    const favBtn = firstCard.locator('[data-test^="favorite-btn-"]')
    const initialLabel = await favBtn.getAttribute('aria-label')

    // Click favorite toggle
    await favBtn.click()
    const toggledLabel = initialLabel === 'Favorite' ? 'Unfavorite' : 'Favorite'
    await expect(favBtn).toHaveAttribute('aria-label', toggledLabel)

    // Click favorite toggle again to restore
    await favBtn.click()
    await expect(favBtn).toHaveAttribute(
      'aria-label',
      initialLabel ?? 'Favorite',
    )

    // Delete first product -> triggers refetch of the page
    const deleteBtn = firstCard.locator('[data-test^="delete-btn-"]')
    await deleteBtn.click()

    // Page refetches and still has 6 items (as next item shifts into page 1)
    await expect(page.locator('[data-test="products-grid"]')).toBeVisible({
      timeout: 10_000,
    })
    await expect(page.locator('[data-test^="product-card-"]')).toHaveCount(6)

    // The deleted product should no longer be present
    if (firstCardTestId) {
      await expect(
        page.locator(`[data-test="${firstCardTestId}"]`),
      ).toHaveCount(0)
    }
  })

  test('Test 9: Simulated Error and Retry Flow', async ({ page }) => {
    const errorToggle = page.locator('[data-test="toggle-error-btn"]')

    // Enable error simulation
    await errorToggle.click()

    // Error view should render with Retry button
    const errorView = page.locator('[data-test="error-view"]')
    await expect(errorView).toBeVisible({ timeout: 5000 })
    const retryBtn = page.locator('[data-test="retry-btn"]')
    await expect(retryBtn).toBeVisible({ timeout: 5000 })

    // Turn off error simulation
    await errorToggle.click()

    // Click retry
    await retryBtn.click()

    // Products grid should be restored
    await expect(page.locator('[data-test="products-grid"]')).toBeVisible({
      timeout: 5000,
    })
    await expect(page.locator('[data-test^="product-card-"]')).toHaveCount(6)
  })

  test('Test 10: Product Selection Modal view and dismiss', async ({
    page,
  }) => {
    const detailsBtn = page.locator('[data-test^="view-details-"]').first()
    await detailsBtn.click()

    // Modal dialog content should be visible
    const modalContent = page.locator('[data-test="product-modal-content"]')
    await expect(modalContent).toBeVisible()

    // Close modal via Done button
    const closeBtn = page.locator('[data-test="modal-close-footer-btn"]')
    await closeBtn.click()
    await expect(modalContent).toHaveCount(0)
  })

  test('Test 11: Rapid navigation during loading discards intermediate page results and loads the target page', async ({
    page,
  }) => {
    // Set latency to 600ms to observe loading state
    const latencySelect = page.locator('[data-test="latency-select"]')
    await latencySelect.selectOption('600')

    const page2Btn = page.locator('[data-test="page-btn-2"]')
    await page2Btn.click()

    // During loading, skeleton is visible, but Next button remains enabled and clickable
    await expect(page.locator('[data-test="loading-skeleton"]')).toBeVisible()
    const nextBtn = page.locator('[data-test="next-page-btn"]')
    await expect(nextBtn).toBeEnabled()

    // Immediately click Next to go to page 3 before page 2 response arrives
    await nextBtn.click()

    // Wait for final load to finish on page 3
    await expect(page.locator('[data-test="products-grid"]')).toBeVisible({
      timeout: 10_000,
    })
    const page3Btn = page.locator('[data-test="page-btn-3"]')
    await expect(page3Btn).toHaveAttribute('aria-current', 'page')
    await expect(page2Btn).not.toHaveAttribute('aria-current', 'page')
  })

  test('Test 12: Sort Selection reorders products and resets to page 1', async ({
    page,
  }) => {
    // Navigate to page 2 first
    await page.locator('[data-test="page-btn-2"]').click()
    await expect(page.locator('[data-test="page-btn-2"]')).toHaveAttribute(
      'aria-current',
      'page',
    )

    // Select Price: Low to High
    const sortSelect = page.locator('[data-test="sort-select"]')
    await sortSelect.selectOption('price_asc')

    // Page must reset to page 1
    await expect(page.locator('[data-test="page-btn-1"]')).toHaveAttribute(
      'aria-current',
      'page',
    )

    // Verify first card has the lowest price
    const firstPriceText = await page
      .locator('[data-test="product-price"]')
      .first()
      .innerText()
    const firstPrice = Number(firstPriceText.replace('$', ''))

    // Select Price: High to Low
    await sortSelect.selectOption('price_desc')
    await expect(page.locator('[data-test="page-btn-1"]')).toHaveAttribute(
      'aria-current',
      'page',
    )

    const highPriceText = await page
      .locator('[data-test="product-price"]')
      .first()
      .innerText()
    const highPrice = Number(highPriceText.replace('$', ''))

    expect(highPrice).toBeGreaterThan(firstPrice)
  })

  test('Test 13: Empty Search Results view and recovery via empty-state reset button', async ({
    page,
  }) => {
    const searchInput = page.locator('[data-test="search-input"]')
    await searchInput.fill('xyznonexistentquery123')

    // Empty state should be visible
    const emptyState = page.locator('[data-test="empty-state"]')
    await expect(emptyState).toBeVisible()
    await expect(emptyState).toContainText('No products found')

    // Pagination bar should not be visible when no items
    await expect(page.locator('[data-test="pagination-nav"]')).toHaveCount(0)

    // Click Reset Filters inside empty state
    const clearBtn = page.locator('[data-test="clear-filters-btn"]')
    await clearBtn.click()

    // Grid and pagination should be restored
    await expect(page.locator('[data-test="products-grid"]')).toBeVisible()
    await expect(page.locator('[data-test^="product-card-"]')).toHaveCount(6)
    await expect(searchInput).toHaveValue('')
  })

  test('Test 14: Ellipsis display in 7-item pagination window for head and tail windows', async ({
    page,
  }) => {
    // On page 1: [1, 2, 3, 4, 5, '...', 8] -> 1 ellipsis
    const ellipsesPage1 = page.locator('[data-test="page-ellipsis"]')
    await expect(ellipsesPage1).toHaveCount(1)
    await expect(page.locator('[data-test="page-btn-5"]')).toBeVisible()

    // Navigate to tail window (page 5): [1, '...', 4, 5, 6, 7, 8] -> 1 ellipsis before page 4
    const page5Btn = page.locator('[data-test="page-btn-5"]')
    await page5Btn.click()
    await expect(page5Btn).toHaveAttribute('aria-current', 'page')

    const ellipsesPage5 = page.locator('[data-test="page-ellipsis"]')
    await expect(ellipsesPage5).toHaveCount(1)
    await expect(page.locator('[data-test="page-btn-4"]')).toBeVisible()
    await expect(page.locator('[data-test="page-btn-8"]')).toBeVisible()

    // Navigate to last page (page 8): [1, '...', 4, 5, 6, 7, 8] -> 1 ellipsis
    const page8Btn = page.locator('[data-test="page-btn-8"]')
    await page8Btn.click()
    await expect(page8Btn).toHaveAttribute('aria-current', 'page')

    const ellipsesPage8 = page.locator('[data-test="page-ellipsis"]')
    await expect(ellipsesPage8).toHaveCount(1)
  })

  test('Test 15: In-Modal Favorite toggle synchronizes with underlying product card', async ({
    page,
  }) => {
    // Open modal for the first product
    const firstCard = page.locator('[data-test^="product-card-"]').first()
    const firstCardTestId = await firstCard.getAttribute('data-test')
    const viewDetailsBtn = firstCard.locator('[data-test^="view-details-"]')
    await viewDetailsBtn.click()

    const modalContent = page.locator('[data-test="product-modal-content"]')
    await expect(modalContent).toBeVisible()

    const modalFavBtn = page.locator('[data-test="modal-favorite-btn"]')
    const modalFavText = await modalFavBtn.innerText()

    // Toggle favorite in modal
    await modalFavBtn.click()
    const expectedModalText = modalFavText.includes('Favorited')
      ? 'Add to Wishlist'
      : 'Favorited'
    await expect(modalFavBtn).toContainText(expectedModalText)

    // Close modal
    await page.locator('[data-test="modal-close-footer-btn"]').click()
    await expect(modalContent).toHaveCount(0)

    // Verify product card favorite button reflects new state
    if (firstCardTestId) {
      const card = page.locator(`[data-test="${firstCardTestId}"]`)
      const cardFavBtn = card.locator('[data-test^="favorite-btn-"]')
      const expectedAriaLabel = expectedModalText.includes('Favorited')
        ? 'Unfavorite'
        : 'Favorite'
      await expect(cardFavBtn).toHaveAttribute('aria-label', expectedAriaLabel)
    }
  })

  test('Test 16: Close Modal via top-right X button and backdrop click', async ({
    page,
  }) => {
    const modalContent = page.locator('[data-test="product-modal-content"]')

    // Open modal and close via top-right X button
    await page.locator('[data-test^="view-details-"]').first().click()
    await expect(modalContent).toBeVisible()
    await page.locator('[data-test="modal-close-btn"]').click()
    await expect(modalContent).toHaveCount(0)

    // Open modal and close via backdrop click
    await page.locator('[data-test^="view-details-"]').first().click()
    await expect(modalContent).toBeVisible()
    await page.locator('[data-test="product-modal-backdrop"]').click({
      position: { x: 10, y: 10 },
    })
    await expect(modalContent).toHaveCount(0)
  })

  test('Test 17: Category count badges reactive decrement upon product deletion', async ({
    page,
  }) => {
    // Check initial counts
    const allTab = page.locator('[data-test="tab-all"]')
    await expect(allTab).toContainText('48')

    // Find first product category
    const firstCard = page.locator('[data-test^="product-card-"]').first()
    const category = await firstCard.getAttribute('data-category')
    expect(category).toBeTruthy()

    if (category) {
      const catTab = page.locator(`[data-test="tab-${category}"]`)
      const initialCatText = await catTab.innerText()
      const initialCatCount = Number(initialCatText.match(/\d+/)?.[0] ?? 0)

      // Delete first product
      const deleteBtn = firstCard.locator('[data-test^="delete-btn-"]')
      await deleteBtn.click()

      // "All" tab should decrement to 47
      await expect(allTab).toContainText('47')

      // Category tab should decrement by 1
      await expect(catTab).toContainText(String(initialCatCount - 1))
    }
  })
})
