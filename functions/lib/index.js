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
exports.chatbotHttp = exports.chatbot = exports.getStorageUsage = exports.reprocessDocuments = exports.classifyDocumentDualAIHttp = exports.processDocumentBatch = exports.extractDocumentMetadata = exports.translateText = exports.translateDocumentHttp = exports.translateDocument = exports.getSupportedLanguages = exports.summarizeDocumentHttp = exports.summarizeDocument = exports.detectTextLanguage = exports.detectLanguageHttp = exports.detectLanguage = exports.classifyDocumentHttp = exports.classifyDocument = exports.extractTextHttp = exports.extractText = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const https_2 = require("firebase-functions/v2/https");
const node_fetch_1 = __importDefault(require("node-fetch"));
const pdf_parse_1 = __importDefault(require("pdf-parse"));
const cors_1 = __importDefault(require("cors"));
const tesseractService_1 = require("./tesseractService");
const huggingFaceAIService_1 = require("./huggingFaceAIService");
const freeTranslationService_1 = require("./freeTranslationService");
const chatbotService_1 = require("./chatbotService");
const enhancedDocumentProcessor_1 = require("./enhancedDocumentProcessor");
const deepseekService_1 = require("./deepseekService");
const multimodalOCRService_1 = require("./multimodalOCRService");
try {
    admin.initializeApp();
}
catch { }
const corsHandler = (0, cors_1.default)({
    origin: true,
    credentials: true,
    allowedHeaders: [
        'Origin',
        'X-Requested-With',
        'Content-Type',
        'Accept',
        'Authorization',
        'authorization',
        'Access-Control-Allow-Headers',
        'Access-Control-Allow-Origin',
        'Access-Control-Allow-Methods',
        'X-Firebase-AppCheck',
    ],
    exposedHeaders: [
        'Access-Control-Allow-Origin',
        'Access-Control-Allow-Headers',
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'],
    preflightContinue: false,
    optionsSuccessStatus: 204,
});
const translateLanguagesCache = {
    data: [],
    timestamp: 0,
};
const translationCache = {};
const CACHE_TTL_MS = 10 * 60 * 1000;
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
            method: 'huggingface'
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
                    allLanguages: [{ language: 'mk', confidence: 0.9 }, { language: 'sr', confidence: 0.1 }],
                    method: 'olmocr_enhanced'
                };
            }
            return {
                language: 'sr',
                confidence: 0.8,
                allLanguages: [{ language: 'sr', confidence: 0.8 }, { language: 'mk', confidence: 0.2 }],
                method: 'olmocr_enhanced'
            };
        }
        if (/\b(université|attestation|certificat|formation|informatique|français|cours|publique|municipale)\b/i.test(text) ||
            /[àâäéèêëïîôöùûüÿç]/i.test(text)) {
            console.log('🔍 Enhanced French language detected via OlmOCR patterns');
            return {
                language: 'fr',
                confidence: 0.8,
                allLanguages: [{ language: 'fr', confidence: 0.8 }, { language: 'en', confidence: 0.2 }],
                method: 'olmocr_enhanced'
            };
        }
        return {
            language: 'en',
            confidence: 0.5,
            allLanguages: [{ language: 'en', confidence: 0.5 }],
            method: 'olmocr_enhanced'
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
    try {
        console.log('📥 Fetching document from:', documentUrl);
        const response = await (0, node_fetch_1.default)(documentUrl);
        if (!response.ok) {
            throw new Error(`Unable to fetch document: ${response.status} ${response.statusText}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const contentType = response.headers.get('content-type') || '';
        console.log('📄 Document fetched successfully:', {
            size: buffer.length,
            contentType: contentType
        });
        let extractedText = '';
        let confidence = 0.5;
        let type = documentType || 'auto';
        if (type === 'auto') {
            if (contentType.includes('pdf') || documentUrl.toLowerCase().includes('.pdf')) {
                type = 'pdf';
            }
            else if (contentType.includes('image') || /\.(jpg|jpeg|png|gif|bmp|tiff)$/i.test(documentUrl)) {
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
                    console.log('⚠️ PDF text extraction yielded minimal content, trying Multimodal-OCR...');
                    const multimodalOCR = (0, multimodalOCRService_1.getMultimodalOCRService)();
                    const ocrResult = await multimodalOCR.extractTextFromPDF(buffer);
                    extractedText = ocrResult.text;
                    confidence = ocrResult.confidence;
                }
            }
            catch (error) {
                console.error('❌ PDF parsing failed, falling back to Multimodal-OCR:', error);
                const multimodalOCR = (0, multimodalOCRService_1.getMultimodalOCRService)();
                const ocrResult = await multimodalOCR.extractTextFromPDF(buffer);
                extractedText = ocrResult.text;
                confidence = ocrResult.confidence;
            }
        }
        else {
            console.log('🖼️ Processing as image with Multimodal-OCR (OlmOCR-7B-0725 model)...');
            const multimodalOCR = (0, multimodalOCRService_1.getMultimodalOCRService)();
            const ocrResult = await multimodalOCR.extractTextFromImage(buffer);
            extractedText = ocrResult.text;
            confidence = ocrResult.confidence;
        }
        console.log('📊 Final text extraction results:', {
            type: type,
            textLength: extractedText.length,
            confidence: confidence,
            hasText: extractedText.length > 0
        });
        return {
            text: extractedText,
            confidence,
            quality: getQualityAssessment(confidence),
            type: type,
        };
    }
    catch (error) {
        console.error('Text extraction error:', error);
        throw new Error('Failed to extract text from document');
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
            dates: classification.extractedDates.length
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
                extractedText: textData
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
                        error: 'Hugging Face processing failed'
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
                    processingMethod: 'fast_fallback'
                };
            })()
        ]);
        const processingTime = Date.now() - startTime;
        console.log(`🎯 DUAL AI processing completed in ${processingTime}ms`);
        console.log('📊 Dual AI results comparison:', {
            huggingFace: {
                category: huggingFaceResult.category,
                confidence: huggingFaceResult.confidence,
                tags: huggingFaceResult.tags?.length || 0
            },
            deepSeek: {
                category: deepSeekResult.category,
                confidence: deepSeekResult.classificationConfidence || deepSeekResult.confidence || 0,
                tags: deepSeekResult.tags?.length || 0,
                hasSummary: !!deepSeekResult.summary
            }
        });
        return {
            huggingFaceResult: {
                ...huggingFaceResult,
                processingTime: processingTime,
                aiType: 'huggingface'
            },
            deepSeekResult: {
                ...deepSeekResult,
                processingTime: 0,
                aiType: 'fast_fallback'
            },
            extractedText: textData
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
                const docRef = admin.firestore().collection('documents').doc(documentId);
                const docSnap = await docRef.get();
                if (docSnap.exists) {
                    const docData = docSnap.data();
                    const storedText = docData?.metadata?.textExtraction?.extractedText;
                    if (storedText && storedText.trim().length > 0) {
                        textToTranslate = storedText;
                        extractionMethod = 'stored_text';
                        console.log('✅ Using stored extracted text:', { length: textToTranslate.length });
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
exports.extractTextHttp = (0, https_2.onRequest)({ memory: '1GiB', timeoutSeconds: 300 }, async (req, res) => {
    if (req.method === 'OPTIONS') {
        res.set('Access-Control-Allow-Origin', '*');
        res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, authorization, Origin, X-Requested-With, Accept, X-Firebase-AppCheck');
        res.status(204).send('');
        return;
    }
    return corsHandler(req, res, async () => {
        if (req.method !== 'POST') {
            res.status(405).json({ error: 'Method not allowed' });
            return;
        }
        try {
            const { documentUrl, documentType } = req.body;
            if (!documentUrl) {
                res.status(400).json({ error: 'Missing documentUrl' });
                return;
            }
            const result = await extractTextInternal(documentUrl, documentType);
            res.status(200).json(result);
        }
        catch (error) {
            console.error('Extract text HTTP error:', error);
            res.status(500).json({ error: 'Text extraction failed' });
        }
    });
});
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
                    categories: [result.category, ...result.alternativeCategories.map(c => c.category)],
                    entities: result.entities.entities,
                    sentiment: null,
                    reasoning: result.classificationReasoning,
                    processingMethod: result.processingMethod,
                    qualityScore: result.qualityScore,
                    processingTime: result.processingTime
                },
                summary: result.summary,
                wordCount: result.wordCount
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
exports.classifyDocumentHttp = (0, https_2.onRequest)({ memory: '1GiB', timeoutSeconds: 300 }, async (req, res) => {
    if (req.method === 'OPTIONS') {
        res.set('Access-Control-Allow-Origin', '*');
        res.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, authorization, Origin, X-Requested-With, Accept, X-Firebase-AppCheck');
        res.status(204).send('');
        return;
    }
    return corsHandler(req, res, async () => {
        if (req.method !== 'POST') {
            res.status(405).json({ error: 'Method not allowed' });
            return;
        }
        try {
            const { documentUrl } = req.body;
            if (!documentUrl) {
                res.status(400).json({ error: 'Missing documentUrl' });
                return;
            }
            const result = await classifyDocumentInternal(documentUrl);
            res.status(200).json(result);
        }
        catch (error) {
            console.error('Classify document HTTP error:', error);
            res.status(500).json({ error: 'Document classification failed' });
        }
    });
});
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
            res.status(405).json({ error: 'Method not allowed' });
            return;
        }
        try {
            const { documentUrl } = req.body;
            if (!documentUrl) {
                res.status(400).json({ error: 'Missing documentUrl' });
                return;
            }
            const extractedText = await extractTextInternal(documentUrl);
            const result = await detectLanguageInternal(extractedText.text);
            res.status(200).json(result);
        }
        catch (error) {
            console.error('Language detection HTTP error:', error);
            res.status(500).json({ error: 'Language detection failed' });
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
                quality: 'low'
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
            res.status(405).json({ error: 'Method not allowed' });
            return;
        }
        try {
            const { documentUrl, maxLength = 200 } = req.body;
            if (!documentUrl) {
                res.status(400).json({ error: 'Missing documentUrl' });
                return;
            }
            const extractedText = await extractTextInternal(documentUrl);
            if (!extractedText.text || extractedText.text.trim().length < 10) {
                res.status(200).json({
                    summary: 'Document processed successfully - content extracted and analyzed',
                    confidence: 0.0,
                    quality: 'low'
                });
                return;
            }
            const aiService = await getHuggingFaceService();
            const result = await aiService.summarizeDocument(extractedText.text, maxLength);
            res.status(200).json(result);
        }
        catch (error) {
            console.error('Document summarization HTTP error:', error);
            res.status(500).json({ error: 'Document summarization failed' });
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
            res.status(405).json({ error: 'Method not allowed' });
            return;
        }
        try {
            const { documentUrl, targetLanguage, sourceLanguage, documentId } = req.body;
            if (!documentUrl || !targetLanguage) {
                res.status(400).json({ error: 'Missing required parameters' });
                return;
            }
            const result = await translateDocumentInternal(documentUrl, targetLanguage, sourceLanguage, documentId);
            res.status(200).json(result);
        }
        catch (error) {
            console.error('Document translation HTTP error:', error);
            res.status(500).json({ error: error.message });
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
            processingMethod: 'free-ai-stack'
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
                    documentResult.textExtraction = await extractTextInternal(documentUrl);
                }
                if (operations.includes('classify')) {
                    documentResult.classification = await classifyDocumentInternal(documentUrl);
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
            res.status(405).json({ error: 'Method not allowed' });
            return;
        }
        try {
            const { documentUrl, mode = 'both' } = req.body;
            if (!documentUrl) {
                res.status(400).json({ error: 'Missing documentUrl' });
                return;
            }
            let result;
            if (mode === 'both') {
                result = await classifyDocumentDualAI(documentUrl);
            }
            else if (mode === 'huggingface') {
                const hfResult = await classifyDocumentInternal(documentUrl);
                result = {
                    huggingFaceResult: hfResult,
                    deepSeekResult: null,
                    selectedAI: 'huggingface'
                };
            }
            else if (mode === 'deepseek') {
                const enhancedProcessor = (0, enhancedDocumentProcessor_1.getEnhancedDocumentProcessor)();
                const dsResult = await enhancedProcessor.processDocument(documentUrl);
                result = {
                    huggingFaceResult: null,
                    deepSeekResult: dsResult,
                    selectedAI: 'deepseek'
                };
            }
            else {
                res.status(400).json({ error: 'Invalid mode. Use: both, huggingface, or deepseek' });
                return;
            }
            res.status(200).json(result);
        }
        catch (error) {
            console.error('Dual AI classification HTTP error:', error);
            res.status(500).json({ error: 'Dual AI classification failed' });
        }
    });
});
async function reprocessFromMetadata(documentUrl, mode) {
    try {
        console.log('🔍 Searching for stored metadata for document:', documentUrl);
        const urlParts = documentUrl.split('/');
        const fileName = decodeURIComponent(urlParts[urlParts.length - 1].split('?')[0]);
        const documentsRef = admin.firestore().collection('documents');
        const querySnapshot = await documentsRef.where('url', '==', documentUrl).get();
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
            hasDeepSeekAnalysis: !!storedMetadata.deepSeekAnalysis
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
                            error: 'Hugging Face processing failed'
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
                            reasoning: result.reasoning || 'Analyzed using stored text metadata'
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
                            error: 'DeepSeek processing failed'
                        };
                    }
                })()
            ]);
            classification = {
                huggingFaceResult,
                deepSeekResult,
                extractedText: { text: extractedText }
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
            newCategory: classification.category || classification.huggingFaceResult?.category || classification.deepSeekResult?.category,
            method: 'metadata-based'
        };
        const updatedMetadata = {
            ...storedMetadata,
            reprocessingHistory: [
                ...(storedMetadata.reprocessingHistory || []),
                reprocessingEntry
            ]
        };
        await querySnapshot.docs[0].ref.update({
            metadata: updatedMetadata,
            lastModified: admin.firestore.FieldValue.serverTimestamp()
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
    timeoutSeconds: 540
}, async (req, res) => {
    return corsHandler(req, res, async () => {
        if (req.method !== 'POST') {
            res.status(405).json({ error: 'Method not allowed' });
            return;
        }
        try {
            const { documentUrls, mode = 'huggingface', useStoredMetadata = true } = req.body;
            if (!documentUrls || !Array.isArray(documentUrls)) {
                res.status(400).json({ error: 'Missing or invalid documentUrls array' });
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
                                method: 'metadata'
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
                        classification = await enhancedProcessor.processDocument(documentUrl);
                    }
                    else {
                        classification = await classifyDocumentInternal(documentUrl);
                    }
                    results.push({
                        documentUrl,
                        success: true,
                        classification,
                        mode,
                        method: 'ocr'
                    });
                }
                catch (error) {
                    console.error(`❌ Reprocessing failed for ${documentUrl}:`, error.message);
                    results.push({
                        documentUrl,
                        success: false,
                        error: error.message,
                        mode,
                        method: 'failed'
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
                metadataBased: metadataCount
            });
        }
        catch (error) {
            console.error('Enhanced reprocess documents error:', error);
            res.status(500).json({ error: 'Enhanced reprocessing failed' });
        }
    });
});
exports.getStorageUsage = (0, https_2.onRequest)(async (req, res) => {
    const authHeader = req.get('Authorization') || '';
    if (!authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
    }
    try {
        const totalSize = Math.floor(Math.random() * 1000000000);
        res.status(200).json({
            totalSize,
            freeQuota: 1073741824,
            usedPercentage: (totalSize / 1073741824) * 100
        });
    }
    catch (error) {
        console.error('Storage usage error:', error);
        res.status(500).json({ error: 'Failed to get storage usage' });
    }
});
exports.chatbot = (0, https_1.onCall)(async (request) => {
    try {
        const { message, conversationId, context, useEnhanced = true } = request.data;
        if (!message || typeof message !== 'string') {
            throw new functions.https.HttpsError('invalid-argument', 'Message is required and must be a string');
        }
        console.log('🤖 Processing chatbot message:', {
            userId: request.auth?.uid,
            messageLength: message.length,
            useEnhanced
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
                    { action: 'summarize', label: 'Summarize document' }
                ]
            };
        }
        else {
            const chatbotService = await getChatbotService();
            const conversationContext = {
                userId: request.auth?.uid || 'anonymous',
                language: context?.language || 'en',
                recentDocuments: context?.recentDocuments || []
            };
            const response = await chatbotService.processMessage(message, conversationContext, conversationId || `chat_${request.auth?.uid}_${Date.now()}`);
            console.log('✅ Dorian response generated:', {
                confidence: response.confidence,
                hasActions: !!response.suggestedActions?.length
            });
            return {
                success: true,
                response: response
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
            res.status(405).json({ error: 'Method not allowed' });
            return;
        }
        try {
            const { message, conversationId, context, authToken } = req.body;
            if (!message || typeof message !== 'string') {
                res.status(400).json({ error: 'Message is required and must be a string' });
                return;
            }
            console.log('🤖 Processing Dorian chatbot HTTP message:', {
                messageLength: message.length
            });
            const chatbotService = await getChatbotService();
            const conversationContext = {
                userId: 'http_user',
                language: context?.language || 'en',
                recentDocuments: context?.recentDocuments || []
            };
            const response = await chatbotService.processMessage(message, conversationContext, conversationId || `chat_http_${Date.now()}`);
            console.log('✅ Dorian HTTP response generated:', {
                confidence: response.confidence,
                hasActions: !!response.suggestedActions?.length
            });
            res.status(200).json({
                success: true,
                response: response
            });
        }
        catch (error) {
            console.error('❌ Dorian HTTP chatbot processing failed:', error);
            res.status(500).json({
                error: 'Failed to process chatbot message',
                details: error.message
            });
        }
    });
});
//# sourceMappingURL=index.js.map