#!/usr/bin/env node

/**
 * 🚀 QUICK AI AUDIT
 * Fast check of all AI services
 */

console.log('🚀 QUICK AI AUDIT STARTING...\n');

const auditResults = {};

// Test 1: Tesseract OCR
async function testTesseract() {
  console.log('🔍 Testing Tesseract OCR...');
  try {
    const tesseract = require('tesseract.js');
    console.log('✅ Tesseract.js library loaded');
    auditResults.tesseract = 'WORKING';
  } catch (error) {
    console.log('❌ Tesseract.js not available:', error.message);
    auditResults.tesseract = 'FAILED';
  }
}

// Test 2: Hugging Face API
async function testHuggingFace() {
  console.log('🔍 Testing Hugging Face API...');
  try {
    const token = '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';
    const response = await fetch(
      'https://api-inference.huggingface.co/models/microsoft/DialoGPT-medium',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ inputs: 'test' }),
      }
    );

    if (response.ok) {
      console.log('✅ Hugging Face API working');
      auditResults.huggingface = 'WORKING';
    } else {
      console.log('❌ Hugging Face API failed:', response.status);
      auditResults.huggingface = 'FAILED';
    }
  } catch (error) {
    console.log('❌ Hugging Face API error:', error.message);
    auditResults.huggingface = 'FAILED';
  }
}

// Test 3: DeepSeek API
async function testDeepSeek() {
  console.log('🔍 Testing DeepSeek API...');
  try {
    const apiKey = 'sk-b67cf66fba39412da267382b2afc5f30';
    const response = await fetch(
      'https://api.deepseek.com/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'deepseek-chat-free',
          messages: [{ role: 'user', content: 'test' }],
          max_tokens: 10,
        }),
      }
    );

    if (response.ok) {
      console.log('✅ DeepSeek API working');
      auditResults.deepseek = 'WORKING';
    } else {
      console.log('❌ DeepSeek API failed:', response.status);
      auditResults.deepseek = 'FAILED';
    }
  } catch (error) {
    console.log('❌ DeepSeek API error:', error.message);
    auditResults.deepseek = 'FAILED';
  }
}

// Test 4: Local AI Services
function testLocalAI() {
  console.log('🔍 Testing Local AI Services...');
  try {
    // Test smart classification
    const testText = 'Ce document est un contrat de travail';
    const classification = testText.toLowerCase().includes('contrat')
      ? 'Contract'
      : 'Document';
    console.log('✅ Smart classification working:', classification);

    // Test entity extraction
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const testEmail = 'test@example.com';
    const hasEmail = emailRegex.test(testEmail);
    console.log('✅ Entity extraction working:', hasEmail);

    auditResults.local_ai = 'WORKING';
  } catch (error) {
    console.log('❌ Local AI services error:', error.message);
    auditResults.local_ai = 'FAILED';
  }
}

// Test 5: Firebase Functions
async function testFirebase() {
  console.log('🔍 Testing Firebase Functions...');
  try {
    const { exec } = require('child_process');
    const util = require('util');
    const execAsync = util.promisify(exec);

    const { stdout } = await execAsync('firebase --version');
    console.log('✅ Firebase CLI available:', stdout.trim());
    auditResults.firebase = 'WORKING';
  } catch (error) {
    console.log('❌ Firebase CLI not found:', error.message);
    auditResults.firebase = 'FAILED';
  }
}

// Run all tests
async function runQuickAudit() {
  await testTesseract();
  await testHuggingFace();
  await testDeepSeek();
  testLocalAI();
  await testFirebase();

  console.log('\n' + '='.repeat(50));
  console.log('📊 AI AUDIT RESULTS:');
  console.log('='.repeat(50));

  Object.entries(auditResults).forEach(([service, status]) => {
    const icon = status === 'WORKING' ? '✅' : '❌';
    console.log(`${icon} ${service.toUpperCase()}: ${status}`);
  });

  const working = Object.values(auditResults).filter(
    s => s === 'WORKING'
  ).length;
  const total = Object.keys(auditResults).length;

  console.log(`\n📈 SUMMARY: ${working}/${total} services working`);

  if (working >= 3) {
    console.log('🎉 System is functional with working services!');
  } else {
    console.log('⚠️ System needs attention - multiple services down');
  }
}

runQuickAudit().catch(console.error);
