// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('DocVault Chatbot (Real Manual Login)', () => {
  test('should properly wait for manual login then test chatbot', async ({
    page,
  }) => {
    console.log('🌐 Opening DocVault - LOGIN MANUALLY NOW...');

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
    console.log(
      '📄 After login, navigate to dashboard and make sure you see your documents'
    );
    console.log('⌛ I will wait for you to reach the dashboard...');

    // Wait for dashboard elements to appear (indicating successful login)
    try {
      // Wait for dashboard-specific elements that only appear after login
      await page.waitForSelector('text=Dashboard', { timeout: 180000 }); // 3 minutes
      console.log('✅ Dashboard detected!');
    } catch (error) {
      try {
        // Alternative: wait for any navigation away from login page
        await page.waitForURL(
          url => !url.includes('login') && !url.includes('register'),
          { timeout: 180000 }
        );
        console.log('✅ Navigated away from login page!');
      } catch (error2) {
        try {
          // Alternative: wait for document-related elements
          await page.waitForSelector(
            '[class*="document"], [data-testid*="document"], text=Upload',
            { timeout: 180000 }
          );
          console.log('✅ Document interface detected!');
        } catch (error3) {
          console.log('⏰ Timeout waiting for login completion');
          console.log('🔍 Current URL:', page.url());

          // Take screenshot of current state
          await page.screenshot({
            path: 'tests/timeout-state.png',
            fullPage: true,
          });

          console.log('📸 Screenshot saved as timeout-state.png');
          console.log('🤔 Proceeding anyway to see what we can find...');
        }
      }
    }

    // Give extra time for everything to load after login
    await page.waitForTimeout(5000);
    await page.waitForLoadState('networkidle');

    console.log('🔍 Analyzing post-login state...');
    console.log('🌐 Current URL:', page.url());

    // Take screenshot of logged-in state
    await page.screenshot({
      path: 'tests/real-manual-login-state.png',
      fullPage: true,
    });

    // Count elements
    const buttons = await page.locator('button').count();
    const links = await page.locator('a').count();
    const inputs = await page.locator('input').count();

    console.log(
      `🔍 Elements found: ${buttons} buttons, ${links} links, ${inputs} inputs`
    );

    // Check if we're still on login page
    const currentUrl = page.url();
    const isLoginPage =
      currentUrl.includes('login') || currentUrl.includes('register');
    const hasLoginButton =
      (await page.locator('button:has-text("Sign In")').count()) > 0;

    if (isLoginPage || hasLoginButton) {
      console.log('❌ Still on login page! Login was not completed.');
      console.log('🔄 Please complete the login and run the test again.');
      return;
    }

    console.log('✅ Login appears successful - no longer on login page');

    // Look for chat button in the logged-in interface
    console.log('🔍 Searching for chat button...');

    // Comprehensive button analysis
    for (let i = 0; i < Math.min(buttons, 15); i++) {
      try {
        const btn = page.locator('button').nth(i);
        const text = await btn.textContent();
        const classes = await btn.getAttribute('class');
        const visible = await btn.isVisible();
        const enabled = await btn.isEnabled();
        console.log(
          `  Button ${i}: "${text?.trim()}" visible:${visible} enabled:${enabled}`
        );
        console.log(`    Classes: ${classes?.substring(0, 80)}...`);
      } catch (e) {
        console.log(`  Button ${i}: Error reading - ${e.message}`);
      }
    }

    // Look for floating/fixed buttons that might be chat
    const floatingButtons = page.locator(
      '[class*="fixed"] button, [class*="float"] button, [class*="absolute"] button'
    );
    const floatingCount = await floatingButtons.count();
    console.log(`🔍 Found ${floatingCount} floating/fixed/absolute buttons`);

    // Try multiple chat button strategies
    const chatStrategies = [
      { name: 'Text "Chat"', selector: 'button:has-text("Chat")' },
      { name: 'Text "Dorian"', selector: 'button:has-text("Dorian")' },
      { name: 'Chat class', selector: 'button[class*="chat"]' },
      { name: 'Chat aria-label', selector: 'button[aria-label*="chat"]' },
      { name: 'Fixed button', selector: '[class*="fixed"] button' },
      { name: 'Floating button', selector: '[class*="float"] button' },
      { name: 'Last button', selector: 'button:last-of-type' },
      {
        name: 'Bottom-right button',
        selector: '[class*="bottom"] button, [class*="right"] button',
      },
    ];

    let chatButton = null;
    for (const strategy of chatStrategies) {
      const elements = page.locator(strategy.selector);
      const count = await elements.count();

      if (count > 0) {
        const element = elements.first();
        if (await element.isVisible()) {
          chatButton = element;
          console.log(`✅ Found chat button using: ${strategy.name}`);
          break;
        } else {
          console.log(
            `🔍 Found ${count} elements for "${strategy.name}" but not visible`
          );
        }
      }
    }

    if (!chatButton) {
      console.log('❌ No chat button found with any strategy');
      console.log(
        '💡 The chat button might not exist yet, or might be in a different location'
      );

      // Take a screenshot for manual inspection
      await page.screenshot({
        path: 'tests/no-chat-button-found.png',
        fullPage: true,
      });
      console.log('📸 Screenshot saved for manual inspection');

      // Wait a bit longer in case chat button loads asynchronously
      console.log('⏳ Waiting 10 more seconds for chat button to appear...');
      await page.waitForTimeout(10000);

      // Try again
      const retryButton = page
        .locator(
          'button[class*="chat"], button:has-text("Chat"), button:has-text("Dorian")'
        )
        .first();
      if (await retryButton.isVisible()) {
        chatButton = retryButton;
        console.log('✅ Chat button appeared after waiting!');
      } else {
        console.log('❌ Chat button still not found after waiting');
        return;
      }
    }

    // Click the chat button
    console.log('🖱️ Clicking chat button...');
    await chatButton.click();
    await page.waitForTimeout(3000);

    await page.screenshot({
      path: 'tests/after-real-chat-click.png',
      fullPage: true,
    });

    // Look for chat interface
    console.log('🔍 Looking for chat input interface...');

    const chatInputs = page.locator('input, textarea');
    const inputCount = await chatInputs.count();
    console.log(`🔍 Total inputs/textareas after chat click: ${inputCount}`);

    // Analyze all inputs to find chat input
    let chatInput = null;
    for (let i = 0; i < inputCount; i++) {
      try {
        const input = chatInputs.nth(i);
        const placeholder = await input.getAttribute('placeholder');
        const type = await input.getAttribute('type');
        const visible = await input.isVisible();
        const classes = await input.getAttribute('class');

        console.log(
          `  Input ${i}: type="${type}" placeholder="${placeholder}" visible:${visible}`
        );
        console.log(`    Classes: ${classes?.substring(0, 60)}...`);

        // Check if this looks like a chat input
        if (
          visible &&
          placeholder &&
          (placeholder.toLowerCase().includes('ask') ||
            placeholder.toLowerCase().includes('message') ||
            placeholder.toLowerCase().includes('chat') ||
            placeholder.toLowerCase().includes('dorian'))
        ) {
          chatInput = input;
          console.log(`✅ Found chat input: Input ${i}`);
          break;
        }
      } catch (e) {
        console.log(`  Input ${i}: Error reading`);
      }
    }

    if (!chatInput) {
      console.log('❌ No chat input found');
      await page.screenshot({
        path: 'tests/no-chat-input-found.png',
        fullPage: true,
      });
      return;
    }

    // NOW TEST THE CHATBOT!
    console.log('🤖 STARTING CHATBOT TESTS...');

    // Test 1: Document count
    console.log('📊 Test 1: How many documents do I have?');
    await chatInput.fill('how many documents do i have');
    await chatInput.press('Enter');

    console.log('✅ Sent document count query');
    await page.waitForTimeout(6000);
    await page.screenshot({
      path: 'tests/real-test1-doc-count.png',
      fullPage: true,
    });

    // Test 2: Last upload
    console.log('🔍 Test 2: Tell me about my last upload');
    await chatInput.fill('tell me about my last upload');
    await chatInput.press('Enter');

    console.log('✅ Sent last upload query');
    await page.waitForTimeout(8000);
    await page.screenshot({
      path: 'tests/real-test2-last-upload.png',
      fullPage: true,
    });

    // Test 3: Document analysis
    console.log('🧠 Test 3: Analyze my documents');
    await chatInput.fill('analyze my uploaded documents and report');
    await chatInput.press('Enter');

    console.log('✅ Sent analysis query');
    await page.waitForTimeout(10000);
    await page.screenshot({
      path: 'tests/real-test3-analysis.png',
      fullPage: true,
    });

    console.log('🎉 ALL CHATBOT TESTS COMPLETED!');
    console.log('📸 Check these screenshots:');
    console.log('   - real-test1-doc-count.png');
    console.log('   - real-test2-last-upload.png');
    console.log('   - real-test3-analysis.png');
    console.log('🔍 Check console output above for debug messages!');

    // Keep browser open so you can see the results
    await page.waitForTimeout(10000);
  });
});
