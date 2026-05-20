const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  page.on('request', request => console.log('>>', request.method(), request.url()));
  page.on('response', response => console.log('<<', response.status(), response.url()));
  page.on('pageerror', exception => console.log('Uncaught exception:', exception));

  console.log('Navigating to login...');
  await page.goto('https://lumina-web-drab.vercel.app/login');
  
  console.log('Filling form...');
  await page.getByPlaceholder('you@example.com').fill('invalid_user@lumina.test');
  await page.getByPlaceholder('Enter your password').fill('WrongPassword123!');
  
  console.log('Submitting...');
  await page.click('button[type="submit"]');
  
  console.log('Waiting 2 seconds...');
  await page.waitForTimeout(2000);
  
  const content = await page.content();
  const hasError = content.includes('Invalid credentials') || content.includes('Login failed');
  console.log('Has error message?', hasError);
  
  // Extract any text in the error container
  const htmlMatch = content.match(/<div[^>]*bg-destructive[^>]*>(.*?)<\/div>/s);
  if (htmlMatch) {
    console.log('Found error box:', htmlMatch[1]);
  } else {
    console.log('No error box found. Current page text snippet:');
    console.log(await page.locator('body').innerText());
  }

  await browser.close();
})();
