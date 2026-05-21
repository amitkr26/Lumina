import { test, expect } from '@playwright/test';

test.describe('Error Recovery', () => {
  const randomSuffix = Math.floor(Math.random() * 1000000);
  const testUser = {
    username: `qa_err_${randomSuffix}`,
    email: `qa_err_${randomSuffix}@lumina.test`,
    password: 'QAPassword123!',
  };

  test.beforeAll(async ({ request }) => {
    await request.post('/api/v1/auth/register', {
      data: { email: testUser.email, username: testUser.username, password: testUser.password },
    });
  });

  test('should show rate limit error on rapid requests', async ({ page }) => {
    await page.goto('/login');
    const attempts = Array(5).fill(null);
    for (const _ of attempts) {
      await page.getByPlaceholder('you@example.com').fill(testUser.email);
      await page.getByPlaceholder('Enter your password').fill('WrongPassword');
      await page.getByRole('button', { name: /log in/i }).click();
      await page.waitForTimeout(500);
    }
    await page.getByPlaceholder('you@example.com').fill(testUser.email);
    await page.getByPlaceholder('Enter your password').fill('WrongPassword');
    await page.getByRole('button', { name: /log in/i }).click();
    const errorBox = page.locator('.bg-destructive\\/10');
    await expect(errorBox).toBeVisible({ timeout: 5000 });
  });

  test('should show error on wrong password, then succeed with correct one', async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('you@example.com').fill(testUser.email);
    await page.getByPlaceholder('Enter your password').fill('WrongPassword123!');
    await page.getByRole('button', { name: /log in/i }).click();

    const errorBox = page.locator('.bg-destructive\\/10');
    await expect(errorBox).toBeVisible({ timeout: 5000 });
    await expect(errorBox).toContainText(/invalid|failed|error|incorrect/i);

    await page.getByPlaceholder('Enter your password').fill(testUser.password);
    await page.getByRole('button', { name: /log in/i }).click();
    await page.waitForURL('/');
    await expect(page.getByRole('banner')).toBeVisible();
  });
});
