import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.MORI_TEST_PORT || 43100);
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: './tests',
  testMatch: '**/browser.spec.ts',
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? [['line'], ['html', { open: 'never' }]] : 'list',
  use: {
    ...devices['Desktop Chrome'],
    channel: process.env.CI ? undefined : 'chrome',
    baseURL,
    viewport: { width: 1440, height: 1000 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  webServer: {
    command: `npm run dev -- --port ${port}`,
    url: `${baseURL}/api/workspace`,
    timeout: 120_000,
    reuseExistingServer: false,
    env: {
      MORI_NEXT_DIR: '.mori/next-browser',
      MORI_DATA_DIR: path.resolve('.mori/browser-data'),
      MORI_PROJECT_PATH: process.cwd(),
      NEXT_TELEMETRY_DISABLED: '1',
    },
  },
});
