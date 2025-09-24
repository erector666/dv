import React from 'react';

interface DashboardSkeletonProps {
  className?: string;
}

export const DashboardSkeleton: React.FC<DashboardSkeletonProps> = ({ className = '' }) => {
  return (
    <div className={`min-h-screen bg-light-bg dark:bg-dark-bg ${className}`}>
      {/* Header Skeleton */}
      <div className="bg-light-bg dark:bg-dark-bg animate-pulse">
        <div className="px-3 py-1.5 md:px-4 md:py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-gray-200 dark:bg-gray-600 rounded-full"></div>
              <div>
                <div className="h-3 md:h-4 bg-gray-200 dark:bg-gray-600 rounded w-36 mb-1"></div>
                <div className="h-2.5 bg-gray-200 dark:bg-gray-600 rounded w-16"></div>
              </div>
            </div>
            <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-10"></div>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6 -mt-4 sm:-mt-6">
        {/* Search Widget Skeleton */}
        <div className="mb-8 sm:mb-10">
          <div className="max-w-2xl mx-auto">
            <div className="h-14 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
          </div>
        </div>

        {/* Stats Cards Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-8 h-8 bg-gray-200 dark:bg-gray-600 rounded animate-pulse"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-20 animate-pulse"></div>
              </div>
              <div className="h-6 bg-gray-200 dark:bg-gray-600 rounded w-16 mb-2 animate-pulse"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-12 animate-pulse"></div>
            </div>
          ))}
        </div>

        {/* Main Content Grid Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8 mb-6 sm:mb-8">
          {/* Sidebar Skeleton */}
          <div className="lg:col-span-1 space-y-4 sm:space-y-6">
            {/* Upload components removed - will be replaced with new buttons */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
              <div className="h-6 bg-gray-200 dark:bg-gray-600 rounded w-32 mb-4 animate-pulse"></div>
              <div className="h-32 bg-gray-200 dark:bg-gray-600 rounded-lg animate-pulse"></div>
            </div>

            {/* Activity Feed Skeleton */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
              <div className="h-6 bg-gray-200 dark:bg-gray-600 rounded w-24 mb-4 animate-pulse"></div>
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-gray-200 dark:bg-gray-600 rounded-full mt-2 animate-pulse"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-32 mb-1 animate-pulse"></div>
                      <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-24 mb-1 animate-pulse"></div>
                      <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-16 animate-pulse"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Main Content Skeleton */}
          <div className="lg:col-span-3">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm h-full">
              <div className="flex items-center justify-between mb-6">
                <div className="h-6 bg-gray-200 dark:bg-gray-600 rounded w-32 animate-pulse"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-20 animate-pulse"></div>
              </div>
              
              {/* Document List Skeleton */}
              <div className="space-y-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="flex items-center space-x-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                    <div className="w-12 h-12 bg-gray-200 dark:bg-gray-600 rounded animate-pulse"></div>
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-48 mb-2 animate-pulse"></div>
                      <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-24 animate-pulse"></div>
                    </div>
                    <div className="w-8 h-8 bg-gray-200 dark:bg-gray-600 rounded animate-pulse"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Categories section removed from skeleton */}

        {/* Analytics Widget Skeleton */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
          <div className="h-6 bg-gray-200 dark:bg-gray-600 rounded w-32 mb-4 animate-pulse"></div>
          <div className="h-64 bg-gray-200 dark:bg-gray-600 rounded animate-pulse"></div>
        </div>
      </div>
    </div>
  );
};

export default DashboardSkeleton;
