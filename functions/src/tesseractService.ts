// Free OCR Service using Tesseract.js
// This replaces Google Vision API with a completely free alternative

import { createWorker, Worker } from 'tesseract.js';

interface TesseractResult {
  text: string;
  confidence: number;
  quality: {
    score: number;
    assessment: string;
  };
}

class TesseractOCRService {
  private worker: Worker | null = null;

  /**
   * Initialize Tesseract worker
   */
  private async initializeWorker(): Promise<Worker> {
    if (this.worker) {
      return this.worker;
    }

    console.log('🔧 Initializing Tesseract OCR worker...');

    // Initialize with just English first to avoid language loading issues
    this.worker = await createWorker('eng', 1, {
      logger: m => {
        if (m.status === 'recognizing text') {
          console.log(`📊 OCR Progress: ${Math.round(m.progress * 100)}%`);
        }
      },
    });

    console.log('✅ Tesseract worker initialized with English support');
    return this.worker;
  }

  /**
   * Extract text from image buffer using Tesseract OCR
   */
  async extractTextFromImage(imageBuffer: Buffer): Promise<TesseractResult> {
    try {
      console.log('🔍 Starting Tesseract OCR text extraction...', {
        bufferSize: imageBuffer.length,
        type: 'image',
      });

      const worker = await this.initializeWorker();

      // Perform OCR
      const { data } = await worker.recognize(imageBuffer);

      const extractedText = data.text || '';
      const confidence = data.confidence / 100; // Convert to 0-1 scale

      console.log('✅ Tesseract OCR completed:', {
        textLength: extractedText.length,
        confidence: confidence,
        preview: extractedText.substring(0, 200),
      });

      // Assess quality based on confidence and text characteristics
      const quality = this.assessTextQuality(extractedText, confidence);

      return {
        text: extractedText,
        confidence: confidence,
        quality: quality,
      };
    } catch (error) {
      console.error('❌ Tesseract OCR failed:', error);
      throw new Error(`OCR extraction failed: ${error.message}`);
    }
  }

  /**
   * Extract text from PDF using Tesseract (for image-based PDFs)
   */
  async extractTextFromPDF(pdfBuffer: Buffer): Promise<TesseractResult> {
    try {
      console.log('📄 Processing PDF with Tesseract OCR...');

      // For now, treat PDF as image - in production you might want to convert PDF to images first
      return await this.extractTextFromImage(pdfBuffer);
    } catch (error) {
      console.error('❌ PDF OCR failed:', error);
      throw new Error(`PDF OCR extraction failed: ${error.message}`);
    }
  }

  /**
   * Enhanced OCR with preprocessing for better accuracy
   */
  async extractTextWithPreprocessing(
    imageBuffer: Buffer,
    options?: {
      languages?: string[];
      psm?: number; // Page Segmentation Mode
      oem?: number; // OCR Engine Mode
    }
  ): Promise<TesseractResult> {
    try {
      console.log('🔧 Starting enhanced OCR with preprocessing...', options);

      const worker = await this.initializeWorker();

      // Set custom parameters for better accuracy
      if (options?.psm !== undefined) {
        await worker.setParameters({
          tessedit_pageseg_mode: options.psm as any,
        });
      }

      if (options?.oem !== undefined) {
        await worker.setParameters({
          tessedit_ocr_engine_mode: options.oem as any,
        });
      }

      // Perform OCR with custom language if specified
      const languages = options?.languages?.join('+') || 'eng+mkd+rus';
      // Note: For newer versions of Tesseract.js, language loading is handled during worker creation

      const { data } = await worker.recognize(imageBuffer);

      const extractedText = this.postProcessText(data.text || '');
      const confidence = data.confidence / 100;
      const quality = this.assessTextQuality(extractedText, confidence);

      console.log('✅ Enhanced OCR completed:', {
        textLength: extractedText.length,
        confidence: confidence,
        languages: languages,
      });

      return {
        text: extractedText,
        confidence: confidence,
        quality: quality,
      };
    } catch (error) {
      console.error('❌ Enhanced OCR failed:', error);
      throw new Error(`Enhanced OCR failed: ${error.message}`);
    }
  }

  /**
   * Post-process extracted text to improve quality
   */
  private postProcessText(text: string): string {
    return (
      text
        // Fix common OCR errors
        .replace(/\s+/g, ' ') // Normalize whitespace
        .replace(/([a-z])([A-Z])/g, '$1 $2') // Add spaces between lowercase and uppercase
        .replace(/([0-9])([a-zA-Z])/g, '$1 $2') // Add spaces between numbers and letters
        .replace(/([a-zA-Z])([0-9])/g, '$1 $2') // Add spaces between letters and numbers
        // Fix common character substitutions
        .replace(/0/g, 'O') // Zero to O in text contexts
        .replace(/1/g, 'I') // One to I in text contexts (be careful with this)
        .replace(/5/g, 'S') // Five to S in some contexts
        // Clean up
        .trim()
    );
  }

  /**
   * Assess text quality based on confidence and characteristics
   */
  private assessTextQuality(
    text: string,
    confidence: number
  ): { score: number; assessment: string } {
    let qualityScore = confidence;

    // Adjust based on text characteristics
    if (text.length > 100) qualityScore += 0.1; // Longer text usually means better extraction
    if (/[А-Яа-я]/.test(text)) qualityScore += 0.05; // Cyrillic text bonus
    if (text.split(' ').length > 10) qualityScore += 0.05; // Multiple words bonus

    // Penalize for common OCR issues
    if (text.includes('|||') || text.includes('___')) qualityScore -= 0.1;
    if (text.length < 10) qualityScore -= 0.2;

    // Cap the score
    qualityScore = Math.min(qualityScore, 0.95);
    qualityScore = Math.max(qualityScore, 0.1);

    let assessment: string;
    if (qualityScore >= 0.9) assessment = 'Excellent';
    else if (qualityScore >= 0.8) assessment = 'Very Good';
    else if (qualityScore >= 0.7) assessment = 'Good';
    else if (qualityScore >= 0.6) assessment = 'Fair';
    else if (qualityScore >= 0.5) assessment = 'Acceptable';
    else assessment = 'Poor';

    return { score: qualityScore, assessment };
  }

  /**
   * Get supported languages
   */
  getSupportedLanguages(): string[] {
    return [
      'eng', // English
      'mkd', // Macedonian
      'rus', // Russian
      'srp', // Serbian
      'bul', // Bulgarian
      'fra', // French
      'deu', // German
      'spa', // Spanish
      'ita', // Italian
      'por', // Portuguese
      'chi_sim', // Chinese Simplified
      'ara', // Arabic
    ];
  }

  /**
   * Cleanup worker resources
   */
  async cleanup(): Promise<void> {
    if (this.worker) {
      console.log('🧹 Cleaning up Tesseract worker...');
      await this.worker.terminate();
      this.worker = null;
    }
  }

  /**
   * Detect document type and suggest optimal OCR settings
   */
  getOptimalSettings(contentType: string): {
    psm: number;
    oem: number;
    languages: string[];
  } {
    // Page Segmentation Modes:
    // 3 = Fully automatic page segmentation (default)
    // 6 = Assume uniform block of text
    // 7 = Treat image as single text line
    // 8 = Treat image as single word
    // 13 = Raw line. Treat image as single text line, bypassing hacks

    // OCR Engine Modes:
    // 1 = Original Tesseract only
    // 2 = Neural nets LSTM only
    // 3 = Default, based on what is available

    if (contentType.includes('pdf')) {
      return {
        psm: 3, // Full page segmentation for PDFs
        oem: 2, // Use LSTM for better accuracy
        languages: ['eng', 'mkd', 'rus'],
      };
    }

    if (contentType.includes('image')) {
      return {
        psm: 6, // Uniform block of text for images
        oem: 2, // Use LSTM
        languages: ['eng', 'mkd', 'rus'],
      };
    }

    // Default settings
    return {
      psm: 3,
      oem: 3,
      languages: ['eng', 'mkd', 'rus'],
    };
  }
}

export { TesseractOCRService, TesseractResult };
