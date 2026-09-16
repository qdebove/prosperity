import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests', testMatch: '**/*.pw.ts', timeout: 120000,
  fullyParallel: false, workers: 1,
  use: { baseURL: 'http://127.0.0.1:5173', channel: 'chrome', screenshot: 'only-on-failure', trace: 'retain-on-failure' },
});
