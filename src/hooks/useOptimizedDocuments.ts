import { useMemo, useCallback } from 'react';
import { useQuery } from 'react-query';
import { Document } from '../services/documentService';

export interface DocumentFilters {
  category?: string;
  search?: string;
  tags?: string[];
  dateRange?: string;
  fileType?: string;
  sortBy?: 'name' | 'date' | 'size' | 'category';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface DocumentStats {
  totalDocuments: number;
  totalSize: number;
  recentDocuments: number;
  categoryCounts: Record<string, number>;
  processingCount: number;
  averageFileSize: number;
  mostUsedCategory: string;
  weeklyGrowth: number;
}

/**
 * Optimized hook for document management with efficient filtering and stats calculation
 */
export const useOptimizedDocuments = (
  userId: string,
  filters: DocumentFilters = {}
) => {
  // Memoize filter key for stable query key
  const filterKey = useMemo(() => {
    return JSON.stringify(filters);
  }, [filters]);

  // Main documents query with server-side filtering (simulated)
  const documentsQuery = useQuery(
    ['documents', userId, filterKey],
    async () => {
      // In a real implementation, this would be server-side filtering
      // For now, we'll simulate it with client-side optimization
      const { getDocuments } = await import('../services/documentService');
      const allDocuments = await getDocuments(userId);
      
      // Apply filters efficiently
      let filtered = allDocuments;
      
      if (filters.category && filters.category !== 'all') {
        filtered = filtered.filter(doc => {
          const docCategory = doc.category?.toLowerCase() || '';
          const filterCategory = filters.category!.toLowerCase();
          
          // Handle category mappings
          if (filterCategory === 'personal' && (!docCategory || docCategory === 'document')) {
            return true;
          }
          if (filterCategory === 'financial') {
            return ['financial', 'finance', 'bills'].some(cat => docCategory.includes(cat));
          }
          if (filterCategory === 'bills') {
            return ['bills', 'financial', 'finance'].some(cat => docCategory.includes(cat));
          }
          
          return docCategory === filterCategory;
        });
      }

      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        filtered = filtered.filter(doc => 
          doc.name.toLowerCase().includes(searchLower) ||
          doc.tags?.some(tag => tag.toLowerCase().includes(searchLower)) ||
          doc.category?.toLowerCase().includes(searchLower) ||
          doc.metadata?.summary?.toLowerCase().includes(searchLower)
        );
      }

      if (filters.tags && filters.tags.length > 0) {
        filtered = filtered.filter(doc =>
          filters.tags!.some(filterTag =>
            doc.tags?.some(docTag => docTag.toLowerCase().includes(filterTag.toLowerCase()))
          )
        );
      }

      if (filters.fileType) {
        filtered = filtered.filter(doc => {
          if (filters.fileType === 'pdf') return doc.type === 'application/pdf';
          if (filters.fileType === 'image') return doc.type.startsWith('image/');
          if (filters.fileType === 'document') return doc.type.includes('word') || doc.type.includes('document');
          return true;
        });
      }

      if (filters.dateRange) {
        const now = new Date();
        const filterDate = new Date();
        
        switch (filters.dateRange) {
          case 'today':
            filterDate.setHours(0, 0, 0, 0);
            break;
          case 'week':
            filterDate.setDate(now.getDate() - 7);
            break;
          case 'month':
            filterDate.setMonth(now.getMonth() - 1);
            break;
          case 'year':
            filterDate.setFullYear(now.getFullYear() - 1);
            break;
          default:
            filterDate.setFullYear(1970);
        }
        
        filtered = filtered.filter(doc => {
          const docDate = doc.uploadedAt?.toDate?.() || new Date(doc.uploadedAt || 0);
          return docDate >= filterDate;
        });
      }

      // Apply sorting
      if (filters.sortBy) {
        filtered.sort((a, b) => {
          let aVal: any, bVal: any;
          
          switch (filters.sortBy) {
            case 'name':
              aVal = a.name.toLowerCase();
              bVal = b.name.toLowerCase();
              break;
            case 'date':
              aVal = a.uploadedAt?.toDate?.() || new Date(a.uploadedAt || 0);
              bVal = b.uploadedAt?.toDate?.() || new Date(b.uploadedAt || 0);
              break;
            case 'size':
              aVal = a.size || 0;
              bVal = b.size || 0;
              break;
            case 'category':
              aVal = a.category || '';
              bVal = b.category || '';
              break;
            default:
              return 0;
          }
          
          const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
          return filters.sortOrder === 'desc' ? -comparison : comparison;
        });
      }

      // Apply pagination
      const startIndex = (filters.page || 0) * (filters.limit || 50);
      const endIndex = startIndex + (filters.limit || 50);
      const paginatedResults = filtered.slice(startIndex, endIndex);

      return {
        documents: paginatedResults,
        total: filtered.length,
        hasMore: endIndex < filtered.length,
        allDocuments: allDocuments // For stats calculation
      };
    },
    {
      enabled: !!userId,
      staleTime: 30000, // 30 seconds
      cacheTime: 300000, // 5 minutes
      keepPreviousData: true,
    }
  );

  // Optimized stats calculation - memoized and cached
  const documentStats = useMemo((): DocumentStats => {
    const allDocuments = documentsQuery.data?.allDocuments || [];
    
    if (allDocuments.length === 0) {
      return {
        totalDocuments: 0,
        totalSize: 0,
        recentDocuments: 0,
        categoryCounts: {},
        processingCount: 0,
        averageFileSize: 0,
        mostUsedCategory: '',
        weeklyGrowth: 0,
      };
    }

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    // Single pass through documents for all calculations
    const stats = allDocuments.reduce(
      (acc, doc) => {
        acc.totalDocuments++;
        acc.totalSize += doc.size || 0;

        const uploadDate = doc.uploadedAt?.toDate?.() || new Date(doc.uploadedAt || 0);
        
        if (uploadDate > weekAgo) {
          acc.recentDocuments++;
        }
        
        if (uploadDate > twoWeeksAgo && uploadDate <= weekAgo) {
          acc.previousWeekDocuments++;
        }

        const category = doc.category || 'other';
        acc.categoryCounts[category] = (acc.categoryCounts[category] || 0) + 1;

        if (doc.status === 'processing') {
          acc.processingCount++;
        }

        return acc;
      },
      {
        totalDocuments: 0,
        totalSize: 0,
        recentDocuments: 0,
        previousWeekDocuments: 0,
        categoryCounts: {} as Record<string, number>,
        processingCount: 0,
      }
    );

    // Calculate derived stats
    const averageFileSize = stats.totalDocuments > 0 ? stats.totalSize / stats.totalDocuments : 0;
    const mostUsedCategory = Object.entries(stats.categoryCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || '';
    
    const weeklyGrowth = stats.previousWeekDocuments > 0 
      ? ((stats.recentDocuments - stats.previousWeekDocuments) / stats.previousWeekDocuments) * 100
      : stats.recentDocuments > 0 ? 100 : 0;

    return {
      totalDocuments: stats.totalDocuments,
      totalSize: stats.totalSize,
      recentDocuments: stats.recentDocuments,
      categoryCounts: stats.categoryCounts,
      processingCount: stats.processingCount,
      averageFileSize,
      mostUsedCategory,
      weeklyGrowth,
    };
  }, [documentsQuery.data?.allDocuments]);

  // Optimized category count getter
  const getCategoryCount = useCallback((category: string) => {
    return documentStats.categoryCounts[category] || 0;
  }, [documentStats.categoryCounts]);

  // Filter update function
  const updateFilters = useCallback((newFilters: Partial<DocumentFilters>) => {
    return { ...filters, ...newFilters };
  }, [filters]);

  return {
    // Data
    documents: documentsQuery.data?.documents || [],
    allDocuments: documentsQuery.data?.allDocuments || [],
    total: documentsQuery.data?.total || 0,
    hasMore: documentsQuery.data?.hasMore || false,
    documentStats,
    
    // Query state
    isLoading: documentsQuery.isLoading,
    isError: documentsQuery.isError,
    error: documentsQuery.error,
    isFetching: documentsQuery.isFetching,
    
    // Actions
    refetch: documentsQuery.refetch,
    getCategoryCount,
    updateFilters,
    
    // Current filters
    currentFilters: filters,
  };
};