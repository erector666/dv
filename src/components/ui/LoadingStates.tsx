import React from 'react';
import { Card } from './Card';
import { FileText, Search, Upload, BarChart3, Loader2 } from 'lucide-react';

interface LoadingStateProps {
  variant?: 'spinner' | 'skeleton' | 'pulse' | 'dots' | 'progress';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  message?: string;
  progress?: number; // 0-100 for progress variant
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingStateProps> = ({
  size = 'md',
  message,
  className = '',
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
    xl: 'h-12 w-12',
  };

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <Loader2 className={`animate-spin text-blue-600 ${sizeClasses[size]}`} />
      {message && (
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{message}</p>
      )}
    </div>
  );
};

export const LoadingDots: React.FC<LoadingStateProps> = ({
  size = 'md',
  message,
  className = '',
}) => {
  const dotSizes = {
    sm: 'w-1 h-1',
    md: 'w-2 h-2',
    lg: 'w-3 h-3',
    xl: 'w-4 h-4',
  };

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div className="flex space-x-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`${dotSizes[size]} bg-blue-600 rounded-full animate-pulse`}
            style={{
              animationDelay: `${i * 0.2}s`,
              animationDuration: '1s',
            }}
          />
        ))}
      </div>
      {message && (
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{message}</p>
      )}
    </div>
  );
};

export const LoadingProgress: React.FC<LoadingStateProps> = ({
  progress = 0,
  message,
  className = '',
}) => {
  return (
    <div className={`w-full ${className}`}>
      <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
        <span>{message || 'Loading...'}</span>
        <span>{Math.round(progress)}%</span>
      </div>
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
        <div
          className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
        />
      </div>
    </div>
  );
};

export const LoadingSkeleton: React.FC<{
  className?: string;
  rows?: number;
  avatar?: boolean;
}> = ({ className = '', rows = 3, avatar = false }) => {
  return (
    <div className={`animate-pulse ${className}`}>
      {avatar && (
        <div className="flex items-center space-x-4 mb-4">
          <div className="w-12 h-12 bg-gray-300 dark:bg-gray-700 rounded-full" />
          <div className="flex-1">
            <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-3/4 mb-2" />
            <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-1/2" />
          </div>
        </div>
      )}
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded" />
            <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-5/6" />
          </div>
        ))}
      </div>
    </div>
  );
};

// Specialized loading states for dashboard components

export const DashboardLoadingState: React.FC<{ message?: string }> = ({
  message = 'Loading dashboard...',
}) => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      {/* Header Skeleton */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 rounded-lg mb-8 p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-white/20 rounded w-1/3 mb-2" />
          <div className="h-4 bg-white/20 rounded w-1/4" />
        </div>
      </div>

      {/* Stats Cards Skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} variant="glass" className="p-4">
            <div className="animate-pulse">
              <div className="w-8 h-8 bg-gray-300 dark:bg-gray-700 rounded mb-3" />
              <div className="h-6 bg-gray-300 dark:bg-gray-700 rounded w-16 mb-2" />
              <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-20" />
            </div>
          </Card>
        ))}
      </div>

      {/* Main Content Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <Card variant="glass" className="p-6">
            <LoadingSkeleton rows={4} />
          </Card>
          <Card variant="glass" className="p-6">
            <LoadingSkeleton rows={3} />
          </Card>
        </div>
        <div className="lg:col-span-3">
          <Card variant="floating" className="p-6">
            <LoadingSkeleton rows={8} />
          </Card>
        </div>
      </div>

      {/* Loading Message */}
      <div className="fixed bottom-6 right-6">
        <Card variant="floating" className="px-4 py-2">
          <div className="flex items-center space-x-2">
            <LoadingSpinner size="sm" />
            <span className="text-sm text-gray-600 dark:text-gray-400">{message}</span>
          </div>
        </Card>
      </div>
    </div>
  );
};

export const DocumentListLoadingState: React.FC<{ count?: number }> = ({ count = 6 }) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i} variant="default" className="p-0 overflow-hidden">
          <div className="animate-pulse">
            {/* Thumbnail skeleton */}
            <div className="aspect-square bg-gray-300 dark:bg-gray-700" />
            
            {/* Content skeleton */}
            <div className="p-3">
              <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded mb-2" />
              <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-16 mb-2" />
              <div className="flex justify-between">
                <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-12" />
                <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-8" />
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
};

export const SearchLoadingState: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="relative mb-4">
        <Search className="h-12 w-12 text-gray-400 animate-pulse" />
        <div className="absolute -top-1 -right-1">
          <LoadingSpinner size="sm" />
        </div>
      </div>
      <p className="text-gray-600 dark:text-gray-400 mb-2">Searching documents...</p>
      <p className="text-sm text-gray-500 dark:text-gray-500">This may take a moment</p>
    </div>
  );
};

export const UploadLoadingState: React.FC<{ progress?: number; fileName?: string }> = ({
  progress = 0,
  fileName,
}) => {
  return (
    <Card variant="glass" className="p-6">
      <div className="flex items-center space-x-4 mb-4">
        <div className="relative">
          <Upload className="h-8 w-8 text-blue-600" />
          <div className="absolute -top-1 -right-1">
            <LoadingSpinner size="sm" />
          </div>
        </div>
        <div className="flex-1">
          <h3 className="font-medium text-gray-900 dark:text-white">
            Uploading {fileName ? `"${fileName}"` : 'file'}...
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Processing and analyzing content
          </p>
        </div>
      </div>
      <LoadingProgress progress={progress} />
    </Card>
  );
};

export const AnalyticsLoadingState: React.FC = () => {
  return (
    <Card variant="floating" className="p-6">
      <div className="flex items-center space-x-3 mb-6">
        <BarChart3 className="h-6 w-6 text-blue-600 animate-pulse" />
        <div className="h-6 bg-gray-300 dark:bg-gray-700 rounded w-32 animate-pulse" />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded-lg" />
            </div>
          ))}
        </div>
        
        <div className="space-y-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded w-24 mb-3" />
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-gray-300 dark:bg-gray-700 rounded-full" />
                  <div className="flex-1 h-3 bg-gray-300 dark:bg-gray-700 rounded" />
                  <div className="w-12 h-3 bg-gray-300 dark:bg-gray-700 rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export const EmptyState: React.FC<{
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}> = ({ icon, title, description, action }) => {
  return (
    <div className="text-center py-12">
      <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-gray-100 dark:bg-gray-800 mb-6">
        {icon || <FileText className="h-8 w-8 text-gray-400" />}
      </div>
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
        {title}
      </h3>
      <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-sm mx-auto">
        {description}
      </p>
      {action && (
        <button
          onClick={action.onClick}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
};