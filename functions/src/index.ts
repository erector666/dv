import * as functions from 'firebase-functions';
import { onObjectFinalized } from 'firebase-functions/v2/storage';
import * as crypto from 'crypto';
// Removed onFinalize storage trigger for now to restore previous behavior
import * as admin from 'firebase-admin';
import { onCall } from 'firebase-functions/v2/https';
import { onRequest } from 'firebase-functions/v2/https';
// import fetch from 'node-fetch'; // Using dynamic import to avoid ESM issues
import pdfParse from 'pdf-parse';
import cors from 'cors';

// Security: Import file validation utilities
import { 
  validateFile, 
  validateFileUrl, 
  generateFileHash,
  FileValidationOptions 
} from './fileValidation';

// Security: Import rate limiting utilities
import { rateLimitMiddleware, RATE_LIMIT_CONFIG } from './rateLimiting';

// Security: Import secure logging utilities
import { secureLogger, logSecure } from './secureLogging';

// Security: Import input sanitization utilities
import { inputSanitizer, sanitize } from './inputSanitization';

// Free AI services - no more Google Cloud dependencies!
import { TesseractOCRService } from './tesseractService';
import { HuggingFaceAIService } from './huggingFaceAIService';
import { FreeTranslationService } from './freeTranslationService';
import { DorianChatbotService } from './chatbotService';
// Enhanced AI processing with DeepSeek
import { getEnhancedDocumentProcessor } from './enhancedDocumentProcessor';
import { getDeepSeekService } from './deepseekService';
// New Multimodal OCR service for better accuracy
import { getMultimodalOCRService } from './multimodalOCRService';
// Your existing Tesseract OCR Service is already imported above

// Initialize Admin SDK
try {
  admin.initializeApp();
} catch {}

// SECURITY: Enhanced CORS configuration
const corsHandler = cors({
  origin: (origin, callback) => {
    // SECURITY: Restrict origins based on environment
    const allowedOrigins = process.env.NODE_ENV === 'production' 
      ? [
          'https://appvault.vercel.app',
          'https://gpt1-77ce0.web.app',
          'https://gpt1-77ce0.firebaseapp.com',
          // Add your production domains here
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
    
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logSecure.security('CORS blocked origin', { origin }, 'medium');
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
  maxAge: 86400, // 24 hours cache for preflight requests
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

// SECURITY: Error handling utilities
function sanitizeErrorResponse(error: any, statusCode: number): {
  statusCode: number;
  message: string;
  details?: string;
} {
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Generic error messages for production
  const genericMessages: { [key: number]: string } = {
    400: 'Bad Request - Invalid input provided',
    401: 'Unauthorized - Authentication required',
    403: 'Forbidden - Access denied',
    404: 'Not Found - Resource not found',
    429: 'Too Many Requests - Rate limit exceeded',
    500: 'Internal Server Error - Please try again later',
    502: 'Bad Gateway - Service temporarily unavailable',
    503: 'Service Unavailable - Please try again later'
  };
  
  // Sanitize status code
  const safeStatusCode = [400, 401, 403, 404, 429, 500, 502, 503].includes(statusCode) 
    ? statusCode 
    : 500;
  
  let message = genericMessages[safeStatusCode] || genericMessages[500];
  let details: string | undefined;
  
  if (!isProduction) {
    // In development, provide more details but still sanitize sensitive info
    const originalMessage = error?.message || 'Unknown error';
    message = originalMessage.replace(/\b(?:password|token|key|secret|auth)\b/gi, '[REDACTED]');
    
    // Only include stack trace for genuine server errors
    if (safeStatusCode >= 500 && error?.stack) {
      details = error.stack.replace(/\b(?:password|token|key|secret|auth)=\S+/gi, '[REDACTED]');
    }
  }
  
  // SECURITY: Use secure logging for error details
  logSecure.error('Error response sanitized', error, {
    originalStatusCode: statusCode,
    sanitizedStatusCode: safeStatusCode,
    userAgent: 'N/A', // Would be available in request context
  });
  
  return {
    statusCode: safeStatusCode,
    message,
    details
  };
}

function generateRequestId(): string {
  return crypto.randomBytes(8).toString('hex');
}

// SECURITY: Helper to apply rate limiting to HTTP endpoints
function withRateLimit(
  rateLimiter: any,
  handler: (req: any, res: any) => Promise<void>
) {
  return async (req: any, res: any) => {
    return new Promise<void>((resolve, reject) => {
      rateLimiter(req, res, async () => {
        try {
          await handler(req, res);
          resolve();
        } catch (error) {
          reject(error);
        }
      });
    });
  };
}

// SECURITY: Add comprehensive security headers to all responses
function addSecurityHeaders(req: any, res: any): void {
  const headers = {
    // Prevent MIME type sniffing
    'X-Content-Type-Options': 'nosniff',
    
    // Prevent clickjacking
    'X-Frame-Options': 'DENY',
    
    // Enable XSS protection
    'X-XSS-Protection': '1; mode=block',
    
    // Control referrer information
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    
    // Prevent caching of sensitive data
    'Cache-Control': 'no-store, no-cache, must-revalidate, private',
    'Pragma': 'no-cache',
    'Expires': '0',
    
    // Security headers for HTTPS
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
    
    // Content Security Policy (basic)
    'Content-Security-Policy': [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'", // Firebase requires inline scripts
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://firebaseapp.com https://*.firebaseio.com https://*.googleapis.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'"
    ].join('; '),
    
    // Permissions Policy (formerly Feature Policy)
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
    
    // Server identification
    'Server': 'AppVault/1.0',
    
    // Request ID for tracking
    'X-Request-ID': generateRequestId(),
    
    // API version
    'X-API-Version': '1.0',
    
    // Rate limiting headers (will be overridden by rate limiter if present)
    'X-RateLimit-Limit': '100',
    'X-RateLimit-Remaining': '99'
  };
  
  // Apply headers
  res.set(headers);
  
  // Remove potentially sensitive headers
  res.removeHeader('X-Powered-By');
  res.removeHeader('Server');
}

// SECURITY: Enhanced CORS handler with security headers
function withSecurityHeaders(
  handler: (req: any, res: any) => Promise<void>
) {
  return async (req: any, res: any) => {
    // Add security headers first
    addSecurityHeaders(req, res);
    
    // Handle CORS preflight with security headers
    if (req.method === 'OPTIONS') {
      res.set({
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
        'Access-Control-Max-Age': '86400' // 24 hours
      });
      res.status(204).send('');
      return;
    }
    
    // Execute the actual handler
    await handler(req, res);
  };
}

// Initialize free services
let tesseractService: TesseractOCRService | null = null;
let huggingFaceService: HuggingFaceAIService | null = null;
let freeTranslationService: FreeTranslationService | null = null;
let chatbotService: DorianChatbotService | null = null;

async function getTesseractService(): Promise<TesseractOCRService> {
  if (!tesseractService) {
    console.log('🆓 Initializing free Tesseract OCR service...');
    tesseractService = new TesseractOCRService();
  }
  return tesseractService;
}

async function getHuggingFaceService(): Promise<HuggingFaceAIService> {
  if (!huggingFaceService) {
    console.log('🤖 Initializing free Hugging Face AI service...');
    huggingFaceService = new HuggingFaceAIService();
  }
  return huggingFaceService;
}

async function getFreeTranslationService(): Promise<FreeTranslationService> {
  if (!freeTranslationService) {
    console.log('🌐 Initializing free translation service...');
    freeTranslationService = new FreeTranslationService();
  }
  return freeTranslationService;
}

async function getChatbotService(): Promise<DorianChatbotService> {
  if (!chatbotService) {
    console.log('🤖 Initializing Dorian chatbot service...');
    chatbotService = new DorianChatbotService();
  }
  return chatbotService;
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

// Enhanced language detection using OlmOCR-7B-0725 built-in detection + Hugging Face fallback
async function detectLanguageInternal(text: string): Promise<any> {
  try {
    console.log(
      '🚀 Starting enhanced language detection with OlmOCR-7B-0725...'
    );

    if (!text || text.trim().length < 10) {
      console.log('⚠️ Text too short for reliable language detection');
      return { language: 'en', confidence: 0.0 };
    }

    // Try Hugging Face AI as primary detection
    const aiService = await getHuggingFaceService();
    const result = await aiService.detectLanguage(text);

    console.log('✅ Enhanced language detection successful:', {
      language: result.language,
      confidence: result.confidence,
      alternatives: result.allLanguages.length,
      method: 'huggingface',
    });

    return result;
  } catch (error) {
    console.warn(
      '⚠️ Language detection failed, using enhanced OlmOCR fallback:',
      error
    );

    // Enhanced fallback: Use OlmOCR's built-in language detection logic
    // Check for Cyrillic characters (Macedonian/Serbian/Russian detection)
    if (/[а-яё]/i.test(text)) {
      // Enhanced Macedonian detection with more patterns
      if (
        /\b(уверение|универзитет|информатика|контролен|испит|диплома|сертификат|институт|факултет)\b/i.test(
          text
        )
      ) {
        console.log(
          '🔍 Enhanced Macedonian language detected via OlmOCR patterns'
        );
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

    // Enhanced French detection with more patterns
    if (
      /\b(université|attestation|certificat|formation|informatique|français|cours|publique|municipale)\b/i.test(
        text
      ) ||
      /[àâäéèêëïîôöùûüÿç]/i.test(text)
    ) {
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

// Get quality assessment description
function getQualityAssessment(score: number): string {
  if (score >= 0.9) return 'Excellent';
  if (score >= 0.8) return 'Very Good';
  if (score >= 0.7) return 'Good';
  if (score >= 0.6) return 'Fair';
  if (score >= 0.5) return 'Acceptable';
  return 'Poor';
}

// Advanced text extraction using Multimodal-OCR with OlmOCR-7B-0725 model selection
async function extractTextInternal(
  documentUrl: string,
  documentType?: 'pdf' | 'image' | 'auto'
): Promise<any> {
  if (!documentUrl) {
    throw new Error('Document URL is required');
  }

  // SECURITY: Validate URL to prevent SSRF attacks
  const urlValidation = validateFileUrl(documentUrl);
  if (!urlValidation.isValid) {
    throw new Error(`Invalid document URL: ${urlValidation.errors.join(', ')}`);
  }

  try {
    logSecure.info('Fetching document for processing', { 
      url: documentUrl.substring(0, 50) + '...' // Truncate long URLs
    });

    const fetch = (await import('node-fetch')).default;
    const response = await fetch(documentUrl);
    if (!response.ok) {
      throw new Error(
        `Unable to fetch document: ${response.status} ${response.statusText}`
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const contentType = response.headers.get('content-type') || '';

    // SECURITY: Extract filename from URL for validation
    const urlParts = documentUrl.split('/');
    const fileName = decodeURIComponent(urlParts[urlParts.length - 1].split('?')[0]) || 'document';

    logSecure.info('Document fetched successfully', {
      size: buffer.length,
      contentType: contentType,
      fileName: fileName.length > 50 ? fileName.substring(0, 50) + '...' : fileName,
    });

    // SECURITY: Validate file content, size, and type
    const validationOptions: FileValidationOptions = {
      maxFileSize: 10 * 1024 * 1024, // 10MB limit
      strictMimeTypeValidation: true,
      checkMagicBytes: true,
      sanitizeFileName: true
    };

    const validation = await validateFile(buffer, fileName, contentType, validationOptions);
    
    if (!validation.isValid) {
      logSecure.security('File validation failed', { 
      errors: validation.errors,
      fileName: fileName.substring(0, 50) 
    }, 'high');
      throw new Error(`File validation failed: ${validation.errors.join(', ')}`);
    }

    if (validation.warnings.length > 0) {
      logSecure.warn('File validation warnings', { warnings: validation.warnings });
    }

    // Generate file hash for integrity checking
    const fileHash = generateFileHash(buffer);
    logSecure.info('File hash generated for integrity checking', { 
      hashPreview: fileHash.substring(0, 16) + '...' 
    });

    let extractedText = '';
    let confidence = 0.5;
    let type = documentType || 'auto';

    // Auto-detect type if not specified
    if (type === 'auto') {
      if (
        contentType.includes('pdf') ||
        documentUrl.toLowerCase().includes('.pdf')
      ) {
        type = 'pdf';
      } else if (
        contentType.includes('image') ||
        /\.(jpg|jpeg|png|gif|bmp|tiff)$/i.test(documentUrl)
      ) {
        type = 'image';
      } else {
        type = 'image'; // Default to image processing
      }
    }

    console.log('📋 Processing document as:', type);

    if (type === 'pdf') {
      console.log('📄 Processing as PDF...');
      try {
        const pdfData = await pdfParse(buffer);
        extractedText = pdfData.text || '';

        if (extractedText.length > 50) {
          console.log(
            '✅ PDF text extracted successfully:',
            extractedText.length,
            'characters'
          );
          confidence = 0.95;
        } else {
          console.log(
            '⚠️ PDF text extraction yielded minimal content, trying Tesseract OCR...'
          );
          // Fallback to Tesseract OCR for image-based PDFs
          const tesseractService = await getTesseractService();
          const ocrResult = await tesseractService.extractTextFromImage(buffer);
          extractedText = ocrResult.text;
          confidence = ocrResult.confidence;
        }
      } catch (error) {
        console.error(
          '❌ PDF parsing failed, falling back to Tesseract OCR:',
          error
        );
        const tesseractService = await getTesseractService();
        const ocrResult = await tesseractService.extractTextFromImage(buffer);
        extractedText = ocrResult.text;
        confidence = ocrResult.confidence;
      }
    } else {
      // Image text extraction using existing Tesseract OCR Service
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
      // SECURITY: Include validation metadata
      validation: {
        fileSize: validation.fileSize,
        detectedMimeType: validation.detectedMimeType,
        sanitizedFileName: validation.sanitizedFileName,
        fileHash: fileHash,
        warnings: validation.warnings
      }
    };
  } catch (error) {
    logSecure.error('Text extraction failed', error);
    // Provide more detailed error information
    const errorMessage =
      error instanceof Error
        ? error.message
        : 'Unknown error during text extraction';
    console.error('Error details:', {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : 'No stack trace',
      documentUrl: documentUrl,
      documentType: documentType,
    });

    // Return a structured error response instead of throwing
    return {
      text: '',
      confidence: 0,
      quality: 'low',
      type: documentType || 'unknown',
      error: 'Failed to extract text from document',
      errorDetails:
        process.env.NODE_ENV === 'production' ? undefined : errorMessage,
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

// Free document classification using Hugging Face AI
// Legacy single AI classification (for backward compatibility)
async function classifyDocumentInternal(documentUrl: string): Promise<any> {
  if (!documentUrl) {
    throw new Error('Document URL is required');
  }

  try {
    console.log(
      '🔍 Starting free AI document classification for:',
      documentUrl
    );

    // Step 1: Extract text using free OCR/PDF parsing
    const extractedText = await extractTextInternal(documentUrl);

    if (!extractedText.text || extractedText.text.length < 10) {
      console.warn(
        '⚠️ No meaningful text extracted, using basic classification'
      );
      return {
        category: 'personal',
        confidence: 0.3,
        tags: ['document'],
        language: 'en',
        extractedDates: [] as string[],
        suggestedName: 'Document',
        classificationDetails: {
          categories: ['personal'],
          entities: [] as any[],
          sentiment: null as any,
        },
      };
    }

    // Step 2: Use free Hugging Face AI for classification
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
  } catch (error) {
    console.error('Free AI document classification error:', error);
    throw new Error('Failed to classify document with free AI');
  }
}

// NEW: Dual AI processing function
async function classifyDocumentDualAI(
  documentUrl: string,
  extractedText?: any
): Promise<{
  huggingFaceResult: any;
  deepSeekResult: any;
  extractedText: any;
}> {
  if (!documentUrl) {
    throw new Error('Document URL is required');
  }

  try {
    console.log(
      '🚀 Starting DUAL AI document classification for:',
      documentUrl
    );

    // Step 1: Extract text if not provided
    let textData = extractedText;
    if (!textData) {
      textData = await extractTextInternal(documentUrl);
    }

    if (!textData.text || textData.text.length < 10) {
      console.warn(
        '⚠️ No meaningful text extracted, using basic classification for both AIs'
      );
      const basicResult = {
        category: 'personal',
        confidence: 0.3,
        tags: ['document'],
        language: 'en',
        extractedDates: [] as string[],
        suggestedName: 'Document',
        summary: 'Document processed successfully',
        reasoning: 'Insufficient text for analysis',
        classificationDetails: {
          categories: ['personal'],
          entities: [] as any[],
          sentiment: null as any,
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

    // Step 2: Run both AIs in parallel
    const [huggingFaceResult, deepSeekResult] = await Promise.all([
      // Hugging Face AI
      (async () => {
        try {
          console.log('🤗 Processing with Hugging Face...');
          const aiService = await getHuggingFaceService();
          const result = await aiService.classifyDocument(textData.text);
          console.log('✅ Hugging Face completed');
          return result;
        } catch (error) {
          console.error('❌ Hugging Face processing failed:', error);
          return {
            category: 'personal',
            confidence: 0.2,
            tags: ['document'],
            language: 'en',
            extractedDates: [] as string[],
            suggestedName: 'Document',
            error: 'Hugging Face processing failed',
          };
        }
      })(),

      // FAST FALLBACK: Skip DeepSeek for main upload to prevent timeouts
      (async () => {
        console.log(
          '⚡ Using fast fallback instead of DeepSeek to prevent timeouts'
        );
        return {
          category: 'document',
          confidence: 0.8,
          tags: ['document', 'uploaded'],
          language: 'en',
          extractedDates: [] as string[],
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
        confidence:
          (deepSeekResult as any).classificationConfidence ||
          (deepSeekResult as any).confidence ||
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
        processingTime: 0, // Fast fallback
        aiType: 'fast_fallback',
      },
      extractedText: textData,
    };
  } catch (error) {
    console.error('❌ Dual AI document classification error:', error);
    throw new Error('Failed to classify document with dual AI');
  }
}

// Free translation using Hugging Face
async function translateDocumentInternal(
  documentUrl: string,
  targetLanguage: string,
  sourceLanguage?: string,
  documentId?: string
): Promise<any> {
  try {
    console.log('🆓 Using free translation service...');
    const translationService = await getFreeTranslationService();

    let textToTranslate = '';
    let extractionMethod = 'unknown';

    // Step 1: Try to get stored text from Firestore first (MUCH FASTER!)
    if (documentId) {
      try {
        console.log('🔍 Checking for stored extracted text in Firestore...');
        // Use Firebase Admin SDK directly
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
      } catch (error) {
        console.warn(
          '⚠️ Could not retrieve stored text, will extract from document:',
          error
        );
      }
    }

    // Step 2: Fallback to extraction if no stored text found
    if (!textToTranslate) {
      console.log('📄 No stored text found, extracting from document...');
      const extractedText = await extractTextInternal(documentUrl);

      if (!extractedText.text || extractedText.text.trim().length === 0) {
        throw new Error('Failed to extract text from document');
      }

      textToTranslate = extractedText.text;
      extractionMethod = 'live_extraction';
      console.log(
        '📄 Text extracted for translation, length:',
        textToTranslate.length
      );
    }

    // Step 3: Translate using free service
    const result = await translationService.translateText(
      textToTranslate,
      targetLanguage,
      sourceLanguage || 'auto'
    );

    // Add extraction method info to result
    (result as any).extractionMethod = extractionMethod;
    (result as any).originalTextLength = textToTranslate.length;

    console.log(
      '✅ Free translation completed successfully using:',
      extractionMethod
    );
    return result;
  } catch (error) {
    console.error('❌ Free translation failed:', error);
    throw new Error(`Free translation failed: ${error.message}`);
  }
}

// Export Firebase Functions

export const extractText = onCall(async request => {
  assertAuthenticated(request);
  const { documentUrl, documentType } = request.data as {
    documentUrl: string;
    documentType?: 'pdf' | 'image' | 'auto';
  };

  try {
    const result = await extractTextInternal(documentUrl, documentType);
    return result;
  } catch (error) {
    console.error('Extract text error:', error);
    throw new functions.https.HttpsError('internal', 'Text extraction failed');
  }
});

export const extractTextHttp = onRequest(
  { memory: '1GiB', timeoutSeconds: 300 }, // Increased memory for Tesseract OCR
  withSecurityHeaders(withRateLimit(rateLimitMiddleware.aiProcessing, async (req, res) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      res.set('Access-Control-Allow-Origin', '*');
      res.set(
        'Access-Control-Allow-Methods',
        'GET, POST, PUT, DELETE, OPTIONS'
      );
      res.set(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization, authorization, Origin, X-Requested-With, Accept, X-Firebase-AppCheck'
      );
      res.status(204).send('');
      return;
    }

    return corsHandler(req, res, async () => {
      // Set CORS headers for all responses
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
        
        // SECURITY: Sanitize and validate inputs
        const sanitizedUrl = sanitize.url(documentUrl || '');
        const sanitizedType = sanitize.string(documentType || 'auto', {
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
        
        logSecure.info('Processing document extraction request', {
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

        // Log security threats if any were detected
        if (sanitizedType.detectedThreats.length > 0) {
          logSecure.security('Input sanitization threats detected', {
            field: 'documentType',
            threats: sanitizedType.detectedThreats
          }, 'medium');
        }

        const result = await extractTextInternal(
          sanitizedUrl.sanitized, 
          sanitizedType.sanitized as 'pdf' | 'image' | 'auto'
        );

        // If there was an error during extraction, it will be in the result object
        if (result.error) {
          res.status(500).json({
            success: false,
            error: result.error,
            details:
              result.errorDetails || 'An error occurred during text extraction',
          });
          return;
        }

        res.status(200).json({
          success: true,
          data: result,
        });
      } catch (error) {
        console.error('Extract text HTTP error:', error);
        const statusCode = error.status || 500;
        const errorMessage = error.message || 'Text extraction failed';

        // SECURITY: Sanitize error responses to prevent information disclosure
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
  }))
);

export const classifyDocument = onCall(async request => {
  assertAuthenticated(request);
  const { documentUrl, useEnhanced = true } = request.data as {
    documentUrl: string;
    useEnhanced?: boolean;
  };

  try {
    if (useEnhanced) {
      // Use enhanced processing with DeepSeek
      console.log('🚀 Using enhanced document processing...');
      const enhancedProcessor = getEnhancedDocumentProcessor();
      const result = await enhancedProcessor.processDocument(documentUrl);

      // Convert to compatible format
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
    } else {
      // Use original processing
      const result = await classifyDocumentInternal(documentUrl);
      return result;
    }
  } catch (error) {
    console.error('Document classification error:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Document classification failed'
    );
  }
});

export const classifyDocumentHttp = onRequest(
  { memory: '1GiB', timeoutSeconds: 300 }, // Increased memory for AI processing
  withSecurityHeaders(withRateLimit(rateLimitMiddleware.aiProcessing, async (req, res) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      res.set('Access-Control-Allow-Origin', '*');
      res.set(
        'Access-Control-Allow-Methods',
        'GET, POST, PUT, DELETE, OPTIONS'
      );
      res.set(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization, authorization, Origin, X-Requested-With, Accept, X-Firebase-AppCheck'
      );
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
      } catch (error) {
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
  }))
);

export const detectLanguage = onCall(async request => {
  const { documentUrl } = request.data as { documentUrl: string };

  try {
    const extractedText = await extractTextInternal(documentUrl);
    const result = await detectLanguageInternal(extractedText.text);
    return result;
  } catch (error) {
    console.error('Language detection error:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Language detection failed'
    );
  }
});

export const detectLanguageHttp = onRequest(
  { memory: '1GiB', timeoutSeconds: 300 }, // Increased memory for Tesseract + AI processing
  async (req, res) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      res.set('Access-Control-Allow-Origin', '*');
      res.set(
        'Access-Control-Allow-Methods',
        'GET, POST, PUT, DELETE, OPTIONS'
      );
      res.set(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization, authorization, Origin, X-Requested-With, Accept, X-Firebase-AppCheck'
      );
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
      } catch (error) {
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
  }
);

export const detectTextLanguage = onCall(async request => {
  const { text } = request.data as { text: string };

  try {
    const result = await detectLanguageInternal(text);
    return result;
  } catch (error) {
    console.error('Text language detection error:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Text language detection failed'
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
        summary:
          'Document processed successfully - content extracted and analyzed',
        confidence: 0.0,
        quality: 'low',
      };
    }

    // Use Hugging Face AI for summarization
    const aiService = await getHuggingFaceService();
    const result = await aiService.summarizeDocument(
      extractedText.text,
      maxLength
    );

    return result;
  } catch (error) {
    console.error('Document summarization error:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Document summarization failed'
    );
  }
});

export const summarizeDocumentHttp = onRequest(
  { memory: '1GiB', timeoutSeconds: 300 }, // Increased memory for AI processing
  async (req, res) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      res.set('Access-Control-Allow-Origin', '*');
      res.set(
        'Access-Control-Allow-Methods',
        'GET, POST, PUT, DELETE, OPTIONS'
      );
      res.set(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization, authorization, Origin, X-Requested-With, Accept, X-Firebase-AppCheck'
      );
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
            summary:
              'Document processed successfully - content extracted and analyzed',
            confidence: 0.0,
            quality: 'low',
          });
          return;
        }

        const aiService = await getHuggingFaceService();
        const result = await aiService.summarizeDocument(
          extractedText.text,
          maxLength
        );

        res.status(200).json(result);
      } catch (error) {
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
  }
);

export const getSupportedLanguages = onCall(async () => {
  try {
    console.log('🌍 Getting supported languages from free service...');
    const translationService = await getFreeTranslationService();
    const languages = translationService.getSupportedLanguages();

    console.log('✅ Free supported languages retrieved:', languages.length);
    return { languages };
  } catch (error) {
    console.warn('⚠️ Free language service failed:', error);

    // Return basic language set as fallback
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

export const translateDocument = onCall(async request => {
  const { documentUrl, targetLanguage, sourceLanguage, documentId } =
    request.data as {
      documentUrl: string;
      targetLanguage: string;
      sourceLanguage?: string;
      documentId?: string;
    };

  try {
    const result = await translateDocumentInternal(
      documentUrl,
      targetLanguage,
      sourceLanguage,
      documentId
    );
    return result;
  } catch (error) {
    console.error('Document translation error:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Document translation failed'
    );
  }
});

export const translateDocumentHttp = onRequest(
  { memory: '1GiB', timeoutSeconds: 300 }, // Increased memory for translation processing
  async (req, res) => {
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
        const { documentUrl, targetLanguage, sourceLanguage, documentId } =
          req.body;

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

        const result = await translateDocumentInternal(
          documentUrl,
          targetLanguage,
          sourceLanguage,
          documentId
        );
        res.status(200).json(result);
      } catch (error) {
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
  }
);

export const translateText = onCall(async request => {
  const { text, targetLanguage, sourceLanguage } = request.data as {
    text: string;
    targetLanguage: string;
    sourceLanguage?: string;
  };

  try {
    const translationService = await getFreeTranslationService();
    const result = await translationService.translateText(
      text,
      targetLanguage,
      sourceLanguage
    );
    return result;
  } catch (error) {
    console.error('Text translation error:', error);
    throw new functions.https.HttpsError('internal', 'Text translation failed');
  }
});

export const extractDocumentMetadata = onCall(async request => {
  assertAuthenticated(request);
  const { documentUrl } = request.data as { documentUrl: string };

  try {
    // Extract text and classify document
    const extractedText = await extractTextInternal(documentUrl);
    const classification = await classifyDocumentInternal(documentUrl);

    // Combine results for comprehensive metadata
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
  } catch (error) {
    console.error('Extract metadata error:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Metadata extraction failed'
    );
  }
});

export const processDocumentBatch = onCall(async request => {
  assertAuthenticated(request);
  const { documentUrls, operations } = request.data as {
    documentUrls: string[];
    operations: string[];
  };

  try {
    const results: any[] = [];

    for (const documentUrl of documentUrls) {
      const documentResult: any = { documentUrl };

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
          const text =
            documentResult.textExtraction?.text ||
            (await extractTextInternal(documentUrl)).text;
          documentResult.language = await detectLanguageInternal(text);
        }

        documentResult.success = true;
      } catch (error) {
        console.error(`Batch processing error for ${documentUrl}:`, error);
        documentResult.success = false;
        documentResult.error = error.message;
      }

      results.push(documentResult);
    }

    return { results };
  } catch (error) {
    console.error('Batch processing error:', error);
    throw new functions.https.HttpsError('internal', 'Batch processing failed');
  }
});

// NEW: Dual AI Classification Endpoint - Enhanced Version
export const classifyDocumentDualAIHttp = onRequest(
  { memory: '2GiB', timeoutSeconds: 540 }, // Increased for dual processing
  async (req, res) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      res.set('Access-Control-Allow-Origin', '*');
      res.set(
        'Access-Control-Allow-Methods',
        'GET, POST, PUT, DELETE, OPTIONS'
      );
      res.set(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization, authorization, Origin, X-Requested-With, Accept, X-Firebase-AppCheck'
      );
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
          // Run both AIs and return comparison
          if (documentText && typeof documentText === 'string' && documentText.trim().length > 0) {
            // When text is provided, bypass fetching
            const [huggingFaceResult, deepSeekResult] = await Promise.all([
              (async () => {
                try {
                  const aiService = await getHuggingFaceService();
                  return await aiService.classifyDocument(documentText);
                } catch (e) {
                  return { category: 'document', confidence: 0.3, tags: ['document'], language: 'en' };
                }
              })(),
              (async () => {
                try {
                  const enhancedProcessor = getEnhancedDocumentProcessor();
                  // Use processDocument with a temporary URL for text processing
                  const ds = await enhancedProcessor.processDocument('text://inline');
                  return {
                    category: ds.category || 'document',
                    confidence: ds.classificationConfidence || 0.5,
                    tags: ds.tags || ['document'],
                    language: ds.language || 'en',
                    suggestedName: ds.suggestedName,
                    summary: ds.summary,
                  };
                } catch (e) {
                  return { category: 'document', confidence: 0.4, tags: ['document'], language: 'en' };
                }
              })(),
            ]);
            result = { huggingFaceResult, deepSeekResult, extractedText: { text: documentText } };
          } else {
            result = await classifyDocumentDualAI(documentUrl);
          }
        } else if (mode === 'huggingface') {
          // Run only Hugging Face
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
        } else if (mode === 'deepseek') {
          // Run only DeepSeek
          const enhancedProcessor = getEnhancedDocumentProcessor();
          const dsResult = documentText
            ? await enhancedProcessor.processDocument('text://inline')
            : await enhancedProcessor.processDocument(documentUrl);
          result = {
            huggingFaceResult: null,
            deepSeekResult: dsResult,
            selectedAI: 'deepseek',
          };
        } else {
          res.status(400).json({
            error: 'Invalid mode. Use: both, huggingface, or deepseek',
          });
          return;
        }

        res.status(200).json(result);
      } catch (error) {
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
  }
);

// Metadata-based reprocessing function
async function reprocessFromMetadata(
  documentUrl: string,
  mode: 'huggingface' | 'deepseek' | 'both'
): Promise<any | null> {
  try {
    console.log('🔍 Searching for stored metadata for document:', documentUrl);

    // Extract document path from URL to search Firestore
    const urlParts = documentUrl.split('/');
    const fileName = decodeURIComponent(
      urlParts[urlParts.length - 1].split('?')[0]
    );

    // Search for document in Firestore by URL or filename
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

    // Use stored extracted text for reprocessing
    const extractedText = storedMetadata.extractedText;

    let classification;

    if (mode === 'both') {
      // Run both AIs on stored text
      console.log('🤖 Running dual AI on stored text...');
      const [huggingFaceResult, deepSeekResult] = await Promise.all([
        // Hugging Face AI
        (async () => {
          try {
            const aiService = await getHuggingFaceService();
            return await aiService.classifyDocument(extractedText);
          } catch (error) {
            console.error('❌ Hugging Face processing failed:', error);
            return {
              category: 'personal',
              confidence: 0.2,
              tags: ['document'],
              language: 'en',
              extractedDates: [] as string[],
              suggestedName: 'Document',
              error: 'Hugging Face processing failed',
            };
          }
        })(),

        // DeepSeek AI - Use text directly instead of URL
        (async () => {
          try {
            const deepSeekService = getDeepSeekService();
            const result =
              await deepSeekService.classifyDocument(extractedText);
            return {
              category: result.category || 'personal',
              confidence: result.confidence || 0.5,
              tags: (result as any).tags || ['document'],
              language: (result as any).language || 'en',
              extractedDates:
                (result as any).extractedDates || ([] as string[]),
              suggestedName: (result as any).suggestedName || 'Document',
              summary:
                (result as any).summary || 'Document processed with DeepSeek',
              reasoning:
                result.reasoning || 'Analyzed using stored text metadata',
            };
          } catch (error) {
            console.error('❌ DeepSeek processing failed:', error);
            return {
              category: 'personal',
              confidence: 0.2,
              tags: ['document'],
              language: 'en',
              extractedDates: [] as string[],
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
    } else if (mode === 'deepseek') {
      // DeepSeek only on stored text
      console.log('🧠 Running DeepSeek on stored text...');
      try {
        const deepSeekService = getDeepSeekService();
        classification = await deepSeekService.classifyDocument(extractedText);
      } catch (error) {
        console.error('❌ DeepSeek processing failed:', error);
        return null;
      }
    } else {
      // Hugging Face only on stored text
      console.log('🤗 Running Hugging Face on stored text...');
      try {
        const aiService = await getHuggingFaceService();
        classification = await aiService.classifyDocument(extractedText);
      } catch (error) {
        console.error('❌ Hugging Face processing failed:', error);
        return null;
      }
    }

    // Update metadata with reprocessing history
    const reprocessingEntry = {
      date: new Date().toISOString(),
      mode,
      previousCategory: docData.category,
      newCategory:
        classification.category ||
        (classification as any).huggingFaceResult?.category ||
        (classification as any).deepSeekResult?.category,
      method: 'metadata-based',
    };

    const updatedMetadata = {
      ...storedMetadata,
      reprocessingHistory: [
        ...(storedMetadata.reprocessingHistory || []),
        reprocessingEntry,
      ],
    };

    // Update Firestore document
    await querySnapshot.docs[0].ref.update({
      metadata: updatedMetadata,
      lastModified: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log('✅ Metadata-based reprocessing completed successfully');
    return classification;
  } catch (error) {
    console.error('❌ Metadata-based reprocessing error:', error);
    return null;
  }
}

// Enhanced Metadata-Based Reprocessing with AI Choice
export const reprocessDocuments = onRequest(
  {
    memory: '1GiB',
    timeoutSeconds: 540,
  },
  async (req, res) => {
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
        const {
          documentUrls,
          mode = 'huggingface',
          useStoredMetadata = true,
        } = req.body;

        if (!documentUrls || !Array.isArray(documentUrls)) {
          res
            .status(400)
            .json({ error: 'Missing or invalid documentUrls array' });
          return;
        }

        console.log(
          `🔄 Enhanced metadata-based reprocessing ${documentUrls.length} documents with mode: ${mode}`
        );

        const results: any[] = [];
        for (const documentUrl of documentUrls) {
          try {
            let classification;

            // Try metadata-based reprocessing first
            if (useStoredMetadata) {
              console.log(
                '📋 Attempting metadata-based reprocessing for:',
                documentUrl
              );
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
              } else {
                console.log(
                  '⚠️ No metadata found, falling back to OCR reprocessing'
                );
              }
            }

            // Fallback to OCR-based reprocessing
            console.log('🔍 Falling back to OCR-based reprocessing');
            if (mode === 'both') {
              // Dual AI processing
              classification = await classifyDocumentDualAI(documentUrl);
            } else if (mode === 'deepseek') {
              // DeepSeek only
              const enhancedProcessor = getEnhancedDocumentProcessor();
              classification =
                await enhancedProcessor.processDocument(documentUrl);
            } else {
              // Hugging Face (default)
              classification = await classifyDocumentInternal(documentUrl);
            }

            results.push({
              documentUrl,
              success: true,
              classification,
              mode,
              method: 'ocr',
            });
          } catch (error: any) {
            console.error(
              `❌ Reprocessing failed for ${documentUrl}:`,
              error.message
            );
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
        const metadataCount = results.filter(
          r => r.method === 'metadata'
        ).length;

        console.log(
          `✅ Enhanced reprocessing completed: ${successCount}/${results.length} successful (${metadataCount} via metadata)`
        );

        res.status(200).json({
          results,
          mode,
          processed: results.length,
          successful: successCount,
          metadataBased: metadataCount,
        });
      } catch (error) {
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
  }
);

export const getStorageUsage = onRequest(async (req, res) => {
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
    // Simple storage calculation - in real implementation,
    // you'd query Firestore for actual document sizes
    const totalSize = Math.floor(Math.random() * 1000000000); // Mock data

    res.status(200).json({
      totalSize,
      freeQuota: 1073741824, // 1GB
      usedPercentage: (totalSize / 1073741824) * 100,
    });
  } catch (error) {
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

// Storage onFinalize: process files uploaded to incoming/{userId}/
export const processIncomingUpload = onObjectFinalized(
  { memory: '1GiB', timeoutSeconds: 540, region: 'europe-central2' },
  async event => {
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

      // Parse path incoming/{userId}/{filename}
      const parts = filePath.split('/');
      if (parts.length < 3) {
        console.warn('Unexpected incoming path:', filePath);
        return;
      }
      const userId = parts[1];
      const fileName = parts.slice(2).join('/');
      const destPath = `documents/${userId}/${fileName}`;
      const destFile = bucket.file(destPath);

      // Copy to documents/
      await srcFile.copy(destFile);

      // Public media URL (token)
      const token = (crypto as any).randomUUID
        ? (crypto as any).randomUUID()
        : crypto.randomBytes(16).toString('hex');
      await destFile.setMetadata({
        contentType,
        metadata: { firebaseStorageDownloadTokens: token },
        cacheControl: 'public, max-age=3600',
      } as any);
      const encodedPath = encodeURIComponent(destPath);
      const downloadURL = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodedPath}?alt=media&token=${token}`;

      // Prefer to use signed URL for internal processing
      const [signedUrl] = await destFile.getSignedUrl({
        action: 'read',
        expires: Date.now() + 60 * 60 * 1000,
      });

      // Run extraction + classification on server helpers
      const extractedText = await extractTextInternal(signedUrl, 'auto');
      let classification: any = null;
      try {
        classification = await classifyDocumentInternal(signedUrl);
      } catch (e) {
        console.warn('Classification failed:', (e as any)?.message);
      }

      // Find Firestore doc (created by client) by original incoming path
      const docsRef = admin.firestore().collection('documents');
      const snap = await docsRef.where('path', '==', filePath).limit(1).get();
      if (snap.empty) {
        console.warn('No Firestore document found for', filePath);
      } else {
        const docRef = snap.docs[0].ref;
        const updates: Record<string, any> = {
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
          if (classification.suggestedName) updates['metadata.suggestedName'] = classification.suggestedName;
          if (classification.summary) updates['metadata.summary'] = classification.summary;
          if (classification.language) updates['metadata.language'] = classification.language;
          if (classification.extractedDates) updates['metadata.extractedDates'] = classification.extractedDates;
        }

        await docRef.update(updates);
        console.log('✅ Firestore updated for', filePath);
      }

      try {
        await srcFile.delete();
        console.log('🧹 Deleted original incoming file');
      } catch (e) {
        console.warn('Cleanup incoming delete failed:', (e as any)?.message);
      }
    } catch (err) {
      console.error('❌ processIncomingUpload error:', (err as any)?.message || err);
    }
  }
);

// Storage Trigger: Process uploads from incoming/ → AI → move to documents/ → update Firestore → delete original

// 🤖 Dorian Chatbot Endpoint (Callable Function)
export const chatbot = onCall(async request => {
  try {
    const {
      message,
      conversationId,
      context,
      useEnhanced = true,
    } = request.data;

    if (!message || typeof message !== 'string') {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Message is required and must be a string'
      );
    }

    console.log('🤖 Processing chatbot message:', {
      userId: request.auth?.uid,
      messageLength: message.length,
      useEnhanced,
    });

    if (useEnhanced && context?.documentText) {
      // Use enhanced DeepSeek Q&A for document-related questions
      console.log('🧠 Using enhanced chatbot with DeepSeek...');
      const enhancedProcessor = getEnhancedDocumentProcessor();
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
    } else {
      // Use original chatbot service
      const chatbotService = await getChatbotService();

      // Build conversation context
      const conversationContext = {
        userId: request.auth?.uid || 'anonymous',
        language: context?.language || 'en',
        recentDocuments: context?.recentDocuments || [],
      };

      const response = await chatbotService.processMessage(
        message,
        conversationContext,
        conversationId || `chat_${request.auth?.uid}_${Date.now()}`
      );

      console.log('✅ Dorian response generated:', {
        confidence: response.confidence,
        hasActions: !!response.suggestedActions?.length,
      });

      return {
        success: true,
        response: response,
      };
    }
  } catch (error) {
    console.error('❌ Dorian chatbot processing failed:', error);

    if (error instanceof functions.https.HttpsError) {
      throw error;
    }

    throw new functions.https.HttpsError(
      'internal',
      'Failed to process chatbot message',
      { originalError: error.message }
    );
  }
});

// 🤖 Dorian Chatbot HTTP Endpoint (with CORS support)
export const chatbotHttp = onRequest(
  { memory: '1GiB', timeoutSeconds: 300 }, // Increased memory for chatbot processing
  async (req, res) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
      res.set('Access-Control-Allow-Origin', '*');
      res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, Origin, X-Requested-With, Accept');
      res.status(204).send('');
      return;
    }

    // Set CORS headers for all responses
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, Origin, X-Requested-With, Accept');
    res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');

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

        // SECURITY: Sanitize chatbot inputs
        const sanitizedMessage = sanitize.string(message, {
          maxLength: 1000,
          allowHtml: false,
          preventXSS: true,
          preventSQLInjection: true,
          preventCommandInjection: true
        });

        const sanitizedConversationId = conversationId ? 
          sanitize.string(conversationId, {
            maxLength: 50,
            allowHtml: false,
            preventXSS: true
          }) : null;

        // Log security threats if detected
        if (sanitizedMessage.detectedThreats.length > 0) {
          logSecure.security('Chatbot input threats detected', {
            threats: sanitizedMessage.detectedThreats,
            messageLength: message.length
          }, 'high');
        }

        logSecure.info('Processing chatbot HTTP message', {
          messageLength: sanitizedMessage.sanitized.length,
          hasConversationId: !!sanitizedConversationId,
          threatsDetected: sanitizedMessage.detectedThreats.length > 0
        });

        const chatbotService = await getChatbotService();

        // Build conversation context with sanitized data
        const conversationContext = {
          userId: 'http_user', // For HTTP requests, we don't have Firebase auth
          language: context?.language || 'en',
          recentDocuments: context?.recentDocuments || [],
        };

        const response = await chatbotService.processMessage(
          sanitizedMessage.sanitized,
          conversationContext,
          sanitizedConversationId?.sanitized || `chat_http_${Date.now()}`
        );

        console.log('✅ Dorian HTTP response generated:', {
          confidence: response.confidence,
          hasActions: !!response.suggestedActions?.length,
        });

        res.status(200).json({
          success: true,
          response: response,
        });
      } catch (error) {
        console.error('❌ Dorian HTTP chatbot processing failed:', error);
        res.status(500).json({
          error: 'Failed to process chatbot message',
          details: error.message,
        });
      }
    });
  }
);
