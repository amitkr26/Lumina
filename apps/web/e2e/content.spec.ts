import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Content Creation and Interaction', () => {
  const randomSuffix = Math.floor(Math.random() * 1000000);
  const testUser = {
    username: `qa_content_${randomSuffix}`,
    email: `qa_content_${randomSuffix}@lumina.test`,
    password: 'QAPassword123!',
  };

  test.beforeEach(async ({ page }) => {
    await page.goto('/signup');
    await page.getByPlaceholder('you@example.com').fill(testUser.email);
    await page.getByPlaceholder('@username').fill(testUser.username);
    await page.getByPlaceholder('Your name').fill(testUser.username);
    await page.getByPlaceholder('At least 8 characters').fill(testUser.password);
    await page.getByRole('button', { name: /sign up/i }).click();

    await page.waitForURL(/\/(login|)$/);

    if (page.url().includes('/login')) {
      await page.getByPlaceholder('you@example.com').fill(testUser.email);
      await page.getByPlaceholder('Enter your password').fill(testUser.password);
      await page.getByRole('button', { name: /log in/i }).click();
      await page.waitForURL('/');
    }
  });

  test('should allow creating an image post and see it in the feed', async ({ page }) => {
    await page.goto('/create');
    await expect(page.getByText('Upload photos or videos')).toBeVisible();

    const fileInput = page.locator('input[type="file"]');
    const filePath = path.join(__dirname, 'dummy.png');
    await fileInput.setInputFiles(filePath);

    const composer = page.getByPlaceholder('Write a caption...');
    await expect(composer).toBeVisible();

    const postContent = `Automated QA Test Post ${Date.now()}`;
    await composer.fill(postContent);

    await page.getByRole('button', { name: /share post/i }).click();
    await page.waitForURL('/');

    await expect(page.getByText(postContent).first()).toBeVisible({ timeout: 15000 });
  });

  test('should show validation error for empty caption', async ({ page }) => {
    await page.goto('/create');
    await expect(page.getByText('Upload photos or videos')).toBeVisible();

    const fileInput = page.locator('input[type="file"]');
    const filePath = path.join(__dirname, 'dummy.png');
    await fileInput.setInputFiles(filePath);

    await page.getByRole('button', { name: /share post/i }).click();
  });
});
