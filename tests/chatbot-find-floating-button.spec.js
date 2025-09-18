// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('DocVault Chatbot (Find Floating Button)', () => {
  test('should find the floating chat button and test chatbot', async ({
    page,
  }) => {
    console.log('🌐 Opening DocVault to find floating chat button...');

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
    await page.waitForLoadState('networkidle');

    console.log('⏳ Please login manually in the browser...');

    // Wait for dashboard
    try {
      await page.waitForSelector('text=Dashboard', { timeout: 180000 });
      console.log('✅ Dashboard loaded');
    } catch (error) {
      console.log('⚠️ Dashboard text not found, but continuing...');
    }

    await page.waitForTimeout(3000);
    await page.screenshot({
      path: 'tests/before-floating-search.png',
      fullPage: true,
    });

    console.log('🔍 Searching specifically for floating chat button...');

    // Look for the exact floating chat button from Layout.tsx
    const floatingChatSelectors = [
      'button[class*="fixed"][class*="bottom-6"][class*="right-6"]',
      'button[class*="fixed bottom-6 right-6"]',
      'button.fixed.bottom-6.right-6',
      '[class*="fixed"][class*="bottom"][class*="right"] button',
      'button[class*="rounded-full"][class*="fixed"]',
      'button[title*="Chat with Dorian"]',
      'button[title*="AI Assistant"]',
    ];

    let floatingChatButton = null;
    for (const selector of floatingChatSelectors) {
      const elements = page.locator(selector);
      const count = await elements.count();

      console.log(`🔍 Selector "${selector}": found ${count} elements`);

      if (count > 0) {
        for (let i = 0; i < count; i++) {
          const element = elements.nth(i);
          const visible = await element.isVisible();
          const enabled = await element.isEnabled();

          if (visible && enabled) {
            floatingChatButton = element;
            console.log(
              `✅ Found floating chat button with: ${selector} (element ${i})`
            );
            break;
          } else {
            console.log(
              `  Element ${i}: visible:${visible} enabled:${enabled}`
            );
          }
        }
        if (floatingChatButton) break;
      }
    }

    // If still not found, look for ANY button in bottom-right area
    if (!floatingChatButton) {
      console.log('🔍 Looking for any button in bottom-right area...');

      // Get all buttons and check their position
      const allButtons = page.locator('button');
      const buttonCount = await allButtons.count();

      for (let i = 0; i < buttonCount; i++) {
        const button = allButtons.nth(i);
        const visible = await button.isVisible();

        if (visible) {
          // Get button position
          const box = await button.boundingBox();
          if (box) {
            const viewport = page.viewportSize() || {
              width: 1280,
              height: 720,
            };
            const isBottomRight =
              box.x > viewport.width * 0.7 && box.y > viewport.height * 0.7;

            if (isBottomRight) {
              const classes = await button.getAttribute('class');
              const title = await button.getAttribute('title');
              console.log(
                `🎯 Bottom-right button ${i}: classes="${classes}" title="${title}"`
              );

              if (!floatingChatButton) {
                floatingChatButton = button;
                console.log(`✅ Using bottom-right button ${i} as chat button`);
              }
            }
          }
        }
      }
    }

    // If STILL not found, check if user is logged in
    if (!floatingChatButton) {
      console.log('❌ Floating chat button not found');
      console.log('🔍 Checking if user is logged in...');

      const loginButton = await page
        .locator('button:has-text("Sign In")')
        .count();
      const currentUrl = page.url();

      console.log(`🔍 Login buttons found: ${loginButton}`);
      console.log(`🔍 Current URL: ${currentUrl}`);

      if (loginButton > 0 || currentUrl.includes('login')) {
        console.log(
          '❌ User is not logged in! The chat button only appears for logged-in users.'
        );
        console.log('🔄 Please complete login and run the test again.');
        return;
      }

      console.log('🤔 User appears logged in but chat button not found');
      console.log('📸 Taking screenshot for debugging...');
      await page.screenshot({
        path: 'tests/chat-button-not-found.png',
        fullPage: true,
      });

      // Try scrolling to bottom-right to see if it's hidden
      await page.evaluate(() => {
        window.scrollTo(document.body.scrollWidth, document.body.scrollHeight);
      });

      await page.waitForTimeout(1000);
      await page.screenshot({
        path: 'tests/after-scroll-bottom-right.png',
        fullPage: true,
      });

      return;
    }

    // Found the chat button! Now test it
    console.log('🖱️ Clicking the floating chat button...');

    // Scroll to make sure button is in view
    await floatingChatButton.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);

    // Take screenshot before clicking
    await page.screenshot({
      path: 'tests/before-chat-click.png',
      fullPage: true,
    });

    // Click the chat button
    await floatingChatButton.click();
    console.log('✅ Chat button clicked!');

    // Wait for chat modal to appear
    await page.waitForTimeout(3000);
    await page.screenshot({
      path: 'tests/after-floating-chat-click.png',
      fullPage: true,
    });

    // Look for chat input in the modal
    console.log('🔍 Looking for chat input in modal...');

    const chatInputSelectors = [
      'input[placeholder*="Ask Dorian"]',
      'input[placeholder*="Ask"]',
      'input[placeholder*="message"]',
      'textarea[placeholder*="Ask"]',
      'input[class*="chat"]',
      'textarea[class*="chat"]',
    ];

    let chatInput = null;
    for (const selector of chatInputSelectors) {
      const element = page.locator(selector);
      if (await element.isVisible()) {
        chatInput = element;
        console.log(`✅ Found chat input: ${selector}`);
        break;
      }
    }

    if (!chatInput) {
      console.log('❌ Chat input not found in modal');

      // Look for any visible input after clicking chat
      const allInputs = page.locator('input:visible, textarea:visible');
      const inputCount = await allInputs.count();
      console.log(`🔍 Found ${inputCount} visible inputs after chat click`);

      if (inputCount > 0) {
        chatInput = allInputs.last(); // Try the last input
        console.log('🤔 Using last visible input as chat input');
      } else {
        await page.screenshot({
          path: 'tests/no-chat-input-in-modal.png',
          fullPage: true,
        });
        return;
      }
    }

    // NOW TEST THE CHATBOT!
    console.log('🤖 TESTING CHATBOT WITH FLOATING BUTTON...');

    // Test 1: Document count
    console.log('📊 Test 1: How many documents do I have?');
    await chatInput.fill('how many documents do i have');
    await chatInput.press('Enter');

    console.log('✅ Sent: "how many documents do i have"');
    await page.waitForTimeout(6000);
    await page.screenshot({
      path: 'tests/floating-test1-doc-count.png',
      fullPage: true,
    });

    // Test 2: Last upload analysis
    console.log('🔍 Test 2: Tell me about my last upload');
    await chatInput.fill('tell me about my last upload');
    await chatInput.press('Enter');

    console.log('✅ Sent: "tell me about my last upload"');
    await page.waitForTimeout(8000);
    await page.screenshot({
      path: 'tests/floating-test2-last-upload.png',
      fullPage: true,
    });

    // Test 3: Document analysis
    console.log('🧠 Test 3: Analyze my documents');
    await chatInput.fill('analyze my uploaded documents and report');
    await chatInput.press('Enter');

    console.log('✅ Sent: "analyze my uploaded documents and report"');
    await page.waitForTimeout(10000);
    await page.screenshot({
      path: 'tests/floating-test3-analysis.png',
      fullPage: true,
    });

    console.log('🎉 FLOATING CHAT BUTTON TESTS COMPLETED!');
    console.log('📸 Check these screenshots:');
    console.log('   - floating-test1-doc-count.png');
    console.log('   - floating-test2-last-upload.png');
    console.log('   - floating-test3-analysis.png');
    console.log('🔍 Look for debug messages in console output above!');

    // Keep browser open to see results
    await page.waitForTimeout(10000);
  });
});
