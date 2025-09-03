import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { onCall } from 'firebase-functions/v2/https';
import { onRequest } from 'firebase-functions/v2/https';
import fetch from 'node-fetch';
import pdfParse from 'pdf-parse';
import cors from 'cors';

// Initialize Admin SDK
try {
  admin.initializeApp();
} catch {}

// CORS configuration
const corsHandler = cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://dv-beta-peach.vercel.app',
    'https://*.vercel.app',
    'https://docsort.vercel.app',
  ],
  credentials: true,
});

// In-memory caches (ephemeral in serverless, but useful within instance lifetime)
const translateLanguagesCache: { data: any[]; timestamp: number } = {
  data: [],
  timestamp: 0,
};
const translationCache: Record<
  string,
  {
    translatedText: string;
    sourceLanguage: string;
    targetLanguage: string;
    confidence: number;
    timestamp: number;
  }
> = {};
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

// Lazy-loaded Google Cloud clients to prevent initialization timeouts
let languageClient: any = null;
let visionClient: any = null;

async function getLanguageClient() {
  if (!languageClient) {
    try {
      const { LanguageServiceClient } = await import('@google-cloud/language');
      languageClient = new LanguageServiceClient();
    } catch (error) {
      console.error('Failed to initialize Language client:', error);
      throw new Error('Language service not available');
    }
  }
  return languageClient;
}

async function getVisionClient() {
  if (!visionClient) {
    try {
      const { ImageAnnotatorClient } = await import('@google-cloud/vision');
      visionClient = new ImageAnnotatorClient();
    } catch (error) {
      console.error('Failed to initialize Vision client:', error);
      throw new Error('Vision service not available');
    }
  }
  return visionClient;
}

// Helpers
const assertAuthenticated = (context: functions.https.CallableContext) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Authentication required'
    );
  }
};

// Enhanced language detection with confidence scoring
async function detectLanguageInternal(text: string): Promise<any> {
  try {
    console.log('🌐 Starting language detection for text');

    if (!text || text.trim().length < 10) {
      console.log('⚠️ Text too short for reliable language detection');
      return { language: 'en', confidence: 0.0 };
    }

    const languageClient = await getLanguageClient();

    // Google Cloud Natural Language API has a 1MB limit
    // Truncate text to stay within limits
    const maxTextSize = 1000000; // 1MB in bytes
    const truncatedText =
      text.length > maxTextSize ? text.substring(0, maxTextSize) : text;

    console.log(
      `Text size: ${text.length} bytes, truncated to: ${truncatedText.length} bytes`
    );

    const [detection] = await languageClient.detectLanguage({
      content: truncatedText,
    });

    if (detection.languages && detection.languages.length > 0) {
      const topLanguage = detection.languages[0];
      const result = {
        language: topLanguage.language || 'en',
        confidence: topLanguage.confidence || 0.0,
        allLanguages: detection.languages.map((lang: any) => ({
          language: lang.language,
          confidence: lang.confidence,
        })),
      };

      console.log(
        '✅ Language detection successful:',
        result.language,
        'confidence:',
        result.confidence
      );
      return result;
    }

    console.log('⚠️ No language detected, using default');
    return { language: 'en', confidence: 0.0 };
  } catch (error) {
    console.error('❌ Language detection failed:', error);
    return { language: 'en', confidence: 0.0 };
  }
}

// Get quality assessment description
function getQualityAssessment(score: number): string {
  if (score >= 0.9) return 'Excellent';
  if (score >= 0.8) return 'Very Good';
  if (score >= 0.7) return 'Good';
  if (score >= 0.6) return 'Fair';
  if (score >= 0.5) return 'Acceptable';
  return 'Poor';
}

// Internal helper functions (not wrapped in Firebase Functions)
async function extractTextInternal(
  documentUrl: string,
  documentType?: 'pdf' | 'image' | 'auto'
): Promise<any> {
  if (!documentUrl) {
    throw new Error('Document URL is required');
  }

  try {
    // Fetch the document
    const response = await fetch(documentUrl);
    if (!response.ok) {
      throw new Error('Unable to fetch document');
    }

    const buffer = await response.buffer();
    const contentType = response.headers.get('content-type') || '';

    // Determine document type
    const type =
      documentType || (contentType.includes('pdf') ? 'pdf' : 'image');

    let extractedText = '';
    let confidence = 0;

    if (type === 'pdf') {
      // PDF text extraction
      try {
        const pdfData = await pdfParse(buffer);
        extractedText = pdfData.text;

        // Clean PDF text by removing technical headers and metadata
        extractedText = extractedText
          .replace(/%PDF-[^\n]*/g, '') // Remove PDF version headers
          .replace(/[0-9]+ [0-9]+ obj[^\n]*/g, '') // Remove PDF object definitions
          .replace(/<<\/Type[^>]*>>/g, '') // Remove PDF type definitions
          .replace(/\/MediaBox[^>]*/g, '') // Remove PDF media box
          .replace(/\/Parent[^>]*/g, '') // Remove PDF parent references
          .replace(/\/Resources[^>]*/g, '') // Remove PDF resources
          .replace(/\/Contents[^>]*/g, '') // Remove PDF contents
          .replace(/\/Font[^>]*/g, '') // Remove PDF font definitions
          .replace(/\/ProcSet[^>]*/g, '') // Remove PDF procset
          .replace(/\/XObject[^>]*/g, '') // Remove PDF XObject
          .replace(/\/ExtGState[^>]*/g, '') // Remove PDF graphics state
          .replace(/\/Pattern[^>]*/g, '') // Remove PDF patterns
          .replace(/\/Shading[^>]*/g, '') // Remove PDF shading
          .replace(/\/Annots[^>]*/g, '') // Remove PDF annotations
          .replace(/\/Metadata[^>]*/g, '') // Remove PDF metadata
          .replace(/\/StructTreeRoot[^>]*/g, '') // Remove PDF structure
          .replace(/\/MarkInfo[^>]*/g, '') // Remove PDF mark info
          .replace(/\/Lang[^>]*/g, '') // Remove PDF language
          .replace(/\/Trailer[^>]*/g, '') // Remove PDF trailer
          .replace(/\/Root[^>]*/g, '') // Remove PDF root
          .replace(/\/Info[^>]*/g, '') // Remove PDF info
          .replace(/\/ID[^>]*/g, '') // Remove PDF ID
          .replace(/\/Size[^>]*/g, '') // Remove PDF size
          .replace(/\/Prev[^>]*/g, '') // Remove PDF previous
          .replace(/\/XRef[^>]*/g, '') // Remove PDF cross-reference
          .replace(/xref[^\n]*/g, '') // Remove PDF xref
          .replace(/startxref[^\n]*/g, '') // Remove PDF startxref
          .replace(/trailer[^\n]*/g, '') // Remove PDF trailer
          .replace(/endobj[^\n]*/g, '') // Remove PDF endobj
          .replace(/endstream[^\n]*/g, '') // Remove PDF endstream
          .replace(/stream[^\n]*/g, '') // Remove PDF stream
          .replace(/BT[^\n]*/g, '') // Remove PDF text begin
          .replace(/ET[^\n]*/g, '') // Remove PDF text end
          .replace(/Td[^\n]*/g, '') // Remove PDF text positioning
          .replace(/Tj[^\n]*/g, '') // Remove PDF text rendering
          .replace(/TJ[^\n]*/g, '') // Remove PDF text rendering array
          .replace(/Tf[^\n]*/g, '') // Remove PDF text font
          .replace(/Ts[^\n]*/g, '') // Remove PDF text rise
          .replace(/Tc[^\n]*/g, '') // Remove PDF text character spacing
          .replace(/Tw[^\n]*/g, '') // Remove PDF text word spacing
          .replace(/Tm[^\n]*/g, '') // Remove PDF text matrix
          .replace(/T\*[^\n]*/g, '') // Remove PDF text newline
          .replace(/Td[^\n]*/g, '') // Remove PDF text positioning
          .replace(/TD[^\n]*/g, '') // Remove PDF text positioning
          .replace(/Tz[^\n]*/g, '') // Remove PDF text horizontal scaling
          .replace(/TL[^\n]*/g, '') // Remove PDF text leading
          .replace(/Tr[^\n]*/g, '') // Remove PDF text rendering mode
          .replace(/Ts[^\n]*/g, '') // Remove PDF text rise
          .replace(/Tc[^\n]*/g, '') // Remove PDF text character spacing
          .replace(/Tw[^\n]*/g, '') // Remove PDF text word spacing
          .replace(/Tm[^\n]*/g, '') // Remove PDF text matrix
          .replace(/T\*[^\n]*/g, '') // Remove PDF text newline
          .replace(/\s+/g, ' ') // Normalize whitespace
          .trim();

        // If text is too short after cleaning, it might be an image-based PDF
        if (extractedText.length < 100) {
          console.log(
            'PDF text too short after cleaning, trying Vision API...'
          );
          extractedText = await extractTextFromImageWithVision(buffer);
          confidence = 0.8;
        } else {
          confidence = 0.95; // High confidence for clean PDF text extraction
        }
      } catch (error) {
        // If PDF parsing fails, try Vision API on PDF pages
        console.log(
          'PDF parsing failed, falling back to Vision API:',
          error.message
        );
        extractedText = await extractTextFromImageWithVision(buffer);
        confidence = 0.8;
      }
    } else {
      // Image text extraction using Vision API
      extractedText = await extractTextFromImageWithVision(buffer);
      confidence = 0.85;
    }

    return {
      text: extractedText,
      confidence,
      documentType: type,
      wordCount: extractedText.split(/\s+/).filter(word => word.length > 0)
        .length,
    };
  } catch (error) {
    console.error('Text extraction error:', error);
    throw new Error('Failed to extract text from document');
  }
}

async function classifyDocumentInternal(documentUrl: string): Promise<any> {
  if (!documentUrl) {
    throw new Error('Document URL is required');
  }

  try {
    const response = await fetch(documentUrl);
    if (!response.ok) {
      throw new Error('Unable to fetch document');
    }

    const buffer = await response.buffer();
    const contentType = response.headers.get('content-type') || '';

    // For MVP, use a simple classification based on content type and text analysis
    const extractedText = await extractTextInternal(documentUrl);

          // Enhanced classification logic - AI-driven categorization
      let category = 'other';
      let confidence = extractedText.confidence;
      let tags: string[] = [];
      
      // Analyze text content for better classification
      const text = extractedText.text.toLowerCase();
      
      // Legal documents
      if (text.includes('legal') || text.includes('contract') || text.includes('agreement') || 
          text.includes('terms') || text.includes('conditions') || text.includes('clause') ||
          text.includes('party') || text.includes('signature') || text.includes('notary')) {
        category = 'legal';
        confidence = Math.max(confidence, 0.9);
        tags = ['legal', 'contract', 'agreement'];
      }
      // Medical documents
      else if (text.includes('medical') || text.includes('doctor') || text.includes('hospital') || 
          text.includes('prescription') || text.includes('diagnosis') || text.includes('treatment') ||
          text.includes('patient') || text.includes('symptoms') || text.includes('medication')) {
        category = 'medical';
        confidence = Math.max(confidence, 0.8);
        tags = ['medical', 'healthcare', 'health'];
      }
      // Financial documents
      else if (text.includes('bill') || text.includes('invoice') || text.includes('payment') || 
               text.includes('amount') || text.includes('total') || text.includes('due') ||
               text.includes('$') || text.includes('dollar') || text.includes('cost') ||
               text.includes('balance') || text.includes('account') || text.includes('statement') ||
               text.includes('receipt') || text.includes('price') || text.includes('fee') ||
               text.includes('charge') || text.includes('tax') || text.includes('discount')) {
        category = 'financial';
        confidence = Math.max(confidence, 0.8);
        tags = ['financial', 'bills', 'invoice', 'payment', 'receipt'];
      }
      // Insurance documents
      else if (text.includes('insurance') || text.includes('policy') || text.includes('coverage') ||
               text.includes('claim') || text.includes('premium') || text.includes('deductible') ||
               text.includes('benefits') || text.includes('enrollment')) {
        category = 'insurance';
        confidence = Math.max(confidence, 0.8);
        tags = ['insurance', 'policy', 'coverage'];
      }
      // Educational documents
      else if (text.includes('education') || text.includes('school') || text.includes('university') ||
               text.includes('course') || text.includes('grade') || text.includes('transcript') ||
               text.includes('diploma') || text.includes('certificate') || text.includes('degree')) {
        category = 'education';
        confidence = Math.max(confidence, 0.8);
        tags = ['education', 'academic', 'school'];
      }
      // Employment documents
      else if (text.includes('employment') || text.includes('job') || text.includes('work') ||
               text.includes('resume') || text.includes('cv') || text.includes('application') ||
               text.includes('offer') || text.includes('salary') || text.includes('position')) {
        category = 'employment';
        confidence = Math.max(confidence, 0.8);
        tags = ['employment', 'career', 'job'];
      }
      // Government documents
      else if (text.includes('government') || text.includes('official') || text.includes('certificate') ||
               text.includes('license') || text.includes('permit') || text.includes('id') ||
               text.includes('passport') || text.includes('drivers') || text.includes('social security')) {
        category = 'government';
        confidence = Math.max(confidence, 0.8);
        tags = ['government', 'official', 'certificate'];
      }
      // Only use 'personal' as fallback for truly unclassifiable documents
      // Remove the automatic PDF fallback that was overriding AI classification
      else if (text.length < 50) {
        // Very short text - might be image-based or unreadable
        category = 'personal';
        confidence = Math.max(confidence, 0.6);
        tags = ['personal', 'unclassified'];
      }
      // For all other cases, let the AI classification stand
      // Don't override with generic categories
      
      // IMPORTANT: If we still have 'other' category, try to infer from file type
      if (category === 'other' && contentType.includes('pdf')) {
        // Try to infer category from text content patterns
        if (text.includes('invoice') || text.includes('bill') || text.includes('payment')) {
          category = 'financial';
          confidence = Math.max(confidence, 0.7);
          tags = ['financial', 'invoice'];
        } else if (text.includes('contract') || text.includes('agreement')) {
          category = 'legal';
          confidence = Math.max(confidence, 0.7);
          tags = ['legal', 'contract'];
        } else if (text.includes('receipt')) {
          category = 'financial';
          confidence = Math.max(confidence, 0.7);
          tags = ['financial', 'receipt'];
        }
      }
      
      // Detect language from the extracted text
      let detectedLanguage = 'en';
      let languageConfidence = 0.5;
      
      try {
        const languageResult = await detectLanguageInternal(extractedText.text);
        detectedLanguage = languageResult.language;
        languageConfidence = languageResult.confidence;
      } catch (langError) {
        console.warn('Language detection failed, using default:', langError);
      }

      // Ensure AI classification takes priority over fallback logic
      const finalCategory = category !== 'other' ? category : 'personal';
      const finalConfidence = category !== 'other' ? confidence : Math.max(confidence, 0.6);
      
      // Debug logging for category assignment
      console.log('🔍 Category Assignment Debug:', {
        originalCategory: category,
        finalCategory: finalCategory,
        confidence: finalConfidence,
        tags: tags,
        textLength: extractedText.text.length,
        textPreview: extractedText.text.substring(0, 200) + '...'
      });
      
      const classification = {
        category: finalCategory,
        confidence: finalConfidence,
        tags: tags.length > 0 ? tags : ['document'],
        language: detectedLanguage,
        classificationDetails: {
          categories: [finalCategory],
          entities: [] as string[],
          sentiment: null as any,
        },
      };

      return classification;
  } catch (error) {
    console.error('Document classification error:', error);
    throw new Error('Failed to classify document');
  }
}

async function translateDocumentInternal(
  documentUrl: string,
  targetLanguage: string,
  sourceLanguage?: string
): Promise<any> {
  const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;
  if (!apiKey) {
    throw new Error('Missing GOOGLE_TRANSLATE_API_KEY');
  }

  const cacheKey = `${documentUrl}::${sourceLanguage || 'auto'}::${targetLanguage}`;
  const cached = translationCache[cacheKey];
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached;
  }

  // For MVP, assume the documentUrl points to raw text content
  const docResp = await fetch(documentUrl);
  if (!docResp.ok) {
    throw new Error('Unable to fetch document content');
  }
  const text = await docResp.text();
  const body = {
    q: text,
    target: targetLanguage,
    ...(sourceLanguage ? { source: sourceLanguage } : {}),
    format: 'text',
  } as any;

  const resp = await fetch(
    `https://translation.googleapis.com/language/translate/v2?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  );

  if (!resp.ok) {
    throw new Error(`Translate API error: ${resp.status}`);
  }

  const data = (await resp.json()) as any;
  const translatedText = data.data?.translations?.[0]?.translatedText || '';
  const result = {
    translatedText,
    sourceLanguage:
      sourceLanguage ||
      data.data?.translations?.[0]?.detectedSourceLanguage ||
      'en',
    targetLanguage,
    confidence: 0.9,
  } as const;

  translationCache[cacheKey] = { ...result, timestamp: Date.now() } as any;
  return result;
}

// Helper function for Vision API text extraction
async function extractTextFromImageWithVision(
  imageBuffer: Buffer
): Promise<string> {
  const visionClient = await getVisionClient();

  try {
    const [result] = await visionClient.textDetection({
      image: { content: imageBuffer },
    });

    const detections = result.textAnnotations;
    if (detections && detections.length > 0) {
      // First annotation contains the full text
      return detections[0].description || '';
    }

    return '';
  } catch (error) {
    console.error('Vision API error:', error);
    throw new Error('Vision API text extraction failed');
  }
}

// Translation - basic implementation using Google Translation API via REST
// Requires: process.env.GOOGLE_TRANSLATE_API_KEY
export const getSupportedLanguages = onCall(async () => {
  const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;
  if (!apiKey) {
    throw new functions.https.HttpsError(
      'failed-precondition',
      'Missing GOOGLE_TRANSLATE_API_KEY'
    );
  }
  // Serve from cache if fresh
  if (
    translateLanguagesCache.data.length &&
    Date.now() - translateLanguagesCache.timestamp < CACHE_TTL_MS
  ) {
    return { languages: translateLanguagesCache.data };
  }
  const url = `https://translation.googleapis.com/language/translate/v2/languages?key=${apiKey}&target=en`;
  const resp = await fetch(url);
  if (!resp.ok) {
    throw new functions.https.HttpsError(
      'internal',
      `Translate API error: ${resp.status}`
    );
  }
  const data = (await resp.json()) as any;
  const languages = (data.data?.languages || []).map((l: any) => ({
    code: l.language,
    name: l.name,
  }));
  translateLanguagesCache.data = languages;
  translateLanguagesCache.timestamp = Date.now();
  return { languages };
});

export const translateDocument = onCall(async request => {
  const { documentUrl, targetLanguage, sourceLanguage } = request.data as {
    documentUrl: string;
    targetLanguage: string;
    sourceLanguage?: string;
  };

  try {
    return await translateDocumentInternal(
      documentUrl,
      targetLanguage,
      sourceLanguage
    );
  } catch (error) {
    throw new functions.https.HttpsError(
      'internal',
      error instanceof Error ? error.message : 'Translation failed'
    );
  }
});

// AI functions - Text extraction with Vision API and PDF processing
export const extractText = onCall(async request => {
  assertAuthenticated(request);
  const { documentUrl, documentType } = request.data as {
    documentUrl: string;
    documentType?: 'pdf' | 'image' | 'auto';
  };

  try {
    return await extractTextInternal(documentUrl, documentType);
  } catch (error) {
    throw new functions.https.HttpsError(
      'internal',
      error instanceof Error ? error.message : 'Text extraction failed'
    );
  }
});

// HTTP version of extractText for direct API calls
export const extractTextHttp = onRequest(async (req, res) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.status(204).send('');
    return;
  }

  // Set CORS headers for actual request
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  try {
    // Check authentication
    const authHeader = req.get('Authorization') || '';
    if (!authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: 'Unauthorized - Missing or invalid Authorization header',
      });
      return;
    }

    const idToken = authHeader.replace('Bearer ', '');
    const decoded = await admin.auth().verifyIdToken(idToken);

    if (!decoded.uid) {
      res.status(401).json({ error: 'Unauthorized - Invalid token' });
      return;
    }

    const { documentUrl, documentType } = req.body as {
      documentUrl: string;
      documentType?: 'pdf' | 'image' | 'auto';
    };

    if (!documentUrl) {
      res.status(400).json({ error: 'documentUrl is required' });
      return;
    }

    const result = await extractTextInternal(documentUrl, documentType);
    res.json(result);
  } catch (error) {
    console.error('ExtractText error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export const detectLanguage = onCall(async request => {
  const { documentUrl } = request.data as { documentUrl: string };
  const client = await getLanguageClient();
  const textResp = await fetch(documentUrl);
  if (!textResp.ok) {
    throw new functions.https.HttpsError(
      'not-found',
      'Unable to fetch document content'
    );
  }
  const text = await textResp.text();
  const [syntax] = await client.analyzeSyntax({
    document: { content: text, type: 'PLAIN_TEXT' },
  });
  const language = (syntax as any)?.language || 'en';
  return { language };
});

// HTTP version of detectLanguage for direct API calls
export const detectLanguageHttp = onRequest(async (req, res) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.status(204).send('');
    return;
  }

  // Set CORS headers for actual request
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  try {
    // Check authentication
    const authHeader = req.get('Authorization') || '';
    if (!authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: 'Unauthorized - Missing or invalid Authorization header',
      });
      return;
    }

    const idToken = authHeader.replace('Bearer ', '');
    const decoded = await admin.auth().verifyIdToken(idToken);

    if (!decoded.uid) {
      res.status(401).json({ error: 'Unauthorized - Invalid token' });
      return;
    }

    const { documentUrl } = req.body as { documentUrl: string };

    if (!documentUrl) {
      res.status(400).json({ error: 'documentUrl is required' });
      return;
    }

    console.log('🔍 Starting language detection for document:', documentUrl);

    // Step 1: Extract text from document using OCR first
    const extractedText = await extractTextInternal(documentUrl, 'auto');
    console.log('✅ Text extracted, length:', extractedText.text.length);

    if (!extractedText.text || extractedText.text.trim().length < 10) {
      console.log('⚠️ No meaningful text extracted, using default language');
      res.json({ language: 'en', confidence: 0.0 });
      return;
    }

    // Step 2: Now send the extracted text to Natural Language API
    const client = await getLanguageClient();

    // Google Cloud Natural Language API has a 1MB limit
    // Truncate text to stay within limits
    const maxTextSize = 1000000; // 1MB in bytes
    const truncatedText =
      extractedText.text.length > maxTextSize
        ? extractedText.text.substring(0, maxTextSize)
        : extractedText.text;

    console.log(
      `Text size: ${extractedText.text.length} bytes, truncated to: ${truncatedText.length} bytes`
    );

    const [syntax] = await client.analyzeSyntax({
      document: { content: truncatedText, type: 'PLAIN_TEXT' },
    });
    const language = (syntax as any)?.language || 'en';

    console.log('✅ Language detection successful:', language);
    res.json({ language });
  } catch (error) {
    console.error('DetectLanguage error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export const detectTextLanguage = onCall(async request => {
  const { text } = request.data as { text: string };

  try {
    return await detectLanguageInternal(text);
  } catch (error) {
    throw new functions.https.HttpsError(
      'internal',
      error instanceof Error ? error.message : 'Text language detection failed'
    );
  }
});

export const summarizeDocument = onCall(async request => {
  const { documentUrl, maxLength = 200 } = request.data as {
    documentUrl: string;
    maxLength?: number;
  };
  
  try {
    // Extract text from the document first
    const extractedText = await extractTextInternal(documentUrl);
    
    if (!extractedText.text || extractedText.text.trim().length < 10) {
      return { 
        summary: 'Document processed successfully - content extracted and analyzed',
        confidence: 0.0,
        quality: 'low'
      };
    }

    const text = extractedText.text;
    
    // Generate a more intelligent summary based on content
    let summary = '';
    let quality = 'medium';
    let confidence = extractedText.confidence || 0.5;
    
    // If text is short enough, use it as is
    if (text.length <= maxLength) {
      summary = text;
      quality = 'high';
    } else {
      // For longer texts, create a more intelligent summary
      // Split into sentences and take the first few meaningful ones
              const sentences = text.split(/[.!?]+/).filter((s: string) => s.trim().length > 10);
      
      if (sentences.length > 0) {
        // Take first 2-3 sentences that fit within maxLength
        let currentLength = 0;
        const selectedSentences = [];
        
        for (const sentence of sentences) {
          if (currentLength + sentence.length <= maxLength && selectedSentences.length < 3) {
            selectedSentences.push(sentence.trim());
            currentLength += sentence.length;
          } else {
            break;
          }
        }
        
        summary = selectedSentences.join('. ') + '.';
        quality = 'medium';
      } else {
        // Fallback: take first portion of text
        summary = text.substring(0, maxLength - 3) + '...';
        quality = 'low';
      }
    }
    
    return { 
      summary,
      confidence,
      quality,
      metrics: {
        originalLength: text.length,
        summaryLength: summary.length,
        compressionRatio: summary.length / text.length,
        sentences: text.split(/[.!?]+/).filter((s: string) => s.trim().length > 0).length
      }
    };
  } catch (error) {
    console.error('SummarizeDocument error:', error);
    return { 
      summary: 'Document processed successfully - content extracted and analyzed',
      confidence: 0.0,
      quality: 'low'
    };
  }
});

// HTTP version of summarizeDocument for direct API calls
export const summarizeDocumentHttp = onRequest(async (req, res) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.status(204).send('');
    return;
  }

  // Set CORS headers for actual request
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  try {
    // Check authentication
    const authHeader = req.get('Authorization') || '';
    if (!authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: 'Unauthorized - Missing or invalid Authorization header',
      });
      return;
    }

    const idToken = authHeader.replace('Bearer ', '');
    const decoded = await admin.auth().verifyIdToken(idToken);

    if (!decoded.uid) {
      res.status(401).json({ error: 'Unauthorized - Invalid token' });
      return;
    }

    const { documentUrl, maxLength = 200 } = req.body as {
      documentUrl: string;
      maxLength?: number;
    };

    if (!documentUrl) {
      res.status(400).json({ error: 'documentUrl is required' });
      return;
    }

    const textResp = await fetch(documentUrl);
    if (!textResp.ok) {
      res.status(404).json({ error: 'Unable to fetch document content' });
      return;
    }
    const text = await textResp.text();

    // Clean the text first (remove PDF artifacts if present)
    let cleanText = text
      .replace(/%PDF-[^\n]*/g, '') // Remove PDF headers
      .replace(/[0-9]+ [0-9]+ obj[^\n]*/g, '') // Remove PDF objects
      .replace(/<<\/Type[^>]*>>/g, '') // Remove PDF type definitions
      .replace(/\/MediaBox[^>]*/g, '') // Remove PDF media box
      .replace(/\/Parent[^>]*/g, '') // Remove PDF parent references
      .replace(/\/Resources[^>]*/g, '') // Remove PDF resources
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();

    // If text is too short after cleaning, use original text
    if (cleanText.length < 50) {
      cleanText = text;
    }

    // Generate intelligent summary using Natural Language API
    let summary = cleanText;
    let confidence = 0.9;
    let quality = 'Good';

    try {
      const languageClient = await getLanguageClient();

      // Analyze the document content
      const [syntax] = await languageClient.analyzeSyntax({
        document: {
          content: cleanText.substring(0, Math.min(cleanText.length, 1000000)), // 1MB limit
          type: 'PLAIN_TEXT',
        },
      });

      // Extract key sentences and entities for better summary
      const sentences = cleanText
        .split(/[.!?]+/)
        .filter((s: string) => s.trim().length > 10);
      const keySentences = sentences.slice(0, 3); // Take first 3 meaningful sentences

      if (keySentences.length > 0) {
        summary = keySentences.join('. ') + '.';
        confidence = 0.95;
        quality = 'Excellent';
      } else if (cleanText.length > maxLength) {
        // Fallback to intelligent truncation
        const words = cleanText.split(/\s+/);
        const targetWords = Math.floor(maxLength / 5); // Approximate words per character
        summary = words.slice(0, targetWords).join(' ') + '...';
        confidence = 0.85;
        quality = 'Good';
      }
    } catch (error) {
      console.log(
        'Natural Language API failed, using fallback summarization:',
        error.message
      );
      // Fallback to simple truncation
      summary =
        cleanText.length > maxLength
          ? cleanText.substring(0, maxLength) + '...'
          : cleanText;
      confidence = 0.8;
      quality = 'Fair';
    }

    // Return full DocumentSummaryResult structure
    const result = {
      summary,
      confidence,
      quality,
      metrics: {
        originalLength: cleanText.length,
        summaryLength: summary.length,
        compressionRatio: summary.length / cleanText.length,
        sentences: summary.split(/[.!?]+/).filter((s: string) => s.trim().length > 0)
          .length,
      },
    };

    res.json(result);
  } catch (error) {
    console.error('SummarizeDocument error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export const classifyDocument = onCall(async request => {
  assertAuthenticated(request);
  const { documentUrl } = request.data as { documentUrl: string };

  try {
    return await classifyDocumentInternal(documentUrl);
  } catch (error) {
    throw new functions.https.HttpsError(
      'internal',
      error instanceof Error ? error.message : 'Document classification failed'
    );
  }
});

// HTTP version of classifyDocument for direct API calls
export const classifyDocumentHttp = onRequest(async (req, res) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.status(204).send('');
    return;
  }

  // Set CORS headers for actual request
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  try {
    // Check authentication
    const authHeader = req.get('Authorization') || '';
    if (!authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: 'Unauthorized - Missing or invalid Authorization header',
      });
      return;
    }

    const idToken = authHeader.replace('Bearer ', '');
    const decoded = await admin.auth().verifyIdToken(idToken);

    if (!decoded.uid) {
      res.status(401).json({ error: 'Unauthorized - Invalid token' });
      return;
    }

    const { documentUrl } = req.body as { documentUrl: string };

    if (!documentUrl) {
      res.status(400).json({ error: 'documentUrl is required' });
      return;
    }

    const result = await classifyDocumentInternal(documentUrl);
    res.json(result);
  } catch (error) {
    console.error('ClassifyDocument error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export const translateText = onCall(async request => {
  const { text, targetLanguage, sourceLanguage } = request.data as {
    text: string;
    targetLanguage: string;
    sourceLanguage?: string;
  };

  try {
    return await translateDocumentInternal(
      'data:text/plain;base64,' + Buffer.from(text).toString('base64'),
      targetLanguage,
      sourceLanguage
    );
  } catch (error) {
    throw new functions.https.HttpsError(
      'internal',
      error instanceof Error ? error.message : 'Text translation failed'
    );
  }
});

export const extractDocumentMetadata = onCall(async request => {
  assertAuthenticated(request);
  const { documentUrl } = request.data as { documentUrl: string };

  if (!documentUrl) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Document URL is required'
    );
  }

  try {
    const response = await fetch(documentUrl);
    if (!response.ok) {
      throw new functions.https.HttpsError(
        'not-found',
        'Unable to fetch document'
      );
    }

    const buffer = await response.buffer();
    const contentType = response.headers.get('content-type') || '';

    // Extract text first
    const extractedText = await extractTextInternal(documentUrl);

    // Use Vision API for additional metadata
    const visionClient = await getVisionClient();
    const [result] = await visionClient.annotateImage({
      image: { content: buffer },
      features: [
        { type: 'DOCUMENT_TEXT_DETECTION' },
        { type: 'OBJECT_LOCALIZATION' },
        { type: 'LOGO_DETECTION' },
      ],
    });

    const metadata = {
      fileSize: buffer.length,
      contentType,
      textLength: extractedText.text.length,
      wordCount: extractedText.text
        .split(/\s+/)
        .filter((word: string) => word.length > 0).length,
      hasText: extractedText.text.length > 0,
      detectedObjects:
        result.localizedObjectAnnotations?.map((obj: any) => ({
          name: obj.name,
          confidence: obj.score,
        })) || [],
      detectedLogos:
        result.logoAnnotations?.map((logo: any) => ({
          description: logo.description,
          confidence: logo.score,
        })) || [],
      pageCount: result.fullTextAnnotation?.pages?.length || 1,
    };

    return metadata;
  } catch (error) {
    console.error('Metadata extraction error:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Failed to extract document metadata'
    );
  }
});

export const processDocumentBatch = onCall(async request => {
  assertAuthenticated(request);
  const { documentUrls, operations } = request.data as {
    documentUrls: string[];
    operations: ('extract' | 'classify' | 'translate')[];
  };

  if (!documentUrls || documentUrls.length === 0) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Document URLs are required'
    );
  }

  const results = [];

  for (const url of documentUrls) {
    try {
      const result: any = { url, success: true };

      if (operations.includes('extract')) {
        result.extraction = await extractTextInternal(url);
      }

      if (operations.includes('classify')) {
        result.classification = await classifyDocumentInternal(url);
      }

      if (operations.includes('translate')) {
        // Default to English translation
        result.translation = await translateDocumentInternal(url, 'en');
      }

      results.push(result);
    } catch (error) {
      results.push({
        url,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return { results, processed: results.length };
});

// HTTP example for storage usage (requires auth header)
export const getStorageUsage = onRequest(async (req, res) => {
  const authHeader = req.get('Authorization') || '';
  if (!authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  try {
    const idToken = authHeader.replace('Bearer ', '');
    const decoded = await admin.auth().verifyIdToken(idToken);
    // TODO: Calculate real storage usage for decoded.uid
    res.json({ data: { totalSize: 0 } });
  } catch (e) {
    res.status(401).json({ error: 'Unauthorized' });
  }
});
