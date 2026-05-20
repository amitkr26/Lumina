import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Content Creation and Interaction', () => {
  const testUser = {
    username: `qa_content_${Math.floor(Math.random() * 1000000)}`,
    email: `qa_content_${Math.floor(Math.random() * 1000000)}@lumina.test`,
    password: 'QAPassword123!',
  };

  test.beforeEach(async ({ page }) => {
    // Quick signup logic to have an authenticated session
    await page.goto('/signup');
    await page.getByPlaceholder('you@example.com').fill(testUser.email);
    await page.getByPlaceholder('@username').fill(testUser.username);
    await page.getByPlaceholder('Your name').fill(testUser.username);
    await page.getByPlaceholder('At least 8 characters').fill(testUser.password);
    await page.click('button[type="submit"]');
    
    // Wait until we reach the feed
    await page.waitForURL(/\/(login|)$/);

    if (page.url().includes('/login')) {
      await page.getByPlaceholder('you@example.com').fill(testUser.email);
      await page.getByPlaceholder('Enter your password').fill(testUser.password);
      await page.click('button[type="submit"]');
      await page.waitForURL('/');
    }
  });

  test('should allow creating an image post and see it in the feed', async ({ page }) => {
    // Navigate to create post
    await page.goto('/create');

    // Wait for the create page to load
    await expect(page.locator('text=Upload photos or videos')).toBeVisible();

    // Locate the hidden file input
    const fileInput = page.locator('input[type="file"]');
    
    // Set the dummy file
    const filePath = path.join(__dirname, 'dummy.png');
    await fileInput.setInputFiles(filePath);

    // Locate the post textarea (caption)
    const composer = page.getByPlaceholder('Write a caption...');
    await expect(composer).toBeVisible();

    const postContent = `Automated QA Test Post ${Date.now()}`;
    await composer.fill(postContent);

    // Submit the post
    const submitBtn = page.locator('button', { hasText: 'Share Post' });
    await submitBtn.click();

    // Verify redirect back to feed
    await page.waitForURL('/');

    // Verify the post appears in the feed
    const newPost = page.locator(`text=${postContent}`).first();
    await expect(newPost).toBeVisible();
  });
});
