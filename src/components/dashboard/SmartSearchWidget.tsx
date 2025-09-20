import React, { useState, useRef, useEffect } from 'react';
import { Search, Filter, X, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
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

const SmartSearchWidget: React.FC<SmartSearchWidgetProps> = ({ onSearch, className, documents = [] }) => {
  const [query, setQuery] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({});
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { translate } = useLanguage();

  useEffect(() => {
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

      setSuggestions([...documentSuggestions, ...categorySuggestions]);
    } else {
      // Show popular categories when no query
      const categories = Array.from(new Set(documents.map(d => d.category).filter(Boolean)));
      const categorySuggestions = categories.slice(0, 4).map(cat => ({
        type: 'category' as const,
        value: cat,
        icon: <FileText className="w-4 h-4 text-gray-500" />,
        description: 'Category'
      }));
      setSuggestions(categorySuggestions);
    }
  }, [query, documents]);

  const handleSearch = (searchQuery: string = query) => {
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
  };

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    setQuery(suggestion.value);
    handleSearch(suggestion.value);
  };

  const clearFilters = () => {
    setFilters({});
  };

  const hasActiveFilters = Object.values(filters).some(value => 
    value && (Array.isArray(value) ? value.length > 0 : true)
  );

  return (
    <div className={`relative ${className}`}>
      <Card variant="glass" className="overflow-visible">
        <div className="relative">
          {/* Search Input */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
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
              placeholder="Search documents, categories, or tags..."
              className="w-full pl-10 sm:pl-12 pr-16 sm:pr-20 py-3 sm:py-4 bg-transparent border-0 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-0 text-base sm:text-lg"
            />
            <div className="absolute inset-y-0 right-0 flex items-center space-x-1 sm:space-x-2 pr-3 sm:pr-4">
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  title="Clear filters"
                >
                  <X className="w-3 h-3 sm:w-4 sm:h-4" />
                </button>
              )}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`p-1.5 sm:p-2 rounded-lg transition-colors ${
                  showFilters || hasActiveFilters
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                    : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                }`}
                title="Filters"
              >
                <Filter className="w-3 h-3 sm:w-4 sm:h-4" />
              </button>
            </div>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="absolute top-full left-0 right-0 mt-2 z-10">
              <Card variant="floating" className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Category Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Category
                    </label>
                    <select
                      value={filters.category || ''}
                      onChange={(e) => setFilters({...filters, category: e.target.value || undefined})}
                      className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
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
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Date Range
                    </label>
                    <select
                      value={filters.dateRange || ''}
                      onChange={(e) => setFilters({...filters, dateRange: e.target.value || undefined})}
                      className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
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
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      File Type
                    </label>
                    <select
                      value={filters.fileType || ''}
                      onChange={(e) => setFilters({...filters, fileType: e.target.value || undefined})}
                      className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
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
          {isExpanded && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 z-0">
              <Card variant="floating" className="py-2">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    {suggestion.icon}
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {suggestion.value}
                      </div>
                      {suggestion.description && (
                        <div className="text-sm text-gray-500 dark:text-gray-400">
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
          className="fixed inset-0 z-0"
          onClick={() => {
            setIsExpanded(false);
            setShowFilters(false);
          }}
        />
      )}
    </div>
  );
};

export default SmartSearchWidget;