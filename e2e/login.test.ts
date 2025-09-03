import puppeteer, { Browser, Page } from 'puppeteer';

describe('Login Page', () => {
  let browser: Browser;
  let page: Page;
  const baseUrl = 'http://localhost:3000';

  beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: false, // Set to true for CI/CD
      slowMo: 50, // Slow down by 50ms for demo purposes
    });
    page = await browser.newPage();
  });

  afterAll(async () => {
    await browser.close();
  });

  test('should login with valid credentials', async () => {
    // Navigate to login page
    await page.goto(`${baseUrl}/login`);

    // Fill in the login form
    await page.waitForSelector('input[type="email"]');
    await page.type('input[type="email"]', 'kango666@gmail.com');
    await page.type('input[type="password"]', 'nickelback6');

    // Click the login button
    await Promise.all([
      page.waitForNavigation(),
      page.click('button[type="submit"]'),
    ]);

    // Verify successful login by checking for dashboard element
    await page.waitForSelector('[data-testid="dashboard"]');
    const url = page.url();
    expect(url).toContain('/dashboard');
  }, 30000); // Increased timeout for CI

  test('should show error with invalid credentials', async () => {
    // Navigate to login page
    await page.goto(`${baseUrl}/login`);

    // Fill in the login form with invalid credentials
    await page.waitForSelector('input[type="email"]');
    await page.type('input[type="email"]', 'invalid@example.com');
    await page.type('input[type="password"]', 'wrongpassword');

    // Click the login button
    await page.click('button[type="submit"]');

    // Wait for error message
    await page.waitForSelector('[role="alert"]');
    const errorMessage = await page.$eval(
      '[role="alert"]',
      el => el.textContent
    );
    expect(errorMessage).toContain('Invalid email or password');
  }, 30000);
});
