import { test, expect } from '@playwright/test';

test.describe('Authentication Flows', () => {
  const randomSuffix = Math.floor(Math.random() * 1000000);
  const testUser = {
    username: `qa_user_${randomSuffix}`,
    email: `qa_user_${randomSuffix}@lumina.test`,
    password: 'QAPassword123!',
    displayName: 'QA Automation User',
  };

  test('should allow a new user to sign up, log in, and access the feed', async ({ page, isMobile }) => {
    // 1. Navigate to signup
    await page.goto('/signup');
    await expect(page).toHaveTitle(/Signup|Register|Lumina/i);

    // 2. Fill out the registration form
    await page.getByPlaceholder('you@example.com').fill(testUser.email);
    await page.getByPlaceholder('@username').fill(testUser.username);
    await page.getByPlaceholder('Your name').fill(testUser.displayName);
    await page.getByPlaceholder('At least 8 characters').fill(testUser.password);

    // Submit form
    await page.click('button[type="submit"]');

    // 3. Verify redirect to login or feed
    await page.waitForURL(/\/(login|)$/);

    if (page.url().includes('/login')) {
      // 4. Log in if redirected to login
      await page.getByPlaceholder('you@example.com').fill(testUser.email);
      await page.getByPlaceholder('Enter your password').fill(testUser.password);
      await page.click('button[type="submit"]');
      await page.waitForURL('/');
    }

    // 5. Verify the home feed loaded
    await expect(page.locator('text=Lumina').first()).toBeVisible();
    await expect(page.locator('.min-h-screen')).toBeVisible();
    
    if (!isMobile) {
      // Check desktop navigation
      await expect(page.locator('nav[aria-label="Desktop navigation"]')).toBeVisible();
    }
  });

  test('should reject invalid login credentials', async ({ page }) => {
    await page.goto('/login');
    // For login page, assuming placeholders are "Enter your email" and "Enter your password"
    await page.getByPlaceholder('you@example.com').fill('invalid_user_does_not_exist@lumina.test');
    await page.getByPlaceholder('Enter your password').fill('WrongPassword123!');
    await page.click('button[type="submit"]');

    // Verify an error toast or message appears
    const errorMessage = page.locator('text=/Invalid|Failed|Error|incorrect/i').first();
    await expect(errorMessage).toBeVisible();
  });
});
