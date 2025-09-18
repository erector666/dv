// Dorian Intelligence Test Script
// This script tests Dorian's conversational abilities

const testQuestions = [
  // Intent Recognition Tests
  {
    category: 'Document Search',
    question: 'Find my tax documents from 2023',
    expectedIntent: 'document_search',
    expectedFeatures: [
      'search suggestions',
      'actionable buttons',
      'specific response',
    ],
  },

  {
    category: 'Upload Assistance',
    question: 'How do I upload a new document?',
    expectedIntent: 'document_upload',
    expectedFeatures: [
      'step-by-step guidance',
      'upload button',
      'category suggestions',
    ],
  },

  {
    category: 'App Help',
    question: 'What can this app do?',
    expectedIntent: 'app_help',
    expectedFeatures: [
      'feature explanation',
      'tutorial suggestions',
      'comprehensive info',
    ],
  },

  {
    category: 'Document Management',
    question: 'Show me my recent files',
    expectedIntent: 'document_management',
    expectedFeatures: [
      'recent documents',
      'organization tips',
      'management actions',
    ],
  },

  {
    category: 'General Conversation',
    question: 'Hello, how are you today?',
    expectedIntent: 'general_conversation',
    expectedFeatures: [
      'friendly greeting',
      'context awareness',
      'helpful offer',
    ],
  },

  // Context and Intelligence Tests
  {
    category: 'Follow-up Question',
    question: 'What about PDF files specifically?',
    expectedIntent: 'contextual_follow_up',
    expectedFeatures: [
      'remembers previous context',
      'specific PDF info',
      'relevant suggestions',
    ],
  },

  {
    category: 'Complex Query',
    question:
      'I need to organize my medical documents by date and find the most recent one',
    expectedIntent: 'complex_document_management',
    expectedFeatures: [
      'understands multiple tasks',
      'prioritizes actions',
      'specific guidance',
    ],
  },

  // Multi-language Tests
  {
    category: 'Macedonian Language',
    question: 'Здраво, можеш ли да ми помогнеш?',
    expectedIntent: 'multilingual_help',
    expectedFeatures: [
      'responds in Macedonian',
      'maintains personality',
      'offers help',
    ],
  },

  {
    category: 'French Language',
    question: 'Comment puis-je télécharger un document?',
    expectedIntent: 'multilingual_upload',
    expectedFeatures: [
      'responds in French',
      'upload guidance',
      'maintains Dorian identity',
    ],
  },
];

console.log('🤖 DORIAN INTELLIGENCE TEST PLAN');
console.log('='.repeat(50));

testQuestions.forEach((test, index) => {
  console.log(`\n${index + 1}. ${test.category}`);
  console.log(`   Question: "${test.question}"`);
  console.log(`   Expected Intent: ${test.expectedIntent}`);
  console.log(`   Expected Features: ${test.expectedFeatures.join(', ')}`);
});

console.log('\n' + '='.repeat(50));
console.log('📋 TEST EVALUATION CRITERIA:');
console.log('✅ SMART: Contextual, specific responses with actions');
console.log('⚠️  BASIC: Generic responses but functional');
console.log('❌ BROKEN: Fallback responses only');

console.log('\n🎯 READY TO TEST DORIAN!');
console.log(
  'Open your app and try these questions to evaluate his intelligence.'
);
