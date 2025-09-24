import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Hook for lazy loading images with intersection observer
 */
export const useLazyImage = (src: string, threshold: number = 0.1) => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [threshold]);

  useEffect(() => {
    if (isInView && src && !imageSrc) {
      setImageSrc(src);
    }
  }, [isInView, src, imageSrc]);

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
  }, []);

  const handleError = useCallback(() => {
    setIsLoaded(false);
    setImageSrc(null);
  }, []);

  return {
    imgRef,
    imageSrc,
    isLoaded,
    isInView,
    handleLoad,
    handleError
  };
};

/**
 * Hook for virtual scrolling large lists
 */
export const useVirtualScroll = <T>({
  items,
  itemHeight,
  containerHeight,
  overscan = 3
}: {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
}) => {
  const [scrollTop, setScrollTop] = useState(0);
  const scrollElementRef = useRef<HTMLDivElement>(null);

  const totalHeight = items.length * itemHeight;
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );

  const visibleItems = items.slice(startIndex, endIndex + 1).map((item, index) => ({
    item,
    index: startIndex + index
  }));

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  return {
    scrollElementRef,
    visibleItems,
    totalHeight,
    startIndex,
    handleScroll,
    offsetY: startIndex * itemHeight
  };
};

/**
 * Hook for intersection observer (general purpose)
 */
export const useIntersectionObserver = (
  threshold: number = 0.1,
  rootMargin: string = '0px'
) => {
  const [isInView, setIsInView] = useState(false);
  const [hasBeenInView, setHasBeenInView] = useState(false);
  const elementRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        const inView = entry.isIntersecting;
        setIsInView(inView);
        
        if (inView && !hasBeenInView) {
          setHasBeenInView(true);
        }
      },
      { threshold, rootMargin }
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => observer.disconnect();
  }, [threshold, rootMargin, hasBeenInView]);

  return { elementRef, isInView, hasBeenInView };
};

/**
 * Hook for debouncing values (performance optimization)
 */
export const useDebounce = <T>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

/**
 * Hook for throttling function calls
 */
export const useThrottle = <T extends (...args: any[]) => any>(
  func: T,
  delay: number
): T => {
  const lastRan = useRef(Date.now());

  return useCallback(
    ((...args) => {
      if (Date.now() - lastRan.current >= delay) {
        func(...args);
        lastRan.current = Date.now();
      }
    }) as T,
    [func, delay]
  );
};

/**
 * Hook for measuring component performance
 */
export const usePerformanceMonitor = (componentName: string) => {
  const renderStartTime = useRef<number>(0);
  const renderCount = useRef<number>(0);

  useEffect(() => {
    renderStartTime.current = performance.now();
    renderCount.current++;
  });

  useEffect(() => {
    const renderTime = performance.now() - renderStartTime.current;
    
    if (renderTime > 16) { // Longer than one frame (60fps)
      console.warn(`🐌 Slow render: ${componentName} took ${renderTime.toFixed(2)}ms (render #${renderCount.current})`);
    }
  });

  return {
    renderCount: renderCount.current,
    startMeasure: () => {
      renderStartTime.current = performance.now();
    },
    endMeasure: () => {
      const duration = performance.now() - renderStartTime.current;
      console.log(`⚡ ${componentName} rendered in ${duration.toFixed(2)}ms`);
      return duration;
    }
  };
};

/**
 * Hook for lazy loading components
 */
export const useLazyComponent = <T,>(
  importFunc: () => Promise<{ default: T }>,
  fallback?: React.ComponentType
) => {
  const [Component, setComponent] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const loadComponent = useCallback(async () => {
    if (Component) return Component;

    setIsLoading(true);
    setError(null);

    try {
      const module = await importFunc();
      setComponent(module.default);
      return module.default;
    } catch (err) {
      setError(err as Error);
      console.error('Failed to load component:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [Component, importFunc]);

  return {
    Component,
    isLoading,
    error,
    loadComponent
  };
};

/**
 * Hook for optimizing re-renders with memoization
 */
export const useStableCallback = <T extends (...args: any[]) => any>(
  callback: T
): T => {
  const callbackRef = useRef<T>(callback);
  
  useEffect(() => {
    callbackRef.current = callback;
  });

  return useCallback(((...args) => {
    return callbackRef.current(...args);
  }) as T, []);
};

/**
 * Hook for batch state updates
 */
export const useBatchedState = <T,>(initialState: T) => {
  const [state, setState] = useState<T>(initialState);
  const pendingUpdates = useRef<Partial<T>[]>([]);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const batchUpdate = useCallback((update: Partial<T>) => {
    pendingUpdates.current.push(update);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setState(prevState => {
        const finalUpdate = pendingUpdates.current.reduce(
          (acc, update) => ({ ...acc, ...update }),
          {}
        );
        pendingUpdates.current = [];
        return { ...prevState, ...finalUpdate };
      });
    }, 0); // Batch updates in next tick
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return [state, batchUpdate] as const;
};