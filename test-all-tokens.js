// Test All Available Tokens for Functionality
const https = require('https');

console.log('🔑 TESTING ALL AVAILABLE TOKENS');
console.log('===============================\n');

// All tokens found in the codebase
const tokens = {
  huggingFace: [
    {
      name: 'Token 1 (Current)',
      token: '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',
      source: 'huggingFaceAIService.ts, olmOCRService.ts, test files',
    },
    {
      name: 'Token 2 (Direct)',
      token: 'hf_MuXrhIA0tFhppbhKYGrdhLhBRWlXALrIDp',
      source: 'test-hf-token-direct.js',
    },
    {
      name: 'Token 3 (New)',
      token: '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',
      source: 'test-new-token.js, freeTranslationService.ts',
    },
  ],
  deepSeek: [
    {
      name: 'DeepSeek Key 1',
      token: 'sk-b67cf66fba39412da267382b2afc5f30',
      source: 'deepseekService.ts',
    },
    {
      name: 'DeepSeek Key 2',
      token:
        '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',
      source: 'chatbotService.ts',
    },
  ],
};

// Test results
const testResults = {
  huggingFace: [],
  deepSeek: [],
};

// Utility function for HTTP requests
function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, options, res => {
      let data = '';
      res.on('data', chunk => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({
            status: res.statusCode,
            data: parsed,
            headers: res.headers,
          });
        } catch (e) {
          resolve({ status: res.statusCode, data: data, headers: res.headers });
        }
      });
    });
    req.on('error', reject);
    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

// Test Hugging Face token
async function testHuggingFaceToken(tokenInfo) {
  console.log(`\n🤗 Testing ${tokenInfo.name}`);
  console.log(`   Token: ${tokenInfo.token.substring(0, 10)}...`);
  console.log(`   Source: ${tokenInfo.source}`);

  try {
    // Test 1: Token validity
    const tokenResponse = await makeRequest(
      'https://huggingface.co/api/whoami',
      {
        headers: {
          Authorization: `Bearer ${tokenInfo.token}`,
        },
      }
    );

    let tokenValid = false;
    let userName = 'Unknown';

    if (tokenResponse.status === 200) {
      tokenValid = true;
      userName = tokenResponse.data.name || 'Unknown';
      console.log(`   ✅ Token valid for user: ${userName}`);
    } else {
      console.log(
        `   ❌ Token invalid: ${tokenResponse.data.error || 'Unknown error'}`
      );
    }

    // Test 2: Model access
    let modelAccess = false;
    if (tokenValid) {
      try {
        const modelResponse = await makeRequest(
          'https://api-inference.huggingface.co/models/microsoft/trocr-base-printed',
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${tokenInfo.token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              inputs:
                'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
            }),
          }
        );

        if (modelResponse.status === 200) {
          modelAccess = true;
          console.log(`   ✅ Model access: Working`);
        } else if (modelResponse.status === 503) {
          console.log(`   ⚠️ Model access: Loading (try again later)`);
        } else {
          console.log(`   ❌ Model access: Failed (${modelResponse.status})`);
        }
      } catch (error) {
        console.log(`   ❌ Model access: Error - ${error.message}`);
      }
    }

    const result = {
      ...tokenInfo,
      tokenValid,
      userName,
      modelAccess,
      status: tokenValid
        ? modelAccess
          ? 'working'
          : 'valid_but_no_model_access'
        : 'invalid',
    };

    testResults.huggingFace.push(result);
    return result;
  } catch (error) {
    console.log(`   ❌ Test failed: ${error.message}`);
    const result = {
      ...tokenInfo,
      tokenValid: false,
      userName: 'Unknown',
      modelAccess: false,
      status: 'error',
    };
    testResults.huggingFace.push(result);
    return result;
  }
}

// Test DeepSeek token
async function testDeepSeekToken(tokenInfo) {
  console.log(`\n🧠 Testing ${tokenInfo.name}`);
  console.log(`   Token: ${tokenInfo.token.substring(0, 10)}...`);
  console.log(`   Source: ${tokenInfo.source}`);

  try {
    const response = await makeRequest(
      'https://api.deepseek.com/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tokenInfo.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            {
              role: 'user',
              content: 'Hello, this is a test message.',
            },
          ],
          max_tokens: 10,
        }),
      }
    );

    let status = 'unknown';
    let message = '';

    if (response.status === 200) {
      status = 'working';
      message = 'API working correctly';
      console.log(`   ✅ ${message}`);
    } else if (response.status === 401) {
      status = 'invalid_key';
      message = 'Invalid API key';
      console.log(`   ❌ ${message}`);
    } else if (response.status === 402) {
      status = 'insufficient_balance';
      message = 'Insufficient balance';
      console.log(`   ❌ ${message}`);
    } else if (response.status === 429) {
      status = 'rate_limited';
      message = 'Rate limit exceeded';
      console.log(`   ⚠️ ${message}`);
    } else {
      status = 'error';
      message = `API error: ${response.status}`;
      console.log(`   ❌ ${message}`);
    }

    const result = {
      ...tokenInfo,
      status,
      message,
      response: response.data,
    };

    testResults.deepSeek.push(result);
    return result;
  } catch (error) {
    console.log(`   ❌ Test failed: ${error.message}`);
    const result = {
      ...tokenInfo,
      status: 'error',
      message: error.message,
      response: null,
    };
    testResults.deepSeek.push(result);
    return result;
  }
}

// Main test execution
async function runAllTests() {
  console.log('🚀 Starting comprehensive token testing...\n');

  // Test all Hugging Face tokens
  console.log('🤗 TESTING HUGGING FACE TOKENS');
  console.log('===============================');

  for (const token of tokens.huggingFace) {
    await testHuggingFaceToken(token);
  }

  // Test all DeepSeek tokens
  console.log('\n🧠 TESTING DEEPSEEK TOKENS');
  console.log('===========================');

  for (const token of tokens.deepSeek) {
    await testDeepSeekToken(token);
  }

  // Generate summary and recommendations
  generateSummary();
}

// Generate test summary and recommendations
function generateSummary() {
  console.log('\n📊 TEST RESULTS SUMMARY');
  console.log('========================');

  // Hugging Face results
  console.log('\n🤗 Hugging Face Tokens:');
  const workingHFTokens = testResults.huggingFace.filter(
    t => t.status === 'working'
  );
  const validHFTokens = testResults.huggingFace.filter(t => t.tokenValid);

  if (workingHFTokens.length > 0) {
    console.log(`✅ ${workingHFTokens.length} working token(s) found:`);
    workingHFTokens.forEach(token => {
      console.log(
        `   🏆 ${token.name}: ${token.token} (User: ${token.userName})`
      );
    });
  } else if (validHFTokens.length > 0) {
    console.log(
      `⚠️ ${validHFTokens.length} valid token(s) but no model access:`
    );
    validHFTokens.forEach(token => {
      console.log(
        `   🔑 ${token.name}: ${token.token} (User: ${token.userName})`
      );
    });
  } else {
    console.log('❌ No working Hugging Face tokens found');
  }

  // DeepSeek results
  console.log('\n🧠 DeepSeek Tokens:');
  const workingDSTokens = testResults.deepSeek.filter(
    t => t.status === 'working'
  );

  if (workingDSTokens.length > 0) {
    console.log(`✅ ${workingDSTokens.length} working token(s) found:`);
    workingDSTokens.forEach(token => {
      console.log(`   🏆 ${token.name}: ${token.token}`);
    });
  } else {
    console.log('❌ No working DeepSeek tokens found');
    testResults.deepSeek.forEach(token => {
      console.log(
        `   ${token.status === 'insufficient_balance' ? '💰' : '❌'} ${token.name}: ${token.message}`
      );
    });
  }

  // Recommendations
  console.log('\n💡 RECOMMENDATIONS');
  console.log('==================');

  if (workingHFTokens.length > 0) {
    const bestHFToken = workingHFTokens[0];
    console.log(`\n🏆 Best Hugging Face Token: ${bestHFToken.name}`);
    console.log(`   Token: ${bestHFToken.token}`);
    console.log(`   User: ${bestHFToken.userName}`);
    console.log(`   Status: Working with model access`);
  }

  if (workingDSTokens.length > 0) {
    const bestDSToken = workingDSTokens[0];
    console.log(`\n🏆 Best DeepSeek Token: ${bestDSToken.name}`);
    console.log(`   Token: ${bestDSToken.token}`);
    console.log(`   Status: Working`);
  }

  console.log('\n📋 IMPLEMENTATION STEPS:');
  console.log('========================');

  if (workingHFTokens.length > 0) {
    const bestToken = workingHFTokens[0];
    console.log(`\n1. 🤗 Update Hugging Face Token:`);
    console.log(`   - File: functions/src/huggingFaceAIService.ts`);
    console.log(`   - Line 45: Replace with '${bestToken.token}'`);
    console.log(`   - File: functions/src/olmOCRService.ts`);
    console.log(`   - Line 37: Replace with '${bestToken.token}'`);
  }

  if (workingDSTokens.length > 0) {
    const bestToken = workingDSTokens[0];
    console.log(`\n2. 🧠 Update DeepSeek Token:`);
    console.log(`   - File: functions/src/deepseekService.ts`);
    console.log(`   - Line 64: Replace with '${bestToken.token}'`);
  }

  if (workingHFTokens.length === 0 && workingDSTokens.length === 0) {
    console.log('\n⚠️ No working tokens found. Consider:');
    console.log('   - Getting new Hugging Face token');
    console.log('   - Adding DeepSeek credits');
    console.log('   - Using local AI services only (they work great!)');
  }
}

// Run the tests
runAllTests().catch(console.error);
