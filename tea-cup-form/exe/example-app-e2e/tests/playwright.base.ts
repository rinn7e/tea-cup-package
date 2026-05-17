import { type PlaywrightTestConfig, devices } from '@playwright/test'

export const baseConfig: PlaywrightTestConfig = {
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: 1,
  reporter: 'html',
  timeout: 15_000,
  use: {
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    actionTimeout: 5_000,
    navigationTimeout: 10_000,
    baseURL: process.env.BASE_URL || 'http://localhost:5173',
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
    command: 'npm run dev',
    url: 'http://localhost:5173',
    cwd: '../example-app',
    reuseExistingServer: !process.env.CI,
  },
}
