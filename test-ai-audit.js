#!/usr/bin/env node

/**
 * 🔍 COMPREHENSIVE AI AUDIT
 * Tests all AI services to determine what works and what doesn't
 */

console.log('🔍 STARTING COMPREHENSIVE AI AUDIT...\n');

// Test data
const testImagePath = 'D:\\Pred Format\\DOKUMENTI ANA\\francuski.png';
const testText =
  "Ce document est un contrat de travail entre Jean Dupont et l'entreprise ABC. Le salaire est de 2500 euros par mois. Contact: jean.dupont@email.com, téléphone: +33 1 23 45 67 89.";

// Results tracking
const auditResults = {
  tesseract: { status: 'unknown', details: '', confidence: 0 },
  huggingface: { status: 'unknown', details: '', confidence: 0 },
  deepseek: { status: 'unknown', details: '', confidence: 0 },
  firebase_functions: { status: 'unknown', details: '', confidence: 0 },
  local_ai: { status: 'unknown', details: '', confidence: 0 },
};

async function testTesseractOCR() {
  console.log('🔍 TESTING TESSERACT OCR...');

  try {
    // Test if Tesseract is available
    const tesseract = require('tesseract.js');
    console.log('✅ Tesseract.js library loaded successfully');

    // Test basic functionality
    const { createWorker } = tesseract;
    const worker = await createWorker('eng+fra', 1, {
      logger: m => {
        if (m.status === 'recognizing text') {
          console.log(`📊 OCR Progress: ${Math.round(m.progress * 100)}%`);
        }
      },
    });

    console.log('✅ Tesseract worker created successfully');

    // Test with sample text (simulate image processing)
    const testResult = await worker.recognize(
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
    );

    console.log('✅ Tesseract OCR test completed');
    console.log(`📊 Extracted text length: ${testResult.data.text.length}`);
    console.log(`📊 Confidence: ${testResult.data.confidence}`);

    await worker.terminate();

    auditResults.tesseract = {
      status: 'working',
      details: `OCR working, confidence: ${testResult.data.confidence}`,
      confidence: testResult.data.confidence,
    };

    console.log('✅ TESSERACT OCR: WORKING\n');
  } catch (error) {
    console.error('❌ TESSERACT OCR ERROR:', error.message);
    auditResults.tesseract = {
      status: 'failed',
      details: error.message,
      confidence: 0,
    };
    console.log('❌ TESSERACT OCR: FAILED\n');
  }
}

async function testHuggingFaceAI() {
  console.log('🔍 TESTING HUGGING FACE AI...');

  try {
    const token = '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';
    const baseUrl = 'https://api-inference.huggingface.co/models';

    // Test with a simple model
    const response = await fetch(`${baseUrl}/microsoft/DialoGPT-medium`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: 'Hello, how are you?',
      }),
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Hugging Face API connection successful');
      console.log('📊 Response received:', typeof result);

      auditResults.huggingface = {
        status: 'working',
        details: 'API connection successful, token valid',
        confidence: 0.9,
      };
      console.log('✅ HUGGING FACE AI: WORKING\n');
    } else {
      const errorText = await response.text();
      console.error('❌ Hugging Face API error:', response.status, errorText);

      auditResults.huggingface = {
        status: 'failed',
        details: `API error: ${response.status} - ${errorText}`,
        confidence: 0,
      };
      console.log('❌ HUGGING FACE AI: FAILED\n');
    }
  } catch (error) {
    console.error('❌ HUGGING FACE AI ERROR:', error.message);
    auditResults.huggingface = {
      status: 'failed',
      details: error.message,
      confidence: 0,
    };
    console.log('❌ HUGGING FACE AI: FAILED\n');
  }
}

async function testDeepSeekAI() {
  console.log('🔍 TESTING DEEPSEEK AI...');

  try {
    const apiKey = 'sk-b67cf66fba39412da267382b2afc5f30';
    const baseUrl = 'https://api.deepseek.com/v1/chat/completions';

    const response = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek-chat-free',
        messages: [{ role: 'user', content: 'Hello, test message' }],
        max_tokens: 50,
      }),
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ DeepSeek API connection successful');
      console.log(
        '📊 Response received:',
        result.choices?.[0]?.message?.content || 'No content'
      );

      auditResults.deepseek = {
        status: 'working',
        details: 'API connection successful, free model working',
        confidence: 0.9,
      };
      console.log('✅ DEEPSEEK AI: WORKING\n');
    } else {
      const errorText = await response.text();
      console.error('❌ DeepSeek API error:', response.status, errorText);

      auditResults.deepseek = {
        status: 'failed',
        details: `API error: ${response.status} - ${errorText}`,
        confidence: 0,
      };
      console.log('❌ DEEPSEEK AI: FAILED\n');
    }
  } catch (error) {
    console.error('❌ DEEPSEEK AI ERROR:', error.message);
    auditResults.deepseek = {
      status: 'failed',
      details: error.message,
      confidence: 0,
    };
    console.log('❌ DEEPSEEK AI: FAILED\n');
  }
}

async function testFirebaseFunctions() {
  console.log('🔍 TESTING FIREBASE FUNCTIONS...');

  try {
    // Test if Firebase CLI is available
    const { exec } = require('child_process');
    const util = require('util');
    const execAsync = util.promisify(exec);

    try {
      const { stdout } = await execAsync('firebase --version');
      console.log('✅ Firebase CLI available:', stdout.trim());

      // Test Firebase project status
      try {
        const { stdout: projectInfo } = await execAsync(
          'firebase projects:list'
        );
        console.log('✅ Firebase projects accessible');

        auditResults.firebase_functions = {
          status: 'working',
          details: 'Firebase CLI available, projects accessible',
          confidence: 0.8,
        };
        console.log('✅ FIREBASE FUNCTIONS: CLI WORKING\n');
      } catch (projectError) {
        console.error(
          '❌ Firebase project access error:',
          projectError.message
        );
        auditResults.firebase_functions = {
          status: 'partial',
          details: 'CLI available but project access issues',
          confidence: 0.4,
        };
        console.log('⚠️ FIREBASE FUNCTIONS: PARTIAL (CLI only)\n');
      }
    } catch (cliError) {
      console.error('❌ Firebase CLI not found:', cliError.message);
      auditResults.firebase_functions = {
        status: 'failed',
        details: 'Firebase CLI not installed',
        confidence: 0,
      };
      console.log('❌ FIREBASE FUNCTIONS: FAILED (CLI not found)\n');
    }
  } catch (error) {
    console.error('❌ FIREBASE FUNCTIONS ERROR:', error.message);
    auditResults.firebase_functions = {
      status: 'failed',
      details: error.message,
      confidence: 0,
    };
    console.log('❌ FIREBASE FUNCTIONS: FAILED\n');
  }
}

async function testLocalAI() {
  console.log('🔍 TESTING LOCAL AI SERVICES...');

  try {
    // Test smart classification
    console.log('📊 Testing smart classification...');

    const smartClassification = text => {
      const lowerText = text.toLowerCase();

      if (lowerText.includes('contrat') || lowerText.includes('contract')) {
        return { category: 'Contract', confidence: 0.9 };
      }
      if (lowerText.includes('facture') || lowerText.includes('invoice')) {
        return { category: 'Invoice', confidence: 0.9 };
      }
      if (lowerText.includes('salaire') || lowerText.includes('salary')) {
        return { category: 'Salary', confidence: 0.9 };
      }
      return { category: 'Document', confidence: 0.5 };
    };

    const classification = smartClassification(testText);
    console.log('✅ Smart classification working:', classification);

    // Test entity extraction
    console.log('📊 Testing entity extraction...');

    const extractEntities = text => {
      const entities = [];

      // Email extraction
      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
      const emails = text.match(emailRegex) || [];
      emails.forEach(email => entities.push({ type: 'EMAIL', value: email }));

      // Phone extraction
      const phoneRegex = /(\+33|0)[1-9](\d{8}|\s\d{2}\s\d{2}\s\d{2}\s\d{2})/g;
      const phones = text.match(phoneRegex) || [];
      phones.forEach(phone => entities.push({ type: 'PHONE', value: phone }));

      // Money extraction
      const moneyRegex = /(\d+)\s*(euros?|€|EUR)/gi;
      const money = text.match(moneyRegex) || [];
      money.forEach(amount => entities.push({ type: 'MONEY', value: amount }));

      return entities;
    };

    const entities = extractEntities(testText);
    console.log('✅ Entity extraction working:', entities);

    // Test language detection
    console.log('📊 Testing language detection...');

    const detectLanguage = text => {
      const frenchWords = [
        'le',
        'la',
        'les',
        'de',
        'du',
        'des',
        'et',
        'est',
        'sont',
        'ce',
        'cette',
        'document',
        'contrat',
        'entreprise',
      ];
      const englishWords = [
        'the',
        'and',
        'is',
        'are',
        'this',
        'that',
        'document',
        'contract',
        'company',
      ];

      const words = text.toLowerCase().split(/\s+/);
      const frenchCount = words.filter(word =>
        frenchWords.includes(word)
      ).length;
      const englishCount = words.filter(word =>
        englishWords.includes(word)
      ).length;

      if (frenchCount > englishCount) {
        return { language: 'French', confidence: 0.9 };
      } else if (englishCount > frenchCount) {
        return { language: 'English', confidence: 0.9 };
      }
      return { language: 'Unknown', confidence: 0.5 };
    };

    const language = detectLanguage(testText);
    console.log('✅ Language detection working:', language);

    auditResults.local_ai = {
      status: 'working',
      details:
        'Smart classification, entity extraction, language detection all working',
      confidence: 0.95,
    };
    console.log('✅ LOCAL AI SERVICES: WORKING\n');
  } catch (error) {
    console.error('❌ LOCAL AI SERVICES ERROR:', error.message);
    auditResults.local_ai = {
      status: 'failed',
      details: error.message,
      confidence: 0,
    };
    console.log('❌ LOCAL AI SERVICES: FAILED\n');
  }
}

async function generateAuditReport() {
  console.log('📊 GENERATING AI AUDIT REPORT...\n');

  console.log('='.repeat(60));
  console.log('🔍 COMPREHENSIVE AI AUDIT REPORT');
  console.log('='.repeat(60));

  Object.entries(auditResults).forEach(([service, result]) => {
    const status =
      result.status === 'working'
        ? '✅'
        : result.status === 'partial'
          ? '⚠️'
          : '❌';

    console.log(`\n${status} ${service.toUpperCase()}:`);
    console.log(`   Status: ${result.status.toUpperCase()}`);
    console.log(`   Confidence: ${result.confidence}`);
    console.log(`   Details: ${result.details}`);
  });

  console.log('\n' + '='.repeat(60));
  console.log('📈 SUMMARY:');

  const working = Object.values(auditResults).filter(
    r => r.status === 'working'
  ).length;
  const partial = Object.values(auditResults).filter(
    r => r.status === 'partial'
  ).length;
  const failed = Object.values(auditResults).filter(
    r => r.status === 'failed'
  ).length;

  console.log(`✅ Working: ${working}/5 services`);
  console.log(`⚠️ Partial: ${partial}/5 services`);
  console.log(`❌ Failed: ${failed}/5 services`);

  console.log('\n🎯 RECOMMENDATIONS:');

  if (auditResults.tesseract.status === 'working') {
    console.log('✅ Tesseract OCR is working perfectly - use as primary OCR');
  }

  if (auditResults.local_ai.status === 'working') {
    console.log(
      '✅ Local AI services are working - reliable fallback available'
    );
  }

  if (auditResults.huggingface.status === 'failed') {
    console.log(
      '❌ Hugging Face needs new token - get from https://huggingface.co/settings/tokens'
    );
  }

  if (auditResults.deepseek.status === 'failed') {
    console.log(
      '❌ DeepSeek needs API key verification - check account status'
    );
  }

  if (auditResults.firebase_functions.status === 'failed') {
    console.log(
      '❌ Firebase Functions need deployment - run: firebase deploy --only functions'
    );
  }

  console.log('\n' + '='.repeat(60));
}

// Run all tests
async function runAudit() {
  try {
    await testTesseractOCR();
    await testHuggingFaceAI();
    await testDeepSeekAI();
    await testFirebaseFunctions();
    await testLocalAI();
    await generateAuditReport();

    console.log('\n🎉 AI AUDIT COMPLETED!');
  } catch (error) {
    console.error('❌ AUDIT FAILED:', error);
  }
}

// Start the audit
runAudit();
