import { test, expect } from '@playwright/test';

test.describe.serial('Authentication Flows', () => {
  const randomSuffix = Math.floor(Math.random() * 1000000);
  const testUser = {
    username: `qa_user_${randomSuffix}`,
    email: `qa_user_${randomSuffix}@lumina.test`,
    password: 'QAPassword123!',
    displayName: 'QA Automation User',
  };

  test('should sign up a new user and redirect to feed', async ({ page, isMobile }) => {
    await page.goto('/signup');
    await expect(page).toHaveTitle(/Signup|Register|Lumina/i);

    await page.getByPlaceholder('you@example.com').fill(testUser.email);
    await page.getByPlaceholder('@username').fill(testUser.username);
    await page.getByPlaceholder('Your name').fill(testUser.displayName);
    await page.getByPlaceholder('At least 8 characters').fill(testUser.password);
    await page.getByRole('button', { name: /sign up/i }).click();

    await page.waitForURL(/\/(login|)$/);

    if (page.url().includes('/login')) {
      await page.getByPlaceholder('you@example.com').fill(testUser.email);
      await page.getByPlaceholder('Enter your password').fill(testUser.password);
      await page.getByRole('button', { name: /log in/i }).click();
    }
    await page.waitForURL('/');
    await expect(page.getByRole('banner')).toBeVisible();
    await expect(page.getByText('Lumina').first()).toBeVisible();

    // Note: Navigation checks are moved to navigation.spec.ts to avoid mobile/desktop conflicts
  });

  test('should reject invalid login credentials', async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('you@example.com').fill('invalid_user_does_not_exist@lumina.test');
    await page.getByPlaceholder('Enter your password').fill('WrongPassword123!');
    await page.getByRole('button', { name: /log in/i }).click();

    const errorBox = page.locator('.bg-destructive\\/10');
    await expect(errorBox).toBeVisible({ timeout: 10000 });
    await expect(errorBox).toContainText(/invalid|failed|error|incorrect/i);
  });

  test('should show error for empty fields on login', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: /log in/i }).click();
    await expect(page.locator('input:invalid')).toHaveCount(1);
  });

  test('should show error for short password on signup', async ({ page }) => {
    await page.goto('/signup');
    await page.getByPlaceholder('you@example.com').fill('short@test.com');
    await page.getByPlaceholder('@username').fill('short_usr');
    await page.getByPlaceholder('At least 8 characters').fill('ab');
    await page.getByRole('button', { name: /sign up/i }).click();
    await expect(page.locator('input:invalid')).toHaveCount(1);
  });

  test('should redirect to login when accessing protected route without auth', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForURL(/\/login/);
    await expect(page.getByRole('heading', { name: /log in/i })).toBeVisible();
  });

  test('should redirect to settings with callbackUrl after login', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForURL(/\/login\?callbackUrl=%2Fsettings/);

    await page.getByPlaceholder('you@example.com').fill(testUser.email);
    await page.getByPlaceholder('Enter your password').fill(testUser.password);
    await page.getByRole('button', { name: /log in/i }).click();
    await page.waitForURL(/\/settings/);
  });
});
