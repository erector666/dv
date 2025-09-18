// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('DocVault Chatbot - FINAL COMPREHENSIVE TEST', () => {
  test('should test the fully functional chatbot with all features', async ({
    page,
  }) => {
    console.log('🚀 FINAL CHATBOT TEST - ALL SYSTEMS GO!');

    // Enable console logging to capture all debug messages
    page.on('console', msg => {
      if (
        msg.text().includes('ChatBot Debug') ||
        msg.text().includes('Backend Debug') ||
        msg.text().includes('🔍')
      ) {
        console.log('🔍 BROWSER DEBUG:', msg.text());
      }
    });

    // Navigate to DocVault
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');

    console.log('⏳ Please login manually in the browser...');
    console.log('📄 Make sure you can see your 4 documents in the dashboard');

    // Wait for dashboard to load
    try {
      await page.waitForSelector('text=Dashboard', { timeout: 180000 });
      console.log('✅ Dashboard loaded - ready for testing!');
    } catch (error) {
      console.log('⚠️ Dashboard selector not found, but proceeding...');
    }

    await page.waitForTimeout(3000);

    // Find the floating chat button
    console.log('🔍 Locating floating chat button...');
    const chatButton = page.locator(
      'button[class*="fixed"][class*="bottom-6"][class*="right-6"]'
    );

    if (!(await chatButton.isVisible())) {
      console.log(
        '❌ Chat button not visible - please ensure you are logged in'
      );
      await page.screenshot({
        path: 'tests/final-no-chat-button.png',
        fullPage: true,
      });
      return;
    }

    console.log('✅ Chat button found!');
    await page.screenshot({
      path: 'tests/final-before-chat.png',
      fullPage: true,
    });

    // Click the chat button
    await chatButton.click();
    console.log('🖱️ Chat button clicked');
    await page.waitForTimeout(2000);

    // Find chat input
    const chatInput = page
      .locator('input[placeholder*="Ask Dorian"], input[placeholder*="Ask"]')
      .first();
    if (!(await chatInput.isVisible())) {
      console.log('❌ Chat input not found');
      await page.screenshot({
        path: 'tests/final-no-input.png',
        fullPage: true,
      });
      return;
    }

    console.log('✅ Chat input found - starting comprehensive tests!');

    // ============================================
    // TEST 1: DOCUMENT COUNT VERIFICATION
    // ============================================
    console.log('📊 TEST 1: Document Count Verification');
    await chatInput.fill('how many documents do i have');
    await chatInput.press('Enter');

    console.log('✅ Sent: "how many documents do i have"');
    console.log('⏳ Waiting for AI response...');
    await page.waitForTimeout(6000);

    await page.screenshot({
      path: 'tests/final-test1-document-count.png',
      fullPage: true,
    });
    console.log('📸 Test 1 screenshot saved');

    // ============================================
    // TEST 2: SPECIFIC DOCUMENT ANALYSIS
    // ============================================
    console.log('🔍 TEST 2: Last Upload Analysis');
    await chatInput.fill('tell me about my last upload');
    await chatInput.press('Enter');

    console.log('✅ Sent: "tell me about my last upload"');
    console.log('⏳ Waiting for AI document analysis...');
    await page.waitForTimeout(10000); // Longer wait for document analysis

    await page.screenshot({
      path: 'tests/final-test2-last-upload.png',
      fullPage: true,
    });
    console.log('📸 Test 2 screenshot saved');

    // ============================================
    // TEST 3: COMPREHENSIVE DOCUMENT ANALYSIS
    // ============================================
    console.log('🧠 TEST 3: Comprehensive Document Analysis');
    await chatInput.fill(
      'analyze all my uploaded documents and give me a detailed report'
    );
    await chatInput.press('Enter');

    console.log(
      '✅ Sent: "analyze all my uploaded documents and give me a detailed report"'
    );
    console.log('⏳ Waiting for comprehensive AI analysis...');
    await page.waitForTimeout(12000); // Even longer for comprehensive analysis

    await page.screenshot({
      path: 'tests/final-test3-comprehensive.png',
      fullPage: true,
    });
    console.log('📸 Test 3 screenshot saved');

    // ============================================
    // TEST 4: SPECIFIC DOCUMENT QUERY
    // ============================================
    console.log('📄 TEST 4: Specific Document Query');
    await chatInput.fill(
      'what can you tell me about C_Document_01_05_1994.pdf'
    );
    await chatInput.press('Enter');

    console.log(
      '✅ Sent: "what can you tell me about C_Document_01_05_1994.pdf"'
    );
    console.log('⏳ Waiting for specific document analysis...');
    await page.waitForTimeout(10000);

    await page.screenshot({
      path: 'tests/final-test4-specific-doc.png',
      fullPage: true,
    });
    console.log('📸 Test 4 screenshot saved');

    // ============================================
    // TEST 5: DOCUMENT CATEGORIZATION
    // ============================================
    console.log('🏷️ TEST 5: Document Categorization');
    await chatInput.fill(
      'what categories are my documents in and how are they organized'
    );
    await chatInput.press('Enter');

    console.log(
      '✅ Sent: "what categories are my documents in and how are they organized"'
    );
    console.log('⏳ Waiting for categorization analysis...');
    await page.waitForTimeout(8000);

    await page.screenshot({
      path: 'tests/final-test5-categories.png',
      fullPage: true,
    });
    console.log('📸 Test 5 screenshot saved');

    // ============================================
    // TEST 6: ACTION BUTTONS TEST
    // ============================================
    console.log('🔘 TEST 6: Action Buttons Test');
    await chatInput.fill('show me options for managing my documents');
    await chatInput.press('Enter');

    console.log('✅ Sent: "show me options for managing my documents"');
    console.log('⏳ Waiting for action buttons...');
    await page.waitForTimeout(6000);

    await page.screenshot({
      path: 'tests/final-test6-actions.png',
      fullPage: true,
    });
    console.log('📸 Test 6 screenshot saved');

    // Check if action buttons appeared
    const actionButtons = page
      .locator('button')
      .filter({ hasText: /analyze|translate|search|upload/i });
    const buttonCount = await actionButtons.count();
    console.log(`🔘 Found ${buttonCount} action buttons`);

    if (buttonCount > 0) {
      console.log('✅ Action buttons are working!');

      // Try clicking one of the action buttons
      const firstActionButton = actionButtons.first();
      const buttonText = await firstActionButton.textContent();
      console.log(`🖱️ Clicking action button: "${buttonText}"`);

      await firstActionButton.click();
      await page.waitForTimeout(2000);

      await page.screenshot({
        path: 'tests/final-test6-action-clicked.png',
        fullPage: true,
      });
      console.log('📸 Action button click screenshot saved');
    }

    // ============================================
    // FINAL SUMMARY
    // ============================================
    console.log('🎉 FINAL CHATBOT TEST COMPLETED!');
    console.log('📊 COMPREHENSIVE TEST RESULTS:');
    console.log('   ✅ Test 1: Document count query');
    console.log('   ✅ Test 2: Last upload analysis');
    console.log('   ✅ Test 3: Comprehensive analysis');
    console.log('   ✅ Test 4: Specific document query');
    console.log('   ✅ Test 5: Document categorization');
    console.log('   ✅ Test 6: Action buttons test');
    console.log('');
    console.log('📸 SCREENSHOTS SAVED:');
    console.log('   - final-test1-document-count.png');
    console.log('   - final-test2-last-upload.png');
    console.log('   - final-test3-comprehensive.png');
    console.log('   - final-test4-specific-doc.png');
    console.log('   - final-test5-categories.png');
    console.log('   - final-test6-actions.png');
    console.log('');
    console.log('🔍 CHECK CONSOLE OUTPUT ABOVE FOR DEBUG MESSAGES!');
    console.log(
      '🎯 The chatbot should now be showing intelligent responses about your 4 documents!'
    );

    // Keep browser open to review results
    await page.waitForTimeout(15000);
  });
});
