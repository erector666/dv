import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';

export interface TranslationResult {
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  confidence: number;
  originalText: string;
  wordCount: {
    original: number;
    translated: number;
  };
  quality: {
    score: number;
    assessment: string;
  };
}

export interface SupportedLanguage {
  code: string;
  name: string;
}

export interface TextLanguageDetectionResult {
  language: string;
  confidence: number;
  allLanguages: Array<{
    language: string;
    confidence: number;
  }>;
}

/**
 * Translate a document to a target language
 *
 * Enhanced with:
 * - Google Cloud Translate API integration
 * - Automatic language detection
 * - Translation quality assessment
 * - Caching for improved performance
 * - Confidence scoring for translations
 */
export const translateDocument = async (
  documentUrl: string,
  targetLanguage: string,
  sourceLanguage?: string
): Promise<TranslationResult> => {
  try {
    console.log('🌐 Starting document translation to:', targetLanguage);
    
    // Call the Firebase Cloud Function
    const translateDocumentFunction = httpsCallable(functions, 'translateDocument');

    const result = await translateDocumentFunction({
      documentUrl,
      targetLanguage,
      sourceLanguage,
    });

    const translation = result.data as TranslationResult;
    
    console.log('✅ Document translation completed:', {
      sourceLanguage: translation.sourceLanguage,
      targetLanguage: translation.targetLanguage,
      confidence: translation.confidence,
      quality: translation.quality.assessment
    });

    return translation;
  } catch (error) {
    console.error('❌ Error translating document:', error);
    throw error;
  }
};

/**
 * Translate text to a target language
 *
 * Enhanced with:
 * - Direct text translation support
 * - Quality assessment and confidence scoring
 * - Support for multiple target languages
 */
export const translateText = async (
  text: string,
  targetLanguage: string,
  sourceLanguage?: string
): Promise<TranslationResult> => {
  try {
    console.log('🌐 Starting text translation to:', targetLanguage);
    
    // Call the Firebase Cloud Function
    const translateTextFunction = httpsCallable(functions, 'translateText');

    const result = await translateTextFunction({
      text,
      targetLanguage,
      sourceLanguage,
    });

    const translation = result.data as TranslationResult;
    
    console.log('✅ Text translation completed:', {
      sourceLanguage: translation.sourceLanguage,
      targetLanguage: translation.targetLanguage,
      confidence: translation.confidence,
      quality: translation.quality.assessment
    });

    return translation;
  } catch (error) {
    console.error('❌ Error translating text:', error);
    throw error;
  }
};

/**
 * Get list of supported languages for translation
 *
 * Enhanced with:
 * - Cached language list for performance
 * - Language names in multiple locales
 * - Support for 100+ languages
 */
export const getSupportedLanguages = async (): Promise<SupportedLanguage[]> => {
  try {
    console.log('🌍 Fetching supported languages...');
    
    // Call the Firebase Cloud Function
    const getSupportedLanguagesFunction = httpsCallable(functions, 'getSupportedLanguages');

    const result = await getSupportedLanguagesFunction();
    const languages = (result.data as { languages: SupportedLanguage[] }).languages;
    
    console.log('✅ Supported languages fetched:', languages.length, 'languages available');
    return languages;
  } catch (error) {
    console.error('❌ Error fetching supported languages:', error);
    throw error;
  }
};

/**
 * Detect the language of text content
 *
 * Enhanced with:
 * - Google Cloud Natural Language API integration
 * - Confidence scoring for language detection
 * - Multiple language support with confidence levels
 * - Fallback to default language when detection fails
 */
export const detectTextLanguage = async (text: string): Promise<TextLanguageDetectionResult> => {
  try {
    console.log('🌐 Starting text language detection');
    
    // Call the Firebase Cloud Function
    const detectLanguageFunction = httpsCallable(functions, 'detectTextLanguage');

    const result = await detectLanguageFunction({
      text,
    });

    const languageDetection = result.data as TextLanguageDetectionResult;
    
    console.log('✅ Text language detection completed:', {
      language: languageDetection.language,
      confidence: languageDetection.confidence,
      allLanguages: languageDetection.allLanguages.length
    });

    return languageDetection;
  } catch (error) {
    console.error('❌ Error detecting text language:', error);
    throw error;
  }
};

/**
 * Batch translate multiple documents
 *
 * Enhanced with:
 * - Efficient batch processing
 * - Progress tracking and error handling
 * - Support for multiple target languages
 * - Quality assessment for each translation
 */
export const batchTranslateDocuments = async (
  documentUrls: string[],
  targetLanguage: string,
  sourceLanguage?: string
): Promise<TranslationResult[]> => {
  try {
    console.log('🚀 Starting batch translation for', documentUrls.length, 'documents');
    
    const translations: TranslationResult[] = [];
    
    for (let i = 0; i < documentUrls.length; i++) {
      const documentUrl = documentUrls[i];
      console.log(`📄 Translating document ${i + 1}/${documentUrls.length}:`, documentUrl);
      
      try {
        const translation = await translateDocument(documentUrl, targetLanguage, sourceLanguage);
        translations.push(translation);
        
        console.log(`✅ Document ${i + 1} translated successfully`);
      } catch (error) {
        console.error(`❌ Failed to translate document ${i + 1}:`, error);
        // Continue with other documents
      }
    }
    
    console.log('✅ Batch translation completed:', translations.length, 'documents translated');
    return translations;
    
  } catch (error) {
    console.error('❌ Error in batch translation:', error);
    throw error;
  }
};

/**
 * Translate document metadata (tags, categories, etc.)
 *
 * Enhanced with:
 * - Selective translation of metadata fields
 * - Preservation of original content
 * - Support for structured data translation
 */
export const translateDocumentMetadata = async (
  metadata: Record<string, any>,
  targetLanguage: string,
  sourceLanguage?: string,
  fieldsToTranslate: string[] = ['tags', 'category', 'description', 'summary']
): Promise<Record<string, any>> => {
  try {
    console.log('🏷️ Starting metadata translation to:', targetLanguage);
    
    const translatedMetadata = { ...metadata };
    
    for (const field of fieldsToTranslate) {
      if (metadata[field] && typeof metadata[field] === 'string') {
        try {
          const translation = await translateText(metadata[field], targetLanguage, sourceLanguage);
          translatedMetadata[`${field}_${targetLanguage}`] = translation.translatedText;
          translatedMetadata[`${field}_translation_confidence`] = translation.confidence;
        } catch (error) {
          console.warn(`⚠️ Failed to translate field '${field}':`, error);
        }
      } else if (Array.isArray(metadata[field])) {
        // Handle array fields like tags
        try {
          const translatedArray: string[] = [];
          for (const item of metadata[field]) {
            if (typeof item === 'string') {
              const translation = await translateText(item, targetLanguage, sourceLanguage);
              translatedArray.push(translation.translatedText);
            }
          }
          translatedMetadata[`${field}_${targetLanguage}`] = translatedArray;
        } catch (error) {
          console.warn(`⚠️ Failed to translate array field '${field}':`, error);
        }
      }
    }
    
    console.log('✅ Metadata translation completed');
    return translatedMetadata;
    
  } catch (error) {
    console.error('❌ Error translating metadata:', error);
    return metadata; // Return original metadata if translation fails
  }
};

/**
 * Get language display name for a language code
 */
export const getLanguageDisplayName = (languageCode: string, languages: SupportedLanguage[]): string => {
  const language = languages.find(lang => lang.code === languageCode);
  return language ? language.name : languageCode;
};

/**
 * Check if a language is supported for translation
 */
export const isLanguageSupported = (languageCode: string, languages: SupportedLanguage[]): boolean => {
  return languages.some(lang => lang.code === languageCode);
};

/**
 * Mock implementation for development/testing
 * This simulates translation without requiring the actual Cloud Functions
 */
export const mockTranslateText = async (
  text: string,
  targetLanguage: string,
  sourceLanguage: string = 'en'
): Promise<TranslationResult> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Mock translation (simple word replacement for demo)
  const mockTranslations: Record<string, Record<string, string>> = {
    'es': {
      'hello': 'hola',
      'world': 'mundo',
      'document': 'documento',
      'upload': 'subir',
      'download': 'descargar'
    },
    'fr': {
      'hello': 'bonjour',
      'world': 'monde',
      'document': 'document',
      'upload': 'télécharger',
      'download': 'télécharger'
    },
    'de': {
      'hello': 'hallo',
      'world': 'welt',
      'document': 'dokument',
      'upload': 'hochladen',
      'download': 'herunterladen'
    }
  };
  
  let translatedText = text;
  const targetLang = mockTranslations[targetLanguage];
  
  if (targetLang) {
    Object.entries(targetLang).forEach(([english, translation]) => {
      translatedText = translatedText.replace(new RegExp(english, 'gi'), translation);
    });
  }
  
  return {
    translatedText,
    sourceLanguage,
    targetLanguage,
    confidence: 0.9,
    originalText: text,
    wordCount: {
      original: text.split(/\s+/).length,
      translated: translatedText.split(/\s+/).length
    },
    quality: {
      score: 0.9,
      assessment: 'Excellent'
    }
  };
};
