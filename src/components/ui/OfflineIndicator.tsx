import React from 'react';
import { Wifi, WifiOff, Clock, CheckCircle, AlertCircle, Download } from 'lucide-react';
import { Card } from './Card';
import { AccessibleButton } from './AccessibleButton';
import { useOfflineSync } from '../../hooks/useOfflineSync';
import { clsx } from 'clsx';

export interface OfflineIndicatorProps {
  className?: string;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  expanded?: boolean;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({
  className = '',
  position = 'bottom-left',
  expanded = false,
}) => {
  const {
    isOnline,
    pendingActions,
    syncInProgress,
    lastSyncTime,
    storageUsed,
    storageLimit,
    storagePercentageUsed,
    getOfflineStatusMessage,
    syncPendingActions,
    clearOfflineData,
    exportOfflineData,
  } = useOfflineSync();

  const [isExpanded, setIsExpanded] = React.useState(expanded);

  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4',
  };

  const getStatusColor = () => {
    if (!isOnline) return 'bg-red-500';
    if (pendingActions.length > 0) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getStatusIcon = () => {
    if (!isOnline) return <WifiOff className="w-4 h-4" />;
    if (syncInProgress) return <Clock className="w-4 h-4 animate-pulse" />;
    if (pendingActions.length > 0) return <AlertCircle className="w-4 h-4" />;
    return <CheckCircle className="w-4 h-4" />;
  };

  return (
    <div className={clsx('fixed z-50', positionClasses[position], className)}>
      {/* Compact Indicator */}
      <div
        className={clsx(
          'flex items-center space-x-2 px-3 py-2 rounded-full shadow-lg transition-all duration-300 cursor-pointer',
          'hover:shadow-xl',
          isOnline ? 'bg-white dark:bg-gray-800' : 'bg-red-50 dark:bg-red-900/20',
          isExpanded && 'mb-2'
        )}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className={clsx('w-2 h-2 rounded-full', getStatusColor())} />
        <div className="text-white">
          {getStatusIcon()}
        </div>
        {!isExpanded && (
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {isOnline ? 'Online' : 'Offline'}
          </span>
        )}
      </div>

      {/* Expanded Panel */}
      {isExpanded && (
        <Card variant="floating" className="w-80 max-h-96 overflow-y-auto">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center space-x-2">
                {isOnline ? (
                  <Wifi className="w-5 h-5 text-green-500" />
                ) : (
                  <WifiOff className="w-5 h-5 text-red-500" />
                )}
                <span>Connection Status</span>
              </h3>
              <button
                onClick={() => setIsExpanded(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                ×
              </button>
            </div>

            {/* Status Information */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Status
                </span>
                <span className={clsx(
                  'text-sm font-bold',
                  isOnline ? 'text-green-600' : 'text-red-600'
                )}>
                  {getOfflineStatusMessage()}
                </span>
              </div>

              {lastSyncTime && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Last Sync
                  </span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {lastSyncTime.toLocaleTimeString()}
                  </span>
                </div>
              )}

              {/* Pending Actions */}
              {pendingActions.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Pending Actions
                    </span>
                    <span className="text-sm font-bold text-yellow-600">
                      {pendingActions.length}
                    </span>
                  </div>
                  
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {pendingActions.slice(0, 5).map((action) => (
                      <div key={action.id} className="flex items-center space-x-2 text-xs">
                        <div className={clsx(
                          'w-2 h-2 rounded-full',
                          action.error ? 'bg-red-400' : 'bg-yellow-400'
                        )} />
                        <span className="flex-1 truncate text-gray-600 dark:text-gray-400">
                          {action.type}: {action.data?.fileName || 'Unknown'}
                        </span>
                        {action.retries > 0 && (
                          <span className="text-red-500">
                            ({action.retries} retries)
                          </span>
                        )}
                      </div>
                    ))}
                    {pendingActions.length > 5 && (
                      <div className="text-xs text-gray-500 dark:text-gray-500 text-center">
                        +{pendingActions.length - 5} more
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Storage Usage */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Offline Storage
                  </span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {storagePercentageUsed.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className={clsx(
                      'h-2 rounded-full transition-all duration-300',
                      storagePercentageUsed > 80 ? 'bg-red-500' :
                      storagePercentageUsed > 60 ? 'bg-yellow-500' :
                      'bg-green-500'
                    )}
                    style={{ width: `${Math.min(storagePercentageUsed, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-500 mt-1">
                  <span>{(storageUsed / 1024 / 1024).toFixed(1)} MB</span>
                  <span>{(storageLimit / 1024 / 1024).toFixed(0)} MB</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                {isOnline && pendingActions.length > 0 && (
                  <AccessibleButton
                    variant="primary"
                    size="sm"
                    onClick={syncPendingActions}
                    disabled={syncInProgress}
                    loading={syncInProgress}
                    loadingText="Syncing..."
                    className="w-full"
                  >
                    Sync Now
                  </AccessibleButton>
                )}

                <div className="flex space-x-2">
                  <AccessibleButton
                    variant="secondary"
                    size="sm"
                    onClick={exportOfflineData}
                    icon={<Download className="w-4 h-4" />}
                    className="flex-1"
                  >
                    Export
                  </AccessibleButton>
                  
                  <AccessibleButton
                    variant="danger"
                    size="sm"
                    onClick={() => {
                      if (window.confirm('Clear all offline data? This cannot be undone.')) {
                        clearOfflineData();
                      }
                    }}
                    className="flex-1"
                  >
                    Clear
                  </AccessibleButton>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default OfflineIndicator;