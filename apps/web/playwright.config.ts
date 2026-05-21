import { defineConfig, devices } from '@playwright/test';
import path from 'path';

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './e2e',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Limit workers due to Prisma pooler connection_limit=1 constraint.
     Each worker holds one DB connection; running more than 2 parallel
     workers causes connection starvation and test timeouts. */
  workers: process.env.CI ? 1 : parseInt(process.env.PLAYWRIGHT_WORKERS || '2', 10),
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.TEST_ENV === 'prod' 
      ? 'https://lumina-web-drab.vercel.app' 
      : 'http://localhost:3000',

    /* Observability Requirements */
    trace: 'on',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Only test Chrome for speed locally unless requested
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],
});
