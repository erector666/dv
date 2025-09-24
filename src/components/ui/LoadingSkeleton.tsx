import React from 'react';
import { motion } from 'framer-motion';

interface LoadingSkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'badge';
  width?: string | number;
  height?: string | number;
  lines?: number;
  animate?: boolean;
}

const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  className = '',
  variant = 'rectangular',
  width,
  height,
  lines = 1,
  animate = true
}) => {
  const baseClasses = `bg-gray-200 dark:bg-gray-600 ${animate ? 'animate-pulse' : ''}`;
  
  const getVariantClasses = () => {
    switch (variant) {
      case 'text':
        return 'rounded h-4';
      case 'circular':
        return 'rounded-full';
      case 'badge':
        return 'rounded-full h-5';
      case 'rectangular':
      default:
        return 'rounded';
    }
  };

  const getStyle = () => {
    const style: React.CSSProperties = {};
    if (width) style.width = width;
    if (height) style.height = height;
    return style;
  };

  if (variant === 'text' && lines > 1) {
    return (
      <div className={`space-y-2 ${className}`}>
        {Array.from({ length: lines }, (_, index) => (
          <motion.div
            key={index}
            className={`${baseClasses} ${getVariantClasses()}`}
            style={{
              ...getStyle(),
              width: index === lines - 1 ? '75%' : '100%'
            }}
            initial={animate ? { opacity: 0.5 } : undefined}
            animate={animate ? { opacity: [0.5, 1, 0.5] } : undefined}
            transition={animate ? {
              duration: 1.5,
              repeat: Infinity,
              delay: index * 0.1
            } : undefined}
          />
        ))}
      </div>
    );
  }

  return (
    <motion.div
      className={`${baseClasses} ${getVariantClasses()} ${className}`}
      style={getStyle()}
      initial={animate ? { opacity: 0.5 } : undefined}
      animate={animate ? { opacity: [0.5, 1, 0.5] } : undefined}
      transition={animate ? {
        duration: 1.5,
        repeat: Infinity
      } : undefined}
    />
  );
};

// Specific skeleton components for common use cases
export const NavigationSkeleton: React.FC = () => (
  <div className="space-y-2 p-2">
    {Array.from({ length: 6 }, (_, index) => (
      <div key={index} className="flex items-center space-x-3 p-2">
        <LoadingSkeleton variant="circular" width={20} height={20} />
        <LoadingSkeleton variant="text" width="60%" height={16} />
        <LoadingSkeleton variant="badge" width={24} height={20} />
      </div>
    ))}
  </div>
);

export const StatsSkeleton: React.FC = () => (
  <div className="space-y-3 p-4">
    <div className="flex items-center space-x-2">
      <LoadingSkeleton variant="circular" width={20} height={20} />
      <LoadingSkeleton variant="text" width="40%" height={16} />
    </div>
    <div className="space-y-2">
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className="flex justify-between items-center">
          <LoadingSkeleton variant="text" width="50%" height={12} />
          <LoadingSkeleton variant="text" width="20%" height={12} />
        </div>
      ))}
    </div>
  </div>
);

export const CategorySkeleton: React.FC = () => (
  <div className="space-y-1">
    {Array.from({ length: 8 }, (_, index) => (
      <div key={index} className="flex items-center justify-between p-2 rounded-lg">
        <div className="flex items-center space-x-3">
          <LoadingSkeleton variant="circular" width={20} height={20} />
          <LoadingSkeleton variant="text" width="80px" height={14} />
        </div>
        <LoadingSkeleton variant="badge" width={28} height={20} />
      </div>
    ))}
  </div>
);

export default LoadingSkeleton;