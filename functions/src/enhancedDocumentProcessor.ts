// Enhanced Document Processor with DeepSeek Intelligence
// Combines multiple OCR sources with AI-powered correction and classification

import { getDeepSeekService } from './deepseekService';
import { TesseractOCRService } from './tesseractService';
import { HuggingFaceAIService } from './huggingFaceAIService';
import { getMultimodalOCRService } from './multimodalOCRService';

interface OCRResult {
  text: string;
  confidence: number;
  engine: string;
  processingTime: number;
}

interface EnhancedProcessingResult {
  // Text extraction
  originalOCR: OCRResult[];
  correctedText: string;
  textConfidence: number;

  // Classification
  category: string;
  classificationConfidence: number;
  classificationReasoning: string;
  alternativeCategories: Array<{ category: string; confidence: number }>;

  // Entities
  entities: any;

  // Metadata
  suggestedName: string;
  tags: string[];
  keyDates: Array<{ date: string; type: string }>;
  summary: string;
  language: string;
  wordCount: number;
  qualityScore: number;

  // Processing details
  processingMethod: 'deepseek' | 'fallback';
  processingTime: number;
  processingNotes: string[];
}

export class EnhancedDocumentProcessor {
  private deepSeek = getDeepSeekService();
  private tesseract = new TesseractOCRService();
  private multimodalOCR = getMultimodalOCRService();
  private huggingFace = new HuggingFaceAIService();

  /**
   * Process document with enhanced AI pipeline
   */
  async processDocument(
    documentUrl: string
  ): Promise<EnhancedProcessingResult> {
    const startTime = Date.now();
    console.log('🚀 Enhanced processing started for:', documentUrl);

    try {
      // Step 1: Multi-engine OCR extraction
      const ocrResults = await this.extractTextMultiEngine(documentUrl);

      let processingResult: EnhancedProcessingResult;

      if (this.deepSeek.isAvailable() && ocrResults.length > 0) {
        // Use DeepSeek enhanced processing
        processingResult = await this.processWithDeepSeek(ocrResults);
        processingResult.processingMethod = 'deepseek';
      } else {
        // Fallback to original processing
        console.log('⚠️ DeepSeek unavailable, using fallback processing');
        processingResult = await this.processWithFallback(ocrResults);
        processingResult.processingMethod = 'fallback';
      }

      processingResult.processingTime = Date.now() - startTime;
      processingResult.originalOCR = ocrResults;

      console.log('✅ Enhanced processing completed:', {
        method: processingResult.processingMethod,
        category: processingResult.category,
        confidence: processingResult.classificationConfidence,
        processingTime: processingResult.processingTime,
      });

      return processingResult;
    } catch (error) {
      console.error('❌ Enhanced processing failed:', error);

      // Emergency fallback
      return {
        originalOCR: [],
        correctedText: '',
        textConfidence: 0,
        category: 'other',
        classificationConfidence: 0,
        classificationReasoning: 'Processing failed',
        alternativeCategories: [],
        entities: { entities: {} },
        suggestedName: 'Unknown_Document',
        tags: ['error'],
        keyDates: [],
        summary: 'Document processing encountered an error',
        language: 'unknown',
        wordCount: 0,
        qualityScore: 0,
        processingMethod: 'fallback',
        processingTime: Date.now() - startTime,
        processingNotes: [`Processing error: ${error.message}`],
      };
    }
  }

  /**
   * Run Multimodal-OCR (OlmOCR-7B-0725) for superior text extraction
   */
  private async runMultimodalOCR(
    documentUrl: string,
    engine: string
  ): Promise<OCRResult> {
    const startTime = Date.now();

    try {
      console.log(`🔍 Starting ${engine} OCR...`);

      // Fetch document
      const response = await fetch(documentUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch document: ${response.status}`);
      }

      const buffer = Buffer.from(await response.arrayBuffer());

      // Use Multimodal-OCR service
      const result = await this.multimodalOCR.extractTextFromImage(buffer);

      return {
        text: result.text,
        confidence: result.confidence,
        engine: engine,
        processingTime: Date.now() - startTime,
      };
    } catch (error) {
      console.error(`❌ ${engine} OCR failed:`, error);
      return {
        text: '',
        confidence: 0,
        engine: engine,
        processingTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Extract text using multiple OCR engines for better accuracy
   */
  private async extractTextMultiEngine(
    documentUrl: string
  ): Promise<OCRResult[]> {
    console.log('📄 Multi-engine OCR extraction...');

    const ocrPromises = [
      // Primary OCR with Multimodal-OCR (state-of-the-art 7B model)
      this.runMultimodalOCR(documentUrl, 'multimodal-primary'),

      // Fallback: Keep one Tesseract for comparison (if Multimodal fails)
      this.runOCRWithConfig(documentUrl, {
        language: 'eng+fra+mkd',
        config: { tessedit_pageseg_mode: '1' }, // Auto page segmentation
        engine: 'tesseract-fallback',
      }),
    ];

    const results = await Promise.allSettled(ocrPromises);

    const validResults = results
      .filter(
        (result): result is PromiseFulfilledResult<OCRResult> =>
          result.status === 'fulfilled' &&
          result.value.confidence > 0.1 &&
          result.value.text.trim().length > 0
      )
      .map(result => result.value);

    console.log('📄 OCR results:', {
      total: results.length,
      successful: validResults.length,
      confidences: validResults.map(r => r.confidence),
    });

    return validResults;
  }

  /**
   * Run OCR with specific configuration
   */
  private async runOCRWithConfig(
    documentUrl: string,
    options: {
      language: string;
      config: any;
      engine: string;
    }
  ): Promise<OCRResult> {
    const startTime = Date.now();

    try {
      // Download document and extract text
      const response = await fetch(documentUrl);
      const buffer = Buffer.from(await response.arrayBuffer());

      const result = await this.tesseract.extractTextWithPreprocessing(buffer, {
        languages: options.language.split('+'),
        psm: options.config.tessedit_pageseg_mode
          ? parseInt(options.config.tessedit_pageseg_mode)
          : 1,
        oem: options.config.tessedit_ocr_engine_mode
          ? parseInt(options.config.tessedit_ocr_engine_mode)
          : 2,
      });

      return {
        text: result.text || '',
        confidence: result.confidence || 0,
        engine: options.engine,
        processingTime: Date.now() - startTime,
      };
    } catch (error) {
      console.warn(`⚠️ OCR engine ${options.engine} failed:`, error);
      return {
        text: '',
        confidence: 0,
        engine: options.engine,
        processingTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Process document using DeepSeek AI
   */
  private async processWithDeepSeek(
    ocrResults: OCRResult[]
  ): Promise<EnhancedProcessingResult> {
    console.log('🧠 Processing with DeepSeek AI...');

    // Step 1: Correct OCR text
    const correctionResult = await this.deepSeek.correctOCRText(ocrResults);

    // Step 2: Classify document
    const classificationResult = await this.deepSeek.classifyDocument(
      correctionResult.correctedText
    );

    // Step 3: Extract entities
    const entitiesResult = await this.deepSeek.extractEntities(
      correctionResult.correctedText
    );

    // Step 4: Generate metadata
    const metadataResult = await this.deepSeek.generateMetadata(
      correctionResult.correctedText,
      entitiesResult,
      classificationResult
    );

    return {
      originalOCR: ocrResults,
      correctedText: correctionResult.correctedText,
      textConfidence: correctionResult.confidence,
      category: classificationResult.category,
      classificationConfidence: classificationResult.confidence,
      classificationReasoning: classificationResult.reasoning,
      alternativeCategories: classificationResult.alternativeCategories,
      entities: { entities: entitiesResult.entities },
      suggestedName: metadataResult.suggestedName,
      tags: metadataResult.tags,
      keyDates: metadataResult.keyDates,
      summary: metadataResult.summary,
      language: metadataResult.language,
      wordCount: metadataResult.wordCount,
      qualityScore: metadataResult.qualityScore,
      processingMethod: 'deepseek',
      processingTime: 0, // Will be set by caller
      processingNotes: [
        ...correctionResult.corrections,
        ...metadataResult.processingNotes,
      ],
    };
  }

  /**
   * Fallback processing using existing services
   */
  private async processWithFallback(
    ocrResults: OCRResult[]
  ): Promise<EnhancedProcessingResult> {
    console.log('🔄 Processing with fallback services...');

    // Use best OCR result (handle empty array)
    const bestOCR =
      ocrResults.length > 0
        ? ocrResults.reduce((best, current) =>
            current.confidence > best.confidence ? current : best
          )
        : { text: '', confidence: 0, engine: 'none', processingTime: 0 };

    if (!bestOCR.text) {
      throw new Error('No valid OCR text available');
    }

    // Use existing Hugging Face services
    const classification = await this.huggingFace.classifyDocument(
      bestOCR.text
    );

    return {
      originalOCR: ocrResults,
      correctedText: bestOCR.text,
      textConfidence: bestOCR.confidence,
      category: classification.category,
      classificationConfidence: classification.confidence,
      classificationReasoning: 'Fallback classification using Hugging Face',
      alternativeCategories: [],
      entities: {
        entities: {
          PERSON:
            classification.entities?.filter((e: any) => e.label === 'PER') ||
            [],
          ORGANIZATION:
            classification.entities?.filter((e: any) => e.label === 'ORG') ||
            [],
          DATE:
            classification.extractedDates?.map((d: any) => ({
              text: d,
              original: d,
              confidence: 0.8,
            })) || [],
          LOCATION:
            classification.entities?.filter((e: any) => e.label === 'LOC') ||
            [],
          MONEY: [],
          DOCUMENT_NUMBER: [],
          EMAIL: [],
          PHONE: [],
        },
      },
      suggestedName: classification.suggestedName,
      tags: classification.tags,
      keyDates:
        classification.extractedDates?.map((d: any) => ({
          date: d,
          type: 'unknown',
        })) || [],
      summary: 'Processed using fallback services',
      language: classification.language,
      wordCount: bestOCR.text.split(/\s+/).length,
      qualityScore: (bestOCR.confidence + classification.confidence) / 2,
      processingMethod: 'fallback',
      processingTime: 0, // Will be set by caller
      processingNotes: [
        'Used fallback processing due to DeepSeek unavailability',
      ],
    };
  }

  /**
   * Enhanced chatbot Q&A using DeepSeek
   */
  async answerQuestion(
    question: string,
    documentContext: any
  ): Promise<{
    answer: string;
    confidence: number;
    method: 'deepseek' | 'fallback';
  }> {
    try {
      if (this.deepSeek.isAvailable()) {
        const result = await this.deepSeek.answerDocumentQuestion(
          question,
          documentContext.correctedText || documentContext.text,
          documentContext
        );

        return {
          answer: result.answer,
          confidence: result.confidence,
          method: 'deepseek',
        };
      } else {
        // Fallback to basic response
        return {
          answer:
            'I apologize, but the enhanced Q&A service is currently unavailable. Please try again later.',
          confidence: 0,
          method: 'fallback',
        };
      }
    } catch (error) {
      console.error('❌ Enhanced Q&A failed:', error);
      return {
        answer:
          'I encountered an error while processing your question. Please try rephrasing it.',
        confidence: 0,
        method: 'fallback',
      };
    }
  }
}

// Export singleton instance
let processorInstance: EnhancedDocumentProcessor | null = null;

export function getEnhancedDocumentProcessor(): EnhancedDocumentProcessor {
  if (!processorInstance) {
    processorInstance = new EnhancedDocumentProcessor();
  }
  return processorInstance;
}
