// Test what OCR models are actually available
const https = require('https');

console.log('🔍 FINDING AVAILABLE OCR MODELS');
console.log('===============================\n');

const WORKING_TOKEN = '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';

async function testModelAvailability() {
  console.log('🔍 Testing model availability through different endpoints...');

  // Test different model access patterns
  const testCases = [
    {
      name: 'Image Captioning (should work)',
      path: '/models/Salesforce/blip-image-captioning-base',
      data: JSON.stringify({
        inputs:
          'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      }),
    },
    {
      name: 'TrOCR Base Printed',
      path: '/models/microsoft/trocr-base-printed',
      data: JSON.stringify({
        inputs:
          'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      }),
    },
    {
      name: 'TrOCR Base Printed (with parameters)',
      path: '/models/microsoft/trocr-base-printed',
      data: JSON.stringify({
        inputs:
          'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        parameters: {
          max_new_tokens: 100,
          temperature: 0.1,
        },
      }),
    },
    {
      name: 'Vision Encoder Decoder',
      path: '/models/nlpconnect/vit-gpt2-image-captioning',
      data: JSON.stringify({
        inputs:
          'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      }),
    },
  ];

  for (const testCase of testCases) {
    try {
      console.log(`\n   Testing: ${testCase.name}`);

      const result = await new Promise((resolve, reject) => {
        const options = {
          hostname: 'api-inference.huggingface.co',
          path: testCase.path,
          method: 'POST',
          headers: {
            Authorization: `Bearer ${WORKING_TOKEN}`,
            'Content-Type': 'application/json',
            'Content-Length': testCase.data.length,
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
        req.write(testCase.data);
        req.end();
      });

      console.log(`     Status: ${result.status}`);

      if (result.status === 200) {
        console.log(`     ✅ SUCCESS - Model works!`);
        try {
          const parsed = JSON.parse(result.data);
          console.log(
            `     Response: ${JSON.stringify(parsed).substring(0, 200)}...`
          );
        } catch (e) {
          console.log(`     Raw: ${result.data.substring(0, 200)}...`);
        }
      } else if (result.status === 503) {
        console.log(`     ⚠️ MODEL LOADING`);
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
  await testModelAvailability();

  console.log('\n🏁 MODEL AVAILABILITY SUMMARY');
  console.log('==============================');
  console.log('Model availability testing completed.');
}

runTest();
