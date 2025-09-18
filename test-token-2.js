// Test Token 2: hf_MuXrhIA0tFhppbhKYGrdhLhBRWlXALrIDp
const https = require('https');

console.log('🔑 TESTING TOKEN 2: hf_MuXrhIA0tFhppbhKYGrdhLhBRWlXALrIDp');
console.log('========================================================\n');

const token = 'hf_MuXrhIA0tFhppbhKYGrdhLhBRWlXALrIDp';

async function testToken() {
  try {
    // Test token validity
    console.log('Testing token validity...');
    const response = await new Promise((resolve, reject) => {
      const req = https.request(
        'https://huggingface.co/api/whoami',
        {
          headers: {
            Authorization: `Bearer ${token}`,
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
      req.end();
    });

    console.log(`Status: ${response.status}`);
    if (response.status === 200) {
      console.log(`✅ Token valid for user: ${response.data.name}`);
      return true;
    } else {
      console.log(
        `❌ Token invalid: ${response.data.error || 'Unknown error'}`
      );
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
