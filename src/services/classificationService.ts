import { getAuth } from 'firebase/auth';
import { Document } from './documentService';

export interface ClassificationResult {
  category: string;
  tags: string[];
  summary: string;
  language: string;
  confidence: number;
  documentType: string;
  wordCount: number;
  classificationDetails: {
    categories: Array<{
      name: string;
      confidence: number;
    }>;
    entities: Array<{
      name: string;
      type: string;
      salience: number;
      metadata?: Record<string, any>;
    }>;
    sentiment: {
      score: number;
      magnitude: number;
      sentences: Array<{
        text: string;
        score: number;
        magnitude: number;
      }>;
    };
  };
}

export interface TextExtractionResult {
  text: string;
  confidence: number;
  documentType: string;
  wordCount: number;
}

export interface LanguageDetectionResult {
  language: string;
  confidence: number;
  allLanguages: Array<{
    language: string;
    confidence: number;
  }>;
}

export interface DocumentSummaryResult {
  summary: string;
  confidence: number;
  metrics: {
    originalLength: number;
    summaryLength: number;
    compressionRatio: number;
    sentences: number;
  };
  quality: string;
}

/**
 * Classify a document using AI to extract categories, tags, and summary
 *
 * This enhanced function now provides:
 * - AI-powered document classification using Google Cloud Natural Language API
 * - Intelligent tag generation based on content analysis
 * - Sentiment analysis and entity extraction
 * - Confidence scoring for all classifications
 * - Fallback classification when AI fails
 */
export const classifyDocument = async (
  documentId: string,
  documentUrl: string,
  documentType: string
): Promise<ClassificationResult> => {
  try {
    console.log('🔍 Starting AI document classification for:', documentId);
    
    // Get the current user's ID token for authentication
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    const idToken = await user.getIdToken();
    
    // Call the Firebase Cloud Function as HTTP request
    const response = await fetch('https://us-central1-gpt1-77ce0.cloudfunctions.net/classifyDocumentHttp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      },
      body: JSON.stringify({
        documentUrl,
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    const classification = await response.json() as ClassificationResult;
    
    console.log('✅ AI classification completed:', {
      category: classification.category,
      confidence: classification.confidence,
      tags: classification.tags.length,
      language: classification.language
    });

    return classification;
  } catch (error) {
    console.error('❌ Error classifying document:', error);
    throw error;
  }
};

/**
 * Extract text content from a document
 *
 * Enhanced with:
 * - PDF text extraction using pdf-parse
 * - Image OCR using Google Cloud Vision API
 * - Confidence scoring for extraction quality
 * - Support for multiple document types
 */
export const extractTextFromDocument = async (
  documentUrl: string,
  documentType: string
): Promise<TextExtractionResult> => {
  try {
    console.log('📄 Starting text extraction from:', documentUrl);
    
    // Get the current user's ID token for authentication
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    const idToken = await user.getIdToken();
    
    // Convert MIME type to document type format expected by the function
    let docType: 'pdf' | 'image' | 'auto' = 'auto';
    if (documentType.includes('pdf')) {
      docType = 'pdf';
    } else if (documentType.includes('image')) {
      docType = 'image';
    }

    // Call the Firebase Cloud Function as HTTP request
    const response = await fetch('https://us-central1-gpt1-77ce0.cloudfunctions.net/extractTextHttp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      },
      body: JSON.stringify({
        documentUrl,
        documentType: docType,
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    const extraction = await response.json() as TextExtractionResult;
    
    console.log('✅ Text extraction completed:', {
      wordCount: extraction.wordCount,
      confidence: extraction.confidence,
      documentType: extraction.documentType
    });

    return extraction;
  } catch (error) {
    console.error('❌ Error extracting text from document:', error);
    throw error;
  }
};

/**
 * Detect the language of a document
 *
 * Enhanced with:
 * - Google Cloud Natural Language API integration
 * - Confidence scoring for language detection
 * - Multiple language support with confidence levels
 * - Fallback to default language when detection fails
 */
export const detectLanguage = async (
  documentUrl: string,
  documentType: string
): Promise<LanguageDetectionResult> => {
  try {
    console.log('🌐 Starting language detection for:', documentUrl);
    
    // Get the current user's ID token for authentication
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    const idToken = await user.getIdToken();
    
    // Call the Firebase Cloud Function as HTTP request
    const response = await fetch('https://us-central1-gpt1-77ce0.cloudfunctions.net/detectLanguageHttp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      },
      body: JSON.stringify({
        documentUrl,
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    const detection = await response.json() as LanguageDetectionResult;
    
    console.log('✅ Language detection completed:', {
      language: detection.language,
      confidence: detection.confidence
    });

    return detection;
  } catch (error) {
    console.error('❌ Error detecting document language:', error);
    throw error;
  }
};

/**
 * Generate a summary of a document
 *
 * Enhanced with:
 * - AI-powered summarization using Google Cloud Natural Language API
 * - Configurable summary length
 * - Quality assessment and confidence scoring
 * - Compression ratio metrics
 */
export const generateDocumentSummary = async (
  documentUrl: string,
  documentType: string,
  maxLength: number = 200
): Promise<DocumentSummaryResult> => {
  try {
    console.log('📝 Starting AI document summarization for:', documentUrl);
    
    // Get the current user's ID token for authentication
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    const idToken = await user.getIdToken();
    
    // Call the Firebase Cloud Function as HTTP request
    const response = await fetch('https://us-central1-gpt1-77ce0.cloudfunctions.net/summarizeDocumentHttp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      },
      body: JSON.stringify({
        documentUrl,
        maxLength,
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    const summary = await response.json() as DocumentSummaryResult;
    
    console.log('✅ Document summarization completed:', {
      quality: summary.quality,
      confidence: summary.confidence,
      compressionRatio: summary.metrics.compressionRatio
    });

    return summary;
  } catch (error) {
    console.error('❌ Error generating document summary:', error);
    throw error;
  }
};

/**
 * Process a document after upload to extract metadata, classify, and tag
 *
 * This enhanced function now provides:
 * - Complete AI-powered document processing pipeline
 * - Text extraction, classification, and summarization
 * - Language detection and translation support
 * - Comprehensive metadata extraction
 */
export const processDocument = async (
  document: Document
): Promise<Document> => {
  try {
    console.log('🚀 Starting comprehensive document processing for:', document.id);
    
    if (!document.url) {
      throw new Error('Document URL is required for processing');
    }

    // Step 1: Extract text content
    console.log('📄 Step 1: Extracting text content...');
    const textExtraction = await extractTextFromDocument(document.url, document.type);
    
    // Step 2: Detect language
    console.log('🌐 Step 2: Detecting language...');
    const languageDetection = await detectLanguage(document.url, document.type);
    
    // Step 3: Classify document
    console.log('🏷️ Step 3: Classifying document...');
    const classification = await classifyDocument(document.id || '', document.url, document.type);
    
    // Step 4: Generate summary
    console.log('📝 Step 4: Generating summary...');
    const summary = await generateDocumentSummary(document.url, document.type, 200);

    // Update document with comprehensive AI processing results
    const updatedDocument: Document = {
      ...document,
      category: classification.category || document.category,
      tags: classification.tags || document.tags || [],
      metadata: {
        ...document.metadata,
        summary: summary.summary,
        language: languageDetection.language,
        categories: classification.classificationDetails.categories,
        classificationConfidence: classification.confidence,
        textExtraction: {
          confidence: textExtraction.confidence,
          wordCount: textExtraction.wordCount,
          documentType: textExtraction.documentType
        },
        languageDetection: {
          confidence: languageDetection.confidence,
          allLanguages: languageDetection.allLanguages
        },
        summarization: {
          confidence: summary.confidence,
          quality: summary.quality,
          metrics: summary.metrics
        },
        entities: classification.classificationDetails.entities,
        sentiment: classification.classificationDetails.sentiment
      },
    };

    console.log('✅ Document processing completed successfully');
    return updatedDocument;
    
  } catch (error) {
    console.error('❌ Error processing document:', error);
    // Return original document if processing fails
    return document;
  }
};

/**
 * Mock implementation of document classification for development/testing
 * This simulates the AI classification without requiring the actual Cloud Functions
 */
export const mockClassifyDocument = async (
  document: Document
): Promise<ClassificationResult> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Mock classification based on document type
  const mockCategories = {
    'pdf': 'document',
    'image': 'image',
    'text': 'text',
    'spreadsheet': 'business',
    'presentation': 'business'
  };
  
  const mockTags = ['sample', 'test', 'document', 'ai', 'classification'];
  const mockSummary = 'This is a sample document for testing AI classification capabilities.';
  
  return {
    category: mockCategories[document.type as keyof typeof mockCategories] || 'document',
    tags: mockTags,
    summary: mockSummary,
    language: 'en',
    confidence: 0.85,
    documentType: document.type,
    wordCount: 25,
    classificationDetails: {
      categories: [
        { name: '/Business & Industrial', confidence: 0.85 }
      ],
      entities: [
        { name: 'sample', type: 'OTHER', salience: 0.3 },
        { name: 'document', type: 'OTHER', salience: 0.4 },
        { name: 'testing', type: 'OTHER', salience: 0.2 }
      ],
      sentiment: {
        score: 0.1,
        magnitude: 0.5,
        sentences: [
          { text: mockSummary, score: 0.1, magnitude: 0.5 }
        ]
      }
    }
  };
};
