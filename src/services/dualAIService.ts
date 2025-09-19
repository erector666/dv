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
    mode: 'huggingface' | 'deepseek' | 'both' = 'both',
    documentTexts?: Record<string, string>
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

      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

      const response = await fetch(`${this.baseUrl}/reprocessDocuments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentUrls, mode, useStoredMetadata: true }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Enhanced reprocessing completed:', {
          processed: result.processed,
          mode: result.mode,
          successCount: result.results.filter((r: ReprocessResult) => r.success)
            .length,
        });
        return result;
      }

      const errorData = await response.text();
      console.warn(
        `⚠️ Batch reprocessing failed with ${response.status}. Falling back to per-document processing.`
      );

      // Fallback: per-document processing via classifyDocumentDualAIHttp
      const fallbackResults: ReprocessResult[] = [];
      for (const url of documentUrls) {
        try {
          // Create AbortController for timeout
          const fallbackController = new AbortController();
          const fallbackTimeoutId = setTimeout(() => fallbackController.abort(), 30000); // 30 second timeout per document

          const perRes = await fetch(
            `${this.baseUrl}/classifyDocumentDualAIHttp`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                documentUrl: url,
                mode,
                ...(documentTexts && documentTexts[url]
                  ? { documentText: documentTexts[url] }
                  : {}),
              }),
              signal: fallbackController.signal,
            }
          );
          
          clearTimeout(fallbackTimeoutId);
          if (!perRes.ok) {
            const txt = await perRes.text();
            throw new Error(`HTTP ${perRes.status}: ${txt}`);
          }
          const classification = await perRes.json();
          fallbackResults.push({
            documentUrl: url,
            success: true,
            classification,
            mode,
          });
        } catch (err: any) {
          console.error('Per-document fallback failed:', err);
          let errorMessage = err?.message || 'fallback_failed';
          
          // Handle specific error types
          if (err.name === 'AbortError') {
            errorMessage = 'Processing timeout - document too large or service busy';
          } else if (err.message?.includes('Failed to fetch')) {
            errorMessage = 'Network error - unable to connect to AI service';
          } else if (err.message?.includes('404')) {
            errorMessage = 'AI service not found - service may be temporarily unavailable';
          } else if (err.message?.includes('500')) {
            errorMessage = 'AI service error - please try again later';
          }
          
          fallbackResults.push({
            documentUrl: url,
            success: false,
            error: errorMessage,
            mode,
          });
        }
      }

      return {
        results: fallbackResults,
        mode,
        processed: fallbackResults.length,
      };
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
   * Check if AI service is available
   */
  async checkAIServiceHealth(): Promise<{
    available: boolean;
    error?: string;
    responseTime?: number;
  }> {
    const startTime = Date.now();
    
    try {
      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout for health check

      const response = await fetch(`${this.baseUrl}/classifyDocumentDualAIHttp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentUrl: 'https://example.com/test.pdf', // Test URL
          mode: 'both',
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;

      // We expect this to fail with the test URL, but if we get a response, the service is up
      return {
        available: true,
        responseTime,
      };
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      
      // If it's a timeout or network error, service is likely down
      if (error.name === 'AbortError' || error.message?.includes('Failed to fetch')) {
        return {
          available: false,
          error: 'Service timeout or network error',
          responseTime,
        };
      }
      
      // If we get any other error (like 400, 500), the service is responding
      return {
        available: true,
        error: error.message,
        responseTime,
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

/**
 * Check AI service health
 */
export const checkAIServiceHealth = async () => {
  return dualAIService.checkAIServiceHealth();
};

/**
 * Quick test for both AI services
 */
export const quickTestAIServices = async () => {
  console.log('🧪 Quick AI Services Test Starting...');
  
  const results = {
    healthCheck: null as any,
    huggingFace: null as any,
    deepSeek: null as any,
    batchReprocessing: null as any
  };

  try {
    // 1. Health Check
    console.log('🔍 Health Check...');
    results.healthCheck = await dualAIService.checkAIServiceHealth();
    console.log('Health Check Result:', results.healthCheck);

    // 2. Test Hugging Face
    console.log('🤗 Testing Hugging Face...');
    try {
      const hfResponse = await fetch(
        'https://us-central1-gpt1-77ce0.cloudfunctions.net/classifyDocumentDualAIHttp',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            documentUrl: 'https://example.com/test.pdf',
            mode: 'huggingface'
          })
        }
      );
      results.huggingFace = {
        status: hfResponse.status,
        ok: hfResponse.ok,
        statusText: hfResponse.statusText
      };
    } catch (error: any) {
      results.huggingFace = { error: error.message };
    }

    // 3. Test DeepSeek
    console.log('🧠 Testing DeepSeek...');
    try {
      const dsResponse = await fetch(
        'https://us-central1-gpt1-77ce0.cloudfunctions.net/classifyDocumentDualAIHttp',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            documentUrl: 'https://example.com/test.pdf',
            mode: 'deepseek'
          })
        }
      );
      results.deepSeek = {
        status: dsResponse.status,
        ok: dsResponse.ok,
        statusText: dsResponse.statusText
      };
    } catch (error: any) {
      results.deepSeek = { error: error.message };
    }

    // 4. Test Batch Reprocessing
    console.log('📦 Testing Batch Reprocessing...');
    try {
      const batchResponse = await fetch(
        'https://us-central1-gpt1-77ce0.cloudfunctions.net/reprocessDocuments',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            documentUrls: ['https://example.com/test.pdf'],
            mode: 'both'
          })
        }
      );
      results.batchReprocessing = {
        status: batchResponse.status,
        ok: batchResponse.ok,
        statusText: batchResponse.statusText
      };
    } catch (error: any) {
      results.batchReprocessing = { error: error.message };
    }

    console.log('📊 Quick Test Results:', results);
    return results;

  } catch (error) {
    console.error('❌ Quick test failed:', error);
    return { error: error.message };
  }
};
