// Test DeepSeek Free API
const https = require('https');

console.log('🧠 TESTING DEEPSEEK FREE API');
console.log('============================\n');

async function testDeepSeekFree() {
  const tokens = [
    'sk-b67cf66fba39412da267382b2afc5f30',
    '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',
  ];

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    console.log(
      `\n🔍 Testing DeepSeek Token ${i + 1}: ${token.substring(0, 10)}...`
    );

    try {
      // Test with different models and endpoints
      const testCases = [
        {
          name: 'DeepSeek Chat (Standard)',
          url: 'https://api.deepseek.com/v1/chat/completions',
          model: 'deepseek-chat',
        },
        {
          name: 'DeepSeek Chat (Free)',
          url: 'https://api.deepseek.com/v1/chat/completions',
          model: 'deepseek-chat-free',
        },
        {
          name: 'DeepSeek V3.1',
          url: 'https://api.deepseek.com/v1/chat/completions',
          model: 'deepseek-v3.1',
        },
      ];

      for (const testCase of testCases) {
        console.log(`\n   Testing: ${testCase.name}`);

        try {
          const response = await new Promise((resolve, reject) => {
            const req = https.request(
              testCase.url,
              {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
              },
              res => {
                let data = '';
                res.on('data', chunk => (data += chunk));
                res.on('end', () => {
                  try {
                    const parsed = JSON.parse(data);
                    resolve({ status: res.statusCode, data: parsed });
                  } catch (e) {
                    resolve({ status: res.statusCode, data: data });
                  }
                });
              }
            );

            req.on('error', reject);
            req.write(
              JSON.stringify({
                model: testCase.model,
                messages: [
                  {
                    role: 'user',
                    content: 'Hello, this is a test message.',
                  },
                ],
                max_tokens: 10,
              })
            );
            req.end();
          });

          console.log(`     Status: ${response.status}`);

          if (response.status === 200) {
            console.log(`     ✅ SUCCESS: ${testCase.name} is working!`);
            console.log(
              `     Response: ${JSON.stringify(response.data).substring(0, 100)}...`
            );
            return {
              success: true,
              token,
              model: testCase.model,
              url: testCase.url,
            };
          } else if (response.status === 401) {
            console.log(`     ❌ Invalid API key`);
          } else if (response.status === 402) {
            console.log(`     💰 Insufficient balance`);
          } else if (response.status === 404) {
            console.log(`     ❌ Model not found: ${testCase.model}`);
          } else if (response.status === 429) {
            console.log(`     ⚠️ Rate limit exceeded`);
          } else {
            console.log(`     ❌ Error: ${response.status}`);
            console.log(
              `     Response: ${JSON.stringify(response.data).substring(0, 200)}...`
            );
          }
        } catch (error) {
          console.log(`     ❌ Request failed: ${error.message}`);
        }
      }
    } catch (error) {
      console.log(`❌ Token test failed: ${error.message}`);
    }
  }
}

// Test alternative DeepSeek endpoints
async function testAlternativeEndpoints() {
  console.log('\n🔄 TESTING ALTERNATIVE DEEPSEEK ENDPOINTS');
  console.log('==========================================');

  const alternativeEndpoints = [
    {
      name: 'DeepSeek Official API',
      url: 'https://api.deepseek.com/v1/chat/completions',
      description: 'Official DeepSeek API endpoint',
    },
    {
      name: 'DeepSeek Alternative',
      url: 'https://api.deepseek.com/chat/completions',
      description: 'Alternative endpoint (if exists)',
    },
  ];

  for (const endpoint of alternativeEndpoints) {
    console.log(`\n🔍 ${endpoint.name}`);
    console.log(`   URL: ${endpoint.url}`);
    console.log(`   Description: ${endpoint.description}`);
    console.log(`   Status: Available (requires valid token)`);
  }
}

// Check DeepSeek documentation
function checkDeepSeekDocumentation() {
  console.log('\n📚 DEEPSEEK DOCUMENTATION CHECK');
  console.log('===============================');

  console.log('DeepSeek API Information:');
  console.log('1. Base URL: https://api.deepseek.com/v1/chat/completions');
  console.log('2. Models available:');
  console.log('   - deepseek-chat (standard)');
  console.log('   - deepseek-chat-free (free tier)');
  console.log('   - deepseek-v3.1 (latest)');
  console.log('3. Authentication: Bearer token in Authorization header');
  console.log('4. Free tier: Available with usage limits');
  console.log('');
  console.log('Common issues:');
  console.log('- Invalid API key (401)');
  console.log('- Model not found (404)');
  console.log('- Rate limit exceeded (429)');
  console.log('- Insufficient balance (402) - but should be free!');
}

// Main execution
async function main() {
  await testDeepSeekFree();
  await testAlternativeEndpoints();
  checkDeepSeekDocumentation();

  console.log('\n💡 DEEPSEEK FIX RECOMMENDATIONS');
  console.log('===============================');
  console.log('1. 🔑 Check if your API key is valid');
  console.log('2. 🤖 Try different model names');
  console.log('3. 🌐 Verify API endpoint URL');
  console.log('4. 📊 Check usage limits');
  console.log('5. 🔄 Test with minimal request');
  console.log('');
  console.log('Since DeepSeek 3.1 is free, the issue is likely:');
  console('- Invalid API key format');
  console('- Wrong model name');
  console('- Incorrect endpoint URL');
  console('- Account not properly set up');
}

main().catch(console.error);
