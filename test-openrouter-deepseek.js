#!/usr/bin/env node

/**
 * 🚀 TEST OPENROUTER DEEPSEEK INTEGRATION
 * Tests if DeepSeek service now works with OpenRouter
 */

console.log('🚀 TESTING OPENROUTER DEEPSEEK INTEGRATION...\n');

async function testOpenRouterDeepSeek() {
  console.log('🔍 Testing OpenRouter DeepSeek integration...');

  try {
    const apiKey =
      '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';
    const baseUrl = 'https://openrouter.ai/api/v1/chat/completions';

    const payload = {
      model: 'deepseek/deepseek-chat',
      messages: [
        {
          role: 'user',
          content:
            'Hello, this is a test message for document processing. Please respond with "OpenRouter DeepSeek working!"',
        },
      ],
      temperature: 0.3,
      max_tokens: 100,
    };

    console.log('📤 Sending request to OpenRouter...');
    console.log('🔧 Model:', payload.model);
    console.log('🔧 API Key:', apiKey.substring(0, 15) + '...');

    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://docvault.app',
        'X-Title': 'DocVault AI Assistant',
      },
      body: JSON.stringify(payload),
    });

    console.log('📥 Response status:', response.status);

    if (response.ok) {
      const result = await response.json();
      console.log('✅ OpenRouter DeepSeek integration working!');
      console.log(
        '📊 Response:',
        result.choices?.[0]?.message?.content || 'No content'
      );

      return {
        status: 'working',
        message: 'OpenRouter DeepSeek integration successful',
        response: result.choices?.[0]?.message?.content,
      };
    } else {
      const errorText = await response.text();
      console.error(
        '❌ OpenRouter DeepSeek failed:',
        response.status,
        errorText
      );

      return {
        status: 'failed',
        message: `OpenRouter DeepSeek failed: ${response.status} - ${errorText}`,
        response: null,
      };
    }
  } catch (error) {
    console.error('❌ OpenRouter DeepSeek error:', error.message);

    return {
      status: 'failed',
      message: error.message,
      response: null,
    };
  }
}

async function testDocumentProcessing() {
  console.log('\n🔍 Testing document processing with OpenRouter DeepSeek...');

  try {
    const apiKey =
      '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';
    const baseUrl = 'https://openrouter.ai/api/v1/chat/completions';

    const testDocument =
      "Ce document est un contrat de travail entre Jean Dupont et l'entreprise ABC. Le salaire est de 2500 euros par mois. Contact: jean.dupont@email.com, téléphone: +33 1 23 45 67 89.";

    const payload = {
      model: 'deepseek/deepseek-chat',
      messages: [
        {
          role: 'user',
          content: `Analyze this document and classify it. Return JSON format:
{
  "category": "document category",
  "confidence": 0.95,
  "entities": {
    "PERSON": ["person names"],
    "ORGANIZATION": ["company names"],
    "MONEY": ["amounts"],
    "EMAIL": ["email addresses"],
    "PHONE": ["phone numbers"]
  },
  "language": "detected language",
  "summary": "brief summary"
}

Document: ${testDocument}`,
        },
      ],
      temperature: 0.1,
      max_tokens: 500,
      response_format: { type: 'json_object' },
    };

    console.log('📤 Sending document processing request...');

    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://docvault.app',
        'X-Title': 'DocVault AI Assistant',
      },
      body: JSON.stringify(payload),
    });

    console.log('📥 Response status:', response.status);

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Document processing with OpenRouter DeepSeek working!');
      console.log(
        '📊 Analysis result:',
        result.choices?.[0]?.message?.content || 'No content'
      );

      return {
        status: 'working',
        message: 'Document processing successful',
        analysis: result.choices?.[0]?.message?.content,
      };
    } else {
      const errorText = await response.text();
      console.error(
        '❌ Document processing failed:',
        response.status,
        errorText
      );

      return {
        status: 'failed',
        message: `Document processing failed: ${response.status} - ${errorText}`,
        analysis: null,
      };
    }
  } catch (error) {
    console.error('❌ Document processing error:', error.message);

    return {
      status: 'failed',
      message: error.message,
      analysis: null,
    };
  }
}

async function runTests() {
  console.log('🧪 RUNNING OPENROUTER DEEPSEEK TESTS...\n');

  const basicTest = await testOpenRouterDeepSeek();
  const documentTest = await testDocumentProcessing();

  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST RESULTS:');
  console.log('='.repeat(60));

  console.log('\n🔍 Basic OpenRouter DeepSeek Test:');
  console.log(
    `   Status: ${basicTest.status === 'working' ? '✅ WORKING' : '❌ FAILED'}`
  );
  console.log(`   Message: ${basicTest.message}`);
  if (basicTest.response) {
    console.log(`   Response: ${basicTest.response.substring(0, 100)}...`);
  }

  console.log('\n📄 Document Processing Test:');
  console.log(
    `   Status: ${documentTest.status === 'working' ? '✅ WORKING' : '❌ FAILED'}`
  );
  console.log(`   Message: ${documentTest.message}`);
  if (documentTest.analysis) {
    console.log(`   Analysis: ${documentTest.analysis.substring(0, 200)}...`);
  }

  console.log('\n' + '='.repeat(60));
  console.log('🎯 SUMMARY:');

  if (basicTest.status === 'working' && documentTest.status === 'working') {
    console.log(
      '🎉 SUCCESS: OpenRouter DeepSeek integration is working perfectly!'
    );
    console.log(
      '✅ DeepSeek App AI service can now use OpenRouter (same as chatbot)'
    );
    console.log('✅ Document processing with DeepSeek is functional');
    console.log('✅ No more API key issues - using working OpenRouter token');
  } else {
    console.log('⚠️ PARTIAL SUCCESS: Some tests failed');
    if (basicTest.status === 'working') {
      console.log('✅ Basic OpenRouter DeepSeek connection works');
    }
    if (documentTest.status === 'working') {
      console.log('✅ Document processing works');
    }
  }

  console.log('\n🚀 NEXT STEPS:');
  console.log('1. Deploy the updated DeepSeek service');
  console.log('2. Test with real documents in the app');
  console.log('3. Verify dual AI comparison works');

  console.log('\n' + '='.repeat(60));
}

// Run the tests
runTests().catch(console.error);
