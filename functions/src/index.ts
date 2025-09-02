import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { onCall } from 'firebase-functions/v2/https';
import { onRequest } from 'firebase-functions/v2/https';
import fetch from 'node-fetch';
import { LanguageServiceClient } from '@google-cloud/language';
import { ImageAnnotatorClient } from '@google-cloud/vision';
import * as pdfParse from 'pdf-parse';

// Initialize Admin SDK
try {
  admin.initializeApp();
} catch {}

// In-memory caches (ephemeral in serverless, but useful within instance lifetime)
const translateLanguagesCache: { data: any[]; timestamp: number } = { data: [], timestamp: 0 };
const translationCache: Record<string, { translatedText: string; sourceLanguage: string; targetLanguage: string; confidence: number; timestamp: number }> = {};
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

// Helpers
const assertAuthenticated = (context: functions.https.CallableContext) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
  }
};

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
  const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;
  if (!apiKey) {
    throw new functions.https.HttpsError('failed-precondition', 'Missing GOOGLE_TRANSLATE_API_KEY');
  }
  const cacheKey = `${documentUrl}::${sourceLanguage || 'auto'}::${targetLanguage}`;
  const cached = translationCache[cacheKey];
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached;
  }
  // For MVP, assume the documentUrl points to raw text content
  const docResp = await fetch(documentUrl);
  if (!docResp.ok) {
    throw new functions.https.HttpsError('not-found', 'Unable to fetch document content');
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
    throw new functions.https.HttpsError('internal', `Translate API error: ${resp.status}`);
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
});

// AI functions - Text extraction with Vision API and PDF processing
export const extractText = onCall(async (request) => {
  assertAuthenticated(request);
  const { documentUrl, documentType } = request.data as { 
    documentUrl: string; 
    documentType?: 'pdf' | 'image' | 'auto' 
  };

  if (!documentUrl) {
    throw new functions.https.HttpsError('invalid-argument', 'Document URL is required');
  }

  try {
    // Fetch the document
    const response = await fetch(documentUrl);
    if (!response.ok) {
      throw new functions.https.HttpsError('not-found', 'Unable to fetch document');
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
    throw new functions.https.HttpsError('internal', 'Failed to extract text from document');
  }
});

// Helper function for Vision API text extraction
async function extractTextFromImageWithVision(imageBuffer: Buffer): Promise<string> {
  const visionClient = new ImageAnnotatorClient();
  
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

export const detectLanguage = onCall(async (request) => {
  const { documentUrl } = request.data as { documentUrl: string };
  const client = new LanguageServiceClient();
  const textResp = await fetch(documentUrl);
  if (!textResp.ok) {
    throw new functions.https.HttpsError('not-found', 'Unable to fetch document content');
  }
  const text = await textResp.text();
  const [syntax] = await client.analyzeSyntax({ document: { content: text, type: 'PLAIN_TEXT' } });
  const language = (syntax as any)?.language || 'en';
  return { language };
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
  const { documentUrl } = request.data as { documentUrl: string };
  const client = new LanguageServiceClient();
  const textResp = await fetch(documentUrl);
  if (!textResp.ok) {
    throw new functions.https.HttpsError('not-found', 'Unable to fetch document content');
  }
  const text = await textResp.text();
  try {
    const [result] = await client.classifyText({ document: { content: text, type: 'PLAIN_TEXT' } });
    const categories = (result.categories || []).map(c => c.name || '').filter(Boolean);
    const tags = (result.categories || []).map(c => (c.name || '').split('/').filter(Boolean).pop() || '').filter(Boolean);
    const confidence = Math.max(...(result.categories || []).map(c => c.confidence || 0), 0);
    return {
      categories: categories.length ? categories : ['Other'],
      tags,
      summary: text.slice(0, 160),
      language: 'en',
      confidence,
    };
  } catch (e) {
    // Fallback to naive classification
    const lower = text.toLowerCase();
    const categories: string[] = [];
    const tags: string[] = [];
    if (lower.includes('invoice') || lower.includes('receipt')) {
      categories.push('Financial');
      tags.push('invoice', 'payment');
    } else if (lower.includes('report') || lower.includes('analysis')) {
      categories.push('Reports');
      tags.push('report', 'analysis');
    } else if (lower.includes('contract') || lower.includes('agreement')) {
      categories.push('Legal');
      tags.push('contract', 'legal');
    }
    return {
      categories: categories.length ? categories : ['Other'],
      tags,
      summary: lower.slice(0, 160),
      language: 'en',
      confidence: 0.6,
    };
  }
});

// Advanced document processing functions
export const extractDocumentMetadata = onCall(async (request) => {
  assertAuthenticated(request);
  const { documentUrl } = request.data as { documentUrl: string };

  try {
    const response = await fetch(documentUrl);
    if (!response.ok) {
      throw new functions.https.HttpsError('not-found', 'Unable to fetch document');
    }

    const buffer = await response.buffer();
    const contentType = response.headers.get('content-type') || '';
    
    // Extract text first
    const extractedText = await extractTextFromImageWithVision(buffer);
    
    // Use Vision API for additional metadata
    const visionClient = new ImageAnnotatorClient();
    const [result] = await visionClient.annotateImage({
      image: { content: buffer },
      features: [
        { type: 'TEXT_DETECTION' },
        { type: 'DOCUMENT_TEXT_DETECTION' },
        { type: 'OBJECT_LOCALIZATION' },
        { type: 'LOGO_DETECTION' }
      ]
    });

    const metadata = {
      fileSize: buffer.length,
      contentType,
      textLength: extractedText.length,
      wordCount: extractedText.split(/\s+/).filter(word => word.length > 0).length,
      hasText: extractedText.length > 0,
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
        const extractionRequest = { data: { documentUrl: url }, auth: request.auth };
        const extraction = await extractText(extractionRequest);
        result.extraction = extraction;
      }

      if (operations.includes('classify')) {
        const classificationRequest = { data: { documentUrl: url }, auth: request.auth };
        const classification = await classifyDocument(classificationRequest);
        result.classification = classification;
      }

      if (operations.includes('translate')) {
        // Default to English translation
        const translationRequest = { 
          data: { documentUrl: url, targetLanguage: 'en' },
          auth: request.auth
        };
        const translation = await translateDocument(translationRequest);
        result.translation = translation;
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

