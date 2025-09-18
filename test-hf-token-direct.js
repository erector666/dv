// Test Hugging Face token directly
const https = require('https');

const token = 'hf_MuXrhIA0tFhppbhKYGrdhLhBRWlXALrIDp';

console.log('🔑 Testing Hugging Face token validity...');

// Test token validity
const options = {
  hostname: 'huggingface.co',
  path: '/api/whoami',
  method: 'GET',
  headers: {
    Authorization: `Bearer ${token}`,
  },
};

const req = https.request(options, res => {
  let data = '';
  res.on('data', chunk => (data += chunk));
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    if (res.statusCode === 200) {
      const userInfo = JSON.parse(data);
      console.log('✅ Token is VALID!');
      console.log('User:', userInfo.name || 'Unknown');
      console.log('Type:', userInfo.type || 'Unknown');
      console.log('Permissions:', userInfo.orgs || 'None');
    } else {
      console.log('❌ Token is INVALID!');
      console.log('Response:', data);
    }
  });
});

req.on('error', e => {
  console.error('❌ Error:', e.message);
});

req.end();
