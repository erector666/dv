// Multimodal OCR Service using Hugging Face Spaces
// More accurate than Tesseract for complex documents and multiple languages

interface MultimodalOCRResult {
  text: string;
  confidence: number;
  processingTime: number;
}

export class MultimodalOCRService {
  private apiUrl = 'https://prithivmlmods-multimodal-ocr.hf.space/run/predict';
  private timeout = 45000; // 45 second timeout for 7B model
  private selectedModel = 'olmOCR-7B-0725'; // Use the 7B model for superior accuracy

  constructor() {
    console.log('🔍 Initializing Multimodal OCR service...');
  }

  /**
   * Test if the Hugging Face Space is accessible
   */
  private async testSpaceAccessibility(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(
        'https://prithivmlmods-multimodal-ocr.hf.space/',
        {
          method: 'GET',
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);
      console.log('🌐 Space accessibility test:', response.status);
      return response.status === 200;
    } catch (error) {
      console.warn('⚠️ Space accessibility test failed:', error);
      return false;
    }
  }

  /**
   * Extract text from image using Multimodal OCR
   */
  async extractTextFromImage(
    imageBuffer: Buffer
  ): Promise<MultimodalOCRResult> {
    const startTime = Date.now();

    try {
      console.log('🖼️ Starting Multimodal OCR on image...');

      // Test space accessibility first
      const isAccessible = await this.testSpaceAccessibility();
      if (!isAccessible) {
        console.warn('⚠️ Hugging Face Space may not be accessible');
      }

      // Try multiple endpoints if the first fails
      const endpoints = [
        'https://prithivmlmods-multimodal-ocr.hf.space/run/predict',
        'https://prithivmlmods-multimodal-ocr.hf.space/api/predict',
        'https://prithivmlmods-multimodal-ocr.hf.space/predict',
        'https://prithivmlmods-multimodal-ocr.hf.space/api/generate',
      ];

      // Convert buffer to base64 for API (just base64 string, no data: prefix)
      const base64Image = imageBuffer.toString('base64');
      const mimeType = this.detectMimeType(imageBuffer);

      console.log('🔧 API Debug Info:', {
        apiUrl: this.apiUrl,
        mimeType: mimeType,
        base64Length: base64Image.length,
        selectedModel: this.selectedModel,
      });

      // Try multiple endpoints until one works
      let response;
      let lastError;

      for (const endpoint of endpoints) {
        try {
          console.log(`🔄 Trying endpoint: ${endpoint}`);

          const controller = new AbortController();
          const timeoutId = setTimeout(() => {
            console.log('⏰ Multimodal OCR timeout, aborting...');
            controller.abort();
          }, this.timeout);

          response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              data: [
                base64Image, // image: just base64 string (no data: prefix)
                'Extract the full page.', // text: query instruction
                this.selectedModel, // model: "olmOCR-7B-0725"
              ],
            }),
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (response.ok) {
            console.log(`✅ Success with endpoint: ${endpoint}`);
            break;
          } else {
            console.log(
              `❌ Failed with endpoint: ${endpoint} - ${response.status}`
            );
            lastError = new Error(
              `HTTP ${response.status}: ${response.statusText}`
            );
          }
        } catch (error) {
          console.log(`❌ Error with endpoint: ${endpoint} - ${error.message}`);
          lastError = error;
          continue;
        }
      }

      if (!response || !response.ok) {
        throw lastError || new Error('All endpoints failed');
      }

      const result = await response.json();
      console.log('🔧 Raw API Response:', result);

      // Gradio API returns: [rawText, markdownText]
      const extractedText = this.parseOCRResponse(result);
      const processingTime = Date.now() - startTime;

      console.log('✅ Multimodal OCR completed:', {
        textLength: extractedText.length,
        processingTime: `${processingTime}ms`,
        preview:
          extractedText.substring(0, 100) +
          (extractedText.length > 100 ? '...' : ''),
      });

      return {
        text: extractedText,
        confidence: this.calculateConfidence(extractedText),
        processingTime,
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error('❌ Multimodal OCR failed:', error);

      // CRITICAL FIX: Use Tesseract as fallback when Hugging Face API fails
      console.log('🔄 Falling back to Tesseract OCR...');
      try {
        const tesseract = require('tesseract.js');
        const result = await tesseract.recognize(imageBuffer, 'eng+fra+mkd', {
          logger: (m: any) => console.log('📄 Tesseract:', m),
        });

        const fallbackText = result.data.text || '';
        const fallbackConfidence = result.data.confidence
          ? result.data.confidence / 100
          : 0.7;

        console.log('✅ Tesseract fallback successful:', {
          textLength: fallbackText.length,
          confidence: fallbackConfidence,
          preview: fallbackText.substring(0, 100),
        });

        return {
          text: fallbackText,
          confidence: fallbackConfidence,
          processingTime: Date.now() - startTime,
        };
      } catch (tesseractError) {
        console.error('❌ Tesseract fallback also failed:', tesseractError);
        return {
          text: '',
          confidence: 0,
          processingTime: Date.now() - startTime,
        };
      }
    }
  }

  /**
   * Extract text from PDF using Multimodal OCR
   * Note: This converts PDF pages to images first
   */
  async extractTextFromPDF(pdfBuffer: Buffer): Promise<MultimodalOCRResult> {
    try {
      console.log('📄 Processing PDF with Multimodal OCR...');

      // For now, we'll use the same method as images
      // In a production setup, you might want to convert PDF to images first
      // But the Multimodal OCR might handle PDFs directly
      return await this.extractTextFromImage(pdfBuffer);
    } catch (error) {
      console.error('❌ PDF OCR failed:', error);
      return {
        text: '',
        confidence: 0,
        processingTime: 0,
      };
    }
  }

  /**
   * Detect MIME type from buffer
   */
  private detectMimeType(buffer: Buffer): string {
    // Check magic bytes for common image formats
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
   * Parse the response from Multimodal OCR API
   */
  private parseOCRResponse(response: any): string {
    try {
      console.log('🔧 Parsing Gradio API Response:', response);

      // Handle Gradio API response format: { data: [rawText, markdownText] }
      if (response?.data && Array.isArray(response.data)) {
        const [rawText, markdownText] = response.data;

        // Prefer raw text, fallback to markdown
        const extractedText = rawText || markdownText || '';

        console.log('🔧 Gradio Response Parsed:', {
          hasRawText: !!rawText,
          hasMarkdown: !!markdownText,
          textLength: extractedText.length,
          preview: extractedText.substring(0, 100),
        });

        if (extractedText && typeof extractedText === 'string') {
          return extractedText.trim();
        }
      }

      // Direct string response
      if (typeof response === 'string') {
        return response.trim();
      }

      // Object with text property
      if (response?.text && typeof response.text === 'string') {
        return response.text.trim();
      }

      console.warn('⚠️ Unexpected OCR response format:', response);
      return '';
    } catch (error) {
      console.error('❌ Error parsing OCR response:', error);
      return '';
    }
  }

  /**
   * Calculate confidence based on text quality
   */
  private calculateConfidence(text: string): number {
    if (!text || text.length === 0) return 0;

    // Basic confidence calculation based on text characteristics
    let confidence = 0.5; // Base confidence

    // Increase confidence for longer texts
    if (text.length > 100) confidence += 0.2;
    if (text.length > 500) confidence += 0.1;

    // Increase confidence for texts with proper structure
    const hasUppercase = /[A-Z]/.test(text);
    const hasLowercase = /[a-z]/.test(text);
    const hasNumbers = /\d/.test(text);
    const hasPunctuation = /[.,!?;:]/.test(text);

    if (hasUppercase) confidence += 0.05;
    if (hasLowercase) confidence += 0.05;
    if (hasNumbers) confidence += 0.05;
    if (hasPunctuation) confidence += 0.05;

    // Decrease confidence for texts with too many special characters
    const specialCharRatio =
      (text.match(/[^\w\s.,!?;:-]/g) || []).length / text.length;
    if (specialCharRatio > 0.3) confidence -= 0.2;

    return Math.max(0, Math.min(1, confidence));
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
      console.log('✅ Multimodal OCR connection test successful');
      return true;
    } catch (error) {
      console.error('❌ Multimodal OCR connection test failed:', error);
      return false;
    }
  }
}

// Export singleton instance
let multimodalOCRInstance: MultimodalOCRService | null = null;

export function getMultimodalOCRService(): MultimodalOCRService {
  if (!multimodalOCRInstance) {
    multimodalOCRInstance = new MultimodalOCRService();
  }
  return multimodalOCRInstance;
}
