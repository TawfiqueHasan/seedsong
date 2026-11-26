import { defineConfig, devices } from '@playwright/test';

// Locally we use the installed Microsoft Edge (no browser download); CI sets E2E_BROWSER=chromium.
const useChromium = process.env.E2E_BROWSER === 'chromium';
const browser = useChromium ? {} : { channel: 'msedge' as const };

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:5174',
    ...browser,
    launchOptions: { args: ['--autoplay-policy=no-user-gesture-required'] },
    acceptDownloads: true,
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], ...browser, viewport: { width: 1440, height: 900 } } },
    { name: 'mobile', use: { ...devices['Pixel 7'], ...browser }, testMatch: /smoke/ },
  ],
  webServer: {
    command: 'node node_modules/vite/bin/vite.js --port 5174 --strictPort',
    url: 'http://localhost:5174',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
