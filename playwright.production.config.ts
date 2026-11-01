import { defineConfig } from '@playwright/test';

const port = Number(process.env.PW_PORT ?? 5187);

export default defineConfig({
  testDir: './tests',
  testMatch: 'offline.spec.ts',
  outputDir: './output/playwright/offline',
  timeout: 45000,
  workers: 1,
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    viewport: { width: 1280, height: 720 },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure'
  },
  webServer: {
    command: `npm run preview -- --host 127.0.0.1 --port ${port} --strictPort`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: false
  }
});
