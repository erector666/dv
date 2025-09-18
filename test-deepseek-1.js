// Test DeepSeek Token 1: sk-b67cf66fba39412da267382b2afc5f30
const https = require('https');

console.log('🧠 TESTING DEEPSEEK TOKEN 1: sk-b67cf66fba39412da267382b2afc5f30');
console.log(
  '================================================================\n'
);

const token = 'sk-b67cf66fba39412da267382b2afc5f30';

async function testToken() {
  try {
    const response = await new Promise((resolve, reject) => {
      const req = https.request(
        'https://api.deepseek.com/v1/chat/completions',
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
          model: 'deepseek-chat',
          messages: [{ role: 'user', content: 'Hello, test message.' }],
          max_tokens: 10,
        })
      );
      req.end();
    });

    console.log(`Status: ${response.status}`);

    if (response.status === 200) {
      console.log(`✅ Token working correctly`);
      return true;
    } else if (response.status === 401) {
      console.log(`❌ Invalid API key`);
      return false;
    } else if (response.status === 402) {
      console.log(`💰 Insufficient balance`);
      return false;
    } else if (response.status === 429) {
      console.log(`⚠️ Rate limit exceeded`);
      return false;
    } else {
      console.log(`❌ API error: ${response.status}`);
      console.log(`Response: ${JSON.stringify(response.data)}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Test failed: ${error.message}`);
    return false;
  }
}

testToken().then(valid => {
  console.log(`\nResult: ${valid ? '✅ WORKING' : '❌ NOT WORKING'}`);
});
