// Free Translation Service using Hugging Face
// This replaces Google Translate API with a completely free alternative

interface HuggingFaceTranslationResult {
  translation_text: string;
}

interface FreeTranslationResult {
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

class FreeTranslationService {
  private baseUrl = 'https://api-inference.huggingface.co/models';
  private token: string;

  constructor() {
    // Free Hugging Face token - get one at https://huggingface.co/settings/tokens
    this.token =
      process.env.HUGGING_FACE_TOKEN ||
      process.env.HUGGINGFACE_TOKEN ||
      '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';
  }

  /**
   * Translate text using Hugging Face's free translation models
   */
  async translateText(
    text: string,
    targetLanguage: string,
    sourceLanguage: string = 'auto'
  ): Promise<FreeTranslationResult> {
    try {
      console.log('🌐 Starting free translation:', {
        sourceLanguage,
        targetLanguage,
      });

      // Map language codes to Hugging Face model names
      const modelMap = this.getTranslationModel(sourceLanguage, targetLanguage);

      if (!modelMap) {
        throw new Error(
          `Translation not supported from ${sourceLanguage} to ${targetLanguage}`
        );
      }

      const response = await fetch(`${this.baseUrl}/${modelMap}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: text,
          parameters: {
            max_length: 1000,
            temperature: 0.7,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Hugging Face API error: ${response.status}`);
      }

      const result = (await response.json()) as HuggingFaceTranslationResult[];
      const translatedText = result[0]?.translation_text || text;

      // Calculate quality metrics
      const originalWordCount = text.split(/\s+/).length;
      const translatedWordCount = translatedText.split(/\s+/).length;
      const confidence = this.calculateConfidence(text, translatedText);
      const quality = this.assessQuality(confidence);

      console.log('✅ Free translation completed:', {
        originalLength: text.length,
        translatedLength: translatedText.length,
        confidence: confidence,
        quality: quality.assessment,
      });

      return {
        translatedText,
        sourceLanguage:
          sourceLanguage === 'auto'
            ? await this.detectLanguage(text)
            : sourceLanguage,
        targetLanguage,
        confidence,
        originalText: text,
        wordCount: {
          original: originalWordCount,
          translated: translatedWordCount,
        },
        quality,
      };
    } catch (error) {
      console.error('❌ Free translation failed:', error);
      throw error;
    }
  }

  /**
   * Detect language using Hugging Face's free language detection
   */
  async detectLanguage(text: string): Promise<string> {
    try {
      const response = await fetch(
        `${this.baseUrl}/papluca/xlm-roberta-base-language-detection`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ inputs: text.substring(0, 2000) }), // Expanded context for better translation
        }
      );

      if (!response.ok) {
        return 'en'; // Default fallback
      }

      const result = await response.json();
      return result[0]?.label || 'en';
    } catch (error) {
      console.warn('Language detection failed, using default:', error);
      return 'en';
    }
  }

  /**
   * Get the appropriate Hugging Face model for translation
   */
  private getTranslationModel(
    sourceLanguage: string,
    targetLanguage: string
  ): string | null {
    // Popular free translation models on Hugging Face
    const models: Record<string, string> = {
      // English to other languages
      'en-es': 'Helsinki-NLP/opus-mt-en-es',
      'en-fr': 'Helsinki-NLP/opus-mt-en-fr',
      'en-de': 'Helsinki-NLP/opus-mt-en-de',
      'en-it': 'Helsinki-NLP/opus-mt-en-it',
      'en-pt': 'Helsinki-NLP/opus-mt-en-pt',
      'en-ru': 'Helsinki-NLP/opus-mt-en-ru',
      'en-zh': 'Helsinki-NLP/opus-mt-en-zh',
      'en-ar': 'Helsinki-NLP/opus-mt-en-ar',
      'en-mk': 'Helsinki-NLP/opus-mt-en-sla', // Slavic languages including Macedonian

      // Other languages to English
      'es-en': 'Helsinki-NLP/opus-mt-es-en',
      'fr-en': 'Helsinki-NLP/opus-mt-fr-en',
      'de-en': 'Helsinki-NLP/opus-mt-de-en',
      'it-en': 'Helsinki-NLP/opus-mt-it-en',
      'pt-en': 'Helsinki-NLP/opus-mt-pt-en',
      'ru-en': 'Helsinki-NLP/opus-mt-ru-en',
      'zh-en': 'Helsinki-NLP/opus-mt-zh-en',
      'ar-en': 'Helsinki-NLP/opus-mt-ar-en',
      'mk-en': 'Helsinki-NLP/opus-mt-sla-en', // Slavic to English

      // Auto-detect to English (most common case)
      'auto-en': 'facebook/mbart-large-50-many-to-one-mmt',
      'auto-es': 'facebook/mbart-large-50-one-to-many-mmt',
      'auto-fr': 'facebook/mbart-large-50-one-to-many-mmt',
    };

    const key = `${sourceLanguage}-${targetLanguage}`;
    return models[key] || models[`auto-${targetLanguage}`] || null;
  }

  /**
   * Calculate translation confidence based on text characteristics
   */
  private calculateConfidence(original: string, translated: string): number {
    // Simple heuristic based on length similarity and content
    const lengthRatio =
      Math.min(original.length, translated.length) /
      Math.max(original.length, translated.length);

    // Check if translation actually changed (not just copied)
    const hasChanged = original !== translated;

    // Base confidence on length similarity and change detection
    let confidence = lengthRatio * 0.7;
    if (hasChanged) confidence += 0.2;
    if (translated.length > 0) confidence += 0.1;

    return Math.min(confidence, 0.95); // Cap at 95%
  }

  /**
   * Assess translation quality based on confidence score
   */
  private assessQuality(confidence: number): {
    score: number;
    assessment: string;
  } {
    if (confidence >= 0.9)
      return { score: confidence, assessment: 'Excellent' };
    if (confidence >= 0.8)
      return { score: confidence, assessment: 'Very Good' };
    if (confidence >= 0.7) return { score: confidence, assessment: 'Good' };
    if (confidence >= 0.6) return { score: confidence, assessment: 'Fair' };
    return { score: confidence, assessment: 'Acceptable' };
  }

  /**
   * Get supported language pairs
   */
  getSupportedLanguages(): Array<{ code: string; name: string }> {
    return [
      { code: 'en', name: 'English' },
      { code: 'es', name: 'Spanish' },
      { code: 'fr', name: 'French' },
      { code: 'de', name: 'German' },
      { code: 'it', name: 'Italian' },
      { code: 'pt', name: 'Portuguese' },
      { code: 'ru', name: 'Russian' },
      { code: 'zh', name: 'Chinese' },
      { code: 'ar', name: 'Arabic' },
      { code: 'mk', name: 'Macedonian' },
    ];
  }
}

export { FreeTranslationService, FreeTranslationResult };
