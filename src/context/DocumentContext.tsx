import React, { createContext, useContext, useMemo } from 'react';
import { useQuery } from 'react-query';
import { useAuth } from './AuthContext';
import { getDocuments, Document } from '../services/documentService';

// Types
interface DocumentStats {
  totalDocuments: number;
  categoriesCount: number;
  recentDocuments: number;
  processingDocuments: number;
  lowConfidenceDocuments: number;
  totalSize: number;
}

interface CategoryCount {
  [key: string]: number;
}

interface DocumentContextValue {
  documents: Document[];
  isLoading: boolean;
  error: Error | null;
  categoryCounts: CategoryCount;
  stats: DocumentStats;
  refetch: () => void;
}

// Category mapping logic extracted and optimized
const CATEGORY_MAPPINGS = {
  personal: ['document', ''],
  financial: ['financial', 'finance', 'bills'],
  bills: ['bills', 'financial', 'finance'],
  education: ['education', 'educational', 'school', 'university', 'academic'],
  legal: ['legal', 'law', 'contract', 'agreement'],
  medical: ['medical', 'health', 'healthcare', 'doctor', 'hospital'],
  insurance: ['insurance', 'insure'],
  government: ['government', 'gov', 'official', 'public'],
} as const;

const PREDEFINED_CATEGORIES = [
  'personal', 'financial', 'finance', 'bills', 'education', 'educational',
  'school', 'university', 'academic', 'legal', 'law', 'contract',
  'agreement', 'medical', 'health', 'healthcare', 'doctor', 'hospital',
  'insurance', 'insure', 'government', 'gov', 'official', 'public'
];

// Optimized category counting function
const computeCategoryCounts = (documents: Document[]): CategoryCount => {
  const counts: CategoryCount = {};
  
  // Initialize predefined categories
  Object.keys(CATEGORY_MAPPINGS).forEach(category => {
    counts[category] = 0;
  });
  counts.other = 0;
  
  documents.forEach(doc => {
    const docCategory = doc.category?.toLowerCase() || '';
    let categorized = false;
    
    // Check against category mappings
    for (const [mainCategory, mappings] of Object.entries(CATEGORY_MAPPINGS)) {
      if (mappings.some(mapping => 
        mapping === docCategory || 
        (mapping && docCategory.includes(mapping)) ||
        (mainCategory === 'personal' && (!docCategory || docCategory === 'document'))
      )) {
        counts[mainCategory]++;
        categorized = true;
        break;
      }
    }
    
    // If not categorized, check if it's a custom category or 'other'
    if (!categorized) {
      if (docCategory === 'other' || !PREDEFINED_CATEGORIES.includes(docCategory)) {
        counts.other++;
      } else {
        // Custom category
        counts[docCategory] = (counts[docCategory] || 0) + 1;
      }
    }
  });
  
  return counts;
};

// Compute document statistics
const computeDocumentStats = (documents: Document[]): DocumentStats => {
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  
  const recentDocuments = documents.filter(doc => {
    const uploadDate = doc.uploadedAt?.toDate ? doc.uploadedAt.toDate() : new Date(doc.uploadedAt);
    return uploadDate >= oneWeekAgo;
  });
  
  const processingDocuments = documents.filter(doc => doc.status === 'processing');
  
  const lowConfidenceDocuments = documents.filter(doc => 
    doc.metadata?.classificationConfidence && 
    doc.metadata.classificationConfidence < 0.6
  );
  
  const totalSize = documents.reduce((total, doc) => total + (doc.size || 0), 0);
  
  const uniqueCategories = documents
    .map(doc => doc.category)
    .filter(Boolean)
    .filter((category, index, arr) => arr.indexOf(category) === index);
  
  return {
    totalDocuments: documents.length,
    categoriesCount: uniqueCategories.length,
    recentDocuments: recentDocuments.length,
    processingDocuments: processingDocuments.length,
    lowConfidenceDocuments: lowConfidenceDocuments.length,
    totalSize
  };
};

// Create context
const DocumentContext = createContext<DocumentContextValue | undefined>(undefined);

// Provider component
interface DocumentProviderProps {
  children: React.ReactNode;
}

export const DocumentProvider: React.FC<DocumentProviderProps> = ({ children }) => {
  const { currentUser } = useAuth();
  
  const {
    data: documents = [],
    isLoading,
    error,
    refetch
  } = useQuery(
    ['documents', currentUser?.uid],
    () => getDocuments(currentUser?.uid || ''),
    {
      enabled: !!currentUser?.uid,
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchInterval: false, // Only refetch on focus/mount
      refetchOnWindowFocus: true,
      retry: 1,
    }
  );
  
  // Memoize expensive computations
  const categoryCounts = useMemo(() => computeCategoryCounts(documents), [documents]);
  const stats = useMemo(() => computeDocumentStats(documents), [documents]);
  
  const value: DocumentContextValue = {
    documents,
    isLoading,
    error: error as Error | null,
    categoryCounts,
    stats,
    refetch
  };
  
  return (
    <DocumentContext.Provider value={value}>
      {children}
    </DocumentContext.Provider>
  );
};

// Hook to use the context
export const useDocuments = (): DocumentContextValue => {
  const context = useContext(DocumentContext);
  if (context === undefined) {
    throw new Error('useDocuments must be used within a DocumentProvider');
  }
  return context;
};

// Utility functions for category operations
export const getCategoryCount = (categoryCounts: CategoryCount, category: string): number => {
  return categoryCounts[category.toLowerCase()] || 0;
};

export const getCustomCategoriesCount = (categoryCounts: CategoryCount): number => {
  const predefinedCategories = Object.keys(CATEGORY_MAPPINGS).concat(['other']);
  return Object.entries(categoryCounts)
    .filter(([category]) => !predefinedCategories.includes(category))
    .reduce((total, [, count]) => total + count, 0);
};

export const formatBytes = (bytes: number, decimals = 2): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};