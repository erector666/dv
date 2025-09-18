// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('DocVault Chatbot Simple Test', () => {
  test('should test chatbot by inspecting the actual app', async ({ page }) => {
    console.log('🌐 Opening DocVault...');

    // Enable console logging
    page.on('console', msg => {
      console.log('🔍 BROWSER:', msg.text());
    });

    // Go to DocVault
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Take initial screenshot
    await page.screenshot({ path: 'tests/docvault-home.png', fullPage: true });

    // Get page title to confirm we're on the right page
    const title = await page.title();
    console.log('📄 Page title:', title);

    // Check if we can see the app structure
    const body = await page.locator('body').innerHTML();
    console.log('📊 Page has content:', body.length > 1000 ? 'YES' : 'NO');

    // Look for any React elements
    const reactElements = page.locator('[data-reactroot], #root, .App');
    const reactCount = await reactElements.count();
    console.log('⚛️ React elements found:', reactCount);

    // Count all interactive elements
    const buttons = await page.locator('button').count();
    const links = await page.locator('a').count();
    const inputs = await page.locator('input').count();

    console.log(
      `🔍 Interactive elements: ${buttons} buttons, ${links} links, ${inputs} inputs`
    );

    // If we find buttons, let's examine them
    if (buttons > 0) {
      console.log('🔍 Button analysis:');
      for (let i = 0; i < Math.min(buttons, 10); i++) {
        try {
          const btn = page.locator('button').nth(i);
          const text = await btn.textContent();
          const classes = await btn.getAttribute('class');
          const visible = await btn.isVisible();
          console.log(
            `  Button ${i}: "${text}" visible:${visible} classes:${classes}`
          );
        } catch (e) {
          console.log(`  Button ${i}: Error reading - ${e.message}`);
        }
      }
    }

    // Look for any element that might be a chat trigger
    const possibleChatElements = await page
      .locator('*')
      .evaluateAll(elements => {
        return elements
          .filter(el => {
            const text = el.textContent?.toLowerCase() || '';
            const className = el.className?.toLowerCase() || '';
            const id = el.id?.toLowerCase() || '';
            return (
              text.includes('chat') ||
              text.includes('dorian') ||
              className.includes('chat') ||
              id.includes('chat') ||
              text.includes('message') ||
              className.includes('float')
            );
          })
          .map(el => ({
            tag: el.tagName,
            text: el.textContent?.substring(0, 50),
            className: el.className,
            id: el.id,
          }));
      });

    console.log('🔍 Possible chat elements:', possibleChatElements);

    // Take a final comprehensive screenshot
    await page.screenshot({
      path: 'tests/comprehensive-analysis.png',
      fullPage: true,
    });

    console.log('✅ Analysis complete! Check screenshots and logs.');
  });
});
