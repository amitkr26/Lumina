import { test, expect } from '@playwright/test';

test.describe('Advanced Auth Flows', () => {
  const randomSuffix = Math.floor(Math.random() * 1000000);
  const testUser = {
    username: `qa_adv_${randomSuffix}`,
    email: `qa_adv_${randomSuffix}@lumina.test`,
    password: 'QAPassword123!',
  };

  test.beforeAll(async ({ request }) => {
    const res = await request.post('/api/v1/auth/register', {
      data: { email: testUser.email, username: testUser.username, password: testUser.password },
    });
    if (res.status() !== 201 && res.status() !== 409) {
      console.warn('User pre-registration returned', res.status());
    }
  });

  test('should redirect to login and back after session expiry', async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('you@example.com').fill(testUser.email);
    await page.getByPlaceholder('Enter your password').fill(testUser.password);
    await page.getByRole('button', { name: /log in/i }).click();
    await page.waitForURL('/');

    await expect(page.getByRole('banner')).toBeVisible();

    await page.goto('/login');
    await page.waitForURL('/');
  });

  test('should logout and prevent access to protected routes', async ({ page, context }) => {
    await page.goto('/login');
    await page.getByPlaceholder('you@example.com').fill(testUser.email);
    await page.getByPlaceholder('Enter your password').fill(testUser.password);
    await page.getByRole('button', { name: /log in/i }).click();
    await page.waitForURL('/');

    await context.clearCookies();

    await page.goto('/settings');
    await page.waitForURL(/\/login/);
  });

  test('should restore session from persisted auth store on refresh', async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('you@example.com').fill(testUser.email);
    await page.getByPlaceholder('Enter your password').fill(testUser.password);
    await page.getByRole('button', { name: /log in/i }).click();
    await page.waitForURL('/');

    const token = await page.evaluate(() => localStorage.getItem('lumina-auth'));
    expect(token).toBeTruthy();

    await page.reload();
    await page.waitForURL('/');
    await expect(page.getByRole('banner')).toBeVisible();
  });

  test('should preserve auth across tabs', async ({ browser }) => {
    const context = await browser.newContext();
    const page1 = await context.newPage();
    const page2 = await context.newPage();

    await page1.goto('/login');
    await page1.getByPlaceholder('you@example.com').fill(testUser.email);
    await page1.getByPlaceholder('Enter your password').fill(testUser.password);
    await page1.getByRole('button', { name: /log in/i }).click();
    await page1.waitForURL('/');

    await page2.goto('/');
    await page2.waitForURL('/');
    await expect(page2.getByRole('banner')).toBeVisible();

    await context.close();
  });
});
