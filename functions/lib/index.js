"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStorageUsage = exports.processDocumentBatch = exports.extractDocumentMetadata = exports.classifyDocument = exports.summarizeDocument = exports.detectLanguage = exports.extractText = exports.translateDocument = exports.getSupportedLanguages = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const https_2 = require("firebase-functions/v2/https");
const node_fetch_1 = __importDefault(require("node-fetch"));
const language_1 = require("@google-cloud/language");
const vision_1 = require("@google-cloud/vision");
const pdfParse = __importStar(require("pdf-parse"));
try {
    admin.initializeApp();
}
catch { }
const translateLanguagesCache = { data: [], timestamp: 0 };
const translationCache = {};
const CACHE_TTL_MS = 10 * 60 * 1000;
const assertAuthenticated = (context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
    }
};
exports.getSupportedLanguages = (0, https_1.onCall)(async () => {
    const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;
    if (!apiKey) {
        throw new functions.https.HttpsError('failed-precondition', 'Missing GOOGLE_TRANSLATE_API_KEY');
    }
    if (translateLanguagesCache.data.length && Date.now() - translateLanguagesCache.timestamp < CACHE_TTL_MS) {
        return { languages: translateLanguagesCache.data };
    }
    const url = `https://translation.googleapis.com/language/translate/v2/languages?key=${apiKey}&target=en`;
    const resp = await (0, node_fetch_1.default)(url);
    if (!resp.ok) {
        throw new functions.https.HttpsError('internal', `Translate API error: ${resp.status}`);
    }
    const data = (await resp.json());
    const languages = (data.data?.languages || []).map((l) => ({ code: l.language, name: l.name }));
    translateLanguagesCache.data = languages;
    translateLanguagesCache.timestamp = Date.now();
    return { languages };
});
exports.translateDocument = (0, https_1.onCall)(async (request) => {
    const { documentUrl, targetLanguage, sourceLanguage } = request.data;
    const apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;
    if (!apiKey) {
        throw new functions.https.HttpsError('failed-precondition', 'Missing GOOGLE_TRANSLATE_API_KEY');
    }
    const cacheKey = `${documentUrl}::${sourceLanguage || 'auto'}::${targetLanguage}`;
    const cached = translationCache[cacheKey];
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
        return cached;
    }
    const docResp = await (0, node_fetch_1.default)(documentUrl);
    if (!docResp.ok) {
        throw new functions.https.HttpsError('not-found', 'Unable to fetch document content');
    }
    const text = await docResp.text();
    const body = {
        q: text,
        target: targetLanguage,
        ...(sourceLanguage ? { source: sourceLanguage } : {}),
        format: 'text',
    };
    const resp = await (0, node_fetch_1.default)(`https://translation.googleapis.com/language/translate/v2?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    if (!resp.ok) {
        throw new functions.https.HttpsError('internal', `Translate API error: ${resp.status}`);
    }
    const data = (await resp.json());
    const translatedText = data.data?.translations?.[0]?.translatedText || '';
    const result = {
        translatedText,
        sourceLanguage: sourceLanguage || data.data?.translations?.[0]?.detectedSourceLanguage || 'en',
        targetLanguage,
        confidence: 0.9,
    };
    translationCache[cacheKey] = { ...result, timestamp: Date.now() };
    return result;
});
exports.extractText = (0, https_1.onCall)(async (request) => {
    assertAuthenticated(request);
    const { documentUrl, documentType } = request.data;
    if (!documentUrl) {
        throw new functions.https.HttpsError('invalid-argument', 'Document URL is required');
    }
    try {
        const response = await (0, node_fetch_1.default)(documentUrl);
        if (!response.ok) {
            throw new functions.https.HttpsError('not-found', 'Unable to fetch document');
        }
        const buffer = await response.buffer();
        const contentType = response.headers.get('content-type') || '';
        const type = documentType || (contentType.includes('pdf') ? 'pdf' : 'image');
        let extractedText = '';
        let confidence = 0;
        if (type === 'pdf') {
            try {
                const pdfData = await pdfParse(buffer);
                extractedText = pdfData.text;
                confidence = 0.95;
            }
            catch (error) {
                extractedText = await extractTextFromImageWithVision(buffer);
                confidence = 0.8;
            }
        }
        else {
            extractedText = await extractTextFromImageWithVision(buffer);
            confidence = 0.85;
        }
        return {
            text: extractedText,
            confidence,
            documentType: type,
            wordCount: extractedText.split(/\s+/).filter(word => word.length > 0).length
        };
    }
    catch (error) {
        console.error('Text extraction error:', error);
        throw new functions.https.HttpsError('internal', 'Failed to extract text from document');
    }
});
async function extractTextFromImageWithVision(imageBuffer) {
    const visionClient = new vision_1.ImageAnnotatorClient();
    try {
        const [result] = await visionClient.textDetection({
            image: { content: imageBuffer }
        });
        const detections = result.textAnnotations;
        if (detections && detections.length > 0) {
            return detections[0].description || '';
        }
        return '';
    }
    catch (error) {
        console.error('Vision API error:', error);
        throw new Error('Vision API text extraction failed');
    }
}
exports.detectLanguage = (0, https_1.onCall)(async (request) => {
    const { documentUrl } = request.data;
    const client = new language_1.LanguageServiceClient();
    const textResp = await (0, node_fetch_1.default)(documentUrl);
    if (!textResp.ok) {
        throw new functions.https.HttpsError('not-found', 'Unable to fetch document content');
    }
    const text = await textResp.text();
    const [syntax] = await client.analyzeSyntax({ document: { content: text, type: 'PLAIN_TEXT' } });
    const language = syntax?.language || 'en';
    return { language };
});
exports.summarizeDocument = (0, https_1.onCall)(async (request) => {
    const { documentUrl, maxLength = 200 } = request.data;
    const textResp = await (0, node_fetch_1.default)(documentUrl);
    if (!textResp.ok) {
        throw new functions.https.HttpsError('not-found', 'Unable to fetch document content');
    }
    const text = await textResp.text();
    const summary = text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
    return { summary };
});
exports.classifyDocument = (0, https_1.onCall)(async (request) => {
    const { documentUrl } = request.data;
    const client = new language_1.LanguageServiceClient();
    const textResp = await (0, node_fetch_1.default)(documentUrl);
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
    }
    catch (e) {
        const lower = text.toLowerCase();
        const categories = [];
        const tags = [];
        if (lower.includes('invoice') || lower.includes('receipt')) {
            categories.push('Financial');
            tags.push('invoice', 'payment');
        }
        else if (lower.includes('report') || lower.includes('analysis')) {
            categories.push('Reports');
            tags.push('report', 'analysis');
        }
        else if (lower.includes('contract') || lower.includes('agreement')) {
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
exports.extractDocumentMetadata = (0, https_1.onCall)(async (request) => {
    assertAuthenticated(request);
    const { documentUrl } = request.data;
    try {
        const response = await (0, node_fetch_1.default)(documentUrl);
        if (!response.ok) {
            throw new functions.https.HttpsError('not-found', 'Unable to fetch document');
        }
        const buffer = await response.buffer();
        const contentType = response.headers.get('content-type') || '';
        const extractedText = await extractTextFromImageWithVision(buffer);
        const visionClient = new vision_1.ImageAnnotatorClient();
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
            detectedObjects: result.localizedObjectAnnotations?.map((obj) => ({
                name: obj.name,
                confidence: obj.score
            })) || [],
            detectedLogos: result.logoAnnotations?.map((logo) => ({
                description: logo.description,
                confidence: logo.score
            })) || [],
            pageCount: result.fullTextAnnotation?.pages?.length || 1
        };
        return metadata;
    }
    catch (error) {
        console.error('Metadata extraction error:', error);
        throw new functions.https.HttpsError('internal', 'Failed to extract document metadata');
    }
});
exports.processDocumentBatch = (0, https_1.onCall)(async (request) => {
    assertAuthenticated(request);
    const { documentUrls, operations } = request.data;
    if (!documentUrls || documentUrls.length === 0) {
        throw new functions.https.HttpsError('invalid-argument', 'Document URLs are required');
    }
    const results = [];
    for (const url of documentUrls) {
        try {
            const result = { url, success: true };
            if (operations.includes('extract')) {
                const extractionRequest = { data: { documentUrl: url }, auth: request.auth };
                const extraction = await (0, exports.extractText)(extractionRequest);
                result.extraction = extraction;
            }
            if (operations.includes('classify')) {
                const classificationRequest = { data: { documentUrl: url }, auth: request.auth };
                const classification = await (0, exports.classifyDocument)(classificationRequest);
                result.classification = classification;
            }
            if (operations.includes('translate')) {
                const translationRequest = {
                    data: { documentUrl: url, targetLanguage: 'en' },
                    auth: request.auth
                };
                const translation = await (0, exports.translateDocument)(translationRequest);
                result.translation = translation;
            }
            results.push(result);
        }
        catch (error) {
            results.push({
                url,
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    return { results, processed: results.length };
});
exports.getStorageUsage = (0, https_2.onRequest)(async (req, res) => {
    const authHeader = req.get('Authorization') || '';
    if (!authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    try {
        const idToken = authHeader.replace('Bearer ', '');
        const decoded = await admin.auth().verifyIdToken(idToken);
        res.json({ data: { totalSize: 0 } });
    }
    catch (e) {
        res.status(401).json({ error: 'Unauthorized' });
    }
});
//# sourceMappingURL=index.js.map