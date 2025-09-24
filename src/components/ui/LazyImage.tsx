import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import { useLazyImage } from '../../hooks/usePerformance';
import { ImageIcon } from 'lucide-react';

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  width?: number | string;
  height?: number | string;
  placeholder?: React.ReactNode;
  fallback?: React.ReactNode;
  threshold?: number;
  onLoad?: () => void;
  onError?: () => void;
}

export const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  className,
  width,
  height,
  placeholder,
  fallback,
  threshold = 0.1,
  onLoad,
  onError
}) => {
  const [hasError, setHasError] = useState(false);
  const { imgRef, imageSrc, isLoaded, isInView, handleLoad, handleError } = useLazyImage(src, threshold);

  const handleImageLoad = () => {
    handleLoad();
    onLoad?.();
  };

  const handleImageError = () => {
    setHasError(true);
    handleError();
    onError?.();
  };

  const defaultPlaceholder = (
    <div className="flex items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-400">
      <ImageIcon className="w-8 h-8" />
    </div>
  );

  const defaultFallback = (
    <div className="flex items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-400">
      <div className="text-center">
        <ImageIcon className="w-8 h-8 mx-auto mb-2" />
        <p className="text-xs">Failed to load</p>
      </div>
    </div>
  );

  return (
    <div 
      ref={imgRef}
      className={clsx('relative overflow-hidden', className)}
      style={{ width, height }}
    >
      {!isInView && (placeholder || defaultPlaceholder)}
      
      {isInView && !hasError && (
        <>
          {!isLoaded && (placeholder || defaultPlaceholder)}
          {imageSrc && (
            <motion.img
              src={imageSrc}
              alt={alt}
              onLoad={handleImageLoad}
              onError={handleImageError}
              className={clsx(
                'w-full h-full object-cover transition-opacity duration-300',
                isLoaded ? 'opacity-100' : 'opacity-0'
              )}
              initial={{ opacity: 0 }}
              animate={{ opacity: isLoaded ? 1 : 0 }}
              transition={{ duration: 0.3 }}
              loading="lazy"
            />
          )}
        </>
      )}
      
      {hasError && (fallback || defaultFallback)}
    </div>
  );
};

// Optimized document thumbnail component
interface DocumentThumbnailProps {
  document: {
    url: string;
    name: string;
    type: string;
  };
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const DocumentThumbnail: React.FC<DocumentThumbnailProps> = ({
  document,
  size = 'md',
  className
}) => {
  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-16 h-16',
    lg: 'w-24 h-24'
  };

  const iconSizes = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8', 
    lg: 'w-12 h-12'
  };

  const isImage = document.type.startsWith('image/');
  const isPDF = document.type === 'application/pdf';

  const getFileIcon = () => {
    if (isPDF) {
      return (
        <div className="bg-red-500 text-white rounded-lg p-2">
          <svg className={iconSizes[size]} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
          </svg>
        </div>
      );
    }

    return (
      <div className="bg-blue-500 text-white rounded-lg p-2">
        <svg className={iconSizes[size]} fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
        </svg>
      </div>
    );
  };

  if (isImage) {
    return (
      <LazyImage
        src={document.url}
        alt={document.name}
        className={clsx(sizeClasses[size], 'rounded-lg', className)}
        placeholder={
          <div className={clsx(sizeClasses[size], 'bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse')} />
        }
        fallback={getFileIcon()}
      />
    );
  }

  return (
    <div className={clsx(sizeClasses[size], 'flex items-center justify-center', className)}>
      {getFileIcon()}
    </div>
  );
};

// Virtual scrolling list component
interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  height: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
  overscan?: number;
}

export const VirtualList = <T,>({
  items,
  itemHeight,
  height,
  renderItem,
  className,
  overscan = 3
}: VirtualListProps<T>) => {
  const [scrollTop, setScrollTop] = useState(0);
  const scrollElementRef = useRef<HTMLDivElement>(null);

  const totalHeight = items.length * itemHeight;
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length - 1,
    Math.ceil((scrollTop + height) / itemHeight) + overscan
  );

  const visibleItems = items.slice(startIndex, endIndex + 1);
  const offsetY = startIndex * itemHeight;

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  return (
    <div
      ref={scrollElementRef}
      className={clsx('overflow-auto', className)}
      style={{ height }}
      onScroll={handleScroll}
      role="list"
      aria-label={`List of ${items.length} items`}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map((item, index) => (
            <div
              key={startIndex + index}
              style={{ height: itemHeight }}
              role="listitem"
            >
              {renderItem(item, startIndex + index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/**
 * Hook for optimizing expensive calculations
 */
export const useExpensiveCalculation = <T,>(
  calculation: () => T,
  dependencies: React.DependencyList,
  delay: number = 100
) => {
  const [result, setResult] = useState<T | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    setIsCalculating(true);
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      try {
        const calculationResult = calculation();
        setResult(calculationResult);
      } catch (error) {
        console.error('Expensive calculation failed:', error);
      } finally {
        setIsCalculating(false);
      }
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, dependencies);

  return { result, isCalculating };
};

/**
 * Hook for preloading resources
 */
export const usePreloader = () => {
  const preloadImage = useCallback((src: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = reject;
      img.src = src;
    });
  }, []);

  const preloadImages = useCallback(async (urls: string[]) => {
    try {
      await Promise.all(urls.map(preloadImage));
      return true;
    } catch (error) {
      console.warn('Failed to preload some images:', error);
      return false;
    }
  }, [preloadImage]);

  return { preloadImage, preloadImages };
};