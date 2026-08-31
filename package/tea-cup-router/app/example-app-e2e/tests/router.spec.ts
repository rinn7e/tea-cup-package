import { expect, test } from '@playwright/test'

test.describe('TeaCup Router Example App', () => {
  test('1. should parse initial direct URLs correctly', async ({ page }) => {
    // Visit Home
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Home Page' })).toBeVisible()
    await expect(page.getByTestId('current-url')).toHaveText('/')
    await expect(page.getByTestId('route-tag')).toHaveText('HomePage')

    // Visit Home with query params
    await page.goto('/?tab=tag&page=2')
    await expect(page.getByTestId('current-url')).toHaveText('/?tab=tag&page=2')
    await expect(page.getByTestId('tab-tag')).toHaveClass(/bg-emerald-600/)
    await expect(page.getByTestId('page-btn-2')).toHaveClass(/bg-slate-800/)

    // Visit Login
    await page.goto('/login')
    await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible()
    await expect(page.getByTestId('current-url')).toHaveText('/login')
    await expect(page.getByTestId('route-tag')).toHaveText('LoginPage')

    // Visit Signup
    await page.goto('/signup')
    await expect(page.getByRole('heading', { name: 'Sign Up' })).toBeVisible()
    await expect(page.getByTestId('current-url')).toHaveText('/signup')
    await expect(page.getByTestId('route-tag')).toHaveText('SignupPage')

    // Visit Profile
    await page.goto('/profile/alice')
    await expect(
      page.getByRole('heading', { name: 'Profile: @alice' }),
    ).toBeVisible()
    await expect(page.getByText('Mode: My Articles')).toBeVisible()

    // Visit Profile Favorites
    await page.goto('/profile/alice/favorites')
    await expect(
      page.getByRole('heading', { name: 'Profile: @alice' }),
    ).toBeVisible()
    await expect(page.getByText('Mode: Favorited Articles')).toBeVisible()

    // Visit Article
    await page.goto('/article/functional-tea-cup')
    await expect(
      page.getByRole('heading', { name: 'Article: functional-tea-cup' }),
    ).toBeVisible()

    // Visit 404
    await page.goto('/some-nonexistent-page-url')
    await expect(page.getByTestId('not-found-view')).toBeVisible()
    await expect(page.getByText('Page Not Found')).toBeVisible()
  })

  test('2. should navigate via Link components without full page refresh', async ({
    page,
  }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Home Page' })).toBeVisible()

    // Click Sign In link
    await page.getByRole('link', { name: 'Sign In' }).click()
    await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible()
    await expect(page.getByTestId('current-url')).toHaveText('/login')
    await expect(page.getByTestId('route-tag')).toHaveText('LoginPage')

    // Click Sign Up link
    await page.getByRole('link', { name: 'Sign Up' }).click()
    await expect(page.getByRole('heading', { name: 'Sign Up' })).toBeVisible()
    await expect(page.getByTestId('current-url')).toHaveText('/signup')
    await expect(page.getByTestId('route-tag')).toHaveText('SignupPage')

    // Click Home link
    await page.getByTestId('nav-home').click()
    await expect(page.getByRole('heading', { name: 'Home Page' })).toBeVisible()
    await expect(page.getByTestId('current-url')).toHaveText('/')
  })

  test('3. should enforce authentication and guest route guards', async ({
    page,
  }) => {
    await page.goto('/')
    await expect(page.getByTestId('auth-status')).toHaveText(
      'Unauthenticated (Guest)',
    )

    // 1. Unauthenticated -> Visit protected /settings -> Redirects to /login
    await page.goto('/settings')
    await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible()
    await expect(page.getByTestId('current-url')).toHaveText('/login')

    // 2. Unauthenticated -> Click protected "Your Feed" tab -> Redirects to /login
    await page.goto('/')
    await page.getByTestId('tab-feed').click()
    await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible()
    await expect(page.getByTestId('current-url')).toHaveText('/login')

    // 3. Authenticate user
    await page.getByTestId('btn-login-toggle').click()
    await expect(page.getByTestId('auth-status')).toHaveText(
      'Authenticated: alice',
    )

    // 4. Authenticated -> Visit /settings -> Allowed
    await page.goto('/settings')
    await expect(
      page.getByRole('heading', { name: 'Settings (Protected)' }),
    ).toBeVisible()
    await expect(page.getByTestId('settings-bio')).toHaveValue('Bio for alice')

    // 5. Authenticated -> Visit guest-only /login -> Redirects to /
    await page.goto('/login')
    await expect(page.getByRole('heading', { name: 'Home Page' })).toBeVisible()
    await expect(page.getByTestId('current-url')).toHaveText('/')

    // 6. Authenticated -> Visit guest-only /signup -> Redirects to /
    await page.goto('/signup')
    await expect(page.getByRole('heading', { name: 'Home Page' })).toBeVisible()
    await expect(page.getByTestId('current-url')).toHaveText('/')

    // 7. Logout -> Redirects to / and resets auth
    await page.getByTestId('btn-logout-toggle').click()
    await expect(page.getByTestId('auth-status')).toHaveText(
      'Unauthenticated (Guest)',
    )
  })

  test('4. should preserve page model state on ChangeRouteNoReload (tabs and pagination)', async ({
    page,
  }) => {
    await page.goto('/')

    // Mutate local state
    await page.getByTestId('btn-home-increment').click()
    await page.getByTestId('btn-home-increment').click()
    await expect(page.getByTestId('home-counter')).toHaveText('2')

    await page
      .getByTestId('home-notes')
      .fill('State should persist across tabs')

    // Switch tab using ChangeRouteNoReload
    await page.getByTestId('tab-tag').click()
    await expect(page.getByTestId('current-url')).toHaveText('/?tab=tag')

    // Verify local state is STILL preserved!
    await expect(page.getByTestId('home-counter')).toHaveText('2')
    await expect(page.getByTestId('home-notes')).toHaveValue(
      'State should persist across tabs',
    )

    // Switch page
    await page.getByTestId('page-btn-3').click()
    await expect(page.getByTestId('current-url')).toHaveText('/?tab=tag&page=3')
    await expect(page.getByTestId('home-counter')).toHaveText('2')
    await expect(page.getByTestId('home-notes')).toHaveValue(
      'State should persist across tabs',
    )
  })

  test('5. should handle browser history back and forward buttons properly', async ({
    page,
  }) => {
    await page.goto('/')
    await expect(page.getByTestId('current-url')).toHaveText('/')

    await page.getByRole('link', { name: 'Sign In' }).click()
    await expect(page).toHaveURL('/login')
    await expect(page.getByTestId('current-url')).toHaveText('/login')
    await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible()

    await page.getByRole('link', { name: 'Sign Up' }).click()
    await expect(page).toHaveURL('/signup')
    await expect(page.getByTestId('current-url')).toHaveText('/signup')
    await expect(page.getByRole('heading', { name: 'Sign Up' })).toBeVisible()

    // Go Back -> /login
    await page.goBack()
    await expect(page).toHaveURL('/login')
    await expect(page.getByTestId('current-url')).toHaveText('/login')
    await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible()

    // Go Back -> /
    await page.goBack()
    await expect(page).toHaveURL('/')
    await expect(page.getByTestId('current-url')).toHaveText('/')
    await expect(page.getByRole('heading', { name: 'Home Page' })).toBeVisible()

    // Go Forward -> /login
    await page.goForward()
    await expect(page).toHaveURL('/login')
    await expect(page.getByTestId('current-url')).toHaveText('/login')
    await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible()
  })

  test('6. should execute programmatic form submissions and navigation', async ({
    page,
  }) => {
    await page.goto('/login')

    // Fill form and submit
    await page.getByTestId('login-email').fill('charlie@example.com')
    await page.getByTestId('btn-login-submit').click()

    // Redirects to Home and logs in as charlie
    await expect(page.getByRole('heading', { name: 'Home Page' })).toBeVisible()
    await expect(page.getByTestId('auth-status')).toHaveText(
      'Authenticated: charlie',
    )

    // Navigate to editor
    await page.getByRole('link', { name: 'New Article' }).click()
    await expect(
      page.getByRole('heading', { name: 'New Article' }),
    ).toBeVisible()

    // Fill title and publish
    await page.getByTestId('editor-title').fill('My First TEA Article')
    await page.getByTestId('btn-editor-submit').click()

    // Redirects to Article page
    await expect(
      page.getByRole('heading', { name: 'Article: my-first-tea-article' }),
    ).toBeVisible()
    await expect(page.getByTestId('current-url')).toHaveText(
      '/article/my-first-tea-article',
    )
  })

  test('7. should handle malformed and boundary query parameters gracefully', async ({
    page,
  }) => {
    // 1. Invalid tab and negative page
    await page.goto('/?tab=invalid_tab_name&page=-99')
    await expect(page.getByRole('heading', { name: 'Home Page' })).toBeVisible()
    await expect(page.getByTestId('current-url')).toHaveText('/')
    await expect(page.getByTestId('tab-global')).toHaveClass(/bg-emerald-600/)

    // 2. Non-numeric page string
    await page.goto('/?page=not_a_number')
    await expect(page.getByRole('heading', { name: 'Home Page' })).toBeVisible()
    await expect(page.getByTestId('current-url')).toHaveText('/')

    // 3. Zero page number
    await page.goto('/?tab=tag&page=0')
    await expect(page.getByTestId('current-url')).toHaveText('/?tab=tag')
    await expect(page.getByTestId('tab-tag')).toHaveClass(/bg-emerald-600/)

    // 4. Large page number
    await page.goto('/?tab=tag&page=42')
    await expect(page.getByTestId('current-url')).toHaveText(
      '/?tab=tag&page=42',
    )
  })

  test('8. should decode special characters and non-ASCII in route parameters', async ({
    page,
  }) => {
    // Encoded space in username
    await page.goto('/profile/alice%20smith')
    await expect(
      page.getByRole('heading', { name: 'Profile: @alice smith' }),
    ).toBeVisible()
    await expect(page.getByTestId('current-url')).toHaveText(
      '/profile/alice%20smith',
    )

    // Japanese Unicode username
    await page.goto('/profile/%E3%83%9E%E3%82%B9%E3%82%BF%E3%83%BC')
    await expect(
      page.getByRole('heading', { name: 'Profile: @マスター' }),
    ).toBeVisible()

    // Encoded special characters in article slug
    await page.goto('/article/c%2B%2B-vs-rust%231')
    await expect(
      page.getByRole('heading', { name: 'Article: c++-vs-rust#1' }),
    ).toBeVisible()
    await expect(page.getByTestId('current-url')).toHaveText(
      '/article/c%2B%2B-vs-rust%231',
    )

    // Adding comments updates count without corrupting decoded slug
    await page.getByTestId('btn-article-add-comment').click()
    await expect(page.getByTestId('article-comments-count')).toHaveText('1')
  })

  test('9. should re-initialize model when route params change and preserve on ChangeRouteNoReload', async ({
    page,
  }) => {
    // 1. Visit Alice profile and increment counter
    await page.goto('/profile/alice')
    await page.getByTestId('btn-profile-inc').click()
    await page.getByTestId('btn-profile-inc').click()
    await expect(page.getByTestId('profile-count')).toHaveText('2')

    // 2. Direct navigation to Bob profile -> State MUST re-initialize to 0
    await page.goto('/profile/bob')
    await expect(
      page.getByRole('heading', { name: 'Profile: @bob' }),
    ).toBeVisible()
    await expect(page.getByTestId('profile-count')).toHaveText('0')

    // 3. Mutate Bob profile counter
    await page.getByTestId('btn-profile-inc').click()
    await expect(page.getByTestId('profile-count')).toHaveText('1')

    // 4. Toggle Favorites on Bob (ChangeRouteNoReload) -> State MUST be preserved
    await page.getByTestId('btn-profile-toggle-fav').click()
    await expect(page.getByTestId('current-url')).toHaveText(
      '/profile/bob/favorites',
    )
    await expect(page.getByText('Mode: Favorited Articles')).toBeVisible()
    await expect(page.getByTestId('profile-count')).toHaveText('1')

    // 5. Toggle Favorites Off -> State is still 1
    await page.getByTestId('btn-profile-toggle-fav').click()
    await expect(page.getByTestId('current-url')).toHaveText('/profile/bob')
    await expect(page.getByText('Mode: My Articles')).toBeVisible()
    await expect(page.getByTestId('profile-count')).toHaveText('1')
  })

  test('10. should handle multi-step quick history jumps (page.go)', async ({
    page,
  }) => {
    await page.goto('/')
    await page.getByRole('link', { name: 'Sign In' }).click()
    await expect(page).toHaveURL('/login')

    await page.getByRole('link', { name: 'Sign Up' }).click()
    await expect(page).toHaveURL('/signup')

    await page.getByTestId('nav-home').click()
    await expect(page).toHaveURL('/')

    // Jump 2 steps back: / -> /signup -> /login
    await page.goBack()
    await expect(page).toHaveURL('/signup')
    await page.goBack()
    await expect(page).toHaveURL('/login')
    await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible()
    await expect(page.getByTestId('current-url')).toHaveText('/login')

    // Jump forward: /login -> /signup
    await page.goForward()
    await expect(page).toHaveURL('/signup')
    await expect(page.getByRole('heading', { name: 'Sign Up' })).toBeVisible()
    await expect(page.getByTestId('current-url')).toHaveText('/signup')
  })

  test('11. should remain idempotent on duplicate same-route clicks', async ({
    page,
  }) => {
    await page.goto('/')
    await page.getByTestId('btn-home-increment').click()
    await expect(page.getByTestId('home-counter')).toHaveText('1')

    // Click Home link while already on Home
    await page.getByTestId('nav-home').click()
    await expect(page).toHaveURL('/')
    await expect(page.getByTestId('current-url')).toHaveText('/')
    await expect(page.getByRole('heading', { name: 'Home Page' })).toBeVisible()
  })

  test('12. should prevent unauthenticated history re-entry to protected routes after logout', async ({
    page,
  }) => {
    // 1. Log in
    await page.goto('/')
    await page.getByTestId('btn-login-toggle').click()
    await expect(page.getByTestId('auth-status')).toHaveText(
      'Authenticated: alice',
    )

    // 2. Visit protected settings
    await page.getByRole('link', { name: 'Settings' }).click()
    await expect(
      page.getByRole('heading', { name: 'Settings (Protected)' }),
    ).toBeVisible()
    await expect(page.getByTestId('current-url')).toHaveText('/settings')

    // 3. Logout -> redirects to /
    await page.getByTestId('btn-settings-logout').click()
    await expect(page).toHaveURL('/')
    await expect(page.getByTestId('auth-status')).toHaveText(
      'Unauthenticated (Guest)',
    )
    await expect(page.getByTestId('current-url')).toHaveText('/')

    // 4. Attempt history back to /settings while logged out
    await page.goBack()
    // Route guard on UrlChange MUST intercept and redirect to /login
    await expect(page).toHaveURL('/login')
    await expect(page.getByRole('heading', { name: 'Sign In' })).toBeVisible()
    await expect(page.getByTestId('current-url')).toHaveText('/login')
  })

  test('13. should force-refresh and re-initialize page model when ChangeRouteMsg is dispatched with forceRefresh=true', async ({
    page,
  }) => {
    await page.goto('/')

    // Initial page load shows indicator, then it disappears
    await expect(page.getByTestId('first-initialized-indicator')).toBeVisible()
    await expect(page.getByTestId('first-initialized-indicator')).toBeHidden({
      timeout: 2000,
    })

    // Mutate local state
    await page.getByTestId('btn-home-increment').click()
    await page.getByTestId('btn-home-increment').click()
    await page.getByTestId('home-notes').fill('State to be reset')
    await expect(page.getByTestId('home-counter')).toHaveText('2')
    await expect(page.getByTestId('home-notes')).toHaveValue(
      'State to be reset',
    )

    // Switch tab (ChangeRouteNoReload) -> State must persist & NO refresh indicator appears
    await page.getByTestId('tab-tag').click()
    await expect(page.getByTestId('home-counter')).toHaveText('2')
    await expect(page.getByTestId('home-notes')).toHaveValue(
      'State to be reset',
    )
    await expect(page.getByTestId('first-initialized-indicator')).toBeHidden()

    // Dispatch ChangeRouteMsg with forceRefresh: true
    await page.getByTestId('btn-home-force-refresh').click()

    // Refresh indicator appears on forceRefresh!
    await expect(page.getByTestId('first-initialized-indicator')).toBeVisible()

    // State MUST be completely reset/re-initialized
    await expect(page.getByTestId('home-counter')).toHaveText('0')
    await expect(page.getByTestId('home-notes')).toHaveValue('')

    // Indicator disappears after timeout
    await expect(page.getByTestId('first-initialized-indicator')).toBeHidden({
      timeout: 2000,
    })
  })

  test('14. should force-refresh and re-initialize page model via Link component with forceRefresh={true}', async ({
    page,
  }) => {
    await page.goto('/')
    await expect(page.getByTestId('first-initialized-indicator')).toBeHidden({
      timeout: 2000,
    })

    // Mutate local state
    await page.getByTestId('btn-home-increment').click()
    await page.getByTestId('home-notes').fill('Preserved on normal click')
    await expect(page.getByTestId('home-counter')).toHaveText('1')
    await expect(page.getByTestId('home-notes')).toHaveValue(
      'Preserved on normal click',
    )

    // Click standard Home link -> Idempotent, state is preserved, NO refresh indicator
    await page.getByTestId('nav-home').click()
    await expect(page.getByTestId('home-counter')).toHaveText('1')
    await expect(page.getByTestId('home-notes')).toHaveValue(
      'Preserved on normal click',
    )
    await expect(page.getByTestId('first-initialized-indicator')).toBeHidden()

    // Click Link with forceRefresh={true}
    await page.getByTestId('nav-home-force-refresh').click()

    // Indicator appears!
    await expect(page.getByTestId('first-initialized-indicator')).toBeVisible()

    // State MUST be completely reset/re-initialized
    await expect(page.getByTestId('home-counter')).toHaveText('0')
    await expect(page.getByTestId('home-notes')).toHaveValue('')

    // Indicator disappears after timeout
    await expect(page.getByTestId('first-initialized-indicator')).toBeHidden({
      timeout: 2000,
    })
  })
})
