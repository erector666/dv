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
    'https://docsort.vercel.app'
  ],
  credentials: true
});

// In-memory caches (ephemeral in serverless, but useful within instance lifetime)
const translateLanguagesCache: { data: any[]; timestamp: number } = { data: [], timestamp: 0 };
const translationCache: Record<string, { translatedText: string; sourceLanguage: string; targetLanguage: string; confidence: number; timestamp: number }> = {};
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
    throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
  }
};

// Enhanced language detection with confidence scoring
async function detectLanguageInternal(text: string): Promise<any> {
  try {
    console.log('🌐 Starting language detection');
    
    if (!text || text.trim().length < 10) {
      console.log('⚠️ Text too short for reliable language detection');
      return { language: 'en', confidence: 0.0 };
    }
    
    const languageClient = await getLanguageClient();
    
    const [detection] = await languageClient.detectLanguage({
      content: text.substring(0, 1000) // Limit content for API efficiency
    });
    
    if (detection.languages && detection.languages.length > 0) {
      const topLanguage = detection.languages[0];
      const result = {
        language: topLanguage.language || 'en',
        confidence: topLanguage.confidence || 0.0,
        allLanguages: detection.languages.map((lang: any) => ({
          language: lang.language,
          confidence: lang.confidence
        }))
      };
      
      console.log('✅ Language detection successful:', result.language, 'confidence:', result.confidence);
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
async function extractTextInternal(documentUrl: string, documentType?: 'pdf' | 'image' | 'auto'): Promise<any> {
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
    const type = documentType || (contentType.includes('pdf') ? 'pdf' : 'image');

    let extractedText = '';
    let confidence = 0;

    if (type === 'pdf') {
      // PDF text extraction
      try {
        const pdfData = await pdfParse(buffer);
        extractedText = pdfData.text;
        confidence = 0.95; // High confidence for PDF text extraction
      } catch (error) {
        // If PDF parsing fails, try Vision API on PDF pages
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
      wordCount: extractedText.split(/\s+/).filter(word => word.length > 0).length
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
    
    // Simple classification logic
    const classification = {
      category: contentType.includes('pdf') ? 'document' : 'image',
      confidence: extractedText.confidence,
      tags: [] as string[],
      language: 'en' // Default, could be enhanced with language detection
    };

    return classification;

  } catch (error) {
    console.error('Document classification error:', error);
    throw new Error('Failed to classify document');
  }
}

async function translateDocumentInternal(documentUrl: string, targetLanguage: string, sourceLanguage?: string): Promise<any> {
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
  
  const resp = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  
  if (!resp.ok) {
    throw new Error(`Translate API error: ${resp.status}`);
  }
  
  const data = (await resp.json()) as any;
  const translatedText = data.data?.translations?.[0]?.translatedText || '';
  const result = {
    translatedText,
    sourceLanguage: sourceLanguage || data.data?.translations?.[0]?.detectedSourceLanguage || 'en',
    targetLanguage,
    confidence: 0.9,
  } as const;
  
  translationCache[cacheKey] = { ...result, timestamp: Date.now() } as any;
  return result;
}

// Helper function for Vision API text extraction
async function extractTextFromImageWithVision(imageBuffer: Buffer): Promise<string> {
  const visionClient = await getVisionClient();
  
  try {
    const [result] = await visionClient.textDetection({
      image: { content: imageBuffer }
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
    throw new functions.https.HttpsError('failed-precondition', 'Missing GOOGLE_TRANSLATE_API_KEY');
  }
  // Serve from cache if fresh
  if (translateLanguagesCache.data.length && Date.now() - translateLanguagesCache.timestamp < CACHE_TTL_MS) {
    return { languages: translateLanguagesCache.data };
  }
  const url = `https://translation.googleapis.com/language/translate/v2/languages?key=${apiKey}&target=en`;
  const resp = await fetch(url);
  if (!resp.ok) {
    throw new functions.https.HttpsError('internal', `Translate API error: ${resp.status}`);
  }
  const data = (await resp.json()) as any;
  const languages = (data.data?.languages || []).map((l: any) => ({ code: l.language, name: l.name }));
  translateLanguagesCache.data = languages;
  translateLanguagesCache.timestamp = Date.now();
  return { languages };
});

export const translateDocument = onCall(async (request) => {
  const { documentUrl, targetLanguage, sourceLanguage } = request.data as {
    documentUrl: string;
    targetLanguage: string;
    sourceLanguage?: string;
  };
  
  try {
    return await translateDocumentInternal(documentUrl, targetLanguage, sourceLanguage);
  } catch (error) {
    throw new functions.https.HttpsError('internal', error instanceof Error ? error.message : 'Translation failed');
  }
});

// AI functions - Text extraction with Vision API and PDF processing
export const extractText = onCall(async (request) => {
  assertAuthenticated(request);
  const { documentUrl, documentType } = request.data as { 
    documentUrl: string; 
    documentType?: 'pdf' | 'image' | 'auto' 
  };

  try {
    return await extractTextInternal(documentUrl, documentType);
  } catch (error) {
    throw new functions.https.HttpsError('internal', error instanceof Error ? error.message : 'Text extraction failed');
  }
});

export const detectLanguage = onCall(async (request) => {
  const { documentUrl } = request.data as { documentUrl: string };
  const client = await getLanguageClient();
  const textResp = await fetch(documentUrl);
  if (!textResp.ok) {
    throw new functions.https.HttpsError('not-found', 'Unable to fetch document content');
  }
  const text = await textResp.text();
  const [syntax] = await client.analyzeSyntax({ document: { content: text, type: 'PLAIN_TEXT' } });
  const language = (syntax as any)?.language || 'en';
  return { language };
});

export const detectTextLanguage = onCall(async (request) => {
  const { text } = request.data as { text: string };
  
  try {
    return await detectLanguageInternal(text);
  } catch (error) {
    throw new functions.https.HttpsError('internal', error instanceof Error ? error.message : 'Text language detection failed');
  }
});

export const summarizeDocument = onCall(async (request) => {
  const { documentUrl, maxLength = 200 } = request.data as { documentUrl: string; maxLength?: number };
  const textResp = await fetch(documentUrl);
  if (!textResp.ok) {
    throw new functions.https.HttpsError('not-found', 'Unable to fetch document content');
  }
  const text = await textResp.text();
  const summary = text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
  return { summary };
});

export const classifyDocument = onCall(async (request) => {
  assertAuthenticated(request);
  const { documentUrl } = request.data as { documentUrl: string };

  try {
    return await classifyDocumentInternal(documentUrl);
  } catch (error) {
    throw new functions.https.HttpsError('internal', error instanceof Error ? error.message : 'Document classification failed');
  }
});

export const translateText = onCall(async (request) => {
  const { text, targetLanguage, sourceLanguage } = request.data as {
    text: string;
    targetLanguage: string;
    sourceLanguage?: string;
  };
  
  try {
    return await translateDocumentInternal('data:text/plain;base64,' + Buffer.from(text).toString('base64'), targetLanguage, sourceLanguage);
  } catch (error) {
    throw new functions.https.HttpsError('internal', error instanceof Error ? error.message : 'Text translation failed');
  }
});

export const extractDocumentMetadata = onCall(async (request) => {
  assertAuthenticated(request);
  const { documentUrl } = request.data as { documentUrl: string };

  if (!documentUrl) {
    throw new functions.https.HttpsError('invalid-argument', 'Document URL is required');
  }

  try {
    const response = await fetch(documentUrl);
    if (!response.ok) {
      throw new functions.https.HttpsError('not-found', 'Unable to fetch document');
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
        { type: 'LOGO_DETECTION' }
      ]
    });

    const metadata = {
      fileSize: buffer.length,
      contentType,
      textLength: extractedText.text.length,
      wordCount: extractedText.text.split(/\s+/).filter((word: string) => word.length > 0).length,
      hasText: extractedText.text.length > 0,
      detectedObjects: result.localizedObjectAnnotations?.map((obj: any) => ({
        name: obj.name,
        confidence: obj.score
      })) || [],
      detectedLogos: result.logoAnnotations?.map((logo: any) => ({
        description: logo.description,
        confidence: logo.score
      })) || [],
      pageCount: result.fullTextAnnotation?.pages?.length || 1
    };

    return metadata;
  } catch (error) {
    console.error('Metadata extraction error:', error);
    throw new functions.https.HttpsError('internal', 'Failed to extract document metadata');
  }
});

export const processDocumentBatch = onCall(async (request) => {
  assertAuthenticated(request);
  const { documentUrls, operations } = request.data as { 
    documentUrls: string[]; 
    operations: ('extract' | 'classify' | 'translate')[];
  };

  if (!documentUrls || documentUrls.length === 0) {
    throw new functions.https.HttpsError('invalid-argument', 'Document URLs are required');
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
        error: error instanceof Error ? error.message : 'Unknown error'
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

