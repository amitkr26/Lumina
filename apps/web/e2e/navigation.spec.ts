import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  const randomSuffix = Math.floor(Math.random() * 1000000);
  const testUser = {
    username: `qa_nav_${randomSuffix}`,
    email: `qa_nav_${randomSuffix}@lumina.test`,
    password: 'QAPassword123!',
  };

  test.beforeAll(async ({ request }) => {
    await request.post('/api/v1/auth/register', {
      data: {
        email: testUser.email,
        username: testUser.username,
        password: testUser.password,
      },
    });
  });

  test('should navigate between public pages without auth', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('button', { name: /log in/i })).toBeVisible();

    await page.goto('/signup');
    await expect(page.getByRole('button', { name: /sign up/i })).toBeVisible();

    await page.goto('/');
    await page.waitForURL(/\/login/);
  });

  test('should show mobile bottom nav on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/login');
    await page.getByPlaceholder('you@example.com').fill(testUser.email);
    await page.getByPlaceholder('Enter your password').fill(testUser.password);
    await page.getByRole('button', { name: /log in/i }).click();
    await page.waitForURL('/');

    const mobileNav = page.getByRole('navigation', { name: 'Mobile navigation' });
    await expect(mobileNav).toBeVisible({ timeout: 8000 });
  });

  test('should show desktop sidebar on desktop viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/login');
    await page.getByPlaceholder('you@example.com').fill(testUser.email);
    await page.getByPlaceholder('Enter your password').fill(testUser.password);
    await page.getByRole('button', { name: /log in/i }).click();
    await page.waitForURL('/');

    const desktopNav = page.getByRole('navigation', { name: 'Desktop navigation' });
    await expect(desktopNav).toBeVisible({ timeout: 8000 });
  });
});
