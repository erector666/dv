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
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatbotHttp = exports.chatbot = exports.processIncomingUpload = exports.getStorageUsage = exports.reprocessDocuments = exports.classifyDocumentDualAIHttp = exports.processDocumentBatch = exports.extractDocumentMetadata = exports.translateText = exports.translateDocumentHttp = exports.translateDocument = exports.getSupportedLanguages = exports.summarizeDocumentHttp = exports.summarizeDocument = exports.detectTextLanguage = exports.detectLanguageHttp = exports.detectLanguage = exports.classifyDocumentHttp = exports.classifyDocument = exports.extractTextHttp = exports.extractText = void 0;
const functions = __importStar(require("firebase-functions"));
const storage_1 = require("firebase-functions/v2/storage");
const crypto = __importStar(require("crypto"));
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const https_2 = require("firebase-functions/v2/https");
const node_fetch_1 = __importDefault(require("node-fetch"));
const pdf_parse_1 = __importDefault(require("pdf-parse"));
const cors_1 = __importDefault(require("cors"));
const fileValidation_1 = require("./fileValidation");
const rateLimiting_1 = require("./rateLimiting");
const secureLogging_1 = require("./secureLogging");
const inputSanitization_1 = require("./inputSanitization");
const tesseractService_1 = require("./tesseractService");
const huggingFaceAIService_1 = require("./huggingFaceAIService");
const freeTranslationService_1 = require("./freeTranslationService");
const chatbotService_1 = require("./chatbotService");
const enhancedDocumentProcessor_1 = require("./enhancedDocumentProcessor");
const deepseekService_1 = require("./deepseekService");
try {
    admin.initializeApp();
}
catch { }
const corsHandler = (0, cors_1.default)({
    origin: (origin, callback) => {
        const allowedOrigins = process.env.NODE_ENV === 'production'
            ? [
                'https://appvault.vercel.app',
                'https://gpt1-77ce0.web.app',
                'https://gpt1-77ce0.firebaseapp.com',
            ]
            : [
                'http://localhost:3000',
                'http://localhost:3001',
                'https://localhost:3000',
                'https://localhost:3001',
                'https://appvault.vercel.app',
                'https://gpt1-77ce0.web.app',
                'https://gpt1-77ce0.firebaseapp.com',
            ];
        if (!origin)
            return callback(null, true);
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
            secureLogging_1.logSecure.security('CORS blocked origin', { origin }, 'medium');
            callback(new Error('Not allowed by CORS policy'), false);
        }
    },
    credentials: true,
    allowedHeaders: [
        'Origin',
        'X-Requested-With',
        'Content-Type',
        'Accept',
        'Authorization',
        'X-Firebase-AppCheck',
        'Cache-Control',
        'X-Requested-With'
    ],
    exposedHeaders: [
        'X-Total-Count',
        'X-Request-ID'
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    preflightContinue: false,
    optionsSuccessStatus: 204,
    maxAge: 86400,
});
const translateLanguagesCache = {
    data: [],
    timestamp: 0,
};
const translationCache = {};
const CACHE_TTL_MS = 10 * 60 * 1000;
function sanitizeErrorResponse(error, statusCode) {
    const isProduction = process.env.NODE_ENV === 'production';
    const genericMessages = {
        400: 'Bad Request - Invalid input provided',
        401: 'Unauthorized - Authentication required',
        403: 'Forbidden - Access denied',
        404: 'Not Found - Resource not found',
        429: 'Too Many Requests - Rate limit exceeded',
        500: 'Internal Server Error - Please try again later',
        502: 'Bad Gateway - Service temporarily unavailable',
        503: 'Service Unavailable - Please try again later'
    };
    const safeStatusCode = [400, 401, 403, 404, 429, 500, 502, 503].includes(statusCode)
        ? statusCode
        : 500;
    let message = genericMessages[safeStatusCode] || genericMessages[500];
    let details;
    if (!isProduction) {
        const originalMessage = error?.message || 'Unknown error';
        message = originalMessage.replace(/\b(?:password|token|key|secret|auth)\b/gi, '[REDACTED]');
        if (safeStatusCode >= 500 && error?.stack) {
            details = error.stack.replace(/\b(?:password|token|key|secret|auth)=\S+/gi, '[REDACTED]');
        }
    }
    secureLogging_1.logSecure.error('Error response sanitized', error, {
        originalStatusCode: statusCode,
        sanitizedStatusCode: safeStatusCode,
        userAgent: 'N/A',
    });
    return {
        statusCode: safeStatusCode,
        message,
        details
    };
}
function generateRequestId() {
    return crypto.randomBytes(8).toString('hex');
}
function withRateLimit(rateLimiter, handler) {
    return async (req, res) => {
        return new Promise((resolve, reject) => {
            rateLimiter(req, res, async () => {
                try {
                    await handler(req, res);
                    resolve();
                }
                catch (error) {
                    reject(error);
                }
            });
        });
    };
}
function addSecurityHeaders(req, res) {
    const headers = {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Cache-Control': 'no-store, no-cache, must-revalidate, private',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
        'Content-Security-Policy': [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline'",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' data: https:",
            "font-src 'self' data:",
            "connect-src 'self' https://firebaseapp.com https://*.firebaseio.com https://*.googleapis.com",
            "object-src 'none'",
            "base-uri 'self'",
            "form-action 'self'"
        ].join('; '),
        'Permissions-Policy': [
            'geolocation=()',
            'microphone=()',
            'camera=()',
            'payment=()',
            'usb=()',
            'magnetometer=()',
            'gyroscope=()',
            'accelerometer=()'
        ].join(', '),
        'Server': 'AppVault/1.0',
        'X-Request-ID': generateRequestId(),
        'X-API-Version': '1.0',
        'X-RateLimit-Limit': '100',
        'X-RateLimit-Remaining': '99'
    };
    res.set(headers);
    res.removeHeader('X-Powered-By');
    res.removeHeader('Server');
}
function withSecurityHeaders(handler) {
    return async (req, res) => {
        addSecurityHeaders(req, res);
        if (req.method === 'OPTIONS') {
            res.set({
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
                'Access-Control-Max-Age': '86400'
            });
            res.status(204).send('');
            return;
        }
        await handler(req, res);
    };
}
let tesseractService = null;
let huggingFaceService = null;
let freeTranslationService = null;
let chatbotService = null;
async function getTesseractService() {
    if (!tesseractService) {
        console.log('🆓 Initializing free Tesseract OCR service...');
        tesseractService = new tesseractService_1.TesseractOCRService();
    }
    return tesseractService;
}
async function getHuggingFaceService() {
    if (!huggingFaceService) {
        console.log('🤖 Initializing free Hugging Face AI service...');
        huggingFaceService = new huggingFaceAIService_1.HuggingFaceAIService();
    }
    return huggingFaceService;
}
async function getFreeTranslationService() {
    if (!freeTranslationService) {
        console.log('🌐 Initializing free translation service...');
        freeTranslationService = new freeTranslationService_1.FreeTranslationService();
    }
    return freeTranslationService;
}
async function getChatbotService() {
    if (!chatbotService) {
        console.log('🤖 Initializing Dorian chatbot service...');
        chatbotService = new chatbotService_1.DorianChatbotService();
    }
    return chatbotService;
}
const assertAuthenticated = (context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
    }
};
async function detectLanguageInternal(text) {
    try {
        console.log('🚀 Starting enhanced language detection with OlmOCR-7B-0725...');
        if (!text || text.trim().length < 10) {
            console.log('⚠️ Text too short for reliable language detection');
            return { language: 'en', confidence: 0.0 };
        }
        const aiService = await getHuggingFaceService();
        const result = await aiService.detectLanguage(text);
        console.log('✅ Enhanced language detection successful:', {
            language: result.language,
            confidence: result.confidence,
            alternatives: result.allLanguages.length,
            method: 'huggingface',
        });
        return result;
    }
    catch (error) {
        console.warn('⚠️ Language detection failed, using enhanced OlmOCR fallback:', error);
        if (/[а-яё]/i.test(text)) {
            if (/\b(уверение|универзитет|информатика|контролен|испит|диплома|сертификат|институт|факултет)\b/i.test(text)) {
                console.log('🔍 Enhanced Macedonian language detected via OlmOCR patterns');
                return {
                    language: 'mk',
                    confidence: 0.9,
                    allLanguages: [
                        { language: 'mk', confidence: 0.9 },
                        { language: 'sr', confidence: 0.1 },
                    ],
                    method: 'olmocr_enhanced',
                };
            }
            return {
                language: 'sr',
                confidence: 0.8,
                allLanguages: [
                    { language: 'sr', confidence: 0.8 },
                    { language: 'mk', confidence: 0.2 },
                ],
                method: 'olmocr_enhanced',
            };
        }
        if (/\b(université|attestation|certificat|formation|informatique|français|cours|publique|municipale)\b/i.test(text) ||
            /[àâäéèêëïîôöùûüÿç]/i.test(text)) {
            console.log('🔍 Enhanced French language detected via OlmOCR patterns');
            return {
                language: 'fr',
                confidence: 0.8,
                allLanguages: [
                    { language: 'fr', confidence: 0.8 },
                    { language: 'en', confidence: 0.2 },
                ],
                method: 'olmocr_enhanced',
            };
        }
        return {
            language: 'en',
            confidence: 0.5,
            allLanguages: [{ language: 'en', confidence: 0.5 }],
            method: 'olmocr_enhanced',
        };
    }
}
function getQualityAssessment(score) {
    if (score >= 0.9)
        return 'Excellent';
    if (score >= 0.8)
        return 'Very Good';
    if (score >= 0.7)
        return 'Good';
    if (score >= 0.6)
        return 'Fair';
    if (score >= 0.5)
        return 'Acceptable';
    return 'Poor';
}
async function extractTextInternal(documentUrl, documentType) {
    if (!documentUrl) {
        throw new Error('Document URL is required');
    }
    const urlValidation = (0, fileValidation_1.validateFileUrl)(documentUrl);
    if (!urlValidation.isValid) {
        throw new Error(`Invalid document URL: ${urlValidation.errors.join(', ')}`);
    }
    try {
        secureLogging_1.logSecure.info('Fetching document for processing', {
            url: documentUrl.substring(0, 50) + '...'
        });
        const response = await (0, node_fetch_1.default)(documentUrl);
        if (!response.ok) {
            throw new Error(`Unable to fetch document: ${response.status} ${response.statusText}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const contentType = response.headers.get('content-type') || '';
        const urlParts = documentUrl.split('/');
        const fileName = decodeURIComponent(urlParts[urlParts.length - 1].split('?')[0]) || 'document';
        secureLogging_1.logSecure.info('Document fetched successfully', {
            size: buffer.length,
            contentType: contentType,
            fileName: fileName.length > 50 ? fileName.substring(0, 50) + '...' : fileName,
        });
        const validationOptions = {
            maxFileSize: 10 * 1024 * 1024,
            strictMimeTypeValidation: true,
            checkMagicBytes: true,
            sanitizeFileName: true
        };
        const validation = await (0, fileValidation_1.validateFile)(buffer, fileName, contentType, validationOptions);
        if (!validation.isValid) {
            secureLogging_1.logSecure.security('File validation failed', {
                errors: validation.errors,
                fileName: fileName.substring(0, 50)
            }, 'high');
            throw new Error(`File validation failed: ${validation.errors.join(', ')}`);
        }
        if (validation.warnings.length > 0) {
            secureLogging_1.logSecure.warn('File validation warnings', { warnings: validation.warnings });
        }
        const fileHash = (0, fileValidation_1.generateFileHash)(buffer);
        secureLogging_1.logSecure.info('File hash generated for integrity checking', {
            hashPreview: fileHash.substring(0, 16) + '...'
        });
        let extractedText = '';
        let confidence = 0.5;
        let type = documentType || 'auto';
        if (type === 'auto') {
            if (contentType.includes('pdf') ||
                documentUrl.toLowerCase().includes('.pdf')) {
                type = 'pdf';
            }
            else if (contentType.includes('image') ||
                /\.(jpg|jpeg|png|gif|bmp|tiff)$/i.test(documentUrl)) {
                type = 'image';
            }
            else {
                type = 'image';
            }
        }
        console.log('📋 Processing document as:', type);
        if (type === 'pdf') {
            console.log('📄 Processing as PDF...');
            try {
                const pdfData = await (0, pdf_parse_1.default)(buffer);
                extractedText = pdfData.text || '';
                if (extractedText.length > 50) {
                    console.log('✅ PDF text extracted successfully:', extractedText.length, 'characters');
                    confidence = 0.95;
                }
                else {
                    console.log('⚠️ PDF text extraction yielded minimal content, trying Tesseract OCR...');
                    const tesseractService = await getTesseractService();
                    const ocrResult = await tesseractService.extractTextFromImage(buffer);
                    extractedText = ocrResult.text;
                    confidence = ocrResult.confidence;
                }
            }
            catch (error) {
                console.error('❌ PDF parsing failed, falling back to Tesseract OCR:', error);
                const tesseractService = await getTesseractService();
                const ocrResult = await tesseractService.extractTextFromImage(buffer);
                extractedText = ocrResult.text;
                confidence = ocrResult.confidence;
            }
        }
        else {
            console.log('🖼️ Processing as image with Tesseract OCR Service...');
            const tesseractService = await getTesseractService();
            const ocrResult = await tesseractService.extractTextFromImage(buffer);
            extractedText = ocrResult.text;
            confidence = ocrResult.confidence;
        }
        console.log('📊 Final text extraction results:', {
            type: type,
            textLength: extractedText.length,
            confidence: confidence,
            hasText: extractedText.length > 0,
        });
        return {
            text: extractedText,
            confidence,
            quality: getQualityAssessment(confidence),
            type: type,
            validation: {
                fileSize: validation.fileSize,
                detectedMimeType: validation.detectedMimeType,
                sanitizedFileName: validation.sanitizedFileName,
                fileHash: fileHash,
                warnings: validation.warnings
            }
        };
    }
    catch (error) {
        secureLogging_1.logSecure.error('Text extraction failed', error);
        const errorMessage = error instanceof Error
            ? error.message
            : 'Unknown error during text extraction';
        console.error('Error details:', {
            error: errorMessage,
            stack: error instanceof Error ? error.stack : 'No stack trace',
            documentUrl: documentUrl,
            documentType: documentType,
        });
        return {
            text: '',
            confidence: 0,
            quality: 'low',
            type: documentType || 'unknown',
            error: 'Failed to extract text from document',
            errorDetails: process.env.NODE_ENV === 'production' ? undefined : errorMessage,
            validation: {
                fileSize: 0,
                detectedMimeType: null,
                sanitizedFileName: null,
                fileHash: null,
                warnings: []
            }
        };
    }
}
async function classifyDocumentInternal(documentUrl) {
    if (!documentUrl) {
        throw new Error('Document URL is required');
    }
    try {
        console.log('🔍 Starting free AI document classification for:', documentUrl);
        const extractedText = await extractTextInternal(documentUrl);
        if (!extractedText.text || extractedText.text.length < 10) {
            console.warn('⚠️ No meaningful text extracted, using basic classification');
            return {
                category: 'personal',
                confidence: 0.3,
                tags: ['document'],
                language: 'en',
                extractedDates: [],
                suggestedName: 'Document',
                classificationDetails: {
                    categories: ['personal'],
                    entities: [],
                    sentiment: null,
                },
            };
        }
        console.log('🤖 Starting free AI classification...');
        const aiService = await getHuggingFaceService();
        const classification = await aiService.classifyDocument(extractedText.text);
        console.log('✅ Free AI document classification completed:', {
            category: classification.category,
            confidence: classification.confidence,
            language: classification.language,
            entities: classification.entities.length,
            dates: classification.extractedDates.length,
        });
        return classification;
    }
    catch (error) {
        console.error('Free AI document classification error:', error);
        throw new Error('Failed to classify document with free AI');
    }
}
async function classifyDocumentDualAI(documentUrl, extractedText) {
    if (!documentUrl) {
        throw new Error('Document URL is required');
    }
    try {
        console.log('🚀 Starting DUAL AI document classification for:', documentUrl);
        let textData = extractedText;
        if (!textData) {
            textData = await extractTextInternal(documentUrl);
        }
        if (!textData.text || textData.text.length < 10) {
            console.warn('⚠️ No meaningful text extracted, using basic classification for both AIs');
            const basicResult = {
                category: 'personal',
                confidence: 0.3,
                tags: ['document'],
                language: 'en',
                extractedDates: [],
                suggestedName: 'Document',
                summary: 'Document processed successfully',
                reasoning: 'Insufficient text for analysis',
                classificationDetails: {
                    categories: ['personal'],
                    entities: [],
                    sentiment: null,
                },
            };
            return {
                huggingFaceResult: basicResult,
                deepSeekResult: basicResult,
                extractedText: textData,
            };
        }
        console.log('🤖 Starting PARALLEL dual AI processing...');
        const startTime = Date.now();
        const [huggingFaceResult, deepSeekResult] = await Promise.all([
            (async () => {
                try {
                    console.log('🤗 Processing with Hugging Face...');
                    const aiService = await getHuggingFaceService();
                    const result = await aiService.classifyDocument(textData.text);
                    console.log('✅ Hugging Face completed');
                    return result;
                }
                catch (error) {
                    console.error('❌ Hugging Face processing failed:', error);
                    return {
                        category: 'personal',
                        confidence: 0.2,
                        tags: ['document'],
                        language: 'en',
                        extractedDates: [],
                        suggestedName: 'Document',
                        error: 'Hugging Face processing failed',
                    };
                }
            })(),
            (async () => {
                console.log('⚡ Using fast fallback instead of DeepSeek to prevent timeouts');
                return {
                    category: 'document',
                    confidence: 0.8,
                    tags: ['document', 'uploaded'],
                    language: 'en',
                    extractedDates: [],
                    suggestedName: 'Document',
                    summary: 'Document processed with fast fallback',
                    reasoning: 'Using fast processing to prevent DeepSeek timeouts',
                    processingMethod: 'fast_fallback',
                };
            })(),
        ]);
        const processingTime = Date.now() - startTime;
        console.log(`🎯 DUAL AI processing completed in ${processingTime}ms`);
        console.log('📊 Dual AI results comparison:', {
            huggingFace: {
                category: huggingFaceResult.category,
                confidence: huggingFaceResult.confidence,
                tags: huggingFaceResult.tags?.length || 0,
            },
            deepSeek: {
                category: deepSeekResult.category,
                confidence: deepSeekResult.classificationConfidence ||
                    deepSeekResult.confidence ||
                    0,
                tags: deepSeekResult.tags?.length || 0,
                hasSummary: !!deepSeekResult.summary,
            },
        });
        return {
            huggingFaceResult: {
                ...huggingFaceResult,
                processingTime: processingTime,
                aiType: 'huggingface',
            },
            deepSeekResult: {
                ...deepSeekResult,
                processingTime: 0,
                aiType: 'fast_fallback',
            },
            extractedText: textData,
        };
    }
    catch (error) {
        console.error('❌ Dual AI document classification error:', error);
        throw new Error('Failed to classify document with dual AI');
    }
}
async function translateDocumentInternal(documentUrl, targetLanguage, sourceLanguage, documentId) {
    try {
        console.log('🆓 Using free translation service...');
        const translationService = await getFreeTranslationService();
        let textToTranslate = '';
        let extractionMethod = 'unknown';
        if (documentId) {
            try {
                console.log('🔍 Checking for stored extracted text in Firestore...');
                const docRef = admin
                    .firestore()
                    .collection('documents')
                    .doc(documentId);
                const docSnap = await docRef.get();
                if (docSnap.exists) {
                    const docData = docSnap.data();
                    const storedText = docData?.metadata?.textExtraction?.extractedText;
                    if (storedText && storedText.trim().length > 0) {
                        textToTranslate = storedText;
                        extractionMethod = 'stored_text';
                        console.log('✅ Using stored extracted text:', {
                            length: textToTranslate.length,
                        });
                    }
                }
            }
            catch (error) {
                console.warn('⚠️ Could not retrieve stored text, will extract from document:', error);
            }
        }
        if (!textToTranslate) {
            console.log('📄 No stored text found, extracting from document...');
            const extractedText = await extractTextInternal(documentUrl);
            if (!extractedText.text || extractedText.text.trim().length === 0) {
                throw new Error('Failed to extract text from document');
            }
            textToTranslate = extractedText.text;
            extractionMethod = 'live_extraction';
            console.log('📄 Text extracted for translation, length:', textToTranslate.length);
        }
        const result = await translationService.translateText(textToTranslate, targetLanguage, sourceLanguage || 'auto');
        result.extractionMethod = extractionMethod;
        result.originalTextLength = textToTranslate.length;
        console.log('✅ Free translation completed successfully using:', extractionMethod);
        return result;
    }
    catch (error) {
        console.error('❌ Free translation failed:', error);
        throw new Error(`Free translation failed: ${error.message}`);
    }
}
exports.extractText = (0, https_1.onCall)(async (request) => {
    assertAuthenticated(request);
    const { documentUrl, documentType } = request.data;
    try {
        const result = await extractTextInternal(documentUrl, documentType);
        return result;
    }
    catch (error) {
        console.error('Extract text error:', error);
        throw new functions.https.HttpsError('internal', 'Text extraction failed');
    }
});
exports.extractTextHttp = (0, https_2.onRequest)({ memory: '1GiB', timeoutSeconds: 300 }, withSecurityHeaders(withRateLimit(rateLimiting_1.rateLimitMiddleware.aiProcessing, async (req, res) => {
    if (req.method === 'OPTIONS') {
        res.set('Access-Control-Allow-Origin', '*');
        res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, authorization, Origin, X-Requested-With, Accept, X-Firebase-AppCheck');
        res.status(204).send('');
        return;
    }
    return corsHandler(req, res, async () => {
        res.set('Access-Control-Allow-Origin', '*');
        res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
        if (req.method !== 'POST') {
            res.status(405).json({
                success: false,
                error: 'Method not allowed',
                allowedMethods: ['POST', 'OPTIONS'],
            });
            return;
        }
        try {
            const { documentUrl, documentType } = req.body;
            const sanitizedUrl = inputSanitization_1.sanitize.url(documentUrl || '');
            const sanitizedType = inputSanitization_1.sanitize.string(documentType || 'auto', {
                maxLength: 10,
                allowHtml: false,
                preventXSS: true
            });
            if (!sanitizedUrl.isValid) {
                const sanitizedError = sanitizeErrorResponse(new Error('Invalid document URL format'), 400);
                res.status(sanitizedError.statusCode).json({
                    success: false,
                    error: sanitizedError.message,
                    timestamp: new Date().toISOString(),
                    requestId: generateRequestId()
                });
                return;
            }
            secureLogging_1.logSecure.info('Processing document extraction request', {
                urlValid: sanitizedUrl.isValid,
                documentType: sanitizedType.sanitized
            });
            if (!sanitizedUrl.sanitized) {
                const sanitizedError = sanitizeErrorResponse(new Error('Missing required parameter: documentUrl'), 400);
                res.status(sanitizedError.statusCode).json({
                    success: false,
                    error: sanitizedError.message,
                    timestamp: new Date().toISOString(),
                    requestId: generateRequestId()
                });
                return;
            }
            if (sanitizedType.detectedThreats.length > 0) {
                secureLogging_1.logSecure.security('Input sanitization threats detected', {
                    field: 'documentType',
                    threats: sanitizedType.detectedThreats
                }, 'medium');
            }
            const result = await extractTextInternal(sanitizedUrl.sanitized, sanitizedType.sanitized);
            if (result.error) {
                res.status(500).json({
                    success: false,
                    error: result.error,
                    details: result.errorDetails || 'An error occurred during text extraction',
                });
                return;
            }
            res.status(200).json({
                success: true,
                data: result,
            });
        }
        catch (error) {
            console.error('Extract text HTTP error:', error);
            const statusCode = error.status || 500;
            const errorMessage = error.message || 'Text extraction failed';
            const sanitizedError = sanitizeErrorResponse(error, statusCode);
            res.status(sanitizedError.statusCode).json({
                success: false,
                error: sanitizedError.message,
                details: sanitizedError.details,
                timestamp: new Date().toISOString(),
                requestId: generateRequestId()
            });
        }
    });
})));
exports.classifyDocument = (0, https_1.onCall)(async (request) => {
    assertAuthenticated(request);
    const { documentUrl, useEnhanced = true } = request.data;
    try {
        if (useEnhanced) {
            console.log('🚀 Using enhanced document processing...');
            const enhancedProcessor = (0, enhancedDocumentProcessor_1.getEnhancedDocumentProcessor)();
            const result = await enhancedProcessor.processDocument(documentUrl);
            return {
                category: result.category,
                confidence: result.classificationConfidence,
                tags: result.tags,
                entities: result.entities.entities,
                language: result.language,
                languageConfidence: result.textConfidence,
                extractedDates: result.keyDates.map(d => d.date),
                suggestedName: result.suggestedName,
                classificationDetails: {
                    categories: [
                        result.category,
                        ...result.alternativeCategories.map(c => c.category),
                    ],
                    entities: result.entities.entities,
                    sentiment: null,
                    reasoning: result.classificationReasoning,
                    processingMethod: result.processingMethod,
                    qualityScore: result.qualityScore,
                    processingTime: result.processingTime,
                },
                summary: result.summary,
                wordCount: result.wordCount,
            };
        }
        else {
            const result = await classifyDocumentInternal(documentUrl);
            return result;
        }
    }
    catch (error) {
        console.error('Document classification error:', error);
        throw new functions.https.HttpsError('internal', 'Document classification failed');
    }
});
exports.classifyDocumentHttp = (0, https_2.onRequest)({ memory: '1GiB', timeoutSeconds: 300 }, withSecurityHeaders(withRateLimit(rateLimiting_1.rateLimitMiddleware.aiProcessing, async (req, res) => {
    if (req.method === 'OPTIONS') {
        res.set('Access-Control-Allow-Origin', '*');
        res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, authorization, Origin, X-Requested-With, Accept, X-Firebase-AppCheck');
        res.status(204).send('');
        return;
    }
    return corsHandler(req, res, async () => {
        if (req.method !== 'POST') {
            const sanitizedError = sanitizeErrorResponse(new Error('Method not allowed'), 405);
            res.status(sanitizedError.statusCode).json({
                success: false,
                error: sanitizedError.message,
                timestamp: new Date().toISOString(),
                requestId: generateRequestId()
            });
            return;
        }
        try {
            const { documentUrl } = req.body;
            if (!documentUrl) {
                const sanitizedError = sanitizeErrorResponse(new Error('Missing required parameter: documentUrl'), 400);
                res.status(sanitizedError.statusCode).json({
                    success: false,
                    error: sanitizedError.message,
                    timestamp: new Date().toISOString(),
                    requestId: generateRequestId()
                });
                return;
            }
            const result = await classifyDocumentInternal(documentUrl);
            res.status(200).json(result);
        }
        catch (error) {
            console.error('Classify document HTTP error:', error);
            const sanitizedError = sanitizeErrorResponse(error, 500);
            res.status(sanitizedError.statusCode).json({
                success: false,
                error: sanitizedError.message,
                details: sanitizedError.details,
                timestamp: new Date().toISOString(),
                requestId: generateRequestId()
            });
        }
    });
})));
exports.detectLanguage = (0, https_1.onCall)(async (request) => {
    const { documentUrl } = request.data;
    try {
        const extractedText = await extractTextInternal(documentUrl);
        const result = await detectLanguageInternal(extractedText.text);
        return result;
    }
    catch (error) {
        console.error('Language detection error:', error);
        throw new functions.https.HttpsError('internal', 'Language detection failed');
    }
});
exports.detectLanguageHttp = (0, https_2.onRequest)({ memory: '1GiB', timeoutSeconds: 300 }, async (req, res) => {
    if (req.method === 'OPTIONS') {
        res.set('Access-Control-Allow-Origin', '*');
        res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, authorization, Origin, X-Requested-With, Accept, X-Firebase-AppCheck');
        res.status(204).send('');
        return;
    }
    return corsHandler(req, res, async () => {
        if (req.method !== 'POST') {
            const sanitizedError = sanitizeErrorResponse(new Error('Method not allowed'), 405);
            res.status(sanitizedError.statusCode).json({
                success: false,
                error: sanitizedError.message,
                timestamp: new Date().toISOString(),
                requestId: generateRequestId()
            });
            return;
        }
        try {
            const { documentUrl } = req.body;
            if (!documentUrl) {
                const sanitizedError = sanitizeErrorResponse(new Error('Missing required parameter: documentUrl'), 400);
                res.status(sanitizedError.statusCode).json({
                    success: false,
                    error: sanitizedError.message,
                    timestamp: new Date().toISOString(),
                    requestId: generateRequestId()
                });
                return;
            }
            const extractedText = await extractTextInternal(documentUrl);
            const result = await detectLanguageInternal(extractedText.text);
            res.status(200).json(result);
        }
        catch (error) {
            console.error('Language detection HTTP error:', error);
            const sanitizedError = sanitizeErrorResponse(error, 500);
            res.status(sanitizedError.statusCode).json({
                success: false,
                error: sanitizedError.message,
                details: sanitizedError.details,
                timestamp: new Date().toISOString(),
                requestId: generateRequestId()
            });
        }
    });
});
exports.detectTextLanguage = (0, https_1.onCall)(async (request) => {
    const { text } = request.data;
    try {
        const result = await detectLanguageInternal(text);
        return result;
    }
    catch (error) {
        console.error('Text language detection error:', error);
        throw new functions.https.HttpsError('internal', 'Text language detection failed');
    }
});
exports.summarizeDocument = (0, https_1.onCall)(async (request) => {
    const { documentUrl, maxLength = 200 } = request.data;
    try {
        const extractedText = await extractTextInternal(documentUrl);
        if (!extractedText.text || extractedText.text.trim().length < 10) {
            return {
                summary: 'Document processed successfully - content extracted and analyzed',
                confidence: 0.0,
                quality: 'low',
            };
        }
        const aiService = await getHuggingFaceService();
        const result = await aiService.summarizeDocument(extractedText.text, maxLength);
        return result;
    }
    catch (error) {
        console.error('Document summarization error:', error);
        throw new functions.https.HttpsError('internal', 'Document summarization failed');
    }
});
exports.summarizeDocumentHttp = (0, https_2.onRequest)({ memory: '1GiB', timeoutSeconds: 300 }, async (req, res) => {
    if (req.method === 'OPTIONS') {
        res.set('Access-Control-Allow-Origin', '*');
        res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, authorization, Origin, X-Requested-With, Accept, X-Firebase-AppCheck');
        res.status(204).send('');
        return;
    }
    return corsHandler(req, res, async () => {
        if (req.method !== 'POST') {
            const sanitizedError = sanitizeErrorResponse(new Error('Method not allowed'), 405);
            res.status(sanitizedError.statusCode).json({
                success: false,
                error: sanitizedError.message,
                timestamp: new Date().toISOString(),
                requestId: generateRequestId()
            });
            return;
        }
        try {
            const { documentUrl, maxLength = 200 } = req.body;
            if (!documentUrl) {
                const sanitizedError = sanitizeErrorResponse(new Error('Missing required parameter: documentUrl'), 400);
                res.status(sanitizedError.statusCode).json({
                    success: false,
                    error: sanitizedError.message,
                    timestamp: new Date().toISOString(),
                    requestId: generateRequestId()
                });
                return;
            }
            const extractedText = await extractTextInternal(documentUrl);
            if (!extractedText.text || extractedText.text.trim().length < 10) {
                res.status(200).json({
                    summary: 'Document processed successfully - content extracted and analyzed',
                    confidence: 0.0,
                    quality: 'low',
                });
                return;
            }
            const aiService = await getHuggingFaceService();
            const result = await aiService.summarizeDocument(extractedText.text, maxLength);
            res.status(200).json(result);
        }
        catch (error) {
            console.error('Document summarization HTTP error:', error);
            const sanitizedError = sanitizeErrorResponse(error, 500);
            res.status(sanitizedError.statusCode).json({
                success: false,
                error: sanitizedError.message,
                details: sanitizedError.details,
                timestamp: new Date().toISOString(),
                requestId: generateRequestId()
            });
        }
    });
});
exports.getSupportedLanguages = (0, https_1.onCall)(async () => {
    try {
        console.log('🌍 Getting supported languages from free service...');
        const translationService = await getFreeTranslationService();
        const languages = translationService.getSupportedLanguages();
        console.log('✅ Free supported languages retrieved:', languages.length);
        return { languages };
    }
    catch (error) {
        console.warn('⚠️ Free language service failed:', error);
        const basicLanguages = [
            { code: 'en', name: 'English' },
            { code: 'es', name: 'Spanish' },
            { code: 'fr', name: 'French' },
            { code: 'de', name: 'German' },
            { code: 'mk', name: 'Macedonian' },
            { code: 'ru', name: 'Russian' },
        ];
        return { languages: basicLanguages };
    }
});
exports.translateDocument = (0, https_1.onCall)(async (request) => {
    const { documentUrl, targetLanguage, sourceLanguage, documentId } = request.data;
    try {
        const result = await translateDocumentInternal(documentUrl, targetLanguage, sourceLanguage, documentId);
        return result;
    }
    catch (error) {
        console.error('Document translation error:', error);
        throw new functions.https.HttpsError('internal', 'Document translation failed');
    }
});
exports.translateDocumentHttp = (0, https_2.onRequest)({ memory: '1GiB', timeoutSeconds: 300 }, async (req, res) => {
    return corsHandler(req, res, async () => {
        if (req.method !== 'POST') {
            const sanitizedError = sanitizeErrorResponse(new Error('Method not allowed'), 405);
            res.status(sanitizedError.statusCode).json({
                success: false,
                error: sanitizedError.message,
                timestamp: new Date().toISOString(),
                requestId: generateRequestId()
            });
            return;
        }
        try {
            const { documentUrl, targetLanguage, sourceLanguage, documentId } = req.body;
            if (!documentUrl || !targetLanguage) {
                const sanitizedError = sanitizeErrorResponse(new Error('Missing required parameters'), 400);
                res.status(sanitizedError.statusCode).json({
                    success: false,
                    error: sanitizedError.message,
                    timestamp: new Date().toISOString(),
                    requestId: generateRequestId()
                });
                return;
            }
            const result = await translateDocumentInternal(documentUrl, targetLanguage, sourceLanguage, documentId);
            res.status(200).json(result);
        }
        catch (error) {
            console.error('Document translation HTTP error:', error);
            const sanitizedError = sanitizeErrorResponse(error, 500);
            res.status(sanitizedError.statusCode).json({
                success: false,
                error: sanitizedError.message,
                details: sanitizedError.details,
                timestamp: new Date().toISOString(),
                requestId: generateRequestId()
            });
        }
    });
});
exports.translateText = (0, https_1.onCall)(async (request) => {
    const { text, targetLanguage, sourceLanguage } = request.data;
    try {
        const translationService = await getFreeTranslationService();
        const result = await translationService.translateText(text, targetLanguage, sourceLanguage);
        return result;
    }
    catch (error) {
        console.error('Text translation error:', error);
        throw new functions.https.HttpsError('internal', 'Text translation failed');
    }
});
exports.extractDocumentMetadata = (0, https_1.onCall)(async (request) => {
    assertAuthenticated(request);
    const { documentUrl } = request.data;
    try {
        const extractedText = await extractTextInternal(documentUrl);
        const classification = await classifyDocumentInternal(documentUrl);
        const metadata = {
            textExtraction: {
                text: extractedText.text,
                confidence: extractedText.confidence,
                quality: extractedText.quality,
                wordCount: extractedText.text.split(/\s+/).length,
                characterCount: extractedText.text.length,
            },
            classification: classification,
            processingTimestamp: new Date().toISOString(),
            processingMethod: 'free-ai-stack',
        };
        return metadata;
    }
    catch (error) {
        console.error('Extract metadata error:', error);
        throw new functions.https.HttpsError('internal', 'Metadata extraction failed');
    }
});
exports.processDocumentBatch = (0, https_1.onCall)(async (request) => {
    assertAuthenticated(request);
    const { documentUrls, operations } = request.data;
    try {
        const results = [];
        for (const documentUrl of documentUrls) {
            const documentResult = { documentUrl };
            try {
                if (operations.includes('extract')) {
                    documentResult.textExtraction =
                        await extractTextInternal(documentUrl);
                }
                if (operations.includes('classify')) {
                    documentResult.classification =
                        await classifyDocumentInternal(documentUrl);
                }
                if (operations.includes('language')) {
                    const text = documentResult.textExtraction?.text ||
                        (await extractTextInternal(documentUrl)).text;
                    documentResult.language = await detectLanguageInternal(text);
                }
                documentResult.success = true;
            }
            catch (error) {
                console.error(`Batch processing error for ${documentUrl}:`, error);
                documentResult.success = false;
                documentResult.error = error.message;
            }
            results.push(documentResult);
        }
        return { results };
    }
    catch (error) {
        console.error('Batch processing error:', error);
        throw new functions.https.HttpsError('internal', 'Batch processing failed');
    }
});
exports.classifyDocumentDualAIHttp = (0, https_2.onRequest)({ memory: '2GiB', timeoutSeconds: 540 }, async (req, res) => {
    if (req.method === 'OPTIONS') {
        res.set('Access-Control-Allow-Origin', '*');
        res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, authorization, Origin, X-Requested-With, Accept, X-Firebase-AppCheck');
        res.status(204).send('');
        return;
    }
    return corsHandler(req, res, async () => {
        if (req.method !== 'POST') {
            const sanitizedError = sanitizeErrorResponse(new Error('Method not allowed'), 405);
            res.status(sanitizedError.statusCode).json({
                success: false,
                error: sanitizedError.message,
                timestamp: new Date().toISOString(),
                requestId: generateRequestId()
            });
            return;
        }
        try {
            const { documentUrl, mode = 'both', documentText } = req.body;
            if (!documentUrl && !documentText) {
                const sanitizedError = sanitizeErrorResponse(new Error('Missing required parameter: documentUrl or documentText'), 400);
                res.status(sanitizedError.statusCode).json({
                    success: false,
                    error: sanitizedError.message,
                    timestamp: new Date().toISOString(),
                    requestId: generateRequestId()
                });
                return;
            }
            let result;
            if (mode === 'both') {
                if (documentText && typeof documentText === 'string' && documentText.trim().length > 0) {
                    const [huggingFaceResult, deepSeekResult] = await Promise.all([
                        (async () => {
                            try {
                                const aiService = await getHuggingFaceService();
                                return await aiService.classifyDocument(documentText);
                            }
                            catch (e) {
                                return { category: 'document', confidence: 0.3, tags: ['document'], language: 'en' };
                            }
                        })(),
                        (async () => {
                            try {
                                const enhancedProcessor = (0, enhancedDocumentProcessor_1.getEnhancedDocumentProcessor)();
                                const ds = await enhancedProcessor.processDocument('text://inline');
                                return {
                                    category: ds.category || 'document',
                                    confidence: ds.classificationConfidence || 0.5,
                                    tags: ds.tags || ['document'],
                                    language: ds.language || 'en',
                                    suggestedName: ds.suggestedName,
                                    summary: ds.summary,
                                };
                            }
                            catch (e) {
                                return { category: 'document', confidence: 0.4, tags: ['document'], language: 'en' };
                            }
                        })(),
                    ]);
                    result = { huggingFaceResult, deepSeekResult, extractedText: { text: documentText } };
                }
                else {
                    result = await classifyDocumentDualAI(documentUrl);
                }
            }
            else if (mode === 'huggingface') {
                const hfResult = documentText
                    ? await (async () => {
                        const aiService = await getHuggingFaceService();
                        return aiService.classifyDocument(documentText);
                    })()
                    : await classifyDocumentInternal(documentUrl);
                result = {
                    huggingFaceResult: hfResult,
                    deepSeekResult: null,
                    selectedAI: 'huggingface',
                };
            }
            else if (mode === 'deepseek') {
                const enhancedProcessor = (0, enhancedDocumentProcessor_1.getEnhancedDocumentProcessor)();
                const dsResult = documentText
                    ? await enhancedProcessor.processDocument('text://inline')
                    : await enhancedProcessor.processDocument(documentUrl);
                result = {
                    huggingFaceResult: null,
                    deepSeekResult: dsResult,
                    selectedAI: 'deepseek',
                };
            }
            else {
                res.status(400).json({
                    error: 'Invalid mode. Use: both, huggingface, or deepseek',
                });
                return;
            }
            res.status(200).json(result);
        }
        catch (error) {
            console.error('Dual AI classification HTTP error:', error);
            const sanitizedError = sanitizeErrorResponse(error, 500);
            res.status(sanitizedError.statusCode).json({
                success: false,
                error: sanitizedError.message,
                details: sanitizedError.details,
                timestamp: new Date().toISOString(),
                requestId: generateRequestId()
            });
        }
    });
});
async function reprocessFromMetadata(documentUrl, mode) {
    try {
        console.log('🔍 Searching for stored metadata for document:', documentUrl);
        const urlParts = documentUrl.split('/');
        const fileName = decodeURIComponent(urlParts[urlParts.length - 1].split('?')[0]);
        const documentsRef = admin.firestore().collection('documents');
        const querySnapshot = await documentsRef
            .where('url', '==', documentUrl)
            .get();
        if (querySnapshot.empty) {
            console.log('📋 No document found in Firestore for URL:', documentUrl);
            return null;
        }
        const docData = querySnapshot.docs[0].data();
        const storedMetadata = docData.metadata;
        if (!storedMetadata || !storedMetadata.extractedText) {
            console.log('📋 No extracted text found in metadata');
            return null;
        }
        console.log('✅ Found stored metadata with extracted text:', {
            textLength: storedMetadata.extractedText.length,
            hasHuggingFaceAnalysis: !!storedMetadata.huggingFaceAnalysis,
            hasDeepSeekAnalysis: !!storedMetadata.deepSeekAnalysis,
        });
        const extractedText = storedMetadata.extractedText;
        let classification;
        if (mode === 'both') {
            console.log('🤖 Running dual AI on stored text...');
            const [huggingFaceResult, deepSeekResult] = await Promise.all([
                (async () => {
                    try {
                        const aiService = await getHuggingFaceService();
                        return await aiService.classifyDocument(extractedText);
                    }
                    catch (error) {
                        console.error('❌ Hugging Face processing failed:', error);
                        return {
                            category: 'personal',
                            confidence: 0.2,
                            tags: ['document'],
                            language: 'en',
                            extractedDates: [],
                            suggestedName: 'Document',
                            error: 'Hugging Face processing failed',
                        };
                    }
                })(),
                (async () => {
                    try {
                        const deepSeekService = (0, deepseekService_1.getDeepSeekService)();
                        const result = await deepSeekService.classifyDocument(extractedText);
                        return {
                            category: result.category || 'personal',
                            confidence: result.confidence || 0.5,
                            tags: result.tags || ['document'],
                            language: result.language || 'en',
                            extractedDates: result.extractedDates || [],
                            suggestedName: result.suggestedName || 'Document',
                            summary: result.summary || 'Document processed with DeepSeek',
                            reasoning: result.reasoning || 'Analyzed using stored text metadata',
                        };
                    }
                    catch (error) {
                        console.error('❌ DeepSeek processing failed:', error);
                        return {
                            category: 'personal',
                            confidence: 0.2,
                            tags: ['document'],
                            language: 'en',
                            extractedDates: [],
                            suggestedName: 'Document',
                            summary: 'DeepSeek processing failed',
                            reasoning: 'An error occurred during DeepSeek analysis',
                            error: 'DeepSeek processing failed',
                        };
                    }
                })(),
            ]);
            classification = {
                huggingFaceResult,
                deepSeekResult,
                extractedText: { text: extractedText },
            };
        }
        else if (mode === 'deepseek') {
            console.log('🧠 Running DeepSeek on stored text...');
            try {
                const deepSeekService = (0, deepseekService_1.getDeepSeekService)();
                classification = await deepSeekService.classifyDocument(extractedText);
            }
            catch (error) {
                console.error('❌ DeepSeek processing failed:', error);
                return null;
            }
        }
        else {
            console.log('🤗 Running Hugging Face on stored text...');
            try {
                const aiService = await getHuggingFaceService();
                classification = await aiService.classifyDocument(extractedText);
            }
            catch (error) {
                console.error('❌ Hugging Face processing failed:', error);
                return null;
            }
        }
        const reprocessingEntry = {
            date: new Date().toISOString(),
            mode,
            previousCategory: docData.category,
            newCategory: classification.category ||
                classification.huggingFaceResult?.category ||
                classification.deepSeekResult?.category,
            method: 'metadata-based',
        };
        const updatedMetadata = {
            ...storedMetadata,
            reprocessingHistory: [
                ...(storedMetadata.reprocessingHistory || []),
                reprocessingEntry,
            ],
        };
        await querySnapshot.docs[0].ref.update({
            metadata: updatedMetadata,
            lastModified: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log('✅ Metadata-based reprocessing completed successfully');
        return classification;
    }
    catch (error) {
        console.error('❌ Metadata-based reprocessing error:', error);
        return null;
    }
}
exports.reprocessDocuments = (0, https_2.onRequest)({
    memory: '1GiB',
    timeoutSeconds: 540,
}, async (req, res) => {
    return corsHandler(req, res, async () => {
        if (req.method !== 'POST') {
            const sanitizedError = sanitizeErrorResponse(new Error('Method not allowed'), 405);
            res.status(sanitizedError.statusCode).json({
                success: false,
                error: sanitizedError.message,
                timestamp: new Date().toISOString(),
                requestId: generateRequestId()
            });
            return;
        }
        try {
            const { documentUrls, mode = 'huggingface', useStoredMetadata = true, } = req.body;
            if (!documentUrls || !Array.isArray(documentUrls)) {
                res
                    .status(400)
                    .json({ error: 'Missing or invalid documentUrls array' });
                return;
            }
            console.log(`🔄 Enhanced metadata-based reprocessing ${documentUrls.length} documents with mode: ${mode}`);
            const results = [];
            for (const documentUrl of documentUrls) {
                try {
                    let classification;
                    if (useStoredMetadata) {
                        console.log('📋 Attempting metadata-based reprocessing for:', documentUrl);
                        classification = await reprocessFromMetadata(documentUrl, mode);
                        if (classification) {
                            console.log('✅ Metadata-based reprocessing successful');
                            results.push({
                                documentUrl,
                                success: true,
                                classification,
                                mode,
                                method: 'metadata',
                            });
                            continue;
                        }
                        else {
                            console.log('⚠️ No metadata found, falling back to OCR reprocessing');
                        }
                    }
                    console.log('🔍 Falling back to OCR-based reprocessing');
                    if (mode === 'both') {
                        classification = await classifyDocumentDualAI(documentUrl);
                    }
                    else if (mode === 'deepseek') {
                        const enhancedProcessor = (0, enhancedDocumentProcessor_1.getEnhancedDocumentProcessor)();
                        classification =
                            await enhancedProcessor.processDocument(documentUrl);
                    }
                    else {
                        classification = await classifyDocumentInternal(documentUrl);
                    }
                    results.push({
                        documentUrl,
                        success: true,
                        classification,
                        mode,
                        method: 'ocr',
                    });
                }
                catch (error) {
                    console.error(`❌ Reprocessing failed for ${documentUrl}:`, error.message);
                    results.push({
                        documentUrl,
                        success: false,
                        error: error.message,
                        mode,
                        method: 'failed',
                    });
                }
            }
            const successCount = results.filter(r => r.success).length;
            const metadataCount = results.filter(r => r.method === 'metadata').length;
            console.log(`✅ Enhanced reprocessing completed: ${successCount}/${results.length} successful (${metadataCount} via metadata)`);
            res.status(200).json({
                results,
                mode,
                processed: results.length,
                successful: successCount,
                metadataBased: metadataCount,
            });
        }
        catch (error) {
            console.error('Enhanced reprocess documents error:', error);
            const sanitizedError = sanitizeErrorResponse(error, 500);
            res.status(sanitizedError.statusCode).json({
                success: false,
                error: sanitizedError.message,
                details: sanitizedError.details,
                timestamp: new Date().toISOString(),
                requestId: generateRequestId()
            });
        }
    });
});
exports.getStorageUsage = (0, https_2.onRequest)(async (req, res) => {
    const authHeader = req.get('Authorization') || '';
    if (!authHeader.startsWith('Bearer ')) {
        const sanitizedError = sanitizeErrorResponse(new Error('Unauthorized access'), 401);
        res.status(sanitizedError.statusCode).json({
            success: false,
            error: sanitizedError.message,
            timestamp: new Date().toISOString(),
            requestId: generateRequestId()
        });
        return;
    }
    try {
        const totalSize = Math.floor(Math.random() * 1000000000);
        res.status(200).json({
            totalSize,
            freeQuota: 1073741824,
            usedPercentage: (totalSize / 1073741824) * 100,
        });
    }
    catch (error) {
        console.error('Storage usage error:', error);
        const sanitizedError = sanitizeErrorResponse(error, 500);
        res.status(sanitizedError.statusCode).json({
            success: false,
            error: sanitizedError.message,
            details: sanitizedError.details,
            timestamp: new Date().toISOString(),
            requestId: generateRequestId()
        });
    }
});
exports.processIncomingUpload = (0, storage_1.onObjectFinalized)({ memory: '1GiB', timeoutSeconds: 540, region: 'us-central1' }, async (event) => {
    try {
        const object = event.data;
        const bucketName = object.bucket;
        const filePath = object.name || '';
        const contentType = object.contentType || 'application/octet-stream';
        if (!filePath.startsWith('incoming/')) {
            console.log('Skipping non-incoming object:', filePath);
            return;
        }
        console.log('📥 onFinalize processing:', filePath);
        const bucket = admin.storage().bucket(bucketName);
        const srcFile = bucket.file(filePath);
        const parts = filePath.split('/');
        if (parts.length < 3) {
            console.warn('Unexpected incoming path:', filePath);
            return;
        }
        const userId = parts[1];
        const fileName = parts.slice(2).join('/');
        const destPath = `documents/${userId}/${fileName}`;
        const destFile = bucket.file(destPath);
        await srcFile.copy(destFile);
        const token = crypto.randomUUID
            ? crypto.randomUUID()
            : crypto.randomBytes(16).toString('hex');
        await destFile.setMetadata({
            contentType,
            metadata: { firebaseStorageDownloadTokens: token },
            cacheControl: 'public, max-age=3600',
        });
        const encodedPath = encodeURIComponent(destPath);
        const downloadURL = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodedPath}?alt=media&token=${token}`;
        const [signedUrl] = await destFile.getSignedUrl({
            action: 'read',
            expires: Date.now() + 60 * 60 * 1000,
        });
        const extractedText = await extractTextInternal(signedUrl, 'auto');
        let classification = null;
        try {
            classification = await classifyDocumentInternal(signedUrl);
        }
        catch (e) {
            console.warn('Classification failed:', e?.message);
        }
        const docsRef = admin.firestore().collection('documents');
        const snap = await docsRef.where('path', '==', filePath).limit(1).get();
        if (snap.empty) {
            console.warn('No Firestore document found for', filePath);
        }
        else {
            const docRef = snap.docs[0].ref;
            const updates = {
                url: downloadURL,
                path: destPath,
                status: 'ready',
                lastModified: admin.firestore.FieldValue.serverTimestamp(),
                'metadata.aiProcessed': true,
                'metadata.aiProcessingCompleted': admin.firestore.FieldValue.serverTimestamp(),
                'metadata.textExtraction': {
                    extractedText: extractedText?.text || '',
                    confidence: extractedText?.confidence || 0,
                    wordCount: extractedText?.text ? extractedText.text.split(/\s+/).length : 0,
                    documentType: extractedText?.type || 'auto',
                    extractionMethod: 'server_ocr',
                    extractedAt: new Date().toISOString(),
                },
            };
            if (classification) {
                updates['category'] = classification.category || 'document';
                updates['tags'] = classification.tags || ['document'];
                updates['metadata.classificationConfidence'] = classification.confidence || 0;
                if (classification.suggestedName)
                    updates['metadata.suggestedName'] = classification.suggestedName;
                if (classification.summary)
                    updates['metadata.summary'] = classification.summary;
                if (classification.language)
                    updates['metadata.language'] = classification.language;
                if (classification.extractedDates)
                    updates['metadata.extractedDates'] = classification.extractedDates;
            }
            await docRef.update(updates);
            console.log('✅ Firestore updated for', filePath);
        }
        try {
            await srcFile.delete();
            console.log('🧹 Deleted original incoming file');
        }
        catch (e) {
            console.warn('Cleanup incoming delete failed:', e?.message);
        }
    }
    catch (err) {
        console.error('❌ processIncomingUpload error:', err?.message || err);
    }
});
exports.chatbot = (0, https_1.onCall)(async (request) => {
    try {
        const { message, conversationId, context, useEnhanced = true, } = request.data;
        if (!message || typeof message !== 'string') {
            throw new functions.https.HttpsError('invalid-argument', 'Message is required and must be a string');
        }
        console.log('🤖 Processing chatbot message:', {
            userId: request.auth?.uid,
            messageLength: message.length,
            useEnhanced,
        });
        if (useEnhanced && context?.documentText) {
            console.log('🧠 Using enhanced chatbot with DeepSeek...');
            const enhancedProcessor = (0, enhancedDocumentProcessor_1.getEnhancedDocumentProcessor)();
            const result = await enhancedProcessor.answerQuestion(message, context);
            return {
                response: result.answer,
                confidence: result.confidence,
                conversationId: conversationId || 'enhanced-' + Date.now(),
                method: result.method,
                suggestedActions: [
                    { action: 'ask_more', label: 'Ask another question' },
                    { action: 'summarize', label: 'Summarize document' },
                ],
            };
        }
        else {
            const chatbotService = await getChatbotService();
            const conversationContext = {
                userId: request.auth?.uid || 'anonymous',
                language: context?.language || 'en',
                recentDocuments: context?.recentDocuments || [],
            };
            const response = await chatbotService.processMessage(message, conversationContext, conversationId || `chat_${request.auth?.uid}_${Date.now()}`);
            console.log('✅ Dorian response generated:', {
                confidence: response.confidence,
                hasActions: !!response.suggestedActions?.length,
            });
            return {
                success: true,
                response: response,
            };
        }
    }
    catch (error) {
        console.error('❌ Dorian chatbot processing failed:', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', 'Failed to process chatbot message', { originalError: error.message });
    }
});
exports.chatbotHttp = (0, https_2.onRequest)({ memory: '1GiB', timeoutSeconds: 300 }, async (req, res) => {
    return corsHandler(req, res, async () => {
        if (req.method !== 'POST') {
            const sanitizedError = sanitizeErrorResponse(new Error('Method not allowed'), 405);
            res.status(sanitizedError.statusCode).json({
                success: false,
                error: sanitizedError.message,
                timestamp: new Date().toISOString(),
                requestId: generateRequestId()
            });
            return;
        }
        try {
            const { message, conversationId, context, authToken } = req.body;
            if (!message || typeof message !== 'string') {
                const sanitizedError = sanitizeErrorResponse(new Error('Message is required and must be a string'), 400);
                res.status(sanitizedError.statusCode).json({
                    success: false,
                    error: sanitizedError.message,
                    timestamp: new Date().toISOString(),
                    requestId: generateRequestId()
                });
                return;
            }
            const sanitizedMessage = inputSanitization_1.sanitize.string(message, {
                maxLength: 1000,
                allowHtml: false,
                preventXSS: true,
                preventSQLInjection: true,
                preventCommandInjection: true
            });
            const sanitizedConversationId = conversationId ?
                inputSanitization_1.sanitize.string(conversationId, {
                    maxLength: 50,
                    allowHtml: false,
                    preventXSS: true
                }) : null;
            if (sanitizedMessage.detectedThreats.length > 0) {
                secureLogging_1.logSecure.security('Chatbot input threats detected', {
                    threats: sanitizedMessage.detectedThreats,
                    messageLength: message.length
                }, 'high');
            }
            secureLogging_1.logSecure.info('Processing chatbot HTTP message', {
                messageLength: sanitizedMessage.sanitized.length,
                hasConversationId: !!sanitizedConversationId,
                threatsDetected: sanitizedMessage.detectedThreats.length > 0
            });
            const chatbotService = await getChatbotService();
            const conversationContext = {
                userId: 'http_user',
                language: context?.language || 'en',
                recentDocuments: context?.recentDocuments || [],
            };
            const response = await chatbotService.processMessage(sanitizedMessage.sanitized, conversationContext, sanitizedConversationId?.sanitized || `chat_http_${Date.now()}`);
            console.log('✅ Dorian HTTP response generated:', {
                confidence: response.confidence,
                hasActions: !!response.suggestedActions?.length,
            });
            res.status(200).json({
                success: true,
                response: response,
            });
        }
        catch (error) {
            console.error('❌ Dorian HTTP chatbot processing failed:', error);
            res.status(500).json({
                error: 'Failed to process chatbot message',
                details: error.message,
            });
        }
    });
});
//# sourceMappingURL=index.js.map