import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e', fullyParallel: false, workers: 1, timeout: 45000,
  use: { baseURL: 'http://127.0.0.1:8080', viewport: { width: 1280, height: 720 }, browserName: 'chromium', channel: 'msedge', screenshot: 'only-on-failure' },
  webServer: { command: 'npm run dev', url: 'http://127.0.0.1:8080', reuseExistingServer: !process.env.CI, timeout: 30000 },
});
