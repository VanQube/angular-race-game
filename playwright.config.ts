import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests',
  timeout: 120000,
  use: {
    headless: true,
    viewport: { width: 1280, height: 800 },
    actionTimeout: 30000,
    baseURL: 'http://localhost:4200'
    ,
    // Capture video and trace for debugging failed tests
    video: 'on',
    trace: 'on'
  }
});
