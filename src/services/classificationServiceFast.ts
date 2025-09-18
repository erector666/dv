import { Document } from './documentService';

/**
 * Fast document processing with optimizations:
 * - Single AI call instead of dual
 * - Shorter timeout (30s instead of 180s)
 * - No retries
 * - Parallel operations where possible
 * - Skip non-essential processing
 */
export const processDocumentFast = async (
  document: Document
): Promise<Document> => {
  try {
    console.log('⚡ Fast AI processing for:', document.name);
    
    // Use local heuristics for quick classification
    const quickClassification = classifyByHeuristics(document);
    
    // Try fast AI processing with short timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout
    
    try {
      // Call simplified classification endpoint (single AI)
      const response = await fetch(
        'https://us-central1-gpt1-77ce0.cloudfunctions.net/classifyDocumentHttp',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            documentUrl: document.url,
            mode: 'fast', // Request fast mode
          }),
          signal: controller.signal,
        }
      );
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const aiResult = await response.json();
        
        // Merge AI results with document
        return {
          ...document,
          category: aiResult.category || quickClassification.category,
          tags: [...new Set([...document.tags, ...(aiResult.tags || [])])],
          metadata: {
            ...document.metadata,
            aiProcessed: true,
            language: aiResult.language || detectLanguageByHeuristics(document.name),
            summary: aiResult.summary,
            suggestedName: aiResult.suggestedName,
            processingTime: Date.now(),
          },
        };
      }
    } catch (error) {
      clearTimeout(timeoutId);
      console.warn('⚠️ Fast AI failed, using heuristics:', error);
    }
    
    // Fallback to heuristics-based classification
    return {
      ...document,
      category: quickClassification.category,
      tags: [...new Set([...document.tags, ...quickClassification.tags])],
      metadata: {
        ...document.metadata,
        aiProcessed: false,
        language: detectLanguageByHeuristics(document.name),
        processingMethod: 'heuristics',
        processingTime: Date.now(),
      },
    };
  } catch (error) {
    console.error('❌ Fast processing error:', error);
    // Return document as-is if all processing fails
    return document;
  }
};

/**
 * Quick classification based on filename and type
 */
function classifyByHeuristics(document: Document): {
  category: string;
  tags: string[];
} {
  const name = document.name.toLowerCase();
  const type = document.type.toLowerCase();
  
  // Document type detection
  if (type.includes('pdf') || name.endsWith('.pdf')) {
    if (name.includes('invoice') || name.includes('bill')) {
      return { category: 'financial', tags: ['invoice', 'pdf'] };
    }
    if (name.includes('contract') || name.includes('agreement')) {
      return { category: 'legal', tags: ['contract', 'pdf'] };
    }
    if (name.includes('report')) {
      return { category: 'reports', tags: ['report', 'pdf'] };
    }
    if (name.includes('certificate') || name.includes('diploma')) {
      return { category: 'education', tags: ['certificate', 'pdf'] };
    }
  }
  
  // Image detection
  if (type.includes('image')) {
    if (name.includes('receipt')) {
      return { category: 'financial', tags: ['receipt', 'image'] };
    }
    if (name.includes('id') || name.includes('passport')) {
      return { category: 'personal', tags: ['identification', 'image'] };
    }
    return { category: 'images', tags: ['image'] };
  }
  
  // Text documents
  if (type.includes('text') || name.includes('.txt')) {
    return { category: 'documents', tags: ['text'] };
  }
  
  // Default
  return { category: 'uncategorized', tags: ['document'] };
}

/**
 * Quick language detection based on filename
 */
function detectLanguageByHeuristics(filename: string): string {
  const name = filename.toLowerCase();
  
  // Check for language indicators in filename
  if (name.includes('mk') || name.includes('macedon') || name.includes('мк')) {
    return 'mk';
  }
  if (name.includes('fr') || name.includes('french') || name.includes('français')) {
    return 'fr';
  }
  if (name.includes('en') || name.includes('english')) {
    return 'en';
  }
  if (name.includes('ru') || name.includes('russian') || name.includes('русск')) {
    return 'ru';
  }
  
  // Check for Cyrillic characters
  if (/[а-яА-Я]/.test(filename)) {
    return 'mk'; // Assume Macedonian for Cyrillic
  }
  
  // Check for French characters
  if (/[àâäçéèêëïîôùûüÿ]/i.test(filename)) {
    return 'fr';
  }
  
  // Default to English
  return 'en';
}