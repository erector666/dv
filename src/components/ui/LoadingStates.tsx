import React from 'react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: 'primary' | 'secondary' | 'white' | 'gray';
  className?: string;
  'aria-label'?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  color = 'primary',
  className,
  'aria-label': ariaLabel = 'Loading'
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
    xl: 'h-12 w-12'
  };

  const colorClasses = {
    primary: 'border-primary-500',
    secondary: 'border-secondary-500',
    white: 'border-white',
    gray: 'border-gray-500'
  };

  return (
    <div
      className={clsx(
        'animate-spin rounded-full border-2 border-t-transparent',
        sizeClasses[size],
        colorClasses[color],
        className
      )}
      role="status"
      aria-label={ariaLabel}
    />
  );
};

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  className?: string;
  animate?: boolean;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width,
  height,
  className,
  animate = true
}) => {
  return (
    <div
      className={clsx(
        'bg-gray-200 dark:bg-gray-700 rounded',
        animate && 'animate-pulse',
        className
      )}
      style={{ width, height }}
      role="presentation"
      aria-hidden="true"
    />
  );
};

export const CardSkeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={clsx('p-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700', className)}>
    <div className="animate-pulse">
      <div className="flex items-center space-x-4 mb-4">
        <Skeleton width={48} height={48} className="rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton height={16} className="w-3/4" />
          <Skeleton height={12} className="w-1/2" />
        </div>
      </div>
      <div className="space-y-3">
        <Skeleton height={12} />
        <Skeleton height={12} className="w-5/6" />
        <Skeleton height={12} className="w-4/6" />
      </div>
      <div className="flex justify-between items-center mt-6">
        <Skeleton width={80} height={32} className="rounded-lg" />
        <Skeleton width={24} height={24} className="rounded" />
      </div>
    </div>
  </div>
);

export const DocumentCardSkeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={clsx('p-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700', className)}>
    <div className="animate-pulse">
      {/* Document preview skeleton */}
      <Skeleton height={120} className="w-full rounded-lg mb-4" />
      
      {/* Document info skeleton */}
      <div className="space-y-3">
        <Skeleton height={16} className="w-full" />
        <div className="flex items-center space-x-2">
          <Skeleton width={60} height={20} className="rounded-full" />
          <Skeleton width={80} height={12} />
        </div>
        <div className="flex justify-between items-center">
          <Skeleton width={100} height={12} />
          <Skeleton width={60} height={12} />
        </div>
      </div>
      
      {/* Action buttons skeleton */}
      <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex space-x-2">
          <Skeleton width={32} height={32} className="rounded-lg" />
          <Skeleton width={32} height={32} className="rounded-lg" />
          <Skeleton width={32} height={32} className="rounded-lg" />
        </div>
        <Skeleton width={24} height={24} className="rounded" />
      </div>
    </div>
  </div>
);

interface ListSkeletonProps {
  count?: number;
  variant?: 'card' | 'document' | 'simple';
  className?: string;
}

export const ListSkeleton: React.FC<ListSkeletonProps> = ({
  count = 3,
  variant = 'card',
  className
}) => {
  const SkeletonComponent = variant === 'document' ? DocumentCardSkeleton : CardSkeleton;
  
  return (
    <div className={clsx(
      variant === 'card' || variant === 'document' 
        ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
        : 'space-y-4',
      className
    )}>
      {Array(count).fill(0).map((_, i) => (
        <SkeletonComponent key={i} />
      ))}
    </div>
  );
};

interface LoadingOverlayProps {
  isLoading: boolean;
  message?: string;
  children: React.ReactNode;
  className?: string;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isLoading,
  message = 'Loading...',
  children,
  className
}) => {
  return (
    <div className={clsx('relative', className)}>
      {children}
      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm flex items-center justify-center z-10 rounded-lg"
        >
          <div className="text-center">
            <LoadingSpinner size="lg" className="mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400 font-medium" role="status" aria-live="polite">
              {message}
            </p>
          </div>
        </motion.div>
      )}
    </div>
  );
};

interface ProgressBarProps {
  progress: number;
  label?: string;
  showPercentage?: boolean;
  color?: 'primary' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  label,
  showPercentage = true,
  color = 'primary',
  size = 'md',
  className
}) => {
  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3'
  };

  const colorClasses = {
    primary: 'bg-primary-500',
    success: 'bg-success-500',
    warning: 'bg-warning-500',
    danger: 'bg-danger-500'
  };

  const clampedProgress = Math.min(Math.max(progress, 0), 100);

  return (
    <div className={clsx('w-full', className)}>
      {(label || showPercentage) && (
        <div className="flex justify-between items-center mb-2">
          {label && (
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {label}
            </span>
          )}
          {showPercentage && (
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {Math.round(clampedProgress)}%
            </span>
          )}
        </div>
      )}
      <div className={clsx(
        'w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden',
        sizeClasses[size]
      )}>
        <motion.div
          className={clsx('h-full rounded-full', colorClasses[color])}
          initial={{ width: 0 }}
          animate={{ width: `${clampedProgress}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          role="progressbar"
          aria-valuenow={clampedProgress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={label || `${clampedProgress}% complete`}
        />
      </div>
    </div>
  );
};

export const PulseLoader: React.FC<{ className?: string }> = ({ className }) => (
  <div className={clsx('flex space-x-1', className)}>
    {[0, 1, 2].map((i) => (
      <motion.div
        key={i}
        className="w-2 h-2 bg-primary-500 rounded-full"
        animate={{
          scale: [1, 1.5, 1],
          opacity: [0.7, 1, 0.7]
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          delay: i * 0.2
        }}
      />
    ))}
  </div>
);