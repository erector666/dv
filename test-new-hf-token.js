#!/usr/bin/env node

/**
 * 🤗 TEST NEW HUGGING FACE TOKEN
 * Verifies the new token works for all AI functionality
 */

console.log('🤗 TESTING NEW HUGGING FACE TOKEN...\n');

const newToken = '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';
const baseUrl = 'https://api-inference.huggingface.co/models';

async function testTokenConnection() {
  console.log('🔍 Testing token connection...');

  try {
    // Test with a simple model
    const response = await fetch(`${baseUrl}/microsoft/DialoGPT-medium`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${newToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: 'Hello, this is a test message',
      }),
    });

    console.log('📥 Response status:', response.status);

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Token connection successful!');
      console.log('📊 Response received:', typeof result);
      return { status: 'success', message: 'Token connection working' };
    } else {
      const errorText = await response.text();
      console.error('❌ Token connection failed:', response.status, errorText);
      return {
        status: 'failed',
        message: `Connection failed: ${response.status} - ${errorText}`,
      };
    }
  } catch (error) {
    console.error('❌ Token connection error:', error.message);
    return { status: 'failed', message: error.message };
  }
}

async function testClassificationModel() {
  console.log('\n🔍 Testing classification model...');

  try {
    const testText =
      "Ce document est un contrat de travail entre Jean Dupont et l'entreprise ABC. Le salaire est de 2500 euros par mois.";

    const response = await fetch(`${baseUrl}/facebook/bart-large-mnli`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${newToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: testText,
        parameters: {
          candidate_labels: [
            'contract',
            'invoice',
            'salary',
            'personal',
            'legal',
            'financial',
          ],
        },
      }),
    });

    console.log('📥 Response status:', response.status);

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Classification model working!');
      console.log('📊 Classification result:', result);
      return {
        status: 'success',
        message: 'Classification model working',
        result,
      };
    } else {
      const errorText = await response.text();
      console.error(
        '❌ Classification model failed:',
        response.status,
        errorText
      );
      return {
        status: 'failed',
        message: `Classification failed: ${response.status} - ${errorText}`,
      };
    }
  } catch (error) {
    console.error('❌ Classification model error:', error.message);
    return { status: 'failed', message: error.message };
  }
}

async function testTrOCRModel() {
  console.log('\n🔍 Testing TrOCR model...');

  try {
    // Test with a simple base64 image (1x1 pixel)
    const testImage =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

    const response = await fetch(`${baseUrl}/microsoft/trocr-base-printed`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${newToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: testImage,
      }),
    });

    console.log('📥 Response status:', response.status);

    if (response.ok) {
      const result = await response.json();
      console.log('✅ TrOCR model working!');
      console.log('📊 OCR result:', result);
      return { status: 'success', message: 'TrOCR model working', result };
    } else {
      const errorText = await response.text();
      console.error('❌ TrOCR model failed:', response.status, errorText);
      return {
        status: 'failed',
        message: `TrOCR failed: ${response.status} - ${errorText}`,
      };
    }
  } catch (error) {
    console.error('❌ TrOCR model error:', error.message);
    return { status: 'failed', message: error.message };
  }
}

async function testEntityExtraction() {
  console.log('\n🔍 Testing entity extraction...');

  try {
    const testText =
      'Jean Dupont works at ABC Company. His email is jean.dupont@email.com and phone is +33 1 23 45 67 89. The salary is 2500 euros.';

    const response = await fetch(
      `${baseUrl}/dbmdz/bert-large-cased-finetuned-conll03-english`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${newToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: testText,
        }),
      }
    );

    console.log('📥 Response status:', response.status);

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Entity extraction working!');
      console.log('📊 Entity extraction result:', result);
      return {
        status: 'success',
        message: 'Entity extraction working',
        result,
      };
    } else {
      const errorText = await response.text();
      console.error('❌ Entity extraction failed:', response.status, errorText);
      return {
        status: 'failed',
        message: `Entity extraction failed: ${response.status} - ${errorText}`,
      };
    }
  } catch (error) {
    console.error('❌ Entity extraction error:', error.message);
    return { status: 'failed', message: error.message };
  }
}

async function runAllTests() {
  console.log('🧪 RUNNING ALL HUGGING FACE TESTS...\n');

  const connectionTest = await testTokenConnection();
  const classificationTest = await testClassificationModel();
  const trocrTest = await testTrOCRModel();
  const entityTest = await testEntityExtraction();

  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST RESULTS:');
  console.log('='.repeat(60));

  console.log('\n🔗 Token Connection:');
  console.log(
    `   Status: ${connectionTest.status === 'success' ? '✅ WORKING' : '❌ FAILED'}`
  );
  console.log(`   Message: ${connectionTest.message}`);

  console.log('\n🏷️ Classification Model:');
  console.log(
    `   Status: ${classificationTest.status === 'success' ? '✅ WORKING' : '❌ FAILED'}`
  );
  console.log(`   Message: ${classificationTest.message}`);

  console.log('\n🖼️ TrOCR Model:');
  console.log(
    `   Status: ${trocrTest.status === 'success' ? '✅ WORKING' : '❌ FAILED'}`
  );
  console.log(`   Message: ${trocrTest.message}`);

  console.log('\n👥 Entity Extraction:');
  console.log(
    `   Status: ${entityTest.status === 'success' ? '✅ WORKING' : '❌ FAILED'}`
  );
  console.log(`   Message: ${entityTest.message}`);

  console.log('\n' + '='.repeat(60));
  console.log('🎯 SUMMARY:');

  const workingTests = [
    connectionTest,
    classificationTest,
    trocrTest,
    entityTest,
  ].filter(test => test.status === 'success').length;

  if (workingTests === 4) {
    console.log('🎉 SUCCESS: All Hugging Face AI features are working!');
    console.log('✅ Token connection: WORKING');
    console.log('✅ Classification: WORKING');
    console.log('✅ TrOCR: WORKING');
    console.log('✅ Entity extraction: WORKING');
    console.log('\n🚀 Your DocVault AI system is now fully functional!');
  } else if (workingTests >= 2) {
    console.log('⚠️ PARTIAL SUCCESS: Some features working');
    console.log(`✅ ${workingTests}/4 features working`);
    console.log('🔧 Some models may need time to load or have rate limits');
  } else {
    console.log('❌ FAILED: Most features not working');
    console.log('🔧 Check token permissions or try again later');
  }

  console.log('\n🎯 NEXT STEPS:');
  console.log('1. Deploy the updated Hugging Face service');
  console.log('2. Test with real documents in the app');
  console.log('3. Verify dual AI comparison works');
  console.log('4. Enjoy enhanced AI capabilities!');

  console.log('\n' + '='.repeat(60));
}

// Run all tests
runAllTests().catch(console.error);
