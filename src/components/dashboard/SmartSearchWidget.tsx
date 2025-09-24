import React, { useState, useRef, useMemo, useCallback } from 'react';
import { Search, Filter, X, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../ui';

interface SmartSearchWidgetProps {
  onSearch?: (query: string, filters: SearchFilters) => void;
  className?: string;
  documents?: any[];
}

interface SearchFilters {
  category?: string;
  dateRange?: string;
  fileType?: string;
  tags?: string[];
}

interface SearchSuggestion {
  type: 'recent' | 'category' | 'tag' | 'document';
  value: string;
  icon: React.ReactNode;
  description?: string;
}

const SmartSearchWidget: React.FC<SmartSearchWidgetProps> = React.memo(({ onSearch, className, documents = [] }) => {
  const [query, setQuery] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({});
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Memoize suggestions to prevent infinite re-renders
  const suggestions = useMemo(() => {
    if (query.length > 0) {
      // Create suggestions from actual document data
      const documentSuggestions: SearchSuggestion[] = documents
        .filter(doc => doc.name.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 3)
        .map(doc => ({
          type: 'document' as const,
          value: doc.name,
          icon: <FileText className="w-4 h-4 text-blue-500" />,
          description: 'Document'
        }));

      // Add category suggestions
      const categories = Array.from(new Set(documents.map(d => d.category).filter(Boolean)));
      const categorySuggestions: SearchSuggestion[] = categories
        .filter(cat => cat.toLowerCase().includes(query.toLowerCase()))
        .slice(0, 2)
        .map(cat => ({
          type: 'category' as const,
          value: cat,
          icon: <FileText className="w-4 h-4 text-purple-500" />,
          description: 'Category'
        }));

      return [...documentSuggestions, ...categorySuggestions];
    } else {
      // Don't show suggestions when there's no query
      return [];
    }
  }, [query, documents]);

  const handleSearch = useCallback((searchQuery: string = query) => {
    if (searchQuery.trim()) {
      if (onSearch) {
        onSearch(searchQuery, filters);
      } else {
        // Navigate to search page with query and filters
        const searchParams = new URLSearchParams();
        searchParams.set('q', searchQuery);
        if (filters.category) searchParams.set('category', filters.category);
        if (filters.dateRange) searchParams.set('date', filters.dateRange);
        if (filters.fileType) searchParams.set('type', filters.fileType);
        if (filters.tags && filters.tags.length > 0) {
          searchParams.set('tags', filters.tags.join(','));
        }
        navigate(`/search?${searchParams.toString()}`);
      }
    }
    setIsExpanded(false);
  }, [query, filters, onSearch, navigate]);

  const handleSuggestionClick = useCallback((suggestion: SearchSuggestion) => {
    setQuery(suggestion.value);
    handleSearch(suggestion.value);
  }, [handleSearch]);

  const clearFilters = useCallback(() => {
    setFilters({});
  }, []);

  const hasActiveFilters = Object.values(filters).some(value => 
    value && (Array.isArray(value) ? value.length > 0 : true)
  );

  return (
        <div ref={containerRef} className={`relative z-20 max-w-sm mx-auto ${className}`}>
          <Card variant="glass" className="overflow-visible relative z-20 rounded-md p-0.5 h-7">
        <div className="relative h-full">
          {/* Search Input */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-1.5 flex items-center pointer-events-none">
              <Search className="h-3.5 w-3.5 text-gray-400" />
            </div>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setIsExpanded(true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSearch();
                } else if (e.key === 'Escape') {
                  setIsExpanded(false);
                  inputRef.current?.blur();
                }
              }}
              placeholder="Search documents..."
              className="w-full h-full pl-5 pr-6 py-0 bg-transparent border-0 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-0 text-xs"
            />
            <div className="absolute inset-y-0 right-0 flex items-center space-x-0.5 pr-1">
              {query.length > 0 && (
                <button
                  onClick={() => {
                    setQuery('');
                    setIsExpanded(false);
                    inputRef.current?.focus();
                  }}
                  className="p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 min-w-[16px] min-h-[16px] flex items-center justify-center"
                  title="Clear search"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              )}
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 min-w-[16px] min-h-[16px] flex items-center justify-center"
                  title="Clear filters"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              )}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`p-0.5 rounded transition-colors min-w-[16px] min-h-[16px] flex items-center justify-center ${
                  showFilters || hasActiveFilters
                    ? 'bg-spotify-green/20 text-spotify-green'
                    : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                }`}
                title="Filters"
              >
                <Filter className="w-2.5 h-2.5" />
              </button>
            </div>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="absolute top-full left-0 right-0 mt-2 z-30">
              <Card variant="floating" className="p-2">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  {/* Category Filter */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Category
                    </label>
                    <select
                      value={filters.category || ''}
                      onChange={(e) => setFilters({...filters, category: e.target.value || undefined})}
                      className="w-full px-2 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white focus:ring-2 focus:ring-spotify-green text-xs"
                    >
                      <option value="">All Categories</option>
                      <option value="personal">Personal</option>
                      <option value="bills">Bills</option>
                      <option value="medical">Medical</option>
                      <option value="insurance">Insurance</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  {/* Date Range Filter */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Date Range
                    </label>
                    <select
                      value={filters.dateRange || ''}
                      onChange={(e) => setFilters({...filters, dateRange: e.target.value || undefined})}
                      className="w-full px-2 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white focus:ring-2 focus:ring-spotify-green text-xs"
                    >
                      <option value="">All Time</option>
                      <option value="today">Today</option>
                      <option value="week">This Week</option>
                      <option value="month">This Month</option>
                      <option value="year">This Year</option>
                    </select>
                  </div>

                  {/* File Type Filter */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      File Type
                    </label>
                    <select
                      value={filters.fileType || ''}
                      onChange={(e) => setFilters({...filters, fileType: e.target.value || undefined})}
                      className="w-full px-2 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white focus:ring-2 focus:ring-spotify-green text-xs"
                    >
                      <option value="">All Types</option>
                      <option value="pdf">PDF</option>
                      <option value="image">Images</option>
                      <option value="document">Documents</option>
                    </select>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Search Suggestions */}
          {isExpanded && query.length > 0 && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 z-30">
              <Card variant="floating" className="py-2">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="w-full flex items-center space-x-2 px-2 py-1.5 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors min-h-[32px]"
                  >
                    {suggestion.icon}
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 dark:text-white text-xs">
                        {suggestion.value}
                      </div>
                      {suggestion.description && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {suggestion.description}
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </Card>
            </div>
          )}
        </div>
      </Card>

      {/* Click outside to close */}
      {(isExpanded || showFilters) && (
        <div
          className="fixed inset-0 z-10"
          onClick={(e) => {
            // Only close if clicking outside the search widget
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
              setIsExpanded(false);
              setShowFilters(false);
            }
          }}
        />
      )}
    </div>
  );
});

SmartSearchWidget.displayName = 'SmartSearchWidget';

export default SmartSearchWidget;