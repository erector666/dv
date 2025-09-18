// @ts-check
const { test, expect, chromium } = require('@playwright/test');

test.describe('DocVault Chatbot (Existing Chrome Session)', () => {
  test('should connect to existing Chrome and test chatbot', async () => {
    console.log('🌐 Connecting to existing Chrome session...');

    // Connect to existing Chrome instance
    // First, you need to start Chrome with remote debugging:
    // chrome.exe --remote-debugging-port=9222 --user-data-dir="C:\temp\chrome-debug"

    let browser;
    let page;

    try {
      // Try to connect to existing Chrome
      browser = await chromium.connectOverCDP('http://localhost:9222');
      const contexts = browser.contexts();
      const context = contexts[0] || (await browser.newContext());
      page = await context.newPage();

      console.log('✅ Connected to existing Chrome session');
    } catch (error) {
      console.log(
        '❌ Could not connect to existing Chrome. Please start Chrome with:'
      );
      console.log(
        'chrome.exe --remote-debugging-port=9222 --user-data-dir="C:\\temp\\chrome-debug"'
      );
      return;
    }

    // Enable console logging to capture our debug messages
    page.on('console', msg => {
      if (
        msg.text().includes('ChatBot Debug') ||
        msg.text().includes('Backend Debug') ||
        msg.text().includes('🔍')
      ) {
        console.log('🔍 BROWSER DEBUG:', msg.text());
      }
    });

    // Navigate to DocVault (assuming it's running on localhost:3000)
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000); // Give time for React to load

    console.log('📄 Current page URL:', page.url());

    // Take screenshot of current state
    await page.screenshot({
      path: 'tests/existing-chrome-state.png',
      fullPage: true,
    });

    // Look for chat button with comprehensive search
    console.log('🔍 Looking for chat button...');

    // Wait for page to be fully loaded
    await page.waitForSelector('body', { timeout: 10000 });

    // Count all buttons
    const allButtons = page.locator('button');
    const buttonCount = await allButtons.count();
    console.log(`🔍 Found ${buttonCount} total buttons on page`);

    if (buttonCount > 0) {
      // Log all button texts for debugging
      for (let i = 0; i < buttonCount; i++) {
        try {
          const buttonText = await allButtons.nth(i).textContent();
          const buttonClasses = await allButtons.nth(i).getAttribute('class');
          console.log(
            `Button ${i}: "${buttonText}" (classes: ${buttonClasses})`
          );
        } catch (e) {
          console.log(`Button ${i}: Could not read text`);
        }
      }
    }

    // Look for chat button with multiple strategies
    const chatSelectors = [
      'button:has-text("Chat")',
      'button:has-text("Dorian")',
      'button[class*="chat"]',
      'button[data-testid*="chat"]',
      '[class*="fixed"] button:last-of-type', // floating buttons
      '[class*="float"] button',
      'button[aria-label*="chat"]',
      'div:last-child button:last-child', // often chat is last button
      'button:last-of-type', // try the last button on page
    ];

    let chatButton = null;
    for (const selector of chatSelectors) {
      const element = page.locator(selector).first();
      if (await element.isVisible()) {
        chatButton = element;
        console.log(`✅ Found chat button with selector: ${selector}`);
        break;
      }
    }

    if (!chatButton && buttonCount > 0) {
      // If no specific chat button found, try the last button (common for floating chat)
      chatButton = allButtons.last();
      console.log('🤔 Using last button as potential chat button');
    }

    if (!chatButton) {
      console.log('❌ No chat button found');
      await page.screenshot({
        path: 'tests/no-chat-button-existing-chrome.png',
        fullPage: true,
      });
      return;
    }

    // Click the chat button
    await chatButton.click();
    console.log('✅ Chat button clicked');
    await page.waitForTimeout(3000);

    // Take screenshot after clicking
    await page.screenshot({
      path: 'tests/after-chat-click-existing.png',
      fullPage: true,
    });

    // Look for chat input
    const chatInput = page
      .locator(
        `
      input[placeholder*="Ask" i], 
      input[placeholder*="Dorian" i],
      input[placeholder*="message" i], 
      textarea[placeholder*="Ask" i],
      input[class*="chat"],
      textarea[class*="chat"],
      input[type="text"]:visible
    `
      )
      .first();

    if (await chatInput.isVisible()) {
      console.log('✅ Chat input found!');

      // Test document count query
      console.log('📊 Testing: "how many documents do i have"');
      await chatInput.fill('how many documents do i have');

      // Send message
      const sendButton = page
        .locator('button[type="submit"], button:has-text("Send")')
        .first();
      if (await sendButton.isVisible()) {
        await sendButton.click();
      } else {
        await chatInput.press('Enter');
      }

      // Wait for response
      await page.waitForTimeout(5000);
      await page.screenshot({
        path: 'tests/document-count-existing-chrome.png',
        fullPage: true,
      });

      // Test document analysis
      console.log('🔍 Testing: "tell me about my last upload"');
      await chatInput.fill('tell me about my last upload');

      if (await sendButton.isVisible()) {
        await sendButton.click();
      } else {
        await chatInput.press('Enter');
      }

      // Wait for AI analysis
      await page.waitForTimeout(8000);
      await page.screenshot({
        path: 'tests/document-analysis-existing-chrome.png',
        fullPage: true,
      });

      console.log('✅ Chatbot testing completed with existing Chrome session!');
    } else {
      console.log('❌ Chat input not found');
      await page.screenshot({
        path: 'tests/no-chat-input-existing.png',
        fullPage: true,
      });
    }

    // Close browser connection
    await browser.close();
  });
});
