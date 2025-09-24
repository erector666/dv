import { useState, useMemo, useCallback } from 'react';
import { useQuery } from 'react-query';
import { Document } from '../services/documentService';

export interface SearchFilters {
  query: string;
  categories: string[];
  dateRange: {
    start?: Date;
    end?: Date;
    preset?: 'today' | 'week' | 'month' | 'year' | 'custom';
  };
  tags: string[];
  fileTypes: string[];
  fileSize: {
    min?: number;
    max?: number;
  };
  sortBy: 'relevance' | 'date' | 'name' | 'size';
  sortOrder: 'asc' | 'desc';
  includeContent: boolean;
  fuzzySearch: boolean;
}

export interface SearchResult {
  document: Document;
  relevanceScore: number;
  matchedFields: string[];
  highlights: {
    field: string;
    text: string;
    start: number;
    end: number;
  }[];
}

export interface SearchStats {
  totalResults: number;
  searchTime: number;
  categories: Record<string, number>;
  fileTypes: Record<string, number>;
  dateRange: {
    earliest: Date;
    latest: Date;
  };
}

const defaultFilters: SearchFilters = {
  query: '',
  categories: [],
  dateRange: { preset: 'year' },
  tags: [],
  fileTypes: [],
  fileSize: {},
  sortBy: 'relevance',
  sortOrder: 'desc',
  includeContent: true,
  fuzzySearch: false,
};

/**
 * Advanced search functionality with full-text search, filtering, and analytics
 */
export const useAdvancedSearch = (documents: Document[] = []) => {
  const [filters, setFilters] = useState<SearchFilters>(defaultFilters);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [savedSearches, setSavedSearches] = useState<Array<{
    id: string;
    name: string;
    filters: SearchFilters;
    createdAt: Date;
  }>>([]);

  // Memoized search function with comprehensive scoring
  const searchResults = useMemo(() => {
    if (!filters.query.trim() && filters.categories.length === 0 && filters.tags.length === 0) {
      return {
        results: [],
        stats: {
          totalResults: 0,
          searchTime: 0,
          categories: {},
          fileTypes: {},
          dateRange: { earliest: new Date(), latest: new Date() },
        } as SearchStats,
      };
    }

    const startTime = performance.now();
    const query = filters.query.toLowerCase().trim();
    const searchTerms = query.split(/\s+/).filter(term => term.length > 0);

    const results: SearchResult[] = documents
      .map(document => {
        let relevanceScore = 0;
        const matchedFields: string[] = [];
        const highlights: SearchResult['highlights'] = [];

        // Apply date range filter first
        if (filters.dateRange.start || filters.dateRange.end) {
          const docDate = document.uploadedAt?.toDate?.() || new Date(document.uploadedAt || 0);
          if (filters.dateRange.start && docDate < filters.dateRange.start) return null;
          if (filters.dateRange.end && docDate > filters.dateRange.end) return null;
        }

        // Apply category filter
        if (filters.categories.length > 0) {
          if (!document.category || !filters.categories.includes(document.category)) {
            return null;
          }
        }

        // Apply file type filter
        if (filters.fileTypes.length > 0) {
          const matchesType = filters.fileTypes.some(type => {
            if (type === 'pdf') return document.type === 'application/pdf';
            if (type === 'image') return document.type.startsWith('image/');
            if (type === 'document') return document.type.includes('word') || document.type.includes('document');
            return document.type.includes(type);
          });
          if (!matchesType) return null;
        }

        // Apply file size filter
        if (filters.fileSize.min && document.size < filters.fileSize.min) return null;
        if (filters.fileSize.max && document.size > filters.fileSize.max) return null;

        // Apply tag filter
        if (filters.tags.length > 0) {
          const hasMatchingTag = filters.tags.some(filterTag =>
            document.tags?.some(docTag => 
              docTag.toLowerCase().includes(filterTag.toLowerCase())
            )
          );
          if (!hasMatchingTag) return null;
        }

        // Skip scoring if no search query
        if (!query) {
          return {
            document,
            relevanceScore: 1,
            matchedFields: [],
            highlights: [],
          };
        }

        // Name matching (highest priority)
        const nameMatch = document.name.toLowerCase();
        if (nameMatch.includes(query)) {
          relevanceScore += 100;
          matchedFields.push('name');
          
          const startIndex = nameMatch.indexOf(query);
          highlights.push({
            field: 'name',
            text: document.name.substring(startIndex, startIndex + query.length),
            start: startIndex,
            end: startIndex + query.length,
          });
        }

        // Individual term matching in name
        searchTerms.forEach(term => {
          if (nameMatch.includes(term)) {
            relevanceScore += 50;
          }
        });

        // Category matching
        if (document.category && document.category.toLowerCase().includes(query)) {
          relevanceScore += 30;
          matchedFields.push('category');
        }

        // Tag matching
        if (document.tags) {
          document.tags.forEach(tag => {
            if (tag.toLowerCase().includes(query)) {
              relevanceScore += 25;
              matchedFields.push('tags');
            }
          });
        }

        // Content matching (if enabled and available)
        if (filters.includeContent && document.metadata) {
          const contentFields = [
            'summary',
            'text',
            'extractedText',
            'content',
            'description'
          ];

          contentFields.forEach(field => {
            const content = document.metadata?.[field];
            if (typeof content === 'string') {
              const contentLower = content.toLowerCase();
              if (contentLower.includes(query)) {
                relevanceScore += 15;
                matchedFields.push(field);
                
                // Add content highlights
                const startIndex = contentLower.indexOf(query);
                const contextStart = Math.max(0, startIndex - 50);
                const contextEnd = Math.min(content.length, startIndex + query.length + 50);
                
                highlights.push({
                  field: field,
                  text: content.substring(contextStart, contextEnd),
                  start: startIndex - contextStart,
                  end: startIndex - contextStart + query.length,
                });
              }

              // Individual term matching in content
              searchTerms.forEach(term => {
                const termCount = (contentLower.match(new RegExp(term, 'g')) || []).length;
                relevanceScore += termCount * 5;
              });
            }
          });
        }

        // Fuzzy search bonus
        if (filters.fuzzySearch && relevanceScore === 0) {
          const fuzzyMatch = searchTerms.some(term => {
            return document.name.toLowerCase().includes(term.substring(0, Math.max(3, term.length - 1)));
          });
          if (fuzzyMatch) {
            relevanceScore += 10;
            matchedFields.push('fuzzy');
          }
        }

        // Boost for exact matches
        if (document.name.toLowerCase() === query) {
          relevanceScore += 200;
        }

        // Boost for recent documents
        const docDate = document.uploadedAt?.toDate?.() || new Date(document.uploadedAt || 0);
        const daysSinceUpload = (Date.now() - docDate.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceUpload < 30) {
          relevanceScore += Math.max(0, 20 - daysSinceUpload);
        }

        return relevanceScore > 0 ? {
          document,
          relevanceScore,
          matchedFields: [...new Set(matchedFields)],
          highlights,
        } : null;
      })
      .filter((result): result is SearchResult => result !== null);

    // Sort results
    results.sort((a, b) => {
      if (filters.sortBy === 'relevance') {
        return filters.sortOrder === 'desc' 
          ? b.relevanceScore - a.relevanceScore
          : a.relevanceScore - b.relevanceScore;
      }
      
      let aVal: any, bVal: any;
      switch (filters.sortBy) {
        case 'date':
          aVal = a.document.uploadedAt?.toDate?.() || new Date(a.document.uploadedAt || 0);
          bVal = b.document.uploadedAt?.toDate?.() || new Date(b.document.uploadedAt || 0);
          break;
        case 'name':
          aVal = a.document.name.toLowerCase();
          bVal = b.document.name.toLowerCase();
          break;
        case 'size':
          aVal = a.document.size || 0;
          bVal = b.document.size || 0;
          break;
        default:
          return 0;
      }
      
      const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return filters.sortOrder === 'desc' ? -comparison : comparison;
    });

    // Calculate stats
    const endTime = performance.now();
    const categories: Record<string, number> = {};
    const fileTypes: Record<string, number> = {};
    let earliest = new Date();
    let latest = new Date(0);

    results.forEach(({ document }) => {
      // Category stats
      const category = document.category || 'uncategorized';
      categories[category] = (categories[category] || 0) + 1;

      // File type stats
      let fileType = 'other';
      if (document.type === 'application/pdf') fileType = 'pdf';
      else if (document.type.startsWith('image/')) fileType = 'image';
      else if (document.type.includes('word')) fileType = 'document';
      
      fileTypes[fileType] = (fileTypes[fileType] || 0) + 1;

      // Date range stats
      const docDate = document.uploadedAt?.toDate?.() || new Date(document.uploadedAt || 0);
      if (docDate < earliest) earliest = docDate;
      if (docDate > latest) latest = docDate;
    });

    const stats: SearchStats = {
      totalResults: results.length,
      searchTime: endTime - startTime,
      categories,
      fileTypes,
      dateRange: { earliest, latest },
    };

    return { results, stats };
  }, [documents, filters]);

  // Update filters
  const updateFilters = useCallback((newFilters: Partial<SearchFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  }, []);

  // Reset filters
  const resetFilters = useCallback(() => {
    setFilters(defaultFilters);
  }, []);

  // Add to recent searches
  const addRecentSearch = useCallback((query: string) => {
    if (query.trim()) {
      setRecentSearches(prev => {
        const updated = [query, ...prev.filter(s => s !== query)].slice(0, 10);
        return updated;
      });
    }
  }, []);

  // Save search
  const saveSearch = useCallback((name: string) => {
    const savedSearch = {
      id: Date.now().toString(),
      name,
      filters: { ...filters },
      createdAt: new Date(),
    };
    setSavedSearches(prev => [...prev, savedSearch]);
    return savedSearch;
  }, [filters]);

  // Load saved search
  const loadSavedSearch = useCallback((searchId: string) => {
    const savedSearch = savedSearches.find(s => s.id === searchId);
    if (savedSearch) {
      setFilters(savedSearch.filters);
    }
  }, [savedSearches]);

  // Delete saved search
  const deleteSavedSearch = useCallback((searchId: string) => {
    setSavedSearches(prev => prev.filter(s => s.id !== searchId));
  }, []);

  // Get search suggestions
  const getSearchSuggestions = useCallback((query: string) => {
    const suggestions: string[] = [];
    const queryLower = query.toLowerCase();

    // Add recent searches that match
    recentSearches.forEach(search => {
      if (search.toLowerCase().includes(queryLower)) {
        suggestions.push(search);
      }
    });

    // Add document names that match
    documents.forEach(doc => {
      if (doc.name.toLowerCase().includes(queryLower) && 
          !suggestions.includes(doc.name) && 
          suggestions.length < 10) {
        suggestions.push(doc.name);
      }
    });

    // Add categories that match
    const categories = [...new Set(documents.map(d => d.category).filter(Boolean))];
    categories.forEach(category => {
      if (category!.toLowerCase().includes(queryLower) && 
          !suggestions.includes(category!) && 
          suggestions.length < 10) {
        suggestions.push(category!);
      }
    });

    return suggestions.slice(0, 8);
  }, [documents, recentSearches]);

  return {
    // Search results
    results: searchResults.results,
    stats: searchResults.stats,
    
    // Filters
    filters,
    updateFilters,
    resetFilters,
    
    // Search management
    recentSearches,
    savedSearches,
    addRecentSearch,
    saveSearch,
    loadSavedSearch,
    deleteSavedSearch,
    getSearchSuggestions,
    
    // Utilities
    isSearchActive: filters.query.trim().length > 0 || 
                   filters.categories.length > 0 || 
                   filters.tags.length > 0,
  };
};