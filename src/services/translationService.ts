import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';
import { Document, updateDocument } from './documentService';

export interface TranslationResult {
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  confidence: number;
}

export interface SupportedLanguage {
  code: string;
  name: string;
}

/**
 * Translate document text content to a target language
 *
 * Note: This requires a Firebase Cloud Function to be set up that integrates
 * with a translation service like Google Cloud Translation API.
 */
export const translateDocument = async (
  documentId: string,
  documentUrl: string,
  documentType: string,
  targetLanguage: string,
  sourceLanguage?: string
): Promise<TranslationResult> => {
  try {
    // Call the Firebase Cloud Function
    const translateDocumentFunction = httpsCallable(
      functions,
      'translateDocument'
    );

    const result = await translateDocumentFunction({
      documentId,
      documentUrl,
      documentType,
      targetLanguage,
      sourceLanguage,
    });

    return result.data as TranslationResult;
  } catch (error) {
    console.error('Error translating document:', error);
    throw error;
  }
};

/**
 * Get a list of supported languages for translation
 */
export const getSupportedLanguages = async (): Promise<SupportedLanguage[]> => {
  try {
    // Call the Firebase Cloud Function
    const getSupportedLanguagesFunction = httpsCallable(
      functions,
      'getSupportedLanguages'
    );

    const result = await getSupportedLanguagesFunction({});
    return (result.data as { languages: SupportedLanguage[] }).languages;
  } catch (error) {
    console.error('Error getting supported languages:', error);
    throw error;
  }
};

/**
 * Save a translated version of a document
 */
export const saveTranslatedDocument = async (
  originalDocument: Document,
  translationResult: TranslationResult
): Promise<Document> => {
  try {
    // Create a new document entry for the translated version
    const translatedDocumentMetadata = {
      ...originalDocument.metadata,
      isTranslation: true,
      originalDocumentId: originalDocument.id,
      sourceLanguage: translationResult.sourceLanguage,
      targetLanguage: translationResult.targetLanguage,
      translationConfidence: translationResult.confidence,
    };

    // Update the original document to include reference to this translation
    if (originalDocument.id) {
      const translations = originalDocument.metadata?.translations || {};
      translations[translationResult.targetLanguage] = {
        timestamp: new Date().getTime(),
        confidence: translationResult.confidence,
      };

      await updateDocument(originalDocument.id, {
        metadata: {
          ...originalDocument.metadata,
          translations,
        },
      });
    }

    // Return the translated document data
    // In a real implementation, this would create a new document in Firestore
    // with the translated content
    return {
      ...originalDocument,
      name: `${originalDocument.name} (${translationResult.targetLanguage})`,
      metadata: translatedDocumentMetadata,
    };
  } catch (error) {
    console.error('Error saving translated document:', error);
    throw error;
  }
};

/**
 * Mock implementation of document translation for development/testing
 * This simulates the translation without requiring the actual Cloud Functions
 */
// Removed mockTranslateDocument

/**
 * Mock implementation of getting supported languages
 */
// Removed mockGetSupportedLanguages
