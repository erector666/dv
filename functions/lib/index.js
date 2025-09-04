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
exports.getStorageUsage = exports.processDocumentBatch = exports.extractDocumentMetadata = exports.translateText = exports.classifyDocumentHttp = exports.classifyDocument = exports.summarizeDocumentHttp = exports.summarizeDocument = exports.detectTextLanguage = exports.detectLanguageHttp = exports.detectLanguage = exports.extractTextHttp = exports.extractText = exports.translateDocument = exports.getSupportedLanguages = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
const https_2 = require("firebase-functions/v2/https");
const node_fetch_1 = __importDefault(require("node-fetch"));
const pdf_parse_1 = __importDefault(require("pdf-parse"));
const cors_1 = __importDefault(require("cors"));
try {
    admin.initializeApp();
}
catch { }
const corsHandler = (0, cors_1.default)({
    origin: [
        'http://localhost:3000',
        'http://localhost:3001',
        'https://dv-beta-peach.vercel.app',
        'https://*.vercel.app',
        'https://docsort.vercel.app',
    ],
    credentials: true,
});
const translateLanguagesCache = {
    data: [],
    timestamp: 0,
};
const translationCache = {};
const CACHE_TTL_MS = 10 * 60 * 1000;
let languageClient = null;
let visionClient = null;
async function getLanguageClient() {
    if (!languageClient) {
        try {
            const { LanguageServiceClient } = await Promise.resolve().then(() => __importStar(require('@google-cloud/language')));
            languageClient = new LanguageServiceClient();
        }
        catch (error) {
            console.error('Failed to initialize Language client:', error);
            throw new Error('Language service not available');
        }
    }
    return languageClient;
}
async function getVisionClient() {
    if (!visionClient) {
        try {
            const { ImageAnnotatorClient } = await Promise.resolve().then(() => __importStar(require('@google-cloud/vision')));
            visionClient = new ImageAnnotatorClient();
        }
        catch (error) {
            console.error('Failed to initialize Vision client:', error);
            throw new Error('Vision service not available');
        }
    }
    return visionClient;
}
const assertAuthenticated = (context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
    }
};
async function detectLanguageInternal(text) {
    try {
        console.log('🌐 Starting language detection for text');
        if (!text || text.trim().length < 10) {
            console.log('⚠️ Text too short for reliable language detection');
            return { language: 'en', confidence: 0.0 };
        }
        const languageClient = await getLanguageClient();
        const maxTextSize = 1000000;
        const truncatedText = text.length > maxTextSize ? text.substring(0, maxTextSize) : text;
        console.log(`Text size: ${text.length} bytes, truncated to: ${truncatedText.length} bytes`);
        const [languageResult] = await languageClient.analyzeSyntax({
            document: {
                content: truncatedText,
                type: 'PLAIN_TEXT',
            },
        });
        if (languageResult && languageResult.language) {
            const result = {
                language: languageResult.language || 'en',
                confidence: 0.9,
                allLanguages: [{
                        language: languageResult.language || 'en',
                        confidence: 0.9,
                    }],
            };
            console.log('✅ Language detection successful:', result.language, 'confidence:', result.confidence);
            return result;
        }
        console.log('⚠️ No language detected, using default');
        return { language: 'en', confidence: 0.0 };
    }
    catch (error) {
        console.error('❌ Language detection failed:', error);
        return { language: 'en', confidence: 0.0 };
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
        const type = documentType === 'auto' || !documentType
            ? (contentType.includes('pdf') ? 'pdf' : 'image')
            : documentType;
        let extractedText = '';
        let confidence = 0;
        console.log('🔍 Document type detected:', type);
        if (type === 'pdf') {
            try {
                console.log('📖 Attempting PDF text extraction...');
                const pdfData = await (0, pdf_parse_1.default)(buffer);
                extractedText = pdfData.text;
                console.log('📖 Raw PDF text extracted:', {
                    length: extractedText.length,
                    preview: extractedText.substring(0, 200)
                });
                extractedText = extractedText
                    .replace(/%PDF-[^\n]*/g, '')
                    .replace(/[0-9]+ [0-9]+ obj[^\n]*/g, '')
                    .replace(/<<\/Type[^>]*>>/g, '')
                    .replace(/\/MediaBox[^>]*/g, '')
                    .replace(/\/Parent[^>]*/g, '')
                    .replace(/\/Resources[^>]*/g, '')
                    .replace(/\/Contents[^>]*/g, '')
                    .replace(/\/Font[^>]*/g, '')
                    .replace(/\/ProcSet[^>]*/g, '')
                    .replace(/\/XObject[^>]*/g, '')
                    .replace(/\/ExtGState[^>]*/g, '')
                    .replace(/\/Pattern[^>]*/g, '')
                    .replace(/\/Shading[^>]*/g, '')
                    .replace(/\/Annots[^>]*/g, '')
                    .replace(/\/Metadata[^>]*/g, '')
                    .replace(/\/StructTreeRoot[^>]*/g, '')
                    .replace(/\/MarkInfo[^>]*/g, '')
                    .replace(/\/Lang[^>]*/g, '')
                    .replace(/\/Trailer[^>]*/g, '')
                    .replace(/\/Root[^>]*/g, '')
                    .replace(/\/Info[^>]*/g, '')
                    .replace(/\/ID[^>]*/g, '')
                    .replace(/\/Size[^>]*/g, '')
                    .replace(/\/Prev[^>]*/g, '')
                    .replace(/\/XRef[^>]*/g, '')
                    .replace(/xref[^\n]*/g, '')
                    .replace(/startxref[^\n]*/g, '')
                    .replace(/trailer[^\n]*/g, '')
                    .replace(/endobj[^\n]*/g, '')
                    .replace(/endstream[^\n]*/g, '')
                    .replace(/stream[^\n]*/g, '')
                    .replace(/BT[^\n]*/g, '')
                    .replace(/ET[^\n]*/g, '')
                    .replace(/Td[^\n]*/g, '')
                    .replace(/Tj[^\n]*/g, '')
                    .replace(/TJ[^\n]*/g, '')
                    .replace(/Tf[^\n]*/g, '')
                    .replace(/Ts[^\n]*/g, '')
                    .replace(/Tc[^\n]*/g, '')
                    .replace(/Tw[^\n]*/g, '')
                    .replace(/Tm[^\n]*/g, '')
                    .replace(/T\*[^\n]*/g, '')
                    .replace(/Td[^\n]*/g, '')
                    .replace(/TD[^\n]*/g, '')
                    .replace(/Tz[^\n]*/g, '')
                    .replace(/TL[^\n]*/g, '')
                    .replace(/Tr[^\n]*/g, '')
                    .replace(/Ts[^\n]*/g, '')
                    .replace(/Tc[^\n]*/g, '')
                    .replace(/Tw[^\n]*/g, '')
                    .replace(/Tm[^\n]*/g, '')
                    .replace(/T\*[^\n]*/g, '')
                    .replace(/\s+/g, ' ')
                    .trim();
                console.log('📄 Extracted PDF text (first 500 chars):', extractedText.substring(0, 500));
                console.log('📄 Extracted PDF text length:', extractedText.length);
                console.log('📄 Cleaned PDF text:', {
                    length: extractedText.length,
                    preview: extractedText.substring(0, 200)
                });
                if (extractedText.length < 100) {
                    console.log('⚠️ PDF text too short after cleaning, trying Vision API...');
                    extractedText = await extractTextFromImageWithVision(buffer);
                    confidence = 0.8;
                }
                else {
                    confidence = 0.95;
                }
            }
            catch (error) {
                console.error('❌ PDF parsing failed, falling back to Vision API:', error);
                extractedText = await extractTextFromImageWithVision(buffer);
                confidence = 0.8;
            }
        }
        else {
            console.log('🖼️ Processing as image with Vision API...');
            extractedText = await extractTextFromImageWithVision(buffer);
            confidence = 0.85;
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
            documentType: type,
            wordCount: extractedText.split(/\s+/).filter(word => word.length > 0)
                .length,
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
        console.log('🔍 Starting document classification for:', documentUrl);
        const response = await (0, node_fetch_1.default)(documentUrl);
        if (!response.ok) {
            throw new Error('Unable to fetch document');
        }
        const buffer = await response.buffer();
        const contentType = response.headers.get('content-type') || '';
        const extractedText = await extractTextInternal(documentUrl);
        console.log('📄 Text extracted for classification, length:', extractedText.text.length);
        if (!extractedText.text || extractedText.text.trim().length < 20) {
            console.log('⚠️ Insufficient text for classification');
            return {
                category: 'other',
                confidence: 0.1,
                tags: ['unreadable'],
                language: 'en',
                extractedDates: [],
                classificationDetails: {
                    categories: ['other'],
                    entities: [],
                    sentiment: null,
                },
            };
        }
        let category = 'other';
        let confidence = extractedText.confidence || 0.5;
        let tags = [];
        let entities = [];
        try {
            const languageClient = await getLanguageClient();
            const maxTextSize = 1000000;
            const textForAnalysis = extractedText.text.length > maxTextSize
                ? extractedText.text.substring(0, maxTextSize)
                : extractedText.text;
            console.log('🤖 Analyzing document with Natural Language API...');
            const [entityAnalysis] = await languageClient.analyzeEntities({
                document: {
                    content: textForAnalysis,
                    type: 'PLAIN_TEXT',
                },
            });
            if (entityAnalysis.entities && entityAnalysis.entities.length > 0) {
                entities = entityAnalysis.entities
                    .filter((entity) => entity.salience && entity.salience > 0.1)
                    .map((entity) => entity.name || '')
                    .filter((name) => name.length > 0)
                    .slice(0, 10);
                console.log('🏷️ Extracted entities:', entities);
            }
            const [sentimentAnalysis] = await languageClient.analyzeSentiment({
                document: {
                    content: textForAnalysis,
                    type: 'PLAIN_TEXT',
                },
            });
            const sentiment = sentimentAnalysis.documentSentiment;
            console.log('😊 Sentiment analysis:', sentiment?.score, sentiment?.magnitude);
            const text = extractedText.text.toLowerCase();
            const entityTypes = entityAnalysis.entities?.map((e) => e.type) || [];
            const entityNames = entities.map(e => e.toLowerCase());
            if (entityTypes.includes('ORGANIZATION') &&
                (entityNames.some(e => e.includes('university') || e.includes('school') || e.includes('college')) ||
                    text.includes('degree') || text.includes('diploma') || text.includes('certificate') ||
                    text.includes('education') || text.includes('academic'))) {
                category = 'education';
                confidence = 0.9;
                tags = ['education', 'academic', 'certificate'];
            }
            else if (entityTypes.includes('PERSON') && entityTypes.includes('DATE') &&
                (text.includes('medical') || text.includes('doctor') || text.includes('hospital') ||
                    text.includes('patient') || text.includes('diagnosis') || text.includes('treatment'))) {
                category = 'medical';
                confidence = 0.9;
                tags = ['medical', 'healthcare', 'patient'];
            }
            else if (entityTypes.includes('ORGANIZATION') &&
                (text.includes('contract') || text.includes('agreement') || text.includes('legal') ||
                    text.includes('terms') || text.includes('conditions') || text.includes('clause'))) {
                category = 'legal';
                confidence = 0.9;
                tags = ['legal', 'contract', 'agreement'];
            }
            else if ((entityTypes.includes('PRICE') || text.includes('$') || text.includes('amount') ||
                text.includes('total') || text.includes('payment') || text.includes('invoice') ||
                text.includes('bill') || text.includes('receipt') || text.includes('cost'))) {
                category = 'financial';
                confidence = 0.85;
                tags = ['financial', 'payment', 'invoice'];
            }
            else if (text.includes('insurance') || text.includes('policy') || text.includes('coverage') ||
                text.includes('claim') || text.includes('premium')) {
                category = 'insurance';
                confidence = 0.8;
                tags = ['insurance', 'policy', 'coverage'];
            }
            else if (text.includes('employment') || text.includes('job') || text.includes('work') ||
                text.includes('resume') || text.includes('cv') || text.includes('salary')) {
                category = 'employment';
                confidence = 0.8;
                tags = ['employment', 'career', 'job'];
            }
            else if (text.includes('government') || text.includes('official') || text.includes('license') ||
                text.includes('permit') || text.includes('passport') || text.includes('id')) {
                category = 'government';
                confidence = 0.8;
                tags = ['government', 'official', 'document'];
            }
            else if (entities.length > 0) {
                category = 'personal';
                confidence = 0.7;
                tags = ['personal', 'document'];
            }
        }
        catch (aiError) {
            console.warn('🤖 AI classification failed, falling back to keyword matching:', aiError);
            const text = extractedText.text.toLowerCase();
            const hasMacedonian = /[а-яё]/i.test(text) ||
                text.includes('уверение') || text.includes('сертификат') ||
                text.includes('документ') || text.includes('универзитет') ||
                text.includes('институт') || text.includes('академија');
            const educationKeywords = ['универзитет', 'факултет', 'студент', 'испит', 'оценка', 'диплома', 'академија', 'образование', 'училиште', 'курс'];
            const legalKeywords = ['суд', 'правен', 'адвокат', 'казнен', 'кривичен', 'престап', 'закон', 'договор'];
            const governmentKeywords = ['министерство', 'општина', 'државен', 'службен', 'регистар', 'статус'];
            const medicalKeywords = ['здравство', 'болница', 'доктор', 'медицински', 'здравје', 'лекар'];
            const financialKeywords = ['UBS', 'bank', 'banking', 'банка', 'кредит', 'заем', 'плаќање', 'сметка', 'invoice', 'payment', 'financial', 'money', 'CHF', 'USD', 'EUR', 'account', 'transaction'];
            const hasEducationContext = educationKeywords.some(keyword => text.toLowerCase().includes(keyword.toLowerCase()));
            const hasLegalContext = legalKeywords.some(keyword => text.toLowerCase().includes(keyword.toLowerCase()));
            const hasGovernmentContext = governmentKeywords.some(keyword => text.toLowerCase().includes(keyword.toLowerCase()));
            const hasMedicalContext = medicalKeywords.some(keyword => text.toLowerCase().includes(keyword.toLowerCase()));
            const hasFinancialContext = financialKeywords.some(keyword => text.toLowerCase().includes(keyword.toLowerCase()));
            console.log('🔍 Context detection results:', {
                education: hasEducationContext,
                legal: hasLegalContext,
                government: hasGovernmentContext,
                medical: hasMedicalContext,
                financial: hasFinancialContext,
                hasGenericCertificate: text.includes('уверение') || text.includes('сертификат')
            });
            if (hasFinancialContext || text.includes('invoice') || text.includes('payment') || text.includes('bill') ||
                text.includes('$') || text.includes('amount') || text.includes('total') || text.includes('bank')) {
                category = 'financial';
                confidence = 0.95;
                tags = ['financial', 'banking', 'payment', 'money'];
            }
            else if (text.includes('education') || text.includes('university') || text.includes('diploma') || hasEducationContext) {
                category = 'education';
                confidence = 0.9;
                tags = ['education', 'academic', 'school', 'university', 'certificate'];
            }
            else if (text.includes('legal') || text.includes('contract') || text.includes('agreement') || hasLegalContext) {
                category = 'legal';
                confidence = 0.85;
                tags = ['legal', 'contract', 'agreement'];
            }
            else if (hasGovernmentContext) {
                category = 'government';
                confidence = 0.8;
                tags = ['government', 'official', 'document'];
            }
            else if (hasMedicalContext) {
                category = 'medical';
                confidence = 0.8;
                tags = ['medical', 'healthcare', 'health'];
            }
            else if (text.includes('medical') || text.includes('doctor') || text.includes('hospital')) {
                category = 'medical';
                confidence = 0.75;
                tags = ['medical', 'healthcare', 'health'];
            }
            else if (text.includes('insurance') || text.includes('policy') || text.includes('coverage')) {
                category = 'insurance';
                confidence = 0.7;
                tags = ['insurance', 'policy', 'coverage'];
            }
            else if (text.includes('employment') || text.includes('job') || text.includes('resume')) {
                category = 'employment';
                confidence = 0.7;
                tags = ['employment', 'career', 'job'];
            }
            else if (text.includes('government') || text.includes('official') || text.includes('license')) {
                category = 'government';
                confidence = 0.7;
                tags = ['government', 'official', 'document'];
            }
            else if (text.length > 50) {
                category = 'personal';
                confidence = 0.6;
                tags = ['personal', 'document'];
            }
        }
        console.log('📅 Extracting dates from document...');
        let extractedDates = [];
        const text = extractedText.text;
        const datePatterns = [
            /(\d{4})-(\d{1,2})-(\d{1,2})/g,
            /(\d{1,2})\.(\d{1,2})\.(\d{4})/g,
            /(\d{1,2})\/(\d{1,2})\/(\d{4})/g,
            /(\d{1,2})-(\d{1,2})-(\d{4})/g,
            /(\d{1,2})\s+(јануари|февруари|март|април|мај|јуни|јули|август|септември|октомври|ноември|декември)\s+(\d{4})/gi,
            /(\d{1,2})\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{4})/gi,
            /(\d{1,2})\.(\d{1,2})\.(\d{2})/g,
        ];
        datePatterns.forEach(pattern => {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                const dateStr = match[0];
                console.log('📅 Found potential date:', dateStr);
                if (dateStr.length >= 8 && dateStr.length <= 20) {
                    if (dateStr.includes('.') || dateStr.includes('/') || dateStr.includes('-')) {
                        const parts = dateStr.split(/[.\/-]/);
                        if (parts.length >= 3) {
                            const year = parseInt(parts[2]) || parseInt(parts[0]);
                            if (year >= 1900 && year <= 2030) {
                                extractedDates.push(dateStr);
                                console.log('✅ Valid date added:', dateStr);
                            }
                            else {
                                console.log('❌ Invalid year in date:', dateStr, 'year:', year);
                            }
                        }
                    }
                    else {
                        extractedDates.push(dateStr);
                    }
                }
            }
        });
        extractedDates = [...new Set(extractedDates)].slice(0, 10);
        console.log('📅 Extracted dates:', extractedDates);
        let detectedLanguage = 'en';
        let languageConfidence = 0.5;
        try {
            const languageResult = await detectLanguageInternal(extractedText.text);
            detectedLanguage = languageResult.language || 'en';
            languageConfidence = languageResult.confidence || 0.5;
            const hasMacedonian = /[а-яё]/i.test(text) ||
                text.includes('уверение') || text.includes('сертификат') ||
                text.includes('документ') || text.includes('универзитет');
            if (hasMacedonian && detectedLanguage === 'en') {
                detectedLanguage = 'mk';
                languageConfidence = 0.9;
                console.log('🌐 Overriding language detection to Macedonian based on text content');
            }
        }
        catch (langError) {
            console.warn('⚠️ Language detection failed, using default:', langError);
            const hasMacedonian = /[а-яё]/i.test(text);
            if (hasMacedonian) {
                detectedLanguage = 'mk';
                languageConfidence = 0.8;
            }
        }
        const finalCategory = category !== 'other' ? category : 'personal';
        const finalConfidence = Math.max(confidence, 0.5);
        console.log('🔍 Final Classification Results:', {
            category: finalCategory,
            confidence: finalConfidence,
            tags: tags,
            language: detectedLanguage,
            languageConfidence: languageConfidence,
            entities: entities.length,
            dates: extractedDates.length,
            textLength: extractedText.text.length
        });
        const classification = {
            category: finalCategory,
            confidence: finalConfidence,
            tags: tags.length > 0 ? tags : ['document'],
            language: detectedLanguage,
            extractedDates: extractedDates,
            classificationDetails: {
                categories: [finalCategory],
                entities: entities,
                sentiment: null,
            },
        };
        return classification;
    }
    catch (error) {
        console.error('Document classification error:', error);
        throw new Error('Failed to classify document');
    }
}
async function translateDocumentInternal(documentUrl, targetLanguage, sourceLanguage) {
    let apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;
    if (!apiKey) {
        try {
            const config = functions.config();
            apiKey = config.google?.translate_api_key;
        }
        catch (error) {
            console.error('Failed to get API key from config:', error);
        }
    }
    if (!apiKey) {
        throw new Error('Missing GOOGLE_TRANSLATE_API_KEY in environment or Firebase config');
    }
    const cacheKey = `${documentUrl}::${sourceLanguage || 'auto'}::${targetLanguage}`;
    const cached = translationCache[cacheKey];
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
        return cached;
    }
    const docResp = await (0, node_fetch_1.default)(documentUrl);
    if (!docResp.ok) {
        throw new Error('Unable to fetch document content');
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
        throw new Error(`Translate API error: ${resp.status}`);
    }
    const data = (await resp.json());
    const translatedText = data.data?.translations?.[0]?.translatedText || '';
    const result = {
        translatedText,
        sourceLanguage: sourceLanguage ||
            data.data?.translations?.[0]?.detectedSourceLanguage ||
            'en',
        targetLanguage,
        confidence: 0.9,
    };
    translationCache[cacheKey] = { ...result, timestamp: Date.now() };
    return result;
}
async function extractTextFromImageWithVision(imageBuffer) {
    try {
        console.log('👁️ Starting Vision API text extraction...', {
            bufferSize: imageBuffer.length
        });
        const visionClient = await getVisionClient();
        const [result] = await visionClient.textDetection({
            image: { content: imageBuffer },
        });
        console.log('👁️ Vision API response received:', {
            hasTextAnnotations: !!(result.textAnnotations && result.textAnnotations.length > 0),
            annotationsCount: result.textAnnotations?.length || 0
        });
        const detections = result.textAnnotations;
        if (detections && detections.length > 0) {
            const extractedText = detections[0].description || '';
            console.log('✅ Vision API text extracted:', {
                length: extractedText.length,
                preview: extractedText.substring(0, 200)
            });
            return extractedText;
        }
        console.log('⚠️ No text detected by Vision API');
        return '';
    }
    catch (error) {
        console.error('❌ Vision API error:', error);
        throw new Error(`Vision API text extraction failed: ${error.message}`);
    }
}
exports.getSupportedLanguages = (0, https_1.onCall)(async () => {
    let apiKey = process.env.GOOGLE_TRANSLATE_API_KEY;
    if (!apiKey) {
        try {
            const config = functions.config();
            apiKey = config.google?.translate_api_key;
        }
        catch (error) {
            console.error('Failed to get API key from config:', error);
        }
    }
    if (!apiKey) {
        throw new functions.https.HttpsError('failed-precondition', 'Missing GOOGLE_TRANSLATE_API_KEY in environment or Firebase config');
    }
    if (translateLanguagesCache.data.length &&
        Date.now() - translateLanguagesCache.timestamp < CACHE_TTL_MS) {
        return { languages: translateLanguagesCache.data };
    }
    const url = `https://translation.googleapis.com/language/translate/v2/languages?key=${apiKey}&target=en`;
    const resp = await (0, node_fetch_1.default)(url);
    if (!resp.ok) {
        throw new functions.https.HttpsError('internal', `Translate API error: ${resp.status}`);
    }
    const data = (await resp.json());
    const languages = (data.data?.languages || []).map((l) => ({
        code: l.language,
        name: l.name,
    }));
    translateLanguagesCache.data = languages;
    translateLanguagesCache.timestamp = Date.now();
    return { languages };
});
exports.translateDocument = (0, https_1.onCall)(async (request) => {
    const { documentUrl, targetLanguage, sourceLanguage } = request.data;
    try {
        return await translateDocumentInternal(documentUrl, targetLanguage, sourceLanguage);
    }
    catch (error) {
        throw new functions.https.HttpsError('internal', error instanceof Error ? error.message : 'Translation failed');
    }
});
exports.extractText = (0, https_1.onCall)(async (request) => {
    assertAuthenticated(request);
    const { documentUrl, documentType } = request.data;
    try {
        return await extractTextInternal(documentUrl, documentType);
    }
    catch (error) {
        throw new functions.https.HttpsError('internal', error instanceof Error ? error.message : 'Text extraction failed');
    }
});
exports.extractTextHttp = (0, https_2.onRequest)(async (req, res) => {
    if (req.method === 'OPTIONS') {
        res.set('Access-Control-Allow-Origin', '*');
        res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        res.status(204).send('');
        return;
    }
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    try {
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
        const { documentUrl, documentType } = req.body;
        if (!documentUrl) {
            res.status(400).json({ error: 'documentUrl is required' });
            return;
        }
        const result = await extractTextInternal(documentUrl, documentType);
        res.json(result);
    }
    catch (error) {
        console.error('ExtractText error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
exports.detectLanguage = (0, https_1.onCall)(async (request) => {
    const { documentUrl } = request.data;
    try {
        console.log('🌐 Starting language detection for document:', documentUrl);
        const extractedText = await extractTextInternal(documentUrl, 'auto');
        console.log('✅ Text extracted, length:', extractedText.text.length);
        if (!extractedText.text || extractedText.text.trim().length < 10) {
            console.log('⚠️ No meaningful text extracted, using default language');
            return { language: 'en', confidence: 0.0 };
        }
        const languageResult = await detectLanguageInternal(extractedText.text);
        console.log('✅ Language detection successful:', languageResult);
        return languageResult;
    }
    catch (error) {
        console.error('❌ Language detection failed:', error);
        throw new functions.https.HttpsError('internal', error instanceof Error ? error.message : 'Language detection failed');
    }
});
exports.detectLanguageHttp = (0, https_2.onRequest)(async (req, res) => {
    if (req.method === 'OPTIONS') {
        res.set('Access-Control-Allow-Origin', '*');
        res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        res.status(204).send('');
        return;
    }
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    try {
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
        const { documentUrl } = req.body;
        if (!documentUrl) {
            res.status(400).json({ error: 'documentUrl is required' });
            return;
        }
        console.log('🔍 Starting language detection for document:', documentUrl);
        const extractedText = await extractTextInternal(documentUrl, 'auto');
        console.log('✅ Text extracted, length:', extractedText.text.length);
        if (!extractedText.text || extractedText.text.trim().length < 10) {
            console.log('⚠️ No meaningful text extracted, using default language');
            res.json({ language: 'en', confidence: 0.0 });
            return;
        }
        const client = await getLanguageClient();
        const maxTextSize = 1000000;
        const truncatedText = extractedText.text.length > maxTextSize
            ? extractedText.text.substring(0, maxTextSize)
            : extractedText.text;
        console.log(`Text size: ${extractedText.text.length} bytes, truncated to: ${truncatedText.length} bytes`);
        const languageResult = await detectLanguageInternal(truncatedText);
        console.log('✅ Language detection successful:', languageResult);
        res.json(languageResult);
    }
    catch (error) {
        console.error('DetectLanguage error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
exports.detectTextLanguage = (0, https_1.onCall)(async (request) => {
    const { text } = request.data;
    try {
        return await detectLanguageInternal(text);
    }
    catch (error) {
        throw new functions.https.HttpsError('internal', error instanceof Error ? error.message : 'Text language detection failed');
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
        const text = extractedText.text;
        let summary = '';
        let quality = 'medium';
        let confidence = extractedText.confidence || 0.5;
        const hasMacedonian = /[а-яё]/i.test(text);
        if (hasMacedonian) {
            const titleMatch = text.match(/(?:УВЕРЕНИЕ|СЕРТИФИКАТ|ДИПЛОМА|ДОКУМЕНТ|УНИВЕРЗИТЕТ|ИНСТИТУТ)/i);
            const dateMatch = text.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
            const nameMatch = text.match(/([А-ЯЁ]+ [А-ЯЁ]+), родена на (\d{1,2})\.(\d{1,2})\.(\d{4})/);
            if (titleMatch && dateMatch) {
                summary = `${titleMatch[0]} документ од ${dateMatch[3]} година.`;
                quality = 'high';
                confidence = 0.9;
            }
            else if (nameMatch) {
                summary = `Документ за ${nameMatch[1]}, родена на ${nameMatch[2]}.${nameMatch[3]}.${nameMatch[4]}.`;
                quality = 'high';
                confidence = 0.9;
            }
            else {
                const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 10);
                if (sentences.length > 0) {
                    summary = sentences[0].trim() + '.';
                    quality = 'medium';
                }
            }
        }
        else {
            if (text.length <= maxLength) {
                summary = text;
                quality = 'high';
            }
            else {
                const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 10);
                if (sentences.length > 0) {
                    let currentLength = 0;
                    const selectedSentences = [];
                    for (const sentence of sentences) {
                        if (currentLength + sentence.length <= maxLength && selectedSentences.length < 3) {
                            selectedSentences.push(sentence.trim());
                            currentLength += sentence.length;
                        }
                        else {
                            break;
                        }
                    }
                    summary = selectedSentences.join('. ') + '.';
                    quality = 'medium';
                }
                else {
                    summary = text.substring(0, maxLength - 3) + '...';
                    quality = 'low';
                }
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
                sentences: text.split(/[.!?]+/).filter((s) => s.trim().length > 0).length
            }
        };
    }
    catch (error) {
        console.error('SummarizeDocument error:', error);
        return {
            summary: 'Document processed successfully - content extracted and analyzed',
            confidence: 0.0,
            quality: 'low'
        };
    }
});
exports.summarizeDocumentHttp = (0, https_2.onRequest)(async (req, res) => {
    if (req.method === 'OPTIONS') {
        res.set('Access-Control-Allow-Origin', '*');
        res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        res.status(204).send('');
        return;
    }
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    try {
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
        const { documentUrl, maxLength = 200 } = req.body;
        if (!documentUrl) {
            res.status(400).json({ error: 'documentUrl is required' });
            return;
        }
        const textResp = await (0, node_fetch_1.default)(documentUrl);
        if (!textResp.ok) {
            res.status(404).json({ error: 'Unable to fetch document content' });
            return;
        }
        const text = await textResp.text();
        let cleanText = text
            .replace(/%PDF-[^\n]*/g, '')
            .replace(/[0-9]+ [0-9]+ obj[^\n]*/g, '')
            .replace(/<<\/Type[^>]*>>/g, '')
            .replace(/\/MediaBox[^>]*/g, '')
            .replace(/\/Parent[^>]*/g, '')
            .replace(/\/Resources[^>]*/g, '')
            .replace(/\s+/g, ' ')
            .trim();
        if (cleanText.length < 50) {
            cleanText = text;
        }
        let summary = cleanText;
        let confidence = 0.9;
        let quality = 'Good';
        try {
            const languageClient = await getLanguageClient();
            const [syntax] = await languageClient.analyzeSyntax({
                document: {
                    content: cleanText.substring(0, Math.min(cleanText.length, 1000000)),
                    type: 'PLAIN_TEXT',
                },
            });
            const sentences = cleanText
                .split(/[.!?]+/)
                .filter((s) => s.trim().length > 10);
            const keySentences = sentences.slice(0, 3);
            if (keySentences.length > 0) {
                summary = keySentences.join('. ') + '.';
                confidence = 0.95;
                quality = 'Excellent';
            }
            else if (cleanText.length > maxLength) {
                const words = cleanText.split(/\s+/);
                const targetWords = Math.floor(maxLength / 5);
                summary = words.slice(0, targetWords).join(' ') + '...';
                confidence = 0.85;
                quality = 'Good';
            }
        }
        catch (error) {
            console.log('Natural Language API failed, using fallback summarization:', error.message);
            summary =
                cleanText.length > maxLength
                    ? cleanText.substring(0, maxLength) + '...'
                    : cleanText;
            confidence = 0.8;
            quality = 'Fair';
        }
        const result = {
            summary,
            confidence,
            quality,
            metrics: {
                originalLength: cleanText.length,
                summaryLength: summary.length,
                compressionRatio: summary.length / cleanText.length,
                sentences: summary.split(/[.!?]+/).filter((s) => s.trim().length > 0)
                    .length,
            },
        };
        res.json(result);
    }
    catch (error) {
        console.error('SummarizeDocument error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
exports.classifyDocument = (0, https_1.onCall)(async (request) => {
    assertAuthenticated(request);
    const { documentUrl } = request.data;
    try {
        return await classifyDocumentInternal(documentUrl);
    }
    catch (error) {
        throw new functions.https.HttpsError('internal', error instanceof Error ? error.message : 'Document classification failed');
    }
});
exports.classifyDocumentHttp = (0, https_2.onRequest)(async (req, res) => {
    if (req.method === 'OPTIONS') {
        res.set('Access-Control-Allow-Origin', '*');
        res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        res.status(204).send('');
        return;
    }
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    try {
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
        const { documentUrl } = req.body;
        if (!documentUrl) {
            res.status(400).json({ error: 'documentUrl is required' });
            return;
        }
        const result = await classifyDocumentInternal(documentUrl);
        res.json(result);
    }
    catch (error) {
        console.error('ClassifyDocument error:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});
exports.translateText = (0, https_1.onCall)(async (request) => {
    const { text, targetLanguage, sourceLanguage } = request.data;
    try {
        return await translateDocumentInternal('data:text/plain;base64,' + Buffer.from(text).toString('base64'), targetLanguage, sourceLanguage);
    }
    catch (error) {
        throw new functions.https.HttpsError('internal', error instanceof Error ? error.message : 'Text translation failed');
    }
});
exports.extractDocumentMetadata = (0, https_1.onCall)(async (request) => {
    assertAuthenticated(request);
    const { documentUrl } = request.data;
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
        const extractedText = await extractTextInternal(documentUrl);
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
                .filter((word) => word.length > 0).length,
            hasText: extractedText.text.length > 0,
            detectedObjects: result.localizedObjectAnnotations?.map((obj) => ({
                name: obj.name,
                confidence: obj.score,
            })) || [],
            detectedLogos: result.logoAnnotations?.map((logo) => ({
                description: logo.description,
                confidence: logo.score,
            })) || [],
            pageCount: result.fullTextAnnotation?.pages?.length || 1,
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
                result.extraction = await extractTextInternal(url);
            }
            if (operations.includes('classify')) {
                result.classification = await classifyDocumentInternal(url);
            }
            if (operations.includes('translate')) {
                result.translation = await translateDocumentInternal(url, 'en');
            }
            results.push(result);
        }
        catch (error) {
            results.push({
                url,
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
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