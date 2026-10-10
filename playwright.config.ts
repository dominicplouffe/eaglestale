import { defineConfig, devices } from '@playwright/test';

/** Browser smoke tests: they play the real game in Chromium against the dev server. Run with `npm run test:e2e`. */
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'http://localhost:5174',
    viewport: { width: 1200, height: 800 },
  },
  webServer: {
    command: 'npm run dev -- --port 5174 --strictPort',
    url: 'http://localhost:5174',
    reuseExistingServer: true,
  },
});
