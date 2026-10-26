import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/production', outputDir: './test-results/production', workers: 1, timeout: 90000,
  use: { baseURL: 'http://127.0.0.1:4281', browserName: 'chromium', channel: 'msedge', viewport: { width: 1280, height: 720 } },
  webServer: { command: 'npm run preview', url: 'http://127.0.0.1:4281', reuseExistingServer: false, timeout: 30000 },
});
