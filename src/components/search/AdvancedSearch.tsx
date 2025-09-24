import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Filter, 
  X, 
  Calendar,
  FileType,
  Tag,
  FolderOpen,
  SlidersHorizontal
} from 'lucide-react';
import { Button, Card } from '../ui';
import { useDebounce } from '../../hooks/usePerformance';
import { clsx } from 'clsx';

interface SearchFilters {
  query: string;
  category: string;
  fileType: string;
  dateRange: string;
  sizeRange: string;
  tags: string[];
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

interface AdvancedSearchProps {
  onSearch: (filters: SearchFilters) => void;
  onClear: () => void;
  className?: string;
  placeholder?: string;
}

const AdvancedSearch: React.FC<AdvancedSearchProps> = ({
  onSearch,
  onClear,
  className,
  placeholder = "Search documents..."
}) => {
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    category: 'all',
    fileType: 'all',
    dateRange: 'all',
    sizeRange: 'all',
    tags: [],
    sortBy: 'date',
    sortOrder: 'desc'
  });

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const debouncedQuery = useDebounce(filters.query, 300);

  // Mock suggestions - in real app, this would come from API
  const mockSuggestions = [
    'invoice', 'receipt', 'contract', 'certificate', 'medical report',
    'tax document', 'insurance policy', 'bank statement', 'diploma'
  ];

  const updateFilter = useCallback((key: keyof SearchFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleQueryChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    updateFilter('query', value);
    
    // Generate suggestions
    if (value.length > 2) {
      const filtered = mockSuggestions.filter(s => 
        s.toLowerCase().includes(value.toLowerCase())
      );
      setSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setShowSuggestions(false);
    }
  }, [updateFilter]);

  const handleSearch = useCallback(() => {
    onSearch(filters);
    setShowSuggestions(false);
  }, [filters, onSearch]);

  const handleClear = useCallback(() => {
    setFilters({
      query: '',
      category: 'all',
      fileType: 'all',
      dateRange: 'all',
      sizeRange: 'all',
      tags: [],
      sortBy: 'date',
      sortOrder: 'desc'
    });
    setSuggestions([]);
    setShowSuggestions(false);
    onClear();
  }, [onClear]);

  const hasActiveFilters = Object.entries(filters).some(([key, value]) => {
    if (key === 'query') return value.length > 0;
    if (key === 'tags') return value.length > 0;
    if (key === 'sortBy') return value !== 'date';
    if (key === 'sortOrder') return value !== 'desc';
    return value !== 'all';
  });

  // Search on debounced query change
  React.useEffect(() => {
    if (debouncedQuery !== filters.query) return;
    handleSearch();
  }, [debouncedQuery, handleSearch, filters.query]);

  return (
    <div className={clsx('relative', className)}>
      <Card className="p-4">
        {/* Main search input */}
        <div className="relative">
          <div className="relative flex items-center">
            <Search className="absolute left-3 w-5 h-5 text-gray-400" aria-hidden="true" />
            <input
              type="search"
              value={filters.query}
              onChange={handleQueryChange}
              placeholder={placeholder}
              className="w-full pl-10 pr-20 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors"
              aria-label="Search documents"
              aria-describedby="search-help"
              autoComplete="off"
            />
            
            {/* Search actions */}
            <div className="absolute right-2 flex items-center space-x-1">
              {filters.query && (
                <button
                  onClick={() => updateFilter('query', '')}
                  className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className={clsx(
                  'p-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500',
                  showAdvanced || hasActiveFilters
                    ? 'text-primary-600 bg-primary-50 dark:bg-primary-900/20'
                    : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                )}
                aria-label="Toggle advanced search"
                aria-expanded={showAdvanced}
              >
                <SlidersHorizontal className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Search suggestions */}
          <AnimatePresence>
            {showSuggestions && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10"
                role="listbox"
                aria-label="Search suggestions"
              >
                {suggestions.map((suggestion, index) => (
                  <button
                    key={suggestion}
                    onClick={() => {
                      updateFilter('query', suggestion);
                      setShowSuggestions(false);
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 first:rounded-t-lg last:rounded-b-lg transition-colors focus:outline-none focus:bg-primary-50 dark:focus:bg-primary-900/20"
                    role="option"
                    aria-selected={false}
                  >
                    <div className="flex items-center">
                      <Search className="w-4 h-4 text-gray-400 mr-3" aria-hidden="true" />
                      <span className="text-gray-900 dark:text-white">{suggestion}</span>
                    </div>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Advanced filters */}
        <AnimatePresence>
          {showAdvanced && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Category filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      <FolderOpen className="w-4 h-4 inline mr-2" aria-hidden="true" />
                      Category
                    </label>
                    <select
                      value={filters.category}
                      onChange={(e) => updateFilter('category', e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      aria-label="Filter by category"
                    >
                      <option value="all">All Categories</option>
                      <option value="personal">Personal</option>
                      <option value="bills">Bills & Financial</option>
                      <option value="medical">Medical</option>
                      <option value="insurance">Insurance</option>
                      <option value="education">Education</option>
                    </select>
                  </div>

                  {/* File type filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      <FileType className="w-4 h-4 inline mr-2" aria-hidden="true" />
                      File Type
                    </label>
                    <select
                      value={filters.fileType}
                      onChange={(e) => updateFilter('fileType', e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      aria-label="Filter by file type"
                    >
                      <option value="all">All Types</option>
                      <option value="pdf">PDF</option>
                      <option value="image">Images</option>
                      <option value="document">Documents</option>
                      <option value="text">Text Files</option>
                    </select>
                  </div>

                  {/* Date range filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      <Calendar className="w-4 h-4 inline mr-2" aria-hidden="true" />
                      Date Range
                    </label>
                    <select
                      value={filters.dateRange}
                      onChange={(e) => updateFilter('dateRange', e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      aria-label="Filter by date range"
                    >
                      <option value="all">All Time</option>
                      <option value="today">Today</option>
                      <option value="week">This Week</option>
                      <option value="month">This Month</option>
                      <option value="year">This Year</option>
                    </select>
                  </div>

                  {/* Sort options */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Sort By
                    </label>
                    <div className="flex space-x-2">
                      <select
                        value={filters.sortBy}
                        onChange={(e) => updateFilter('sortBy', e.target.value)}
                        className="flex-1 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        aria-label="Sort by field"
                      >
                        <option value="date">Date</option>
                        <option value="name">Name</option>
                        <option value="size">Size</option>
                        <option value="type">Type</option>
                      </select>
                      <button
                        onClick={() => updateFilter('sortOrder', filters.sortOrder === 'asc' ? 'desc' : 'asc')}
                        className={clsx(
                          'px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500',
                          filters.sortOrder === 'desc'
                            ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                            : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                        )}
                        aria-label={`Sort ${filters.sortOrder === 'asc' ? 'ascending' : 'descending'}`}
                        title={`Currently sorting ${filters.sortOrder === 'asc' ? 'ascending' : 'descending'}`}
                      >
                        {filters.sortOrder === 'desc' ? '↓' : '↑'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Filter actions */}
                <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {hasActiveFilters && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-100 dark:bg-primary-900/20 text-primary-800 dark:text-primary-200">
                        <Filter className="w-3 h-3 mr-1" aria-hidden="true" />
                        Filters active
                      </span>
                    )}
                  </div>
                  
                  <div className="flex space-x-3">
                    {hasActiveFilters && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleClear}
                        ariaLabel="Clear all filters"
                        leftIcon={<X className="w-4 h-4" />}
                      >
                        Clear
                      </Button>
                    )}
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleSearch}
                      ariaLabel="Apply search filters"
                      leftIcon={<Search className="w-4 h-4" />}
                    >
                      Search
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Search help text */}
        <p id="search-help" className="text-xs text-gray-500 dark:text-gray-400 mt-2">
          Search by document name, content, or use filters for advanced search
        </p>
      </Card>

      {/* Active filters display */}
      {hasActiveFilters && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4"
        >
          <div className="flex flex-wrap gap-2">
            {Object.entries(filters).map(([key, value]) => {
              if (key === 'query' && value) {
                return (
                  <FilterChip
                    key={key}
                    label={`Search: "${value}"`}
                    onRemove={() => updateFilter('query', '')}
                  />
                );
              }
              if (key === 'category' && value !== 'all') {
                return (
                  <FilterChip
                    key={key}
                    label={`Category: ${value}`}
                    onRemove={() => updateFilter('category', 'all')}
                  />
                );
              }
              if (key === 'fileType' && value !== 'all') {
                return (
                  <FilterChip
                    key={key}
                    label={`Type: ${value}`}
                    onRemove={() => updateFilter('fileType', 'all')}
                  />
                );
              }
              if (key === 'dateRange' && value !== 'all') {
                return (
                  <FilterChip
                    key={key}
                    label={`Date: ${value}`}
                    onRemove={() => updateFilter('dateRange', 'all')}
                  />
                );
              }
              return null;
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
};

interface FilterChipProps {
  label: string;
  onRemove: () => void;
}

const FilterChip: React.FC<FilterChipProps> = ({ label, onRemove }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.8 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.8 }}
    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary-100 dark:bg-primary-900/20 text-primary-800 dark:text-primary-200"
  >
    <span>{label}</span>
    <button
      onClick={onRemove}
      className="ml-2 p-0.5 rounded-full hover:bg-primary-200 dark:hover:bg-primary-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
      aria-label={`Remove ${label} filter`}
    >
      <X className="w-3 h-3" />
    </button>
  </motion.div>
);

export default AdvancedSearch;