// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('DocVault Chatbot Interaction', () => {
  test.beforeEach(async ({ page }) => {
    // Enable console logging to capture debug messages
    page.on('console', msg => {
      if (
        msg.text().includes('ChatBot Debug') ||
        msg.text().includes('Backend Debug')
      ) {
        console.log('🔍 BROWSER CONSOLE:', msg.text());
      }
    });

    // Navigate to the application
    await page.goto('/');

    // Wait for the page to load
    await page.waitForLoadState('networkidle');
  });

  test('should open chatbot and show document count', async ({ page }) => {
    console.log('🤖 Testing chatbot document interaction...');

    // Look for chat button (could be various selectors)
    const chatButton = page
      .locator('button')
      .filter({ hasText: /chat|dorian/i })
      .first();

    // If no specific chat button, look for any button that might open chat
    if (!(await chatButton.isVisible())) {
      // Try to find chat icon or floating button
      const altChatButton = page
        .locator(
          '[data-testid*="chat"], [class*="chat"], button[aria-label*="chat"]'
        )
        .first();
      if (await altChatButton.isVisible()) {
        await altChatButton.click();
      } else {
        // Look for any floating action button or chat-like button
        await page.locator('button').last().click();
      }
    } else {
      await chatButton.click();
    }

    // Wait for chat modal/interface to appear
    await page.waitForTimeout(2000);

    // Look for chat input or chat interface
    const chatInput = page
      .locator(
        'input[placeholder*="Ask"], input[placeholder*="message"], textarea[placeholder*="Ask"]'
      )
      .first();

    if (await chatInput.isVisible()) {
      console.log('✅ Chat interface found!');

      // Type a message about documents
      await chatInput.fill('how many personal documents do i have');

      // Find and click send button
      const sendButton = page
        .locator(
          'button[type="submit"], button:has-text("Send"), button:has-text("→")'
        )
        .first();
      await sendButton.click();

      // Wait for response
      await page.waitForTimeout(5000);

      // Capture screenshot of the interaction
      await page.screenshot({
        path: 'tests/chatbot-interaction.png',
        fullPage: true,
      });

      console.log('📸 Screenshot captured: tests/chatbot-interaction.png');
    } else {
      console.log('❌ Chat input not found, taking screenshot for debugging');
      await page.screenshot({
        path: 'tests/debug-no-chat-input.png',
        fullPage: true,
      });
    }
  });

  test('should test document analysis query', async ({ page }) => {
    console.log('🔍 Testing document analysis query...');

    // Open chat (similar to previous test)
    const chatButton = page
      .locator('button')
      .filter({ hasText: /chat|dorian/i })
      .first();

    if (!(await chatButton.isVisible())) {
      const altChatButton = page
        .locator(
          '[data-testid*="chat"], [class*="chat"], button[aria-label*="chat"]'
        )
        .first();
      if (await altChatButton.isVisible()) {
        await altChatButton.click();
      } else {
        await page.locator('button').last().click();
      }
    } else {
      await chatButton.click();
    }

    await page.waitForTimeout(2000);

    const chatInput = page
      .locator(
        'input[placeholder*="Ask"], input[placeholder*="message"], textarea[placeholder*="Ask"]'
      )
      .first();

    if (await chatInput.isVisible()) {
      // Test document analysis query
      await chatInput.fill('tell me about my last upload');

      const sendButton = page
        .locator(
          'button[type="submit"], button:has-text("Send"), button:has-text("→")'
        )
        .first();
      await sendButton.click();

      // Wait for response
      await page.waitForTimeout(8000);

      // Capture screenshot of the analysis response
      await page.screenshot({
        path: 'tests/document-analysis-response.png',
        fullPage: true,
      });

      console.log(
        '📸 Document analysis screenshot: tests/document-analysis-response.png'
      );

      // Check if response mentions document count or analysis
      const chatMessages = page.locator('[class*="message"], [class*="chat"]');
      const messageCount = await chatMessages.count();
      console.log(`💬 Found ${messageCount} chat messages`);
    }
  });

  test('should capture login state and document data', async ({ page }) => {
    console.log('👤 Checking login state and document data...');

    // Check if user is logged in
    const loginButton = page.locator(
      'button:has-text("Login"), a:has-text("Login")'
    );
    const isLoggedOut = await loginButton.isVisible();

    if (isLoggedOut) {
      console.log('❌ User is not logged in - this may affect document access');
      await page.screenshot({ path: 'tests/not-logged-in.png' });
    } else {
      console.log('✅ User appears to be logged in');
    }

    // Check for any document-related elements on the page
    const documentElements = page.locator(
      '[class*="document"], [data-testid*="document"]'
    );
    const docCount = await documentElements.count();
    console.log(`📄 Found ${docCount} document-related elements on page`);

    // Take a full page screenshot for analysis
    await page.screenshot({
      path: 'tests/full-page-state.png',
      fullPage: true,
    });
    console.log('📸 Full page screenshot: tests/full-page-state.png');
  });
});
