import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BarChart3, 
  ChevronDown, 
  FileText, 
  FolderOpen, 
  Clock, 
  Zap, 
  AlertTriangle,
  HardDrive
} from 'lucide-react';
import { useDocuments, formatBytes } from '../../../context/DocumentContext';

interface StatItemProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  color?: string;
  isLoading?: boolean;
}

const StatItem: React.FC<StatItemProps> = ({ 
  icon: Icon, 
  label, 
  value, 
  color = "text-gray-500 dark:text-gray-400",
  isLoading = false 
}) => (
  <div className="flex items-center justify-between py-1">
    <div className="flex items-center space-x-2">
      <Icon className={`h-4 w-4 ${color}`} />
      <span className="text-xs text-gray-600 dark:text-gray-300">{label}</span>
    </div>
    <div className="text-xs font-medium text-gray-900 dark:text-gray-100">
      {isLoading ? (
        <div className="w-8 h-3 bg-gray-200 dark:bg-gray-600 rounded animate-pulse" />
      ) : (
        value
      )}
    </div>
  </div>
);

interface SidebarStatsProps {
  isCompact?: boolean;
}

const SidebarStats: React.FC<SidebarStatsProps> = ({ isCompact = false }) => {
  const { stats, isLoading } = useDocuments();
  const [isExpanded, setIsExpanded] = useState(!isCompact);

  if (isCompact && stats.totalDocuments === 0) {
    return (
      <div className="p-4 text-center">
        <div className="text-gray-400 dark:text-gray-500 mb-2">
          <FileText className="h-8 w-8 mx-auto mb-1" />
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500">
          No documents yet. Upload your first file to get started!
        </p>
      </div>
    );
  }

  return (
    <div className="border-t border-gray-200 dark:border-gray-700">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        aria-expanded={isExpanded}
        aria-controls="sidebar-stats"
      >
        <div className="flex items-center space-x-2">
          <BarChart3 className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
            Quick Stats
          </span>
        </div>
        <ChevronDown
          className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${
            isExpanded ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Stats Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            id="sidebar-stats"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-2">
              {/* Primary Stats */}
              <div className="space-y-1">
                <StatItem
                  icon={FileText}
                  label="Total documents"
                  value={stats.totalDocuments}
                  isLoading={isLoading}
                />
                
                {stats.categoriesCount > 0 && (
                  <StatItem
                    icon={FolderOpen}
                    label="Categories"
                    value={stats.categoriesCount}
                    isLoading={isLoading}
                  />
                )}
                
                {stats.totalSize > 0 && (
                  <StatItem
                    icon={HardDrive}
                    label="Total size"
                    value={formatBytes(stats.totalSize)}
                    isLoading={isLoading}
                  />
                )}
              </div>

              {/* Activity Stats */}
              {(stats.recentDocuments > 0 || stats.processingDocuments > 0 || stats.lowConfidenceDocuments > 0) && (
                <div className="pt-2 border-t border-gray-100 dark:border-gray-700 space-y-1">
                  {stats.recentDocuments > 0 && (
                    <StatItem
                      icon={Clock}
                      label="This week"
                      value={stats.recentDocuments}
                      color="text-blue-500 dark:text-blue-400"
                      isLoading={isLoading}
                    />
                  )}
                  
                  {stats.processingDocuments > 0 && (
                    <StatItem
                      icon={Zap}
                      label="Processing"
                      value={stats.processingDocuments}
                      color="text-yellow-500 dark:text-yellow-400"
                      isLoading={isLoading}
                    />
                  )}
                  
                  {stats.lowConfidenceDocuments > 0 && (
                    <StatItem
                      icon={AlertTriangle}
                      label="Need review"
                      value={stats.lowConfidenceDocuments}
                      color="text-orange-500 dark:text-orange-400"
                      isLoading={isLoading}
                    />
                  )}
                </div>
              )}

              {/* Loading State */}
              {isLoading && (
                <div className="pt-2 text-center">
                  <div className="inline-flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                    <div className="w-3 h-3 border border-gray-300 border-t-transparent rounded-full animate-spin" />
                    <span>Loading stats...</span>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SidebarStats;