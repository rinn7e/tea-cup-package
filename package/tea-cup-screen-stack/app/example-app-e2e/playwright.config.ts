import { defineConfig } from '@playwright/test'

import { baseConfig } from './tests/playwright.base'

export default defineConfig({
  ...baseConfig,
})
