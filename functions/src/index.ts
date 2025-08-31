import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { onCall } from 'firebase-functions/v2/https';
import { onRequest } from 'firebase-functions/v2/https';
import fetch from 'node-fetch';
import { LanguageServiceClient } from '@google-cloud/language';

// Initialize Admin SDK
try {
  admin.initializeApp();
} catch {}

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
  const url = `https://translation.googleapis.com/language/translate/v2/languages?key=${apiKey}&target=en`;
  const resp = await fetch(url);
  if (!resp.ok) {
    throw new functions.https.HttpsError('internal', `Translate API error: ${resp.status}`);
  }
  const data = (await resp.json()) as any;
  const languages = (data.data?.languages || []).map((l: any) => ({ code: l.language, name: l.name }));
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
  return {
    translatedText,
    sourceLanguage: sourceLanguage || data.data?.translations?.[0]?.detectedSourceLanguage || 'en',
    targetLanguage,
    confidence: 0.9,
  };
});

// AI functions - placeholder integration points
export const extractText = onCall(async (request) => {
  // TODO: Implement text extraction (Vision/PDF processing)
  return { text: '' };
});

export const detectLanguage = onCall(async (request) => {
  const { documentUrl } = request.data as { documentUrl: string };
  const client = new LanguageServiceClient();
  const textResp = await fetch(documentUrl);
  if (!textResp.ok) {
    throw new functions.https.HttpsError('not-found', 'Unable to fetch document content');
  }
  const text = await textResp.text();
  const [result] = await client.analyzeEntities({ document: { content: text, type: 'PLAIN_TEXT' } });
  // The API doesn't return language directly here; default to en for MVP or use alternative API.
  return { language: (result as any)?.language || 'en' };
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
  const textResp = await fetch(documentUrl);
  if (!textResp.ok) {
    throw new functions.https.HttpsError('not-found', 'Unable to fetch document content');
  }
  const text = (await textResp.text()).toLowerCase();
  const categories: string[] = [];
  const tags: string[] = [];
  if (text.includes('invoice') || text.includes('receipt')) {
    categories.push('Financial');
    tags.push('invoice', 'payment');
  } else if (text.includes('report') || text.includes('analysis')) {
    categories.push('Reports');
    tags.push('report', 'analysis');
  } else if (text.includes('contract') || text.includes('agreement')) {
    categories.push('Legal');
    tags.push('contract', 'legal');
  }
  return {
    categories: categories.length ? categories : ['Other'],
    tags,
    summary: text.slice(0, 160),
    language: 'en',
    confidence: 0.7,
  };
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

