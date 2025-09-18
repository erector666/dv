const fetch = require('node-fetch');

async function testHuggingFaceToken() {
  const token = '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';

  console.log('🔧 Testing Hugging Face token...');
  console.log('🔧 Token starts with:', token.substring(0, 10) + '...');

  try {
    // Test with GPT2 model (simple and reliable)
    const response = await fetch(
      'https://api-inference.huggingface.co/models/gpt2',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: 'Hello world',
          parameters: {
            max_length: 50,
            temperature: 0.7,
          },
        }),
      }
    );

    console.log('🔧 Response status:', response.status);
    console.log(
      '🔧 Response headers:',
      Object.fromEntries(response.headers.entries())
    );

    if (!response.ok) {
      const errorBody = await response.text();
      console.log('❌ Error response body:', errorBody);
      return false;
    }

    const result = await response.json();
    console.log('✅ SUCCESS! Response:', JSON.stringify(result, null, 2));
    return true;
  } catch (error) {
    console.error('❌ Request failed:', error.message);
    return false;
  }
}

testHuggingFaceToken().then(success => {
  if (success) {
    console.log('🎯 TOKEN IS WORKING! Ready to test Dorian!');
  } else {
    console.log(
      '💥 TOKEN FAILED! Need to check permissions or create new one!'
    );
  }
});
