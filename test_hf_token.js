const https = require('https');

const token = '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';

const data = JSON.stringify({
  inputs:
    'This is a UBS banking document about financial services and account holder information.',
  parameters: {
    candidate_labels: [
      'financial document',
      'educational document',
      'personal document',
    ],
  },
});

const options = {
  hostname: 'api-inference.huggingface.co',
  path: '/models/facebook/bart-large-mnli',
  method: 'POST',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'Content-Length': data.length,
  },
};

console.log('🧪 Testing Hugging Face token...');
console.log('Token:', token);
console.log('URL:', `https://${options.hostname}${options.path}`);

const req = https.request(options, res => {
  console.log('\n📊 RESPONSE STATUS:', res.statusCode);
  console.log('📊 RESPONSE HEADERS:', res.headers);

  let responseData = '';
  res.on('data', chunk => {
    responseData += chunk;
  });

  res.on('end', () => {
    console.log('\n📊 RESPONSE BODY:');
    try {
      const parsed = JSON.parse(responseData);
      console.log(JSON.stringify(parsed, null, 2));

      if (res.statusCode === 200) {
        console.log('\n✅ HUGGING FACE TOKEN IS WORKING!');
      } else {
        console.log('\n❌ HUGGING FACE TOKEN FAILED!');
        console.log('Status:', res.statusCode);
        console.log('Error:', parsed);
      }
    } catch (e) {
      console.log('Raw response:', responseData);
      console.log('\n❌ FAILED TO PARSE RESPONSE');
    }
  });
});

req.on('error', e => {
  console.error('\n❌ REQUEST ERROR:', e.message);
});

req.write(data);
req.end();
