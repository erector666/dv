import React, { useState, useEffect } from 'react';
import { Card } from '../ui';
import { performanceMonitor } from '../../utils/performanceMonitor';
import { Activity, Zap, AlertTriangle, BarChart3 } from 'lucide-react';

interface PerformanceDashboardProps {
  className?: string;
}

const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({ className }) => {
  const [metrics, setMetrics] = useState(performanceMonitor.getPerformanceSummary());
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;

    // Only update metrics when dashboard is visible to reduce overhead
    if (!isVisible) return;

    let animationFrameId: number;
    let timeoutId: NodeJS.Timeout;
    let lastUpdate = 0;
    const updateInterval = 2000; // Update every 2 seconds when visible
    
    const updateMetrics = () => {
      if (!isVisible) return; // Stop if dashboard is closed
      
      const now = Date.now();
      if (now - lastUpdate >= updateInterval) {
        const summary = performanceMonitor.getPerformanceSummary();
        if (summary) {
          setMetrics(summary);
        }
        lastUpdate = now;
      }
      
      // Use timeout instead of requestAnimationFrame for less frequent updates
      timeoutId = setTimeout(() => {
        if (isVisible) {
          animationFrameId = requestAnimationFrame(updateMetrics);
        }
      }, 1000); // Check every second
    };
    
    // Initial update
    const summary = performanceMonitor.getPerformanceSummary();
    if (summary) {
      setMetrics(summary);
    }
    
    // Start the update loop
    animationFrameId = requestAnimationFrame(updateMetrics);

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [isVisible]); // Re-run when visibility changes

  // Only show in development
  if (process.env.NODE_ENV !== 'development' || !metrics) {
    return null;
  }

  const getPerformanceColor = (value: number, threshold: number) => {
    if (value <= threshold) return 'text-green-600';
    if (value <= threshold * 2) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getPerformanceBg = (value: number, threshold: number) => {
    if (value <= threshold) return 'bg-green-100 dark:bg-green-900/20';
    if (value <= threshold * 2) return 'bg-yellow-100 dark:bg-yellow-900/20';
    return 'bg-red-100 dark:bg-red-900/20';
  };

  return (
    <div className={`fixed bottom-4 right-4 z-50 ${className}`}>
      {/* Toggle Button */}
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="mb-2 p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg transition-colors"
        title="Performance Monitor"
      >
        <BarChart3 className="w-4 h-4" />
      </button>

      {/* Performance Dashboard */}
      {isVisible && (
        <Card variant="floating" className="w-80 max-h-96 overflow-y-auto">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center space-x-2">
                <Activity className="w-5 h-5 text-blue-600" />
                <span>Performance Monitor</span>
              </h3>
              <button
                onClick={() => performanceMonitor.clearMetrics()}
                className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                Clear
              </button>
            </div>

            {/* Render Performance */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Avg Render Time
                </span>
                <span className={`text-sm font-bold ${getPerformanceColor(metrics.averageRenderTime, 16)}`}>
                  {metrics.averageRenderTime.toFixed(2)}ms
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Avg Function Time
                </span>
                <span className={`text-sm font-bold ${getPerformanceColor(metrics.averageFunctionTime, 10)}`}>
                  {metrics.averageFunctionTime.toFixed(2)}ms
                </span>
              </div>

              {/* Performance Bars */}
              <div className="space-y-2">
                <div>
                  <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                    <span>Render Performance</span>
                    <span>{metrics.averageRenderTime.toFixed(1)}ms</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${getPerformanceBg(metrics.averageRenderTime, 16)}`}
                      style={{ width: `${Math.min((metrics.averageRenderTime / 50) * 100, 100)}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                    <span>Function Performance</span>
                    <span>{metrics.averageFunctionTime.toFixed(1)}ms</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${getPerformanceBg(metrics.averageFunctionTime, 10)}`}
                      style={{ width: `${Math.min((metrics.averageFunctionTime / 30) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Alerts */}
              {(metrics.slowRenders > 0 || metrics.slowFunctions > 0) && (
                <div className="mt-3 p-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <div className="flex items-center space-x-2 text-yellow-800 dark:text-yellow-200">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="text-sm font-medium">Performance Issues</span>
                  </div>
                  <div className="mt-1 text-xs text-yellow-700 dark:text-yellow-300">
                    {metrics.slowRenders > 0 && (
                      <div>{metrics.slowRenders} slow renders detected</div>
                    )}
                    {metrics.slowFunctions > 0 && (
                      <div>{metrics.slowFunctions} slow functions detected</div>
                    )}
                  </div>
                </div>
              )}

              {/* Memory Usage */}
              {metrics.memoryUsage && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Memory Usage
                  </span>
                  <span className="text-sm font-bold text-blue-600">
                    {metrics.memoryUsage.toFixed(1)}MB
                  </span>
                </div>
              )}

              {/* Stats Summary */}
              <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                <div className="text-center">
                  <div className="text-lg font-bold text-gray-900 dark:text-white">
                    {metrics.totalRenders}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Renders
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-gray-900 dark:text-white">
                    {metrics.totalFunctions}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Functions
                  </div>
                </div>
              </div>

              {/* Performance Tips */}
              <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-center space-x-2 text-blue-800 dark:text-blue-200">
                  <Zap className="w-4 h-4" />
                  <span className="text-sm font-medium">Performance Tips</span>
                </div>
                <div className="mt-1 text-xs text-blue-700 dark:text-blue-300 space-y-1">
                  <div>• Use React.memo for expensive components</div>
                  <div>• Memoize expensive calculations with useMemo</div>
                  <div>• Use useCallback for event handlers</div>
                  <div>• Avoid inline objects in JSX</div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default PerformanceDashboard;
