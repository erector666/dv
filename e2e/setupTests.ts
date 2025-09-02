// Set default timeout to 30 seconds
jest.setTimeout(30000);

// Add any global test setup here
beforeEach(async () => {
  // Clear all browser data before each test
  const context = await browser.createIncognitoBrowserContext();
  const page = await context.newPage();
  await page.close();
});

afterEach(async () => {
  // Close all pages after each test
  const pages = await browser.pages();
  await Promise.all(pages.map(page => page.close()));
});
