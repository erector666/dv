// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('DocVault Chatbot with Authentication', () => {
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
  });

  test('should login and test chatbot with documents', async ({ page }) => {
    console.log('🔐 Starting login process...');

    // Navigate to the application
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check if already logged in
    const loginButton = page.locator(
      'button:has-text("Login"), a:has-text("Login"), a[href*="login"]'
    );
    const isLoggedOut = await loginButton.isVisible();

    if (isLoggedOut) {
      console.log('❌ Not logged in, attempting to login...');

      // Click login button/link
      await loginButton.click();
      await page.waitForLoadState('networkidle');

      // Fill login form (assuming email/password login)
      const emailInput = page.locator(
        'input[type="email"], input[placeholder*="email" i]'
      );
      const passwordInput = page.locator(
        'input[type="password"], input[placeholder*="password" i]'
      );

      if (await emailInput.isVisible()) {
        // Use a test email - you may need to provide real credentials
        await emailInput.fill('test@example.com'); // Replace with real test email
        await passwordInput.fill('testpassword123'); // Replace with real test password

        // Click login submit button
        const submitButton = page.locator(
          'button[type="submit"], button:has-text("Sign in"), button:has-text("Login")'
        );
        await submitButton.click();

        // Wait for login to complete
        await page.waitForTimeout(3000);
        await page.waitForLoadState('networkidle');

        console.log('✅ Login attempted');
      } else {
        console.log('❌ Login form not found');
        await page.screenshot({ path: 'tests/login-form-not-found.png' });
        return;
      }
    } else {
      console.log('✅ Already logged in');
    }

    // Take screenshot after login
    await page.screenshot({ path: 'tests/after-login.png', fullPage: true });

    // Wait a bit for any data to load
    await page.waitForTimeout(2000);

    // Now test the chatbot
    console.log('🤖 Testing chatbot after login...');

    // Look for chat button - try multiple selectors
    let chatOpened = false;

    // Method 1: Look for specific chat button text
    const chatButtonText = page
      .locator('button')
      .filter({ hasText: /chat|dorian|message/i });
    if (await chatButtonText.first().isVisible()) {
      await chatButtonText.first().click();
      chatOpened = true;
      console.log('✅ Opened chat via text button');
    }

    // Method 2: Look for floating action button (common pattern)
    if (!chatOpened) {
      const floatingButton = page
        .locator('button[class*="fixed"], button[class*="float"]')
        .last();
      if (await floatingButton.isVisible()) {
        await floatingButton.click();
        chatOpened = true;
        console.log('✅ Opened chat via floating button');
      }
    }

    // Method 3: Look for chat icon
    if (!chatOpened) {
      const chatIcon = page.locator(
        'svg[class*="chat"], [data-testid*="chat"], button[aria-label*="chat"]'
      );
      if (await chatIcon.first().isVisible()) {
        await chatIcon.first().click();
        chatOpened = true;
        console.log('✅ Opened chat via icon');
      }
    }

    if (!chatOpened) {
      console.log('❌ Could not find chat button');
      await page.screenshot({
        path: 'tests/no-chat-button.png',
        fullPage: true,
      });
      return;
    }

    // Wait for chat modal to appear
    await page.waitForTimeout(2000);

    // Look for chat input with multiple selectors
    const chatInput = page
      .locator(
        `
      input[placeholder*="Ask" i], 
      input[placeholder*="message" i], 
      input[placeholder*="dorian" i],
      textarea[placeholder*="Ask" i], 
      textarea[placeholder*="message" i],
      input[class*="chat"],
      textarea[class*="chat"]
    `
      )
      .first();

    if (await chatInput.isVisible()) {
      console.log('✅ Chat input found!');

      // Test document count query
      console.log('📊 Testing document count query...');
      await chatInput.fill('how many personal documents do i have');

      // Find send button
      const sendButton = page
        .locator(
          `
        button[type="submit"], 
        button:has-text("Send"), 
        button:has-text("→"),
        button[aria-label*="send" i],
        button[class*="send"]
      `
        )
        .first();

      if (await sendButton.isVisible()) {
        await sendButton.click();
        console.log('✅ Document count query sent');

        // Wait for response
        await page.waitForTimeout(5000);

        // Capture response
        await page.screenshot({
          path: 'tests/document-count-response.png',
          fullPage: true,
        });

        // Test document analysis query
        console.log('🔍 Testing document analysis query...');
        await chatInput.fill('tell me about my last upload');
        await sendButton.click();

        // Wait for analysis response
        await page.waitForTimeout(8000);

        // Capture analysis response
        await page.screenshot({
          path: 'tests/document-analysis-response.png',
          fullPage: true,
        });

        console.log('✅ Chatbot testing completed!');
      } else {
        console.log('❌ Send button not found');
        await page.screenshot({ path: 'tests/no-send-button.png' });
      }
    } else {
      console.log('❌ Chat input not found');
      await page.screenshot({
        path: 'tests/no-chat-input-after-login.png',
        fullPage: true,
      });
    }
  });

  test('should check for documents in dashboard', async ({ page }) => {
    console.log('📄 Checking for documents in dashboard...');

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Navigate to dashboard if not already there
    const dashboardLink = page.locator(
      'a[href*="dashboard"], button:has-text("Dashboard")'
    );
    if (await dashboardLink.isVisible()) {
      await dashboardLink.click();
      await page.waitForLoadState('networkidle');
    }

    // Look for document elements
    const documentCards = page.locator(
      '[class*="document"], [data-testid*="document"], .card'
    );
    const docCount = await documentCards.count();

    console.log(`📊 Found ${docCount} potential document elements`);

    // Take screenshot of dashboard
    await page.screenshot({
      path: 'tests/dashboard-documents.png',
      fullPage: true,
    });

    if (docCount === 0) {
      console.log(
        '⚠️ No documents found - this explains why chatbot says 0 documents'
      );
    } else {
      console.log('✅ Documents found on dashboard');
    }
  });
});
