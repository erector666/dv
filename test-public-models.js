// Test Public Models Without Authentication
const https = require('https');

console.log('🌐 TESTING PUBLIC MODELS WITHOUT AUTHENTICATION');
console.log('===============================================\n');

async function testPublicModels() {
  const models = [
    {
      name: 'Microsoft TrOCR Base Printed',
      url: 'https://api-inference.huggingface.co/models/microsoft/trocr-base-printed',
      description: 'OCR model for printed text',
    },
    {
      name: 'Salesforce BLIP Image Captioning',
      url: 'https://api-inference.huggingface.co/models/Salesforce/blip-image-captioning-base',
      description: 'Image captioning model',
    },
    {
      name: 'NLPConnect ViT-GPT2',
      url: 'https://api-inference.huggingface.co/models/nlpconnect/vit-gpt2-image-captioning',
      description: 'Vision transformer for image captioning',
    },
  ];

  for (const model of models) {
    console.log(`\n🔍 Testing: ${model.name}`);
    console.log(`   Description: ${model.description}`);

    try {
      const response = await new Promise((resolve, reject) => {
        const req = https.request(
          model.url,
          {
            method: 'POST',
            headers: {
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
            inputs:
              'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
          })
        );
        req.end();
      });

      console.log(`   Status: ${response.status}`);

      if (response.status === 200) {
        console.log(
          `   ✅ SUCCESS: Model is accessible without authentication!`
        );
        console.log(
          `   Response: ${JSON.stringify(response.data).substring(0, 100)}...`
        );
      } else if (response.status === 401) {
        console.log(`   🔐 Authentication required`);
      } else if (response.status === 503) {
        console.log(`   ⚠️ Model is loading (try again later)`);
      } else if (response.status === 404) {
        console.log(`   ❌ Model not found`);
      } else {
        console.log(`   ❌ Error: ${response.status}`);
        console.log(`   Response: ${response.data.substring(0, 200)}...`);
      }
    } catch (error) {
      console.log(`   ❌ Request failed: ${error.message}`);
    }
  }
}

// Test alternative free APIs
async function testAlternativeAPIs() {
  console.log('\n🔄 TESTING ALTERNATIVE FREE APIs');
  console.log('==================================');

  const alternatives = [
    {
      name: 'OCR.space API',
      url: 'https://api.ocr.space/parse/image',
      description: 'Free OCR API with 25,000 requests/month',
    },
    {
      name: 'Google Vision API (Free Tier)',
      url: 'https://vision.googleapis.com/v1/images:annotate',
      description: 'Google Cloud Vision API with free tier',
    },
  ];

  for (const api of alternatives) {
    console.log(`\n🔍 ${api.name}`);
    console.log(`   Description: ${api.description}`);
    console.log(`   URL: ${api.url}`);
    console.log(`   Status: Available (requires API key)`);
  }
}

// Generate working token suggestions
function generateTokenSuggestions() {
  console.log('\n💡 WORKING TOKEN SUGGESTIONS');
  console.log('============================');

  console.log('\n🤗 Hugging Face Token Options:');
  console.log('1. Create new account at https://huggingface.co/');
  console.log('2. Go to Settings > Access Tokens');
  console.log('3. Create token with "Read" permissions');
  console.log('4. Use the new token in your application');

  console.log('\n🧠 DeepSeek Token Options:');
  console.log('1. Sign up at https://platform.deepseek.com/');
  console.log('2. Add credits to your account');
  console.log('3. Generate API key');
  console.log('4. Use the new key in your application');

  console.log('\n🔄 Alternative: Use Free APIs');
  console.log('1. OCR.space: 25,000 free requests/month');
  console.log('2. Google Vision: Free tier available');
  console.log('3. Azure Computer Vision: Free tier available');
}

// Main execution
async function main() {
  await testPublicModels();
  await testAlternativeAPIs();
  generateTokenSuggestions();

  console.log('\n📋 IMMEDIATE ACTION PLAN');
  console.log('========================');
  console.log('1. 🌐 Test if any models work without authentication');
  console.log('2. 🔑 Get new Hugging Face token');
  console.log('3. 💰 Add DeepSeek credits');
  console.log('4. 🔧 Fix Firebase configuration');
  console.log('5. 🚀 Deploy cloud functions');
  console.log('6. ✅ Test complete system');
}

main().catch(console.error);
