// Create Working Tokens and Fix Firebase Issues
const https = require('https');

console.log('🔧 CREATING WORKING TOKENS AND FIXING FIREBASE');
console.log('==============================================\n');

// Test if we can create a working Hugging Face token
async function createWorkingHuggingFaceToken() {
  console.log('🤗 CREATING WORKING HUGGING FACE TOKEN');
  console.log('=====================================');

  console.log('Step 1: Go to https://huggingface.co/settings/tokens');
  console.log('Step 2: Sign in to your account');
  console.log('Step 3: Click "New token"');
  console.log('Step 4: Name: "DocVault AI Service"');
  console.log('Step 5: Type: "Read"');
  console.log('Step 6: Click "Generate a token"');
  console.log('Step 7: Copy the token (starts with hf_)');
  console.log('Step 8: Paste it here and press Enter\n');

  // For now, let's test with a public model
  console.log('Testing public model access...');

  try {
    const response = await new Promise((resolve, reject) => {
      const req = https.request(
        'https://api-inference.huggingface.co/models/microsoft/trocr-base-printed',
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

    console.log(`Public model status: ${response.status}`);

    if (response.status === 401) {
      console.log('✅ Authentication required (this is expected)');
      console.log('   You need a valid token to access the models.');
    } else if (response.status === 200) {
      console.log('✅ Public access works (unexpected but good!)');
    } else {
      console.log(`⚠️ Unexpected status: ${response.status}`);
    }
  } catch (error) {
    console.log(`❌ Test failed: ${error.message}`);
  }
}

// Fix Firebase configuration
async function fixFirebaseConfiguration() {
  console.log('\n🔥 FIXING FIREBASE CONFIGURATION');
  console.log('=================================');

  console.log("The errors you're seeing suggest:");
  console.log('1. ERR_QUIC_PROTOCOL_ERROR: Network/protocol issue');
  console.log('2. ERR_ADDRESS_UNREACHABLE: Firebase services not accessible');
  console.log('3. This could be due to:');
  console.log('   - Network connectivity issues');
  console.log('   - Firebase project configuration');
  console.log('   - Firewall/proxy blocking');
  console.log('   - Firebase project not properly set up\n');

  console.log('Firebase Fix Steps:');
  console.log('1. Check Firebase project status');
  console.log('2. Verify Firebase configuration');
  console.log('3. Check network connectivity');
  console.log('4. Redeploy Firebase functions');
  console.log('5. Test Firebase services\n');
}

// Create a working configuration
function createWorkingConfiguration() {
  console.log('⚙️ CREATING WORKING CONFIGURATION');
  console.log('=================================');

  console.log("Here's what we need to do:");
  console.log('');
  console.log('1. 🤗 Get new Hugging Face token:');
  console.log('   - Go to https://huggingface.co/settings/tokens');
  console.log('   - Create new token with Read permissions');
  console.log('   - Update functions/src/huggingFaceAIService.ts');
  console.log('');
  console.log('2. 🧠 Get new DeepSeek token:');
  console.log('   - Go to https://platform.deepseek.com/');
  console.log('   - Add credits to your account');
  console.log('   - Generate new API key');
  console.log('   - Update functions/src/deepseekService.ts');
  console.log('');
  console.log('3. 🔥 Fix Firebase:');
  console.log('   - Check Firebase project configuration');
  console.log('   - Redeploy functions');
  console.log('   - Test Firebase services');
  console.log('');
  console.log('4. 🚀 Deploy and test:');
  console.log('   - Deploy cloud functions');
  console.log('   - Test all AI services');
  console.log('   - Verify complete system');
}

// Test current Firebase status
async function testFirebaseStatus() {
  console.log('\n🔥 TESTING FIREBASE STATUS');
  console.log('==========================');

  try {
    const response = await new Promise((resolve, reject) => {
      const req = https.request(
        'https://us-central1-gpt1-77ce0.cloudfunctions.net',
        res => {
          resolve({ status: res.statusCode, headers: res.headers });
        }
      );
      req.on('error', reject);
      req.end();
    });

    console.log(`Firebase base URL status: ${response.status}`);

    if (response.status === 404) {
      console.log('⚠️ Firebase base URL returns 404 (this might be normal)');
    } else {
      console.log(`✅ Firebase base URL accessible: ${response.status}`);
    }
  } catch (error) {
    console.log(`❌ Firebase test failed: ${error.message}`);
    console.log('   This suggests network or configuration issues');
  }
}

// Main execution
async function main() {
  await createWorkingHuggingFaceToken();
  await fixFirebaseConfiguration();
  await testFirebaseStatus();
  createWorkingConfiguration();

  console.log('\n📋 IMMEDIATE NEXT STEPS');
  console.log('=======================');
  console.log('1. 🔑 Get new Hugging Face token (5 minutes)');
  console.log('2. 💰 Add DeepSeek credits (10 minutes)');
  console.log('3. 🔧 Fix Firebase configuration (15 minutes)');
  console.log('4. 🚀 Deploy and test (10 minutes)');
  console.log('');
  console.log('Total time: ~40 minutes');
  console.log('Result: Fully working AI system with cloud functions!');
}

main().catch(console.error);
