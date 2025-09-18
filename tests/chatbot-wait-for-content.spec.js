// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('DocVault Chatbot (Wait for React)', () => {
  test('should wait for React to load and test chatbot', async ({ page }) => {
    console.log('🌐 Loading DocVault and waiting for React...');

    // Enable console logging
    page.on('console', msg => {
      if (
        msg.text().includes('ChatBot Debug') ||
        msg.text().includes('Backend Debug') ||
        msg.text().includes('🔍')
      ) {
        console.log('🔍 BROWSER DEBUG:', msg.text());
      }
    });

    // Go to DocVault
    await page.goto('http://localhost:3000');

    // Wait for the React app to actually render content in #root
    console.log('⏳ Waiting for React app to render...');
    await page.waitForSelector('#root > *', { timeout: 30000 }); // Wait for content inside root

    // Wait for network to be idle (all API calls done)
    await page.waitForLoadState('networkidle');

    // Give additional time for any async operations
    await page.waitForTimeout(3000);

    console.log('✅ React app loaded');

    // Now check for content
    const rootContent = await page.locator('#root').innerHTML();
    console.log('📊 Root content length:', rootContent.length);

    // Count interactive elements again
    const buttons = await page.locator('button').count();
    const links = await page.locator('a').count();
    const inputs = await page.locator('input').count();

    console.log(
      `🔍 Interactive elements: ${buttons} buttons, ${links} links, ${inputs} inputs`
    );

    // Take screenshot of loaded app
    await page.screenshot({ path: 'tests/react-loaded.png', fullPage: true });

    if (buttons === 0) {
      console.log(
        '❌ Still no buttons found - React may not be loading properly'
      );

      // Check for any error messages
      const errorElements = await page
        .locator('[class*="error"], [class*="Error"]')
        .count();
      console.log('❌ Error elements found:', errorElements);

      // Check console for errors
      const pageErrors = [];
      page.on('pageerror', error => {
        pageErrors.push(error.message);
      });

      console.log('🚨 Page errors:', pageErrors);
      return;
    }

    // Look for chat button
    console.log('🔍 Looking for chat button...');

    // Log all buttons for debugging
    for (let i = 0; i < Math.min(buttons, 5); i++) {
      try {
        const btn = page.locator('button').nth(i);
        const text = await btn.textContent();
        const classes = await btn.getAttribute('class');
        console.log(`  Button ${i}: "${text}" classes: ${classes}`);
      } catch (e) {
        console.log(`  Button ${i}: Error - ${e.message}`);
      }
    }

    // Try to find chat button
    const chatSelectors = [
      'button:has-text("Chat")',
      'button:has-text("Dorian")',
      'button[class*="chat"]',
      'button[class*="fixed"]',
      'button:last-of-type',
    ];

    let chatButton = null;
    for (const selector of chatSelectors) {
      const element = page.locator(selector).first();
      if (await element.isVisible()) {
        chatButton = element;
        console.log(`✅ Found chat button: ${selector}`);
        break;
      }
    }

    if (!chatButton) {
      console.log('🤔 No specific chat button found, trying last button...');
      chatButton = page.locator('button').last();
    }

    // Click chat button
    await chatButton.click();
    console.log('✅ Clicked chat button');
    await page.waitForTimeout(2000);

    // Screenshot after click
    await page.screenshot({
      path: 'tests/after-chat-click-react.png',
      fullPage: true,
    });

    // Look for chat input
    const chatInput = page
      .locator('input, textarea')
      .filter({ hasText: '' })
      .first();
    const inputCount = await page.locator('input, textarea').count();
    console.log(`🔍 Found ${inputCount} input/textarea elements`);

    if (inputCount > 0) {
      // Try the most likely chat input
      const possibleChatInput = page
        .locator(
          'input[placeholder*="Ask"], input[placeholder*="message"], input:last-of-type, textarea'
        )
        .first();

      if (await possibleChatInput.isVisible()) {
        console.log('✅ Chat input found!');

        // Test the chatbot
        await possibleChatInput.fill('how many documents do i have');
        await possibleChatInput.press('Enter');

        console.log('📤 Sent: "how many documents do i have"');
        await page.waitForTimeout(5000);

        await page.screenshot({
          path: 'tests/chatbot-response-final.png',
          fullPage: true,
        });

        console.log('✅ Chatbot test completed!');
      } else {
        console.log('❌ Chat input not visible');
      }
    } else {
      console.log('❌ No input elements found');
    }
  });
});
