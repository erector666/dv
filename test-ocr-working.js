// Test OCR with working token
const https = require('https');

console.log('🧪 TESTING OCR WITH WORKING TOKEN');
console.log('==================================\n');

const WORKING_TOKEN = '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';

async function testOCRAccess() {
  console.log('🔍 Testing OCR model access with working token...');

  const models = [
    'microsoft/trocr-base-printed',
    'microsoft/trocr-large-printed',
    'microsoft/trocr-base-handwritten',
  ];

  for (const model of models) {
    try {
      console.log(`\n   Testing: ${model}`);

      const result = await new Promise((resolve, reject) => {
        const data = JSON.stringify({
          inputs:
            'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
          parameters: {
            max_new_tokens: 100,
            temperature: 0.1,
          },
        });

        const options = {
          hostname: 'api-inference.huggingface.co',
          path: `/models/${model}`,
          method: 'POST',
          headers: {
            Authorization: `Bearer ${WORKING_TOKEN}`,
            'Content-Type': 'application/json',
            'Content-Length': data.length,
          },
        };

        const req = https.request(options, res => {
          let responseData = '';
          res.on('data', chunk => (responseData += chunk));
          res.on('end', () => {
            resolve({
              status: res.statusCode,
              data: responseData,
              headers: res.headers,
            });
          });
        });

        req.on('error', reject);
        req.write(data);
        req.end();
      });

      console.log(`     Status: ${result.status}`);

      if (result.status === 200) {
        console.log(`     ✅ SUCCESS - Model is accessible!`);
        try {
          const parsed = JSON.parse(result.data);
          console.log(
            `     Response: ${JSON.stringify(parsed).substring(0, 200)}...`
          );
        } catch (e) {
          console.log(`     Raw: ${result.data.substring(0, 200)}...`);
        }
      } else if (result.status === 503) {
        console.log(`     ⚠️ MODEL LOADING - Try again in a moment`);
        console.log(`     Message: ${result.data.substring(0, 100)}...`);
      } else if (result.status === 404) {
        console.log(`     ❌ MODEL NOT FOUND`);
      } else {
        console.log(`     ❌ ERROR ${result.status}`);
        console.log(`     Response: ${result.data.substring(0, 200)}...`);
      }
    } catch (error) {
      console.log(`     ❌ REQUEST ERROR: ${error.message}`);
    }
  }
}

async function runTest() {
  await testOCRAccess();

  console.log('\n🏁 OCR ACCESS TEST SUMMARY');
  console.log('===========================');
  console.log('OCR model access testing completed.');
}

runTest();
