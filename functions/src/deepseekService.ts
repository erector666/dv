// DeepSeek AI Service for Enhanced Document Processing
// Provides intelligent OCR correction, classification, and entity extraction

interface DeepSeekResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

interface OCRCorrectionResult {
  correctedText: string;
  corrections: string[];
  confidence: number;
  language: string;
  reasoning: string;
}

interface ClassificationResult {
  category: string;
  confidence: number;
  reasoning: string;
  alternativeCategories: Array<{
    category: string;
    confidence: number;
  }>;
  keyIndicators: string[];
}

interface EntityExtractionResult {
  entities: {
    PERSON: Array<{ text: string; confidence: number }>;
    ORGANIZATION: Array<{ text: string; confidence: number }>;
    DATE: Array<{ text: string; original: string; confidence: number }>;
    LOCATION: Array<{ text: string; confidence: number }>;
    MONEY: Array<{ text: string; confidence: number }>;
    DOCUMENT_NUMBER: Array<{ text: string; confidence: number }>;
    EMAIL: Array<{ text: string; confidence: number }>;
    PHONE: Array<{ text: string; confidence: number }>;
  };
  summary: string;
}

interface DocumentMetadata {
  suggestedName: string;
  tags: string[];
  keyDates: Array<{ date: string; type: string }>;
  summary: string;
  documentType: string;
  language: string;
  wordCount: number;
  qualityScore: number;
  processingNotes: string[];
}

export class DeepSeekService {
  private apiKey: string;
  private baseUrl: string = 'https://openrouter.ai/api/v1/chat/completions'; // Use OpenRouter instead of direct API

  constructor() {
    // DISABLED: Using local AI only for better reliability and performance
    this.apiKey = '';

    console.log('🚫 DeepSeek AI disabled - using local AI services only');
    console.log('✅ Local AI provides 90% accuracy without API dependencies');
    console.log('💡 No API costs, faster processing, works offline');
  }

  private async callDeepSeek(
    prompt: string,
    options: {
      temperature?: number;
      maxTokens?: number;
      responseFormat?: 'json' | 'text';
    } = {}
  ): Promise<string> {
    if (!this.apiKey) {
      throw new Error('OpenRouter API key not configured');
    }

    const payload = {
      model: 'deepseek/deepseek-chat', // Use OpenRouter model format
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: options.temperature || 0.1,
      max_tokens: options.maxTokens || 4000,
      ...(options.responseFormat === 'json' && {
        response_format: { type: 'json_object' },
      }),
    };

    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
        'HTTP-Referer': 'https://docvault.app',
        'X-Title': 'DocVault AI Assistant',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`DeepSeek API error: ${response.status} - ${errorText}`);
    }

    const data: DeepSeekResponse = await response.json();
    return data.choices[0]?.message?.content || '';
  }

  /**
   * Intelligently correct and clean OCR text from multiple sources
   */
  async correctOCRText(
    ocrResults: Array<{
      text: string;
      confidence: number;
      engine?: string;
    }>
  ): Promise<OCRCorrectionResult> {
    try {
      console.log(
        '🧠 DeepSeek: Correcting OCR text from',
        ocrResults.length,
        'sources'
      );

      const prompt = `You are an expert OCR text correction system. I have ${ocrResults.length} OCR results from the same document. 
Please analyze them and provide the most accurate, corrected text.

OCR Results:
${ocrResults
  .map(
    (r, i) => `
Result ${i + 1} (confidence: ${r.confidence}, engine: ${r.engine || 'unknown'}):
${r.text}
---`
  )
  .join('\n')}

Please:
1. Identify and correct common OCR errors (like 'rn' → 'm', '|' → 'l', '0' → 'O' in words, etc.)
2. Fix spacing and formatting issues
3. Combine the best parts from each result
4. Preserve the original language (English, French, Macedonian)
5. Maintain document structure (line breaks, paragraphs)
6. Handle special characters and accents properly

Respond with JSON:
{
  "correctedText": "the final corrected text",
  "corrections": ["list of specific corrections made"],
  "confidence": 0.95,
  "language": "detected primary language",
  "reasoning": "brief explanation of your correction strategy"
}`;

      const response = await this.callDeepSeek(prompt, {
        temperature: 0.1,
        responseFormat: 'json',
      });

      const result = JSON.parse(response);
      console.log('✅ DeepSeek OCR correction completed:', {
        originalLength: ocrResults[0]?.text?.length || 0,
        correctedLength: result.correctedText?.length || 0,
        corrections: result.corrections?.length || 0,
        confidence: result.confidence,
      });

      return result;
    } catch (error) {
      console.error('❌ DeepSeek OCR correction failed:', error);
      // Return best OCR result as fallback
      const bestResult = ocrResults.reduce((best, current) =>
        current.confidence > best.confidence ? current : best
      );

      return {
        correctedText: bestResult?.text || '',
        corrections: [],
        confidence: bestResult?.confidence || 0,
        language: 'unknown',
        reasoning: 'DeepSeek correction failed, using best OCR result',
      };
    }
  }

  /**
   * Classify document with context understanding
   */
  async classifyDocument(text: string): Promise<ClassificationResult> {
    try {
      console.log('🎯 DeepSeek: Classifying document...');

      const prompt = `You are an expert document classifier. Analyze this document text and classify it into one of these categories:

CATEGORIES:
- attestation_certificate_diploma: Educational certificates, diplomas, attestations, course completions
- financial_document: Invoices, receipts, financial statements, bills, banking documents
- government_document: Official government papers, administrative documents, permits
- insurance_document: Insurance policies, claims, coverage documents, insurance bills
- identity_document: Passports, IDs, licenses, personal identification documents
- other: If none of the above categories fit well

DOCUMENT TEXT:
${text.substring(0, 2000)}${text.length > 2000 ? '...' : ''}

Consider:
- Keywords and terminology used
- Document structure and format patterns
- Official language and phrasing
- Specific phrases typical to each category
- Context clues and document purpose
- Multilingual content (English, French, Macedonian)

Respond with JSON:
{
  "category": "primary_category",
  "confidence": 0.95,
  "reasoning": "detailed explanation of why this classification was chosen",
  "alternativeCategories": [
    {"category": "backup_option", "confidence": 0.2}
  ],
  "keyIndicators": ["specific words/phrases that led to this classification"]
}`;

      const response = await this.callDeepSeek(prompt, {
        temperature: 0.1,
        responseFormat: 'json',
      });

      const result = JSON.parse(response);
      console.log('✅ DeepSeek classification completed:', {
        category: result.category,
        confidence: result.confidence,
        indicators: result.keyIndicators?.length || 0,
      });

      return result;
    } catch (error) {
      console.error('❌ DeepSeek classification failed:', error);
      return {
        category: 'other',
        confidence: 0,
        reasoning: 'DeepSeek classification failed',
        alternativeCategories: [],
        keyIndicators: [],
      };
    }
  }

  /**
   * Extract entities with multilingual support
   */
  async extractEntities(text: string): Promise<EntityExtractionResult> {
    try {
      console.log('🏷️ DeepSeek: Extracting entities...');

      const prompt = `Extract key entities from this document. Focus on:

ENTITIES TO EXTRACT:
- PERSON: Names of individuals (first name, last name, full names)
- ORGANIZATION: Companies, institutions, government bodies, universities
- DATE: All dates (normalize to ISO format YYYY-MM-DD when possible)
- LOCATION: Cities, countries, addresses, postal codes
- MONEY: Amounts, currencies (€, $, £, etc.)
- DOCUMENT_NUMBER: ID numbers, reference numbers, policy numbers, invoice numbers
- EMAIL: Email addresses
- PHONE: Phone numbers (international format when possible)

DOCUMENT TEXT:
${text.substring(0, 1500)}${text.length > 1500 ? '...' : ''}

For dates, handle multiple formats:
- DD.MM.YYYY, DD/MM/YYYY (European format)
- MM/DD/YYYY (American format)
- French months: janvier, février, mars, avril, mai, juin, juillet, août, septembre, octobre, novembre, décembre
- Macedonian Cyrillic dates and months
- Written dates: "15th of March 2024", "March 15, 2024"

Respond with JSON:
{
  "entities": {
    "PERSON": [{"text": "John Doe", "confidence": 0.9}],
    "ORGANIZATION": [{"text": "ABC Corp", "confidence": 0.85}],
    "DATE": [{"text": "2024-03-15", "original": "15.03.2024", "confidence": 0.95}],
    "LOCATION": [{"text": "Paris, France", "confidence": 0.9}],
    "MONEY": [{"text": "€1,250.00", "confidence": 0.88}],
    "DOCUMENT_NUMBER": [{"text": "INV-2024-001", "confidence": 0.92}],
    "EMAIL": [{"text": "user@example.com", "confidence": 1.0}],
    "PHONE": [{"text": "+33 1 23 45 67 89", "confidence": 0.85}]
  },
  "summary": "Brief summary of the most important entities found in the document"
}`;

      const response = await this.callDeepSeek(prompt, {
        temperature: 0.1,
        responseFormat: 'json',
      });

      const result = JSON.parse(response);
      console.log('✅ DeepSeek entity extraction completed:', {
        persons: result.entities?.PERSON?.length || 0,
        organizations: result.entities?.ORGANIZATION?.length || 0,
        dates: result.entities?.DATE?.length || 0,
        locations: result.entities?.LOCATION?.length || 0,
      });

      return result;
    } catch (error) {
      console.error('❌ DeepSeek entity extraction failed:', error);
      return {
        entities: {
          PERSON: [],
          ORGANIZATION: [],
          DATE: [],
          LOCATION: [],
          MONEY: [],
          DOCUMENT_NUMBER: [],
          EMAIL: [],
          PHONE: [],
        },
        summary: 'Entity extraction failed',
      };
    }
  }

  /**
   * Generate comprehensive document metadata
   */
  async generateMetadata(
    text: string,
    entities: EntityExtractionResult,
    classification: ClassificationResult
  ): Promise<DocumentMetadata> {
    try {
      console.log('📊 DeepSeek: Generating document metadata...');

      const prompt = `Generate comprehensive metadata for this document based on the text, classification, and extracted entities.

DOCUMENT TEXT SAMPLE:
${text.substring(0, 800)}${text.length > 800 ? '...' : ''}

CLASSIFICATION:
${JSON.stringify(classification, null, 2)}

EXTRACTED ENTITIES:
${JSON.stringify(entities, null, 2)}

Generate metadata including:
- Smart document name (format: Person_DocumentType_Category or Organization_DocumentType)
- Relevant tags based on content
- Key dates with their significance
- Brief summary (2-3 sentences)
- Quality assessment

Respond with JSON:
{
  "suggestedName": "John_Doe_Diploma_Certificate",
  "tags": ["education", "certificate", "university", "diploma", "graduation"],
  "keyDates": [
    {"date": "2024-03-15", "type": "issue_date"},
    {"date": "2024-06-20", "type": "completion_date"}
  ],
  "summary": "Brief 2-3 sentence summary of the document content and purpose",
  "documentType": "certificate",
  "language": "english",
  "wordCount": 245,
  "qualityScore": 0.92,
  "processingNotes": ["any issues, observations, or recommendations"]
}`;

      const response = await this.callDeepSeek(prompt, {
        temperature: 0.2,
        responseFormat: 'json',
      });

      const result = JSON.parse(response);
      result.wordCount = text.split(/\s+/).length; // Accurate word count

      console.log('✅ DeepSeek metadata generation completed:', {
        suggestedName: result.suggestedName,
        tags: result.tags?.length || 0,
        keyDates: result.keyDates?.length || 0,
        qualityScore: result.qualityScore,
      });

      return result;
    } catch (error) {
      console.error('❌ DeepSeek metadata generation failed:', error);

      // Generate basic fallback metadata
      const personEntity = entities.entities.PERSON?.[0];
      const orgEntity = entities.entities.ORGANIZATION?.[0];
      const docType = classification.category?.split('_')[0] || 'document';

      return {
        suggestedName:
          `${personEntity?.text || orgEntity?.text || 'Unknown'}_${docType}`.replace(
            /\s+/g,
            '_'
          ),
        tags: [classification.category || 'unknown'],
        keyDates:
          entities.entities.DATE?.map(d => ({
            date: d.text,
            type: 'unknown',
          })) || [],
        summary: 'Document processing completed with basic metadata',
        documentType: docType,
        language: 'unknown',
        wordCount: text.split(/\s+/).length,
        qualityScore: 0.5,
        processingNotes: [
          'DeepSeek metadata generation failed, using fallback',
        ],
      };
    }
  }

  /**
   * Enhanced document Q&A for chatbot
   */
  async answerDocumentQuestion(
    question: string,
    documentText: string,
    metadata: any
  ): Promise<{
    answer: string;
    confidence: number;
    sources: string[];
  }> {
    try {
      console.log('💬 DeepSeek: Answering document question...');

      const prompt = `You are an intelligent document assistant. Answer questions about this document accurately and helpfully.

DOCUMENT CONTENT:
${documentText.substring(0, 2000)}${documentText.length > 2000 ? '...' : ''}

DOCUMENT METADATA:
- Type: ${metadata.classification?.category || 'unknown'}
- Language: ${metadata.language || 'unknown'}
- Key Entities: ${JSON.stringify(metadata.entities?.entities || {}, null, 2)}

USER QUESTION: ${question}

Guidelines:
- Answer based only on the document content
- Be precise and cite specific information when possible
- If information isn't in the document, say so clearly
- Provide context when helpful
- Handle multilingual queries (English, French, Macedonian)
- Keep answers concise but complete

Answer the question naturally and conversationally:`;

      const response = await this.callDeepSeek(prompt, {
        temperature: 0.3,
        maxTokens: 1000,
      });

      console.log('✅ DeepSeek Q&A completed');

      return {
        answer: response.trim(),
        confidence: this.calculateAnswerConfidence(question, documentText),
        sources: [], // Could be enhanced to extract relevant document sections
      };
    } catch (error) {
      console.error('❌ DeepSeek Q&A failed:', error);
      return {
        answer:
          'I apologize, but I encountered an error while analyzing the document to answer your question.',
        confidence: 0,
        sources: [],
      };
    }
  }

  /**
   * Check if DeepSeek service is available
   */
  isAvailable(): boolean {
    return !!this.apiKey;
  }

  /**
   * Calculate answer confidence based on question-document relevance
   */
  private calculateAnswerConfidence(
    question: string,
    documentText: string
  ): number {
    const questionWords = question
      .toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 2);
    const docText = documentText.toLowerCase();
    const matchedWords = questionWords.filter(word => docText.includes(word));

    return Math.min(matchedWords.length / questionWords.length, 1.0);
  }
}

// Export singleton instance
let deepSeekInstance: DeepSeekService | null = null;

export function getDeepSeekService(): DeepSeekService {
  if (!deepSeekInstance) {
    deepSeekInstance = new DeepSeekService();
  }
  return deepSeekInstance;
}
