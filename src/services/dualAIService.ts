import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from './firebase';

const functions = getFunctions(app);

export interface AIAnalysisResult {
  category: string;
  confidence: number;
  tags: string[];
  suggestedName: string;
  language: string;
  summary?: string;
  reasoning?: string;
  entities?: any[];
  extractedDates?: string[];
  processingTime?: number;
  aiType?: 'huggingface' | 'deepseek';
  classificationConfidence?: number;
}

export interface DualAIResult {
  huggingFaceResult: AIAnalysisResult;
  deepSeekResult: AIAnalysisResult;
  extractedText: any;
  selectedAI?: 'huggingface' | 'deepseek';
}

export interface ReprocessResult {
  documentUrl: string;
  success: boolean;
  classification?: any;
  mode: 'huggingface' | 'deepseek' | 'both';
  error?: string;
}

/**
 * Dual AI Classification Service
 *
 * Provides advanced document processing using both Hugging Face and DeepSeek AIs:
 * - Parallel processing for maximum efficiency
 * - User choice between AI results
 * - Comprehensive metadata storage
 * - Enhanced reprocessing capabilities
 */
export class DualAIService {
  private static instance: DualAIService;
  private baseUrl: string;

  constructor() {
    // Use Firebase Functions URL
    this.baseUrl = 'https://us-central1-gpt1-77ce0.cloudfunctions.net';
  }

  static getInstance(): DualAIService {
    if (!DualAIService.instance) {
      DualAIService.instance = new DualAIService();
    }
    return DualAIService.instance;
  }

  /**
   * Classify document using both AIs and return comparison results
   */
  async classifyDocumentDualAI(
    documentUrl: string,
    mode: 'both' | 'huggingface' | 'deepseek' = 'both'
  ): Promise<DualAIResult> {
    try {
      console.log('🚀 Starting dual AI classification:', { documentUrl, mode });

      const response = await fetch(
        `${this.baseUrl}/classifyDocumentDualAIHttp`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            documentUrl,
            mode,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(
          `Dual AI classification failed: ${response.status} - ${errorData}`
        );
      }

      const result = await response.json();
      console.log('✅ Dual AI classification completed:', result);

      return result;
    } catch (error) {
      console.error('❌ Dual AI classification error:', error);
      throw error;
    }
  }

  /**
   * Reprocess documents with specified AI mode
   */
  async reprocessDocuments(
    documentUrls: string[],
    mode: 'huggingface' | 'deepseek' | 'both' = 'both'
  ): Promise<{
    results: ReprocessResult[];
    mode: string;
    processed: number;
  }> {
    try {
      console.log('🔄 Starting enhanced reprocessing:', {
        documentCount: documentUrls.length,
        mode,
      });

      const response = await fetch(`${this.baseUrl}/reprocessDocuments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentUrls,
          mode,
          useStoredMetadata: true, // Use metadata-based reprocessing
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(
          `Enhanced reprocessing failed: ${response.status} - ${errorData}`
        );
      }

      const result = await response.json();
      console.log('✅ Enhanced reprocessing completed:', {
        processed: result.processed,
        mode: result.mode,
        successCount: result.results.filter((r: ReprocessResult) => r.success)
          .length,
      });

      return result;
    } catch (error) {
      console.error('❌ Enhanced reprocessing error:', error);
      throw error;
    }
  }

  /**
   * Test dual AI processing with a single document
   */
  async testDualAI(documentUrl: string): Promise<{
    success: boolean;
    results?: DualAIResult;
    error?: string;
    processingTime?: number;
  }> {
    const startTime = Date.now();

    try {
      const results = await this.classifyDocumentDualAI(documentUrl, 'both');
      const processingTime = Date.now() - startTime;

      return {
        success: true,
        results,
        processingTime,
      };
    } catch (error: any) {
      const processingTime = Date.now() - startTime;

      return {
        success: false,
        error: error.message,
        processingTime,
      };
    }
  }

  /**
   * Compare AI results and provide recommendation
   */
  compareAIResults(
    huggingFaceResult: AIAnalysisResult,
    deepSeekResult: AIAnalysisResult
  ): {
    recommendation: 'huggingface' | 'deepseek' | 'similar';
    reason: string;
    confidenceDifference: number;
    agreementScore: number;
  } {
    const hfConfidence = huggingFaceResult.confidence || 0;
    const dsConfidence =
      deepSeekResult.classificationConfidence || deepSeekResult.confidence || 0;

    const confidenceDifference = Math.abs(hfConfidence - dsConfidence);

    // Calculate agreement score based on category and tags
    const categoryMatch =
      huggingFaceResult.category === deepSeekResult.category;
    const tagOverlap = this.calculateTagOverlap(
      huggingFaceResult.tags,
      deepSeekResult.tags
    );
    const agreementScore = (categoryMatch ? 0.5 : 0) + tagOverlap * 0.5;

    let recommendation: 'huggingface' | 'deepseek' | 'similar' = 'similar';
    let reason = 'Both AIs provided similar results';

    if (confidenceDifference > 0.2) {
      if (hfConfidence > dsConfidence) {
        recommendation = 'huggingface';
        reason = `Hugging Face has higher confidence (${Math.round(hfConfidence * 100)}% vs ${Math.round(dsConfidence * 100)}%)`;
      } else {
        recommendation = 'deepseek';
        reason = `DeepSeek has higher confidence (${Math.round(dsConfidence * 100)}% vs ${Math.round(hfConfidence * 100)}%)`;
      }
    } else if (deepSeekResult.summary && !huggingFaceResult.summary) {
      recommendation = 'deepseek';
      reason = 'DeepSeek provides additional summary and reasoning';
    } else if (agreementScore < 0.3) {
      recommendation = 'deepseek';
      reason =
        'AIs disagree significantly - DeepSeek may provide better contextual analysis';
    }

    return {
      recommendation,
      reason,
      confidenceDifference,
      agreementScore,
    };
  }

  private calculateTagOverlap(tags1: string[], tags2: string[]): number {
    if (!tags1?.length || !tags2?.length) return 0;

    const set1 = new Set(tags1.map(tag => tag.toLowerCase()));
    const set2 = new Set(tags2.map(tag => tag.toLowerCase()));

    // Convert sets to arrays for compatibility
    const array1 = Array.from(set1);
    const array2 = Array.from(set2);

    const intersection = new Set(array1.filter(tag => set2.has(tag)));
    const union = new Set([...array1, ...array2]);

    return intersection.size / union.size; // Jaccard similarity
  }

  /**
   * Format AI results for display
   */
  formatAIResult(result: AIAnalysisResult): {
    displayName: string;
    confidence: string;
    confidenceColor: string;
    features: string[];
  } {
    const confidence =
      result.classificationConfidence || result.confidence || 0;
    const confidencePercent = `${Math.round(confidence * 100)}%`;

    let confidenceColor = 'text-red-600';
    if (confidence >= 0.8) confidenceColor = 'text-green-600';
    else if (confidence >= 0.6) confidenceColor = 'text-yellow-600';

    const features: string[] = [];
    if (result.summary) features.push('Summary');
    if (result.reasoning) features.push('Reasoning');
    if (result.entities?.length)
      features.push(`${result.entities.length} Entities`);
    if (result.extractedDates?.length)
      features.push(`${result.extractedDates.length} Dates`);

    return {
      displayName:
        result.aiType === 'deepseek' ? 'DeepSeek AI' : 'Hugging Face AI',
      confidence: confidencePercent,
      confidenceColor,
      features,
    };
  }
}

// Export singleton instance
export const dualAIService = DualAIService.getInstance();

/**
 * Test dual AI processing for a document
 */
export const testDualAIProcessing = async (documentUrl: string) => {
  return dualAIService.testDualAI(documentUrl);
};

/**
 * Reprocess documents with enhanced AI choice
 */
export const reprocessDocumentsEnhanced = async (
  documentUrls: string[],
  mode: 'huggingface' | 'deepseek' | 'both' = 'both'
) => {
  return dualAIService.reprocessDocuments(documentUrls, mode);
};

/**
 * Get dual AI classification results
 */
export const getDualAIClassification = async (
  documentUrl: string,
  mode: 'both' | 'huggingface' | 'deepseek' = 'both'
) => {
  return dualAIService.classifyDocumentDualAI(documentUrl, mode);
};
