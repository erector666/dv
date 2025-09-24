import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { 
  FileText, 
  DollarSign, 
  Heart, 
  Shield, 
  FolderOpen 
} from 'lucide-react';
import { Card } from '../ui';
import { DocumentStats } from '../../hooks/useOptimizedDocuments';

export interface DashboardCategoriesProps {
  documentStats: DocumentStats;
  getCategoryCount: (category: string) => number;
  className?: string;
}

export const DashboardCategories: React.FC<DashboardCategoriesProps> = ({
  documentStats,
  getCategoryCount,
  className = '',
}) => {
  const navigate = useNavigate();
  const { translate } = useLanguage();

  // Memoized categories to prevent unnecessary re-renders
  const categories = useMemo(() => [
    {
      key: 'personal',
      icon: FileText,
      variant: 'glassPurple' as const,
      color: 'purple',
    },
    {
      key: 'bills',
      icon: DollarSign,
      variant: 'neonGreen' as const,
      color: 'green',
    },
    {
      key: 'medical',
      icon: Heart,
      variant: 'gradientSunset' as const,
      color: 'red',
    },
    {
      key: 'insurance',
      icon: Shield,
      variant: 'neonBlue' as const,
      color: 'blue',
    },
    {
      key: 'other',
      icon: FolderOpen,
      variant: 'glass' as const,
      color: 'gray',
    },
  ], []);

  const handleCategoryClick = (category: string) => {
    navigate(`/category/${category}`);
  };

  return (
    <Card variant="floating" className={`mb-8 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center space-x-3">
          <FolderOpen className="w-6 h-6 text-indigo-600" />
          <span>Document Categories</span>
        </h2>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {documentStats.totalDocuments} documents organized
        </div>
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {categories.map(({ key, icon: IconComponent, variant, color }) => {
          const categoryKey = key || 'unknown';
          const categoryName = translate(categoryKey) || categoryKey;
          const count = getCategoryCount(categoryKey);

          return (
            <div
              key={`category-${categoryKey}`}
              onClick={() => handleCategoryClick(categoryKey)}
              className="group cursor-pointer"
            >
              <Card
                variant={variant}
                className="h-24 sm:h-32 flex flex-col items-center justify-center text-center active:scale-95 hover:scale-105 transition-all duration-300 touch-manipulation"
              >
                <div className="mb-1 sm:mb-2 group-active:scale-95 group-hover:scale-110 transition-transform duration-200">
                  <IconComponent className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div>
                  <p className={`text-base sm:text-lg font-bold mb-1 ${
                    variant?.includes('neon') || variant?.includes('gradient') 
                      ? 'text-white' 
                      : 'text-gray-900 dark:text-white'
                  }`}>
                    {count}
                  </p>
                  <p className={`text-xs font-medium ${
                    variant?.includes('neon') || variant?.includes('gradient')
                      ? 'text-gray-200'
                      : 'text-gray-600 dark:text-gray-400'
                  }`}>
                    {categoryName}
                  </p>
                </div>
              </Card>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

export default DashboardCategories;