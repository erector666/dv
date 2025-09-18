// Debug Hugging Face API Issues
const https = require('https');

console.log('🔍 DEBUGGING HUGGING FACE API ISSUES');
console.log('=====================================\n');

const VALID_TOKEN = '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';

async function debugAPI() {
  console.log('🔑 Testing token validity...');

  try {
    const result = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'huggingface.co',
        path: '/api/whoami',
        method: 'GET',
        headers: {
          Authorization: `Bearer ${VALID_TOKEN}`,
        },
      };

      const req = https.request(options, res => {
        let data = '';
        res.on('data', chunk => (data += chunk));
        res.on('end', () => {
          resolve({
            status: res.statusCode,
            data: data,
            headers: res.headers,
          });
        });
      });

      req.on('error', reject);
      req.end();
    });

    console.log(
      `   Token Status: ${result.status === 200 ? '✅ VALID' : '❌ INVALID'}`
    );
    console.log(`   Response: ${result.data}`);

    if (result.status === 200) {
      const userInfo = JSON.parse(result.data);
      console.log(`   User: ${userInfo.name || 'Unknown'}`);
      console.log(`   Type: ${userInfo.type || 'Unknown'}`);
    }
  } catch (error) {
    console.log(`   Token Error: ${error.message}`);
  }
}

async function testModelAccess() {
  console.log('\n🔍 Testing model access patterns...');

  // Test different model access patterns
  const testCases = [
    {
      name: 'Basic Text Model',
      path: '/models/facebook/bart-large-mnli',
      data: JSON.stringify({
        inputs: 'Test classification',
        parameters: { candidate_labels: ['positive', 'negative'] },
      }),
    },
    {
      name: 'OCR Model (Direct)',
      path: '/models/microsoft/trocr-base-printed',
      data: JSON.stringify({
        inputs:
          'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      }),
    },
    {
      name: 'OCR Model (With Parameters)',
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
            Authorization: `Bearer ${VALID_TOKEN}`,
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
      console.log(`     Content-Type: ${result.headers['content-type']}`);

      if (result.status === 200) {
        console.log(`     ✅ SUCCESS`);
        try {
          const parsed = JSON.parse(result.data);
          console.log(
            `     Response: ${JSON.stringify(parsed).substring(0, 100)}...`
          );
        } catch (e) {
          console.log(`     Raw: ${result.data.substring(0, 100)}...`);
        }
      } else if (result.status === 404) {
        console.log(`     ❌ MODEL NOT FOUND`);
        console.log(`     Error: ${result.data.substring(0, 200)}...`);
      } else if (result.status === 503) {
        console.log(`     ⚠️ MODEL LOADING`);
        console.log(`     Message: ${result.data.substring(0, 200)}...`);
      } else {
        console.log(`     ❌ ERROR ${result.status}`);
        console.log(`     Response: ${result.data.substring(0, 200)}...`);
      }
    } catch (error) {
      console.log(`     ❌ REQUEST ERROR: ${error.message}`);
    }
  }
}

async function checkModelInfo() {
  console.log('\n🔍 Checking model information...');

  const models = [
    'microsoft/trocr-base-printed',
    'microsoft/trocr-large-printed',
    'stepfun-ai/GOT-OCR2_0',
  ];

  for (const model of models) {
    try {
      const result = await new Promise((resolve, reject) => {
        const options = {
          hostname: 'huggingface.co',
          path: `/api/models/${model}`,
          method: 'GET',
          headers: {
            Authorization: `Bearer ${VALID_TOKEN}`,
          },
        };

        const req = https.request(options, res => {
          let data = '';
          res.on('data', chunk => (data += chunk));
          res.on('end', () => {
            resolve({
              status: res.statusCode,
              data: data,
            });
          });
        });

        req.on('error', reject);
        req.end();
      });

      console.log(
        `   ${model}: ${result.status === 200 ? '✅ EXISTS' : '❌ NOT FOUND'}`
      );
      if (result.status === 200) {
        const modelInfo = JSON.parse(result.data);
        console.log(`     Pipeline: ${modelInfo.pipeline_tag || 'Unknown'}`);
        console.log(`     Downloads: ${modelInfo.downloads || 0}`);
      }
    } catch (error) {
      console.log(`   ${model}: ❌ ERROR - ${error.message}`);
    }
  }
}

async function runDebug() {
  await debugAPI();
  await testModelAccess();
  await checkModelInfo();

  console.log('\n🏁 DEBUG SUMMARY');
  console.log('================');
  console.log('API debugging completed. Check results above.');
}

runDebug();
