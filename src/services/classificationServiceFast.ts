import { Document } from './documentService';
import { getAuth } from 'firebase/auth';

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
    
    // Get auth token if available
    let authToken = '';
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (user) {
        authToken = await user.getIdToken();
      }
    } catch (authError) {
      console.warn('Could not get auth token, continuing without:', authError);
    }
    
    // Try fast AI processing with short timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout
    
    try {
      // Call simplified classification endpoint (single AI)
      const headers: any = {
        'Content-Type': 'application/json',
      };
      
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }
      
      const response = await fetch(
        'https://us-central1-gpt1-77ce0.cloudfunctions.net/classifyDocumentHttp',
        {
          method: 'POST',
          headers,
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
        const uniqueTags = Array.from(new Set([...(document.tags || []), ...(aiResult.tags || [])]));
        return {
          ...document,
          category: aiResult.category || quickClassification.category,
          tags: uniqueTags,
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
    const fallbackTags = Array.from(new Set([...(document.tags || []), ...quickClassification.tags]));
    return {
      ...document,
      category: quickClassification.category,
      tags: fallbackTags,
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
  
  const currentYear = new Date().getFullYear().toString();
  const baseTags = [currentYear, 'this-year', 'processed'];
  
  // Document type detection
  if (type.includes('pdf') || name.endsWith('.pdf')) {
    // Enhanced bill and financial document detection
    const financialTerms = ['invoice', 'bill', 'receipt', 'statement', 'payment', 'billing', 'charged', 'debit', 'credit', 'balance', 'financial', 'finance', 'fee', 'cost', 'price', 'tax', 'vat', 'amount', 'due', 'overdue', 'subscription', 'membership', 'loan', 'mortgage', 'interest', 'account', 'bank', 'transaction'];
    const hasFinancialTerm = financialTerms.some(term => name.toLowerCase().includes(term));
    
    if (hasFinancialTerm) {
      return { category: 'Finance', tags: [...baseTags, 'financial', 'statement', 'invoice', 'pdf'] };
    }
    if (name.includes('contract') || name.includes('agreement')) {
      return { category: 'Legal', tags: [...baseTags, 'legal', 'contract', 'pdf'] };
    }
    if (name.includes('report')) {
      return { category: 'Reports', tags: [...baseTags, 'report', 'pdf', 'text-heavy'] };
    }
    if (name.includes('certificate') || name.includes('diploma')) {
      return { category: 'Education', tags: [...baseTags, 'education', 'certificate', 'pdf'] };
    }
    return { category: 'Documents', tags: [...baseTags, 'pdf', 'document'] };
  }
  
  // Image detection
  if (type.includes('image')) {
    if (name.includes('receipt')) {
      return { category: 'Finance', tags: [...baseTags, 'financial', 'receipt', 'image-only'] };
    }
    if (name.includes('id') || name.includes('passport')) {
      return { category: 'Personal', tags: [...baseTags, 'identification', 'image-only', 'important'] };
    }
    return { category: 'Photos', tags: [...baseTags, 'image-only', 'photos'] };
  }
  
  // Text documents
  if (type.includes('text') || name.includes('.txt')) {
    return { category: 'Documents', tags: [...baseTags, 'text-heavy', 'digital-native'] };
  }
  
  // Default
  return { category: 'Personal', tags: [...baseTags, 'document'] };
}

/**
 * Quick language detection based on filename
 */
function detectLanguageByHeuristics(filename: string): string {
  const name = filename.toLowerCase();
  
  // Only use explicit language indicators in filename (prefixes like "fr_", "en_", etc.)
  if (name.includes('mk_') || name.includes('macedon') || name.includes('мк')) {
    return 'mk';
  }
  if (name.includes('fr_') || name.includes('french') || name.includes('français') || name.includes('francais')) {
    return 'fr';
  }
  if (name.includes('en_') || name.includes('english')) {
    return 'en';
  }
  if (name.includes('sr_') || name.includes('serbian') || name.includes('ср')) {
    return 'sr';
  }
  if (name.includes('ru_') || name.includes('russian') || name.includes('русск')) {
    return 'ru';
  }
  
  // Check for Cyrillic characters (be more specific)
  if (/[а-яА-Я]/.test(filename)) {
    // Check for Serbian-specific Cyrillic patterns
    if (/[ђжћш]/i.test(filename)) {
      return 'sr';
    }
    // Check for Macedonian-specific patterns
    if (/[ќѓ]/i.test(filename)) {
      return 'mk';
    }
    // Default to Serbian for general Cyrillic (more common in your documents)
    return 'sr';
  }
  
  // Check for French accented characters in filename
  if (/[àâäçéèêëïîôùûüÿ]/i.test(filename)) {
    return 'fr';
  }
  
  // Don't make assumptions based on business names in filenames
  // Let the content-based detection handle that
  
  // Final fallback
  return 'en';
}