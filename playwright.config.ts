import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests', testMatch: '**/*.pw.ts', timeout: 120000,
  fullyParallel: false, workers: 1,
  webServer: [
    { command: 'npm run dev', url: 'http://127.0.0.1:5173', reuseExistingServer: !process.env.CI, timeout: 30000 },
    { command: 'npm run server', url: 'http://127.0.0.1:8000/api/health', reuseExistingServer: !process.env.CI, timeout: 30000 },
  ],
  use: { baseURL: 'http://127.0.0.1:5173', channel: 'chrome', screenshot: 'only-on-failure', trace: 'retain-on-failure' },
});
