import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3000';

export default defineConfig({
  testDir: './tests/smoke',
  timeout: 30_000,
  expect: {
    timeout: 10_000,
  },
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium-mobile',
      use: { ...devices['Pixel 5'] },
    },
  ],
});
