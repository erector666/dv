// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('DocVault Chatbot (Assuming Logged In)', () => {
  test.beforeEach(async ({ page }) => {
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
  });

  test('should test chatbot with existing session', async ({ page }) => {
    console.log('🤖 Testing chatbot (assuming user is logged in)...');

    // Navigate to the application
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Give time for data to load

    // Take initial screenshot
    await page.screenshot({ path: 'tests/initial-state.png', fullPage: true });

    // Look for chat button with comprehensive selectors
    console.log('🔍 Looking for chat button...');

    const chatSelectors = [
      'button:has-text("Chat")',
      'button:has-text("Dorian")',
      'button[class*="chat"]',
      'button[data-testid*="chat"]',
      '[class*="fixed"] button', // floating buttons
      '[class*="float"] button',
      'button[aria-label*="chat"]',
      'button[title*="chat"]',
      // Look for any button in bottom right (common chat position)
      'div[class*="fixed bottom"] button',
      'div[class*="fixed right"] button',
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

    if (!chatButton) {
      console.log('❌ Chat button not found with any selector');
      // Try clicking any button that might be chat-related
      const allButtons = page.locator('button');
      const buttonCount = await allButtons.count();
      console.log(`🔍 Found ${buttonCount} total buttons on page`);

      // Screenshot all buttons for debugging
      await page.screenshot({
        path: 'tests/all-buttons-debug.png',
        fullPage: true,
      });
      return;
    }

    // Click the chat button
    await chatButton.click();
    console.log('✅ Chat button clicked');
    await page.waitForTimeout(2000);

    // Look for chat modal/interface
    const chatModal = page
      .locator('[class*="modal"], [class*="dialog"], [class*="chat"]')
      .first();
    await page.screenshot({
      path: 'tests/after-chat-click.png',
      fullPage: true,
    });

    // Look for chat input
    const chatInputSelectors = [
      'input[placeholder*="Ask"]',
      'input[placeholder*="Dorian"]',
      'input[placeholder*="message"]',
      'textarea[placeholder*="Ask"]',
      'input[class*="chat"]',
      'textarea[class*="chat"]',
      'input[type="text"]', // fallback
    ];

    let chatInput = null;
    for (const selector of chatInputSelectors) {
      const element = page.locator(selector).first();
      if (await element.isVisible()) {
        chatInput = element;
        console.log(`✅ Found chat input with selector: ${selector}`);
        break;
      }
    }

    if (!chatInput) {
      console.log('❌ Chat input not found');
      await page.screenshot({
        path: 'tests/no-chat-input.png',
        fullPage: true,
      });
      return;
    }

    // Test 1: Ask about document count
    console.log('📊 Testing document count query...');
    await chatInput.fill('how many documents do i have');

    // Find send button
    const sendButton = page
      .locator(
        'button[type="submit"], button:has-text("Send"), button[class*="send"]'
      )
      .first();
    if (await sendButton.isVisible()) {
      await sendButton.click();
      console.log('✅ Document count query sent');
    } else {
      // Try pressing Enter
      await chatInput.press('Enter');
      console.log('✅ Used Enter to send message');
    }

    // Wait for response and capture
    await page.waitForTimeout(5000);
    await page.screenshot({
      path: 'tests/document-count-response.png',
      fullPage: true,
    });

    // Test 2: Ask about last upload
    console.log('🔍 Testing last upload query...');
    await chatInput.fill('tell me about my last upload');

    if (await sendButton.isVisible()) {
      await sendButton.click();
    } else {
      await chatInput.press('Enter');
    }

    // Wait for AI response
    await page.waitForTimeout(8000);
    await page.screenshot({
      path: 'tests/last-upload-response.png',
      fullPage: true,
    });

    // Test 3: Generic document analysis
    console.log('🧠 Testing document analysis query...');
    await chatInput.fill('analyze my uploaded documents');

    if (await sendButton.isVisible()) {
      await sendButton.click();
    } else {
      await chatInput.press('Enter');
    }

    // Wait for analysis response
    await page.waitForTimeout(10000);
    await page.screenshot({
      path: 'tests/document-analysis-final.png',
      fullPage: true,
    });

    console.log('✅ All chatbot tests completed!');
    console.log('📸 Check the screenshots in tests/ folder for results');
  });
});
