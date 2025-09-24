import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  DollarSign,
  GraduationCap,
  Scale,
  Building2,
  Heart,
  Shield,
  FolderOpen,
  ChevronDown,
  Search,
  Edit3,
  Palette,
  EyeOff,
  Trash2,
} from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';
import { useDocuments, getCategoryCount, getCustomCategoriesCount } from '../../../context/DocumentContext';
import NavigationItem from './NavigationItem';

interface Category {
  id: string;
  label: string;
  icon: any; // More flexible type to support both LucideIcon and ComponentType
  path: string;
  color: string;
  priority: 'primary' | 'secondary' | 'tertiary';
}

const PREDEFINED_CATEGORIES: Category[] = [
  {
    id: 'personal',
    label: 'Personal',
    icon: FileText,
    path: '/category/personal',
    color: 'text-blue-500 dark:text-blue-400',
    priority: 'primary'
  },
  {
    id: 'financial',
    label: 'Financial',
    icon: DollarSign,
    path: '/category/financial',
    color: 'text-green-500 dark:text-green-400',
    priority: 'primary'
  },
  {
    id: 'education',
    label: 'Education',
    icon: GraduationCap,
    path: '/category/education',
    color: 'text-purple-500 dark:text-purple-400',
    priority: 'secondary'
  },
  {
    id: 'legal',
    label: 'Legal',
    icon: Scale,
    path: '/category/legal',
    color: 'text-amber-500 dark:text-amber-400',
    priority: 'secondary'
  },
  {
    id: 'government',
    label: 'Government',
    icon: Building2,
    path: '/category/government',
    color: 'text-indigo-500 dark:text-indigo-400',
    priority: 'secondary'
  },
  {
    id: 'medical',
    label: 'Medical',
    icon: Heart,
    path: '/category/medical',
    color: 'text-red-500 dark:text-red-400',
    priority: 'secondary'
  },
  {
    id: 'insurance',
    label: 'Insurance',
    icon: Shield,
    path: '/category/insurance',
    color: 'text-cyan-500 dark:text-cyan-400',
    priority: 'secondary'
  },
  {
    id: 'other',
    label: 'Other',
    icon: FolderOpen,
    path: '/category/other',
    color: 'text-gray-500 dark:text-gray-400',
    priority: 'tertiary'
  }
];

interface SidebarCategoriesProps {
  onItemClick?: () => void;
}

const SidebarCategories: React.FC<SidebarCategoriesProps> = React.memo(({ onItemClick }) => {
  const { translate } = useLanguage();
  const { categoryCounts, isLoading } = useDocuments();
  const [searchQuery, setSearchQuery] = useState('');
  const [showSecondary, setShowSecondary] = useState(true);
  const [showTertiary, setShowTertiary] = useState(false);

  // Filter categories based on search query
  const filteredCategories = PREDEFINED_CATEGORIES.filter(category =>
    category.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    translate(category.id).toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group categories by priority
  const primaryCategories = filteredCategories.filter(cat => cat.priority === 'primary');
  const secondaryCategories = filteredCategories.filter(cat => cat.priority === 'secondary');
  const tertiaryCategories = filteredCategories.filter(cat => cat.priority === 'tertiary');

  const customCategoriesCount = getCustomCategoriesCount(categoryCounts);

  // Context menu handlers
  const handleRenameCategory = (categoryId: string) => {
    console.log('Rename category:', categoryId);
    // TODO: Implement category renaming
  };

  const handleChangeColor = (categoryId: string) => {
    console.log('Change color for category:', categoryId);
    // TODO: Implement color picker
  };

  const handleHideCategory = (categoryId: string) => {
    console.log('Hide category:', categoryId);
    // TODO: Implement category hiding
  };

  const handleDeleteCategory = (categoryId: string) => {
    console.log('Delete category:', categoryId);
    // TODO: Implement category deletion
  };

  // Generate context menu items for categories
  const getCategoryContextMenu = (category: Category) => {
    const isCustomCategory = !PREDEFINED_CATEGORIES.some(cat => cat.id === category.id);
    
    return {
      items: [
        {
          id: 'rename',
          label: 'Rename category',
          icon: Edit3,
          onClick: () => handleRenameCategory(category.id),
          disabled: !isCustomCategory
        },
        {
          id: 'color',
          label: 'Change color',
          icon: Palette,
          onClick: () => handleChangeColor(category.id)
        },
        {
          id: 'hide',
          label: 'Hide category',
          icon: EyeOff,
          onClick: () => handleHideCategory(category.id),
          divider: true
        },
        {
          id: 'delete',
          label: 'Delete category',
          icon: Trash2,
          onClick: () => handleDeleteCategory(category.id),
          disabled: !isCustomCategory,
          destructive: true
        }
      ]
    };
  };

  return (
    <div className="space-y-4">
      {/* Categories Header */}
      <div className="flex items-center justify-between px-2">
        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          {translate('categories')}
        </span>
        <span className="text-xs text-gray-400 dark:text-gray-500">
          {Object.values(categoryCounts).reduce((sum, count) => sum + count, 0)}
        </span>
      </div>

      {/* Search Categories */}
      <div className="px-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search categories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors"
            aria-label="Search categories"
          />
        </div>
      </div>

      {/* Primary Categories (Always Visible) */}
      <div className="space-y-1">
        {primaryCategories.map(category => (
          <NavigationItem
            key={category.id}
            id={category.id}
            label={translate(category.id) || category.label}
            icon={category.icon}
            path={category.path}
            count={getCategoryCount(categoryCounts, category.id)}
            color={category.color}
            isLoading={isLoading}
            onClick={onItemClick}
            contextMenu={getCategoryContextMenu(category)}
          />
        ))}
      </div>

      {/* Secondary Categories (Collapsible) */}
      {secondaryCategories.length > 0 && (
        <div className="space-y-1">
          <button
            onClick={() => setShowSecondary(!showSecondary)}
            className="flex items-center justify-between w-full px-2 py-1 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            aria-expanded={showSecondary}
            aria-controls="secondary-categories"
          >
            <span>More Categories</span>
            <ChevronDown
              className={`h-4 w-4 transition-transform duration-200 ${
                showSecondary ? 'rotate-180' : ''
              }`}
            />
          </button>
          
          <AnimatePresence>
            {showSecondary && (
              <motion.div
                id="secondary-categories"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-1 overflow-hidden"
              >
                {secondaryCategories.map(category => (
                  <NavigationItem
                    key={category.id}
                    id={category.id}
                    label={translate(category.id) || category.label}
                    icon={category.icon}
                    path={category.path}
                    count={getCategoryCount(categoryCounts, category.id)}
                    color={category.color}
                    isLoading={isLoading}
                    onClick={onItemClick}
                    contextMenu={getCategoryContextMenu(category)}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Tertiary Categories (Other, Custom) */}
      {(tertiaryCategories.length > 0 || customCategoriesCount > 0) && (
        <div className="space-y-1">
          <button
            onClick={() => setShowTertiary(!showTertiary)}
            className="flex items-center justify-between w-full px-2 py-1 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            aria-expanded={showTertiary}
            aria-controls="tertiary-categories"
          >
            <span>Other & Custom</span>
            <ChevronDown
              className={`h-4 w-4 transition-transform duration-200 ${
                showTertiary ? 'rotate-180' : ''
              }`}
            />
          </button>
          
          <AnimatePresence>
            {showTertiary && (
              <motion.div
                id="tertiary-categories"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-1 overflow-hidden"
              >
                {tertiaryCategories.map(category => (
                  <NavigationItem
                    key={category.id}
                    id={category.id}
                    label={translate(category.id) || category.label}
                    icon={category.icon}
                    path={category.path}
                    count={getCategoryCount(categoryCounts, category.id)}
                    color={category.color}
                    isLoading={isLoading}
                    onClick={onItemClick}
                    contextMenu={getCategoryContextMenu(category)}
                  />
                ))}
                
                {/* Custom Categories */}
                {customCategoriesCount > 0 && (
                  <NavigationItem
                    id="custom"
                    label="Custom"
                    icon={({ className }: { className?: string }) => (
                      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                    )}
                    path="/category/custom"
                    count={customCategoriesCount}
                    color="text-pink-500 dark:text-pink-400"
                    isLoading={isLoading}
                    onClick={onItemClick}
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* No Results */}
      {searchQuery && filteredCategories.length === 0 && (
        <div className="px-2 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
          No categories found for "{searchQuery}"
        </div>
      )}
    </div>
  );
});

SidebarCategories.displayName = 'SidebarCategories';

export default SidebarCategories;