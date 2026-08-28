import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  timeout: 30_000,
  expect: { timeout: 7_000 },
  outputDir: 'C:/Users/lcfaj/AppData/Local/Temp/procurement-playwright-results',
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'C:/Users/lcfaj/AppData/Local/Temp/procurement-playwright-report' }]],
  webServer: {
    command: 'node node_modules/vite/bin/vite.js --mode test --host 127.0.0.1 --port 8003',
    url: 'http://127.0.0.1:8003',
    reuseExistingServer: true,
    timeout: 120_000,
  },
  use: {
    baseURL: 'http://127.0.0.1:8003',
    channel: 'chrome',
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop-chrome', testIgnore: /responsive\.spec\.ts/, use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
    { name: 'mobile-chrome', use: { ...devices['Pixel 7'] }, testMatch: /responsive\.spec\.ts/ },
  ],
});
