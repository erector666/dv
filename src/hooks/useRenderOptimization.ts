import { useMemo, useCallback, useRef, useState, useEffect } from 'react';
import { debounce } from 'lodash';

export interface VirtualScrollOptions {
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
  estimateItemHeight?: (index: number) => number;
}

export interface VirtualScrollResult<T> {
  visibleItems: Array<{ item: T; index: number; style: React.CSSProperties }>;
  totalHeight: number;
  scrollToIndex: (index: number) => void;
  containerProps: {
    style: React.CSSProperties;
    onScroll: (e: React.UIEvent<HTMLDivElement>) => void;
  };
}

export const useRenderOptimization = () => {
  // Debounced state updates
  const createDebouncedSetter = useCallback(<T>(
    setter: (value: T) => void,
    delay: number = 300
  ) => {
    return debounce(setter, delay, { leading: false, trailing: true });
  }, []);

  // Memoized expensive calculations
  const memoizeExpensiveCalculation = useCallback(<TArgs extends any[], TReturn>(
    fn: (...args: TArgs) => TReturn,
    deps: React.DependencyList
  ) => {
    return useMemo(() => fn, deps);
  }, []);

  // Virtual scrolling implementation
  const useVirtualScroll = <T>(
    items: T[],
    options: VirtualScrollOptions
  ): VirtualScrollResult<T> => {
    const {
      itemHeight,
      containerHeight,
      overscan = 5,
      estimateItemHeight,
    } = options;

    const [scrollTop, setScrollTop] = useState(0);
    const scrollElementRef = useRef<HTMLDivElement>(null);

    const totalHeight = useMemo(() => {
      if (estimateItemHeight) {
        return items.reduce((total, _, index) => total + estimateItemHeight(index), 0);
      }
      return items.length * itemHeight;
    }, [items.length, itemHeight, estimateItemHeight]);

    const visibleRange = useMemo(() => {
      const start = Math.floor(scrollTop / itemHeight);
      const end = Math.min(
        start + Math.ceil(containerHeight / itemHeight) + overscan,
        items.length
      );
      return {
        start: Math.max(0, start - overscan),
        end,
      };
    }, [scrollTop, itemHeight, containerHeight, overscan, items.length]);

    const visibleItems = useMemo(() => {
      const result: Array<{ item: T; index: number; style: React.CSSProperties }> = [];
      
      for (let i = visibleRange.start; i < visibleRange.end; i++) {
        const item = items[i];
        if (item !== undefined) {
          const top = estimateItemHeight
            ? items.slice(0, i).reduce((total, _, index) => total + estimateItemHeight(index), 0)
            : i * itemHeight;

          result.push({
            item,
            index: i,
            style: {
              position: 'absolute',
              top: `${top}px`,
              left: 0,
              right: 0,
              height: estimateItemHeight ? `${estimateItemHeight(i)}px` : `${itemHeight}px`,
            },
          });
        }
      }
      
      return result;
    }, [items, visibleRange, itemHeight, estimateItemHeight]);

    const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
      setScrollTop(e.currentTarget.scrollTop);
    }, []);

    const scrollToIndex = useCallback((index: number) => {
      if (scrollElementRef.current) {
        const top = estimateItemHeight
          ? items.slice(0, index).reduce((total, _, i) => total + estimateItemHeight(i), 0)
          : index * itemHeight;
        
        scrollElementRef.current.scrollTo({
          top,
          behavior: 'smooth',
        });
      }
    }, [items, itemHeight, estimateItemHeight]);

    const containerProps = useMemo(() => ({
      ref: scrollElementRef,
      style: {
        height: `${containerHeight}px`,
        overflowY: 'auto' as const,
        position: 'relative' as const,
      },
      onScroll: handleScroll,
    }), [containerHeight, handleScroll]);

    return {
      visibleItems,
      totalHeight,
      scrollToIndex,
      containerProps,
    };
  };

  // Optimized list rendering with chunking
  const useChunkedList = <T>(
    items: T[],
    chunkSize: number = 50,
    delay: number = 16
  ) => {
    const [renderedChunks, setRenderedChunks] = useState<T[][]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [currentChunk, setCurrentChunk] = useState(0);

    const chunks = useMemo(() => {
      const result: T[][] = [];
      for (let i = 0; i < items.length; i += chunkSize) {
        result.push(items.slice(i, i + chunkSize));
      }
      return result;
    }, [items, chunkSize]);

    const loadNextChunk = useCallback(() => {
      if (currentChunk < chunks.length) {
        setIsLoading(true);
        
        setTimeout(() => {
          setRenderedChunks(prev => [...prev, chunks[currentChunk]]);
          setCurrentChunk(prev => prev + 1);
          setIsLoading(false);
        }, delay);
      }
    }, [chunks, currentChunk, delay]);

    const loadAllChunks = useCallback(() => {
      setRenderedChunks(chunks);
      setCurrentChunk(chunks.length);
    }, [chunks]);

    const reset = useCallback(() => {
      setRenderedChunks([]);
      setCurrentChunk(0);
      setIsLoading(false);
    }, []);

    // Auto-load first chunk
    useEffect(() => {
      if (chunks.length > 0 && renderedChunks.length === 0) {
        loadNextChunk();
      }
    }, [chunks.length, renderedChunks.length, loadNextChunk]);

    const flattenedItems = useMemo(() => 
      renderedChunks.flat(), 
      [renderedChunks]
    );

    return {
      items: flattenedItems,
      isLoading,
      hasMore: currentChunk < chunks.length,
      loadNextChunk,
      loadAllChunks,
      reset,
      progress: chunks.length > 0 ? currentChunk / chunks.length : 0,
    };
  };

  // Intersection observer for lazy loading
  const useIntersectionObserver = (
    callback: (entries: IntersectionObserverEntry[]) => void,
    options?: IntersectionObserverInit
  ) => {
    const targetRef = useRef<HTMLElement>(null);
    const observerRef = useRef<IntersectionObserver | null>(null);

    useEffect(() => {
      if (targetRef.current) {
        observerRef.current = new IntersectionObserver(callback, options);
        observerRef.current.observe(targetRef.current);
      }

      return () => {
        if (observerRef.current) {
          observerRef.current.disconnect();
        }
      };
    }, [callback, options]);

    return targetRef;
  };

  // Optimized search with debouncing
  const useOptimizedSearch = <T>(
    items: T[],
    searchFn: (item: T, query: string) => boolean,
    debounceMs: number = 300
  ) => {
    const [query, setQuery] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);

    const debouncedSetQuery = useMemo(
      () => debounce((q: string) => {
        setDebouncedQuery(q);
        setIsSearching(false);
      }, debounceMs),
      [debounceMs]
    );

    const updateQuery = useCallback((newQuery: string) => {
      setQuery(newQuery);
      setIsSearching(true);
      debouncedSetQuery(newQuery);
    }, [debouncedSetQuery]);

    const filteredItems = useMemo(() => {
      if (!debouncedQuery.trim()) return items;
      return items.filter(item => searchFn(item, debouncedQuery));
    }, [items, debouncedQuery, searchFn]);

    return {
      query,
      debouncedQuery,
      isSearching,
      filteredItems,
      updateQuery,
    };
  };

  // Performance monitoring
  const usePerformanceMonitor = (componentName: string) => {
    const renderCount = useRef(0);
    const lastRenderTime = useRef(Date.now());
    const [performanceMetrics, setPerformanceMetrics] = useState({
      renderCount: 0,
      averageRenderTime: 0,
      lastRenderDuration: 0,
    });

    useEffect(() => {
      renderCount.current++;
      const now = Date.now();
      const duration = now - lastRenderTime.current;
      
      setPerformanceMetrics(prev => ({
        renderCount: renderCount.current,
        averageRenderTime: (prev.averageRenderTime * (renderCount.current - 1) + duration) / renderCount.current,
        lastRenderDuration: duration,
      }));
      
      lastRenderTime.current = now;

      // Log performance warnings
      if (duration > 100) {
        console.warn(`Slow render in ${componentName}: ${duration}ms`);
      }
    });

    return performanceMetrics;
  };

  // Batch state updates
  const useBatchedUpdates = <T extends Record<string, any>>(
    initialState: T,
    batchDelay: number = 16
  ) => {
    const [state, setState] = useState(initialState);
    const pendingUpdates = useRef<Partial<T>>({});
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    const batchedSetState = useCallback((updates: Partial<T>) => {
      pendingUpdates.current = { ...pendingUpdates.current, ...updates };

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        setState(prev => ({ ...prev, ...pendingUpdates.current }));
        pendingUpdates.current = {};
        timeoutRef.current = null;
      }, batchDelay);
    }, [batchDelay]);

    const flushUpdates = useCallback(() => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        setState(prev => ({ ...prev, ...pendingUpdates.current }));
        pendingUpdates.current = {};
        timeoutRef.current = null;
      }
    }, []);

    useEffect(() => {
      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
    }, []);

    return [state, batchedSetState, flushUpdates] as const;
  };

  // Memoized component wrapper
  const createMemoizedComponent = <P extends Record<string, any>>(
    Component: React.ComponentType<P>,
    areEqual?: (prevProps: P, nextProps: P) => boolean
  ) => {
    return React.memo(Component, areEqual);
  };

  return {
    // Debouncing
    createDebouncedSetter,
    
    // Memoization
    memoizeExpensiveCalculation,
    createMemoizedComponent,
    
    // Virtual scrolling
    useVirtualScroll,
    
    // List optimization
    useChunkedList,
    
    // Lazy loading
    useIntersectionObserver,
    
    // Search optimization
    useOptimizedSearch,
    
    // Performance monitoring
    usePerformanceMonitor,
    
    // Batched updates
    useBatchedUpdates,
  };
};

export default useRenderOptimization;