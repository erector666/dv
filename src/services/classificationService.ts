import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';
import { Document } from './documentService';

export interface ClassificationResult {
  categories: string[];
  tags: string[];
  summary: string;
  language: string;
  confidence: number;
}

/**
 * Classify a document using AI to extract categories, tags, and summary
 * 
 * Note: This requires a Firebase Cloud Function to be set up that integrates
 * with an AI service like Google Cloud Natural Language API or a custom model.
 */
export const classifyDocument = async (
  documentId: string,
  documentUrl: string,
  documentType: string
): Promise<ClassificationResult> => {
  try {
    // Call the Firebase Cloud Function
    const classifyDocumentFunction = httpsCallable(
      functions,
      'classifyDocument'
    );

    const result = await classifyDocumentFunction({
      documentId,
      documentUrl,
      documentType
    });

    return result.data as ClassificationResult;
  } catch (error) {
    console.error('Error classifying document:', error);
    throw error;
  }
};

/**
 * Extract text content from a document
 * 
 * Note: This requires a Firebase Cloud Function to be set up that can
 * extract text from different document types (PDF, DOCX, etc.)
 */
export const extractTextFromDocument = async (
  documentUrl: string,
  documentType: string
): Promise<string> => {
  try {
    // Call the Firebase Cloud Function
    const extractTextFunction = httpsCallable(
      functions,
      'extractText'
    );

    const result = await extractTextFunction({
      documentUrl,
      documentType
    });

    return (result.data as { text: string }).text;
  } catch (error) {
    console.error('Error extracting text from document:', error);
    throw error;
  }
};

/**
 * Detect the language of a document
 */
export const detectLanguage = async (
  documentUrl: string,
  documentType: string
): Promise<string> => {
  try {
    // Call the Firebase Cloud Function
    const detectLanguageFunction = httpsCallable(
      functions,
      'detectLanguage'
    );

    const result = await detectLanguageFunction({
      documentUrl,
      documentType
    });

    return (result.data as { language: string }).language;
  } catch (error) {
    console.error('Error detecting document language:', error);
    throw error;
  }
};

/**
 * Generate a summary of a document
 */
export const generateDocumentSummary = async (
  documentUrl: string,
  documentType: string,
  maxLength: number = 200
): Promise<string> => {
  try {
    // Call the Firebase Cloud Function
    const summarizeDocumentFunction = httpsCallable(
      functions,
      'summarizeDocument'
    );

    const result = await summarizeDocumentFunction({
      documentUrl,
      documentType,
      maxLength
    });

    return (result.data as { summary: string }).summary;
  } catch (error) {
    console.error('Error generating document summary:', error);
    throw error;
  }
};

/**
 * Process a document after upload to extract metadata, classify, and tag
 */
export const processDocument = async (document: Document): Promise<Document> => {
  try {
    // Classify the document
    const classificationResult = await classifyDocument(
      document.id || '',
      document.url,
      document.type
    );
    
    // Update document with classification results
    const updatedDocument: Document = {
      ...document,
      category: classificationResult.categories[0] || document.category,
      tags: classificationResult.tags || document.tags || [],
      metadata: {
        ...document.metadata,
        summary: classificationResult.summary,
        language: classificationResult.language,
        categories: classificationResult.categories,
        classificationConfidence: classificationResult.confidence
      }
    };
    
    return updatedDocument;
  } catch (error) {
    console.error('Error processing document:', error);
    // Return original document if processing fails
    return document;
  }
};

/**
 * Mock implementation of document classification for development/testing
 * This simulates the AI classification without requiring the actual Cloud Functions
 */
export const mockClassifyDocument = (
  document: Document
): Promise<ClassificationResult> => {
  return new Promise((resolve) => {
    // Simulate API delay
    setTimeout(() => {
      // Simple classification based on file name and type
      const fileName = document.name.toLowerCase();
      let categories: string[] = [];
      let tags: string[] = [];
      
      // Determine categories based on file type
      if (document.type.includes('pdf')) {
        categories.push('PDF Documents');
      } else if (document.type.includes('image')) {
        categories.push('Images');
      } else if (document.type.includes('word') || document.type.includes('document')) {
        categories.push('Word Documents');
      } else if (document.type.includes('spreadsheet') || document.type.includes('excel')) {
        categories.push('Spreadsheets');
      } else if (document.type.includes('presentation') || document.type.includes('powerpoint')) {
        categories.push('Presentations');
      } else {
        categories.push('Other');
      }
      
      // Add more specific categories based on filename
      if (fileName.includes('invoice') || fileName.includes('receipt')) {
        categories.push('Financial');
        tags.push('invoice', 'payment');
      } else if (fileName.includes('report') || fileName.includes('analysis')) {
        categories.push('Reports');
        tags.push('report', 'analysis');
      } else if (fileName.includes('contract') || fileName.includes('agreement')) {
        categories.push('Legal');
        tags.push('contract', 'legal');
      } else if (fileName.includes('photo') || fileName.includes('image')) {
        tags.push('photo');
      }
      
      // Generate a mock summary
      const summary = `This is a ${categories[0].toLowerCase()} file named "${document.name}" with a size of ${document.size} bytes.`;
      
      resolve({
        categories,
        tags,
        summary,
        language: 'en',
        confidence: 0.85
      });
    }, 500); // 500ms delay to simulate API call
  });
};
