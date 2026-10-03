import { type PlaywrightTestConfig, devices } from '@playwright/test'

// The example app runs on its own port (see its vite.config.ts) so a server
// of another example app is never reused by mistake.
const appUrl = 'http://localhost:5184'

export const baseConfig: PlaywrightTestConfig = {
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: 1,
  reporter: 'list',
  timeout: 15_000,
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    actionTimeout: 5_000,
    navigationTimeout: 10_000,
    baseURL: process.env.BASE_URL || appUrl,
  },
  expect: {
    timeout: 5_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'pnpm run dev',
    url: appUrl,
    cwd: '../example-app',
    reuseExistingServer: !process.env.CI,
  },
}
