/**
 * Performance Monitoring Utility
 * Tracks component render times, function execution times, and memory usage
 */

import React from 'react';

interface PerformanceMetrics {
  componentName: string;
  renderTime: number;
  memoryUsage?: number;
  timestamp: number;
}

interface FunctionMetrics {
  functionName: string;
  executionTime: number;
  timestamp: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private functionMetrics: FunctionMetrics[] = [];
  private isEnabled: boolean = process.env.NODE_ENV === 'development';
  private _cachedSummary: any = null;
  private _lastSummaryUpdate: number = 0;

  /**
   * Track component render performance
   */
  trackComponentRender(componentName: string, renderTime: number) {
    if (!this.isEnabled) return;

    const metric: PerformanceMetrics = {
      componentName,
      renderTime,
      memoryUsage: this.getMemoryUsage(),
      timestamp: Date.now(),
    };

    this.metrics.push(metric);

    // Log slow renders (>16ms for 60fps)
    if (renderTime > 16) {
      console.warn(`🐌 Slow render detected: ${componentName} took ${renderTime.toFixed(2)}ms`);
    }

    // Keep only last 100 metrics
    if (this.metrics.length > 100) {
      this.metrics = this.metrics.slice(-100);
    }
  }

  /**
   * Track function execution time
   */
  trackFunction<T extends (...args: any[]) => any>(
    functionName: string,
    fn: T
  ): T {
    if (!this.isEnabled) return fn;

    return ((...args: any[]) => {
      const start = performance.now();
      const result = fn(...args);
      const end = performance.now();
      const executionTime = end - start;

      const metric: FunctionMetrics = {
        functionName,
        executionTime,
        timestamp: Date.now(),
      };

      this.functionMetrics.push(metric);

      // Log slow functions (>10ms)
      if (executionTime > 10) {
        console.warn(`🐌 Slow function detected: ${functionName} took ${executionTime.toFixed(2)}ms`);
      }

      // Keep only last 100 function metrics
      if (this.functionMetrics.length > 100) {
        this.functionMetrics = this.functionMetrics.slice(-100);
      }

      return result;
    }) as T;
  }

  /**
   * Get current memory usage (if available)
   */
  private getMemoryUsage(): number | undefined {
    if ('memory' in performance) {
      return (performance as any).memory.usedJSHeapSize / 1024 / 1024; // MB
    }
    return undefined;
  }

  /**
   * Get performance summary - optimized for frequent calls
   */
  getPerformanceSummary() {
    if (!this.isEnabled) return null;

    // Cache calculations to avoid repeated work
    if (this._cachedSummary && Date.now() - this._lastSummaryUpdate < 500) {
      return this._cachedSummary;
    }

    const metricsLength = this.metrics.length;
    const functionMetricsLength = this.functionMetrics.length;
    
    if (metricsLength === 0 && functionMetricsLength === 0) {
      return {
        totalRenders: 0,
        totalFunctions: 0,
        averageRenderTime: 0,
        averageFunctionTime: 0,
        slowRenders: 0,
        slowFunctions: 0,
        memoryUsage: this.getMemoryUsage(),
      };
    }

    // Use more efficient calculations
    let renderSum = 0;
    let functionSum = 0;
    let slowRenders = 0;
    let slowFunctions = 0;

    for (let i = 0; i < metricsLength; i++) {
      const renderTime = this.metrics[i].renderTime;
      renderSum += renderTime;
      if (renderTime > 16) slowRenders++;
    }

    for (let i = 0; i < functionMetricsLength; i++) {
      const functionTime = this.functionMetrics[i].executionTime;
      functionSum += functionTime;
      if (functionTime > 10) slowFunctions++;
    }

    const summary = {
      totalRenders: metricsLength,
      totalFunctions: functionMetricsLength,
      averageRenderTime: metricsLength > 0 ? renderSum / metricsLength : 0,
      averageFunctionTime: functionMetricsLength > 0 ? functionSum / functionMetricsLength : 0,
      slowRenders,
      slowFunctions,
      memoryUsage: this.getMemoryUsage(),
    };

    // Cache the result
    this._cachedSummary = summary;
    this._lastSummaryUpdate = Date.now();

    return summary;
  }

  /**
   * Clear all metrics
   */
  clearMetrics() {
    this.metrics = [];
    this.functionMetrics = [];
    this._cachedSummary = null;
    this._lastSummaryUpdate = 0;
  }

  /**
   * Export metrics for analysis
   */
  exportMetrics() {
    return {
      componentMetrics: this.metrics,
      functionMetrics: this.functionMetrics,
      summary: this.getPerformanceSummary(),
    };
  }
}

// Create singleton instance
export const performanceMonitor = new PerformanceMonitor();

/**
 * React Hook for tracking component render performance
 */
export const usePerformanceTracking = (componentName: string) => {
  if (process.env.NODE_ENV !== 'development') {
    return { trackRender: () => {} };
  }

  const trackRender = (renderTime: number) => {
    performanceMonitor.trackComponentRender(componentName, renderTime);
  };

  return { trackRender };
};

/**
 * Higher-order component for automatic performance tracking
 */
export const withPerformanceTracking = <P extends object>(
  Component: React.ComponentType<P>,
  componentName?: string
) => {
  const WrappedComponent = (props: P) => {
    const name = componentName || Component.displayName || Component.name || 'Unknown';
    const { trackRender } = usePerformanceTracking(name);

    React.useEffect(() => {
      const start = performance.now();
      return () => {
        const end = performance.now();
        trackRender(end - start);
      };
    });

    return React.createElement(Component, props);
  };

  WrappedComponent.displayName = `withPerformanceTracking(${componentName || Component.displayName || Component.name})`;
  return WrappedComponent;
};

/**
 * Utility to measure async function performance
 */
export const measureAsync = async <T>(
  functionName: string,
  asyncFn: () => Promise<T>
): Promise<T> => {
  const start = performance.now();
  try {
    const result = await asyncFn();
    const end = performance.now();
    const executionTime = end - start;
    
    if (executionTime > 100) {
      console.warn(`🐌 Slow async function: ${functionName} took ${executionTime.toFixed(2)}ms`);
    }
    
    return result;
  } catch (error) {
    const end = performance.now();
    const executionTime = end - start;
    console.error(`❌ Failed async function: ${functionName} took ${executionTime.toFixed(2)}ms`, error);
    throw error;
  }
};

/**
 * Utility to debounce expensive operations
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

/**
 * Utility to throttle expensive operations
 */
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

export default performanceMonitor;
