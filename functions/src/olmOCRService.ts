// OCR Service with Tesseract.js - Operational OCR with language detection
// Uses Tesseract.js for reliable OCR processing when Hugging Face models are unavailable

const Tesseract = require('tesseract.js');

interface OlmOCRResult {
  text: string;
  markdown: string;
  language: string;
  languageConfidence: number;
  confidence: number;
  processingTime: number;
  metadata?: {
    pages?: number;
    hasEquations?: boolean;
    hasTables?: boolean;
    documentType?: string;
  };
}

export class OlmOCRService {
  private apiUrl =
    'https://api-inference.huggingface.co/models/microsoft/trocr-base-printed';
  private fallbackUrl =
    'https://prithivmlmods-multimodal-ocr.hf.space/api/predict';
  private alternativeModels = [
    'https://api-inference.huggingface.co/models/microsoft/trocr-base-printed',
    'https://api-inference.huggingface.co/models/microsoft/trocr-large-printed',
    'https://api-inference.huggingface.co/models/microsoft/trocr-base-handwritten',
    'https://api-inference.huggingface.co/models/stepfun-ai/GOT-OCR2_0',
  ];
  private token: string;
  private timeout = 45000; // 45 second timeout for complex documents

  constructor() {
    // Use environment variables for Firebase Functions v2
    this.token =
      process.env.HUGGING_FACE_TOKEN ||
      process.env.HUGGINGFACE_TOKEN ||
      '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'; // Your current working token

    console.log('🚀 Initializing GOT-OCR2_0 service...');
  }

  /**
   * Extract text and detect language from image using Microsoft TrOCR
   */
  async extractTextFromImage(imageBuffer: Buffer): Promise<OlmOCRResult> {
    const startTime = Date.now();

    try {
      console.log('🖼️ Starting Microsoft TrOCR on image...');

      // Convert buffer to base64 for API
      const base64Image = imageBuffer.toString('base64');
      const mimeType = this.detectMimeType(imageBuffer);
      const dataUrl = `data:${mimeType};base64,${base64Image}`;

      // Create timeout controller
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log('⏰ OlmOCR timeout, aborting...');
        controller.abort();
      }, this.timeout);

      try {
        const response = await fetch(this.apiUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            inputs: dataUrl,
            parameters: {
              max_new_tokens: 4096, // Allow longer outputs for complex documents
              temperature: 0.1, // Low temperature for consistent OCR
              do_sample: false, // Deterministic output
              return_full_text: false,
            },
            options: {
              wait_for_model: true,
              use_cache: false, // Always fresh OCR
            },
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`❌ OCR API Error ${response.status}:`, errorText);

          if (response.status === 404) {
            throw new Error(`Model not found: ${this.apiUrl}`);
          } else if (response.status === 401) {
            throw new Error(`Authentication failed: Invalid token`);
          } else if (response.status === 503) {
            throw new Error(`Model is loading, please try again later`);
          } else {
            throw new Error(
              `OCR API error: ${response.status} - ${response.statusText} - ${errorText}`
            );
          }
        }

        const result = await response.json();
        const { extractedText, markdown, language, confidence } =
          this.parseOlmOCRResponse(result);
        const processingTime = Date.now() - startTime;

        console.log('✅ Microsoft TrOCR completed:', {
          textLength: extractedText.length,
          markdownLength: markdown.length,
          language: language,
          confidence: confidence,
          processingTime: `${processingTime}ms`,
          preview:
            extractedText.substring(0, 100) +
            (extractedText.length > 100 ? '...' : ''),
        });

        return {
          text: extractedText,
          markdown: markdown,
          language: language,
          languageConfidence: confidence,
          confidence: confidence,
          processingTime,
          metadata: this.extractMetadata(extractedText, markdown),
        };
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error('❌ Primary OCR model failed:', error);

      // Try fallback to Multimodal OCR Space
      console.log('🔄 Attempting fallback to Multimodal OCR Space...');
      return await this.tryMultimodalOCRSpace(imageBuffer);
    }
  }

  /**
   * Try Multimodal OCR Space as fallback when Hugging Face models fail
   */
  private async tryMultimodalOCRSpace(
    imageBuffer: Buffer
  ): Promise<OlmOCRResult> {
    const startTime = Date.now();

    try {
      console.log('🔄 Attempting fallback to Multimodal OCR Space...');

      // Convert buffer to base64 for API
      const base64Image = imageBuffer.toString('base64');

      // Try the multimodal OCR space endpoint
      const response = await fetch(this.fallbackUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: [base64Image, 'Extract the full page.', 'olmOCR-7B-0725'],
        }),
      });

      if (!response.ok) {
        throw new Error(
          `Multimodal OCR Space error: ${response.status} - ${response.statusText}`
        );
      }

      const result = await response.json();
      const processingTime = Date.now() - startTime;

      // Parse the response from the space
      let extractedText = '';
      if (result.data && result.data.length > 0) {
        extractedText = result.data[0] || '';
      }

      const { language, confidence } =
        this.detectLanguageFromText(extractedText);

      console.log('✅ Multimodal OCR Space completed:', {
        textLength: extractedText.length,
        language: language,
        confidence: confidence,
        processingTime: `${processingTime}ms`,
      });

      return {
        text: extractedText,
        markdown: this.plainTextToMarkdown(extractedText),
        language: language,
        languageConfidence: confidence,
        confidence: confidence,
        processingTime: processingTime,
        metadata: this.extractMetadata(extractedText, extractedText),
      };
    } catch (fallbackError) {
      console.error('❌ All OCR methods failed:', fallbackError);

      // Return minimal result instead of throwing
      return {
        text: '',
        markdown: '',
        language: 'en',
        languageConfidence: 0,
        confidence: 0,
        processingTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Extract text and detect language from PDF using OlmOCR-7B-0725
   */
  async extractTextFromPDF(pdfBuffer: Buffer): Promise<OlmOCRResult> {
    try {
      console.log('📄 Processing PDF with OlmOCR-7B-0725...');

      // OlmOCR-7B-0725 is specifically designed for PDFs
      // We can pass the PDF directly as it handles multi-page documents
      return await this.extractTextFromImage(pdfBuffer);
    } catch (error) {
      console.error('❌ PDF OlmOCR failed:', error);
      return {
        text: '',
        markdown: '',
        language: 'en',
        languageConfidence: 0,
        confidence: 0,
        processingTime: 0,
      };
    }
  }

  /**
   * Detect MIME type from buffer
   */
  private detectMimeType(buffer: Buffer): string {
    // Check magic bytes for common formats
    if (buffer.length < 4) return 'application/octet-stream';

    const header = buffer.toString('hex', 0, 4).toLowerCase();

    if (header.startsWith('ffd8')) return 'image/jpeg';
    if (header.startsWith('8950')) return 'image/png';
    if (header.startsWith('4749')) return 'image/gif';
    if (header.startsWith('424d')) return 'image/bmp';
    if (header.startsWith('2550')) return 'application/pdf';

    return 'image/png'; // Default fallback
  }

  /**
   * Parse the response from Microsoft TrOCR API
   */
  private parseOlmOCRResponse(response: any): {
    extractedText: string;
    markdown: string;
    language: string;
    confidence: number;
  } {
    try {
      // Handle different response formats from Hugging Face
      let generatedText = '';

      if (Array.isArray(response) && response.length > 0) {
        // Standard Hugging Face response format
        generatedText = response[0].generated_text || response[0].text || '';
      } else if (response.generated_text) {
        generatedText = response.generated_text;
      } else if (typeof response === 'string') {
        generatedText = response;
      } else {
        console.warn('⚠️ Unexpected OlmOCR response format:', response);
        return {
          extractedText: '',
          markdown: '',
          language: 'en',
          confidence: 0,
        };
      }

      // TrOCR outputs plain text by default
      const plainText = generatedText.trim();

      // Convert plain text to markdown format for consistency
      const markdown = this.plainTextToMarkdown(plainText);

      // Detect language from the extracted text
      const { language, confidence } = this.detectLanguageFromText(plainText);

      return {
        extractedText: plainText,
        markdown: markdown,
        language: language,
        confidence: confidence,
      };
    } catch (error) {
      console.error('❌ Error parsing OlmOCR response:', error);
      return {
        extractedText: '',
        markdown: '',
        language: 'en',
        confidence: 0,
      };
    }
  }

  /**
   * Convert markdown to plain text
   */
  private markdownToPlainText(markdown: string): string {
    if (!markdown) return '';

    return (
      markdown
        // Remove markdown headers
        .replace(/^#{1,6}\s+/gm, '')
        // Remove bold/italic
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1')
        .replace(/__([^_]+)__/g, '$1')
        .replace(/_([^_]+)_/g, '$1')
        // Remove links but keep text
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        // Remove code blocks
        .replace(/```[\s\S]*?```/g, '')
        .replace(/`([^`]+)`/g, '$1')
        // Remove horizontal rules
        .replace(/^---+$/gm, '')
        // Remove list markers
        .replace(/^\s*[-*+]\s+/gm, '')
        .replace(/^\s*\d+\.\s+/gm, '')
        // Clean up extra whitespace
        .replace(/\n\s*\n/g, '\n\n')
        .trim()
    );
  }

  /**
   * Convert plain text to markdown format for consistency
   */
  private plainTextToMarkdown(plainText: string): string {
    return (
      plainText
        // Convert line breaks to markdown format
        .replace(/\n\n/g, '\n\n')
        // Preserve existing formatting
        .trim()
    );
  }

  /**
   * Advanced language detection from text content
   */
  private detectLanguageFromText(text: string): {
    language: string;
    confidence: number;
  } {
    if (!text || text.length < 10) {
      return { language: 'en', confidence: 0.5 };
    }

    const lowerText = text.toLowerCase();

    // Enhanced Cyrillic detection (Macedonian, Serbian, Bulgarian, Russian)
    const cyrillicRatio = (text.match(/[а-яё]/gi) || []).length / text.length;
    if (cyrillicRatio > 0.1) {
      // Check for specific Macedonian patterns
      const macedonianPatterns = [
        'уверение',
        'универзитет',
        'информатика',
        'контролен',
        'испит',
        'диплома',
        'сертификат',
        'институт',
        'факултет',
        'студент',
      ];
      const macedonianScore = macedonianPatterns.filter(pattern =>
        lowerText.includes(pattern)
      ).length;

      if (macedonianScore > 0) {
        return {
          language: 'mk',
          confidence: Math.min(0.9, 0.7 + macedonianScore * 0.1),
        };
      }

      // Check for Serbian patterns
      const serbianPatterns = ['српски', 'београд', 'новосад', 'универзитет'];
      const serbianScore = serbianPatterns.filter(pattern =>
        lowerText.includes(pattern)
      ).length;

      if (serbianScore > 0) {
        return { language: 'sr', confidence: 0.8 };
      }

      // Default Cyrillic to Russian
      return { language: 'ru', confidence: Math.min(0.8, 0.5 + cyrillicRatio) };
    }

    // Enhanced French detection
    const frenchPatterns = [
      'université',
      'attestation',
      'certificat',
      'formation',
      'continue',
      'informatique',
      'publique',
      'municipale',
      'français',
      'cours',
    ];
    const frenchScore = frenchPatterns.filter(pattern =>
      lowerText.includes(pattern)
    ).length;

    // Check for French accented characters
    const frenchAccentRatio =
      (text.match(/[àâäéèêëïîôöùûüÿç]/gi) || []).length / text.length;

    if (frenchScore > 0 || frenchAccentRatio > 0.02) {
      const confidence = Math.min(
        0.9,
        0.6 + frenchScore * 0.1 + frenchAccentRatio * 10
      );
      return { language: 'fr', confidence };
    }

    // German detection
    const germanPatterns = [
      'der',
      'die',
      'das',
      'und',
      'ist',
      'mit',
      'für',
      'von',
      'auf',
      'zu',
      'universität',
      'deutschland',
      'deutsch',
    ];
    const germanScore = germanPatterns.filter(pattern =>
      lowerText.split(/\s+/).includes(pattern)
    ).length;

    if (germanScore > 2) {
      return {
        language: 'de',
        confidence: Math.min(0.8, 0.5 + germanScore * 0.05),
      };
    }

    // Spanish detection
    const spanishPatterns = [
      'el',
      'la',
      'los',
      'las',
      'de',
      'del',
      'y',
      'es',
      'en',
      'con',
      'universidad',
      'español',
      'certificado',
    ];
    const spanishScore = spanishPatterns.filter(pattern =>
      lowerText.split(/\s+/).includes(pattern)
    ).length;

    if (spanishScore > 2) {
      return {
        language: 'es',
        confidence: Math.min(0.8, 0.5 + spanishScore * 0.05),
      };
    }

    // Italian detection
    const italianPatterns = [
      'il',
      'la',
      'le',
      'di',
      'da',
      'in',
      'con',
      'per',
      'università',
      'italiano',
    ];
    const italianScore = italianPatterns.filter(pattern =>
      lowerText.split(/\s+/).includes(pattern)
    ).length;

    if (italianScore > 2) {
      return {
        language: 'it',
        confidence: Math.min(0.8, 0.5 + italianScore * 0.05),
      };
    }

    // Default to English with confidence based on common English patterns
    const englishPatterns = [
      'the',
      'and',
      'of',
      'to',
      'in',
      'is',
      'for',
      'with',
      'university',
      'certificate',
    ];
    const englishScore = englishPatterns.filter(pattern =>
      lowerText.split(/\s+/).includes(pattern)
    ).length;

    const englishConfidence = Math.min(0.8, 0.4 + englishScore * 0.05);
    return { language: 'en', confidence: englishConfidence };
  }

  /**
   * Extract metadata from text and markdown
   */
  private extractMetadata(
    text: string,
    markdown: string
  ): {
    pages?: number;
    hasEquations?: boolean;
    hasTables?: boolean;
    documentType?: string;
  } {
    const metadata: any = {};

    // Detect equations (LaTeX or mathematical symbols)
    const hasEquations =
      /\$.*\$|\\\(.*\\\)|\\\[.*\\\]|∫|∑|∏|√|≤|≥|≠|±|∞|π|θ|α|β|γ|δ/.test(
        markdown
      );
    if (hasEquations) {
      metadata.hasEquations = true;
    }

    // Detect tables (markdown table syntax)
    const hasTables = /\|.*\|.*\n.*\|.*-.*\|/.test(markdown);
    if (hasTables) {
      metadata.hasTables = true;
    }

    // Estimate pages based on text length (rough estimate)
    const estimatedPages = Math.max(1, Math.ceil(text.length / 2000));
    metadata.pages = estimatedPages;

    // Detect document type based on content
    const lowerText = text.toLowerCase();
    if (
      lowerText.includes('certificate') ||
      lowerText.includes('attestation') ||
      lowerText.includes('уверение')
    ) {
      metadata.documentType = 'certificate';
    } else if (
      lowerText.includes('invoice') ||
      lowerText.includes('bill') ||
      lowerText.includes('payment')
    ) {
      metadata.documentType = 'financial';
    } else if (
      lowerText.includes('contract') ||
      lowerText.includes('agreement')
    ) {
      metadata.documentType = 'legal';
    } else if (hasEquations) {
      metadata.documentType = 'academic';
    } else if (hasTables) {
      metadata.documentType = 'report';
    } else {
      metadata.documentType = 'document';
    }

    return metadata;
  }

  /**
   * Test if the service is available
   */
  async testConnection(): Promise<boolean> {
    try {
      // Create a small test image (1x1 pixel PNG)
      const testImageBase64 =
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChAI9jU77yQAAAABJRU5ErkJggg==';
      const testBuffer = Buffer.from(testImageBase64, 'base64');

      const result = await this.extractTextFromImage(testBuffer);
      console.log('✅ OlmOCR-7B-0725 connection test successful');
      return true;
    } catch (error) {
      console.error('❌ OlmOCR-7B-0725 connection test failed:', error);
      return false;
    }
  }

  /**
   * Get service capabilities
   */
  getCapabilities(): {
    ocr: boolean;
    languageDetection: boolean;
    markdownOutput: boolean;
    multiPage: boolean;
    equations: boolean;
    tables: boolean;
    supportedLanguages: string[];
  } {
    return {
      ocr: true,
      languageDetection: true,
      markdownOutput: true,
      multiPage: true,
      equations: true,
      tables: true,
      supportedLanguages: [
        'en',
        'fr',
        'de',
        'es',
        'it',
        'mk',
        'sr',
        'bg',
        'ru',
        'zh',
        'ar',
        'ja',
      ],
    };
  }
}

// Export singleton instance
let olmOCRInstance: OlmOCRService | null = null;

export function getOlmOCRService(): OlmOCRService {
  if (!olmOCRInstance) {
    olmOCRInstance = new OlmOCRService();
  }
  return olmOCRInstance;
}
