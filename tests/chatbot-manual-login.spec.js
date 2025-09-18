// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('DocVault Chatbot (Manual Login)', () => {
  test('should wait for manual login then test chatbot', async ({ page }) => {
    console.log('🌐 Opening DocVault - YOU CAN LOGIN MANUALLY NOW...');

    // Enable console logging to capture debug messages
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

    console.log('⏳ WAITING FOR YOU TO LOGIN MANUALLY...');
    console.log('👆 Please login in the Chromium browser that just opened');
    console.log('📄 Make sure you can see your 3 documents in the dashboard');
    console.log('⌛ I will wait up to 2 minutes for you to complete login...');

    // Wait for login to complete by checking for the disappearance of login elements
    try {
      // Wait for login button to disappear (meaning user logged in)
      await page.waitForSelector('button:has-text("Sign In")', {
        state: 'hidden',
        timeout: 120000,
      });
      console.log('✅ Login detected - Sign In button disappeared');
    } catch (error) {
      console.log('⏰ Timeout waiting for login - proceeding anyway...');
    }

    // Give additional time for the dashboard to load
    await page.waitForTimeout(3000);
    await page.waitForLoadState('networkidle');

    console.log('🔍 Analyzing logged-in state...');

    // Take screenshot of current state
    await page.screenshot({
      path: 'tests/after-manual-login.png',
      fullPage: true,
    });

    // Count elements in logged-in state
    const buttons = await page.locator('button').count();
    const links = await page.locator('a').count();
    const inputs = await page.locator('input').count();

    console.log(
      `🔍 Post-login elements: ${buttons} buttons, ${links} links, ${inputs} inputs`
    );

    // Look for chat button in logged-in state
    console.log('🔍 Looking for chat button in logged-in state...');

    // Analyze all buttons to find chat
    for (let i = 0; i < Math.min(buttons, 10); i++) {
      try {
        const btn = page.locator('button').nth(i);
        const text = await btn.textContent();
        const classes = await btn.getAttribute('class');
        const visible = await btn.isVisible();
        console.log(
          `  Button ${i}: "${text}" visible:${visible} classes:${classes?.substring(0, 50)}...`
        );
      } catch (e) {
        console.log(`  Button ${i}: Error reading`);
      }
    }

    // Look for chat button with multiple strategies
    const chatSelectors = [
      'button:has-text("Chat")',
      'button:has-text("Dorian")',
      'button[class*="chat"]',
      'button[aria-label*="chat"]',
      'button[class*="fixed"]', // floating buttons
      'button[class*="float"]',
      '[class*="fixed"] button', // button inside fixed container
      'div[class*="fixed"] button:last-child', // last button in fixed div
      'button:last-of-type', // often chat is the last button
    ];

    let chatButton = null;
    for (const selector of chatSelectors) {
      const elements = page.locator(selector);
      const count = await elements.count();
      if (count > 0) {
        const element = elements.first();
        if (await element.isVisible()) {
          chatButton = element;
          console.log(`✅ Found chat button with selector: ${selector}`);
          break;
        }
      }
    }

    if (!chatButton) {
      console.log(
        '🤔 No specific chat button found, trying last visible button...'
      );
      const allButtons = page.locator('button:visible');
      const visibleCount = await allButtons.count();
      if (visibleCount > 0) {
        chatButton = allButtons.last();
        console.log(
          `🎯 Using last visible button (${visibleCount} total visible)`
        );
      }
    }

    if (!chatButton) {
      console.log('❌ No chat button found at all');
      await page.screenshot({
        path: 'tests/no-chat-button-logged-in.png',
        fullPage: true,
      });
      return;
    }

    // Click the chat button
    console.log('🖱️ Clicking chat button...');
    await chatButton.click();
    await page.waitForTimeout(3000);

    // Screenshot after clicking chat
    await page.screenshot({
      path: 'tests/after-chat-click-manual.png',
      fullPage: true,
    });

    // Look for chat input/modal
    console.log('🔍 Looking for chat input...');

    const chatInputSelectors = [
      'input[placeholder*="Ask"]',
      'input[placeholder*="Dorian"]',
      'input[placeholder*="message"]',
      'textarea[placeholder*="Ask"]',
      'input[class*="chat"]',
      'textarea[class*="chat"]',
      'input[type="text"]:visible',
      'textarea:visible',
    ];

    let chatInput = null;
    for (const selector of chatInputSelectors) {
      const element = page.locator(selector).first();
      if (await element.isVisible()) {
        chatInput = element;
        console.log(`✅ Found chat input: ${selector}`);
        break;
      }
    }

    if (!chatInput) {
      console.log('❌ Chat input not found');
      // List all visible inputs for debugging
      const allInputs = page.locator('input:visible, textarea:visible');
      const inputCount = await allInputs.count();
      console.log(`🔍 Found ${inputCount} visible inputs/textareas:`);

      for (let i = 0; i < Math.min(inputCount, 5); i++) {
        try {
          const input = allInputs.nth(i);
          const placeholder = await input.getAttribute('placeholder');
          const type = await input.getAttribute('type');
          console.log(
            `  Input ${i}: type="${type}" placeholder="${placeholder}"`
          );
        } catch (e) {
          console.log(`  Input ${i}: Error reading`);
        }
      }

      await page.screenshot({
        path: 'tests/no-chat-input-manual.png',
        fullPage: true,
      });
      return;
    }

    // TEST THE CHATBOT!
    console.log('🤖 TESTING CHATBOT NOW...');

    // Test 1: Document count
    console.log('📊 Test 1: Asking about document count...');
    await chatInput.fill('how many documents do i have');

    // Send the message
    const sendButton = page
      .locator(
        'button[type="submit"], button:has-text("Send"), button[aria-label*="send"]'
      )
      .first();
    if (await sendButton.isVisible()) {
      await sendButton.click();
    } else {
      await chatInput.press('Enter');
    }

    console.log('✅ Sent: "how many documents do i have"');
    await page.waitForTimeout(6000); // Wait for response

    await page.screenshot({
      path: 'tests/test1-document-count.png',
      fullPage: true,
    });

    // Test 2: Last upload analysis
    console.log('🔍 Test 2: Asking about last upload...');
    await chatInput.fill('tell me about my last upload');

    if (await sendButton.isVisible()) {
      await sendButton.click();
    } else {
      await chatInput.press('Enter');
    }

    console.log('✅ Sent: "tell me about my last upload"');
    await page.waitForTimeout(8000); // Wait for AI analysis

    await page.screenshot({
      path: 'tests/test2-last-upload.png',
      fullPage: true,
    });

    // Test 3: Document analysis
    console.log('🧠 Test 3: Asking for document analysis...');
    await chatInput.fill('analyze my uploaded documents and report');

    if (await sendButton.isVisible()) {
      await sendButton.click();
    } else {
      await chatInput.press('Enter');
    }

    console.log('✅ Sent: "analyze my uploaded documents and report"');
    await page.waitForTimeout(10000); // Wait for comprehensive analysis

    await page.screenshot({
      path: 'tests/test3-document-analysis.png',
      fullPage: true,
    });

    console.log('🎉 ALL CHATBOT TESTS COMPLETED!');
    console.log('📸 Check the screenshots in tests/ folder:');
    console.log('   - test1-document-count.png');
    console.log('   - test2-last-upload.png');
    console.log('   - test3-document-analysis.png');
    console.log(
      '🔍 Check console above for any debug messages from the chatbot!'
    );

    // Keep browser open for a few seconds so you can see the final state
    await page.waitForTimeout(5000);
  });
});
