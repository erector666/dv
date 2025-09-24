import { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from 'react-query';

export interface OfflineAction {
  id: string;
  type: 'upload' | 'delete' | 'update' | 'reprocess';
  data: any;
  timestamp: number;
  retries: number;
  error?: string;
}

export interface OfflineState {
  isOnline: boolean;
  pendingActions: OfflineAction[];
  syncInProgress: boolean;
  lastSyncTime?: Date;
  storageUsed: number;
  storageLimit: number;
}

const STORAGE_KEY = 'dashboard_offline_data';
const ACTIONS_KEY = 'dashboard_pending_actions';
const MAX_RETRIES = 3;
const SYNC_INTERVAL = 30000; // 30 seconds

/**
 * Offline functionality with data caching and sync capabilities
 */
export const useOfflineSync = () => {
  const queryClient = useQueryClient();
  const [offlineState, setOfflineState] = useState<OfflineState>({
    isOnline: navigator.onLine,
    pendingActions: [],
    syncInProgress: false,
    storageUsed: 0,
    storageLimit: 50 * 1024 * 1024, // 50MB default
  });

  // Initialize offline data on mount
  useEffect(() => {
    loadOfflineData();
    loadPendingActions();
    updateStorageUsage();
    
    // Set up online/offline listeners
    const handleOnline = () => {
      setOfflineState(prev => ({ ...prev, isOnline: true }));
      syncPendingActions();
    };
    
    const handleOffline = () => {
      setOfflineState(prev => ({ ...prev, isOnline: false }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Set up periodic sync when online
    const syncInterval = setInterval(() => {
      if (navigator.onLine && offlineState.pendingActions.length > 0) {
        syncPendingActions();
      }
    }, SYNC_INTERVAL);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(syncInterval);
    };
  }, []);

  // Load cached offline data
  const loadOfflineData = useCallback(() => {
    try {
      const cachedData = localStorage.getItem(STORAGE_KEY);
      if (cachedData) {
        const data = JSON.parse(cachedData);
        // Restore cached queries to React Query
        Object.entries(data).forEach(([queryKey, queryData]) => {
          queryClient.setQueryData(JSON.parse(queryKey), queryData);
        });
      }
    } catch (error) {
      console.error('Failed to load offline data:', error);
    }
  }, [queryClient]);

  // Load pending actions
  const loadPendingActions = useCallback(() => {
    try {
      const actionsData = localStorage.getItem(ACTIONS_KEY);
      if (actionsData) {
        const actions = JSON.parse(actionsData);
        setOfflineState(prev => ({ ...prev, pendingActions: actions }));
      }
    } catch (error) {
      console.error('Failed to load pending actions:', error);
    }
  }, []);

  // Save data for offline access
  const cacheData = useCallback((queryKey: string, data: any) => {
    try {
      const cachedData = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      cachedData[queryKey] = data;
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cachedData));
      updateStorageUsage();
    } catch (error) {
      console.error('Failed to cache data:', error);
      // If storage is full, try to clear old data
      clearOldCache();
    }
  }, []);

  // Add action to pending queue
  const addPendingAction = useCallback((action: Omit<OfflineAction, 'id' | 'timestamp' | 'retries'>) => {
    const newAction: OfflineAction = {
      ...action,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      retries: 0,
    };

    setOfflineState(prev => {
      const updatedActions = [...prev.pendingActions, newAction];
      
      // Save to localStorage
      try {
        localStorage.setItem(ACTIONS_KEY, JSON.stringify(updatedActions));
      } catch (error) {
        console.error('Failed to save pending actions:', error);
      }
      
      return { ...prev, pendingActions: updatedActions };
    });

    // Try to sync immediately if online
    if (navigator.onLine) {
      setTimeout(() => syncPendingActions(), 1000);
    }

    return newAction.id;
  }, []);

  // Sync pending actions with server
  const syncPendingActions = useCallback(async () => {
    if (offlineState.syncInProgress || offlineState.pendingActions.length === 0) {
      return;
    }

    setOfflineState(prev => ({ ...prev, syncInProgress: true }));

    const actionsToSync = [...offlineState.pendingActions];
    const completedActions: string[] = [];
    const failedActions: OfflineAction[] = [];

    for (const action of actionsToSync) {
      try {
        await processOfflineAction(action);
        completedActions.push(action.id);
      } catch (error) {
        const updatedAction = {
          ...action,
          retries: action.retries + 1,
          error: error instanceof Error ? error.message : 'Unknown error',
        };

        if (updatedAction.retries >= MAX_RETRIES) {
          // Max retries reached, remove from queue but log error
          console.error(`Action ${action.id} failed after ${MAX_RETRIES} retries:`, error);
          completedActions.push(action.id);
        } else {
          failedActions.push(updatedAction);
        }
      }
    }

    // Update pending actions
    setOfflineState(prev => {
      const remainingActions = failedActions;
      
      // Save updated actions
      try {
        localStorage.setItem(ACTIONS_KEY, JSON.stringify(remainingActions));
      } catch (error) {
        console.error('Failed to save updated actions:', error);
      }

      return {
        ...prev,
        pendingActions: remainingActions,
        syncInProgress: false,
        lastSyncTime: new Date(),
      };
    });

    // Invalidate relevant queries to refresh data
    if (completedActions.length > 0) {
      queryClient.invalidateQueries(['documents']);
    }
  }, [offlineState, queryClient]);

  // Process individual offline action
  const processOfflineAction = async (action: OfflineAction): Promise<void> => {
    const { type, data } = action;

    switch (type) {
      case 'upload':
        // Re-implement upload logic
        const { uploadDocumentWithAI } = await import('../services/documentService');
        await uploadDocumentWithAI(
          data.file,
          data.userId,
          data.category,
          data.tags,
          data.metadata
        );
        break;

      case 'delete':
        const { deleteDocument } = await import('../services/documentService');
        await deleteDocument(data.documentId, data.firestoreId);
        break;

      case 'update':
        const { updateDocument } = await import('../services/documentService');
        await updateDocument(data.documentId, data.updates);
        break;

      case 'reprocess':
        // Re-implement reprocess logic
        console.log('Reprocessing document offline:', data);
        break;

      default:
        throw new Error(`Unknown action type: ${type}`);
    }
  };

  // Update storage usage calculation
  const updateStorageUsage = useCallback(() => {
    try {
      let totalSize = 0;
      
      // Calculate localStorage usage
      for (const key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
          totalSize += localStorage[key].length;
        }
      }

      setOfflineState(prev => ({ ...prev, storageUsed: totalSize }));
    } catch (error) {
      console.error('Failed to calculate storage usage:', error);
    }
  }, []);

  // Clear old cached data to free up space
  const clearOldCache = useCallback(() => {
    try {
      const cachedData = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      const sortedEntries = Object.entries(cachedData)
        .map(([key, value]: [string, any]) => ({
          key,
          value,
          timestamp: value.dataUpdatedAt || 0,
        }))
        .sort((a, b) => a.timestamp - b.timestamp);

      // Remove oldest 25% of entries
      const toRemove = Math.ceil(sortedEntries.length * 0.25);
      const newCachedData: any = {};
      
      sortedEntries.slice(toRemove).forEach(({ key, value }) => {
        newCachedData[key] = value;
      });

      localStorage.setItem(STORAGE_KEY, JSON.stringify(newCachedData));
      updateStorageUsage();
    } catch (error) {
      console.error('Failed to clear old cache:', error);
    }
  }, [updateStorageUsage]);

  // Clear all offline data
  const clearOfflineData = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(ACTIONS_KEY);
      setOfflineState(prev => ({
        ...prev,
        pendingActions: [],
        storageUsed: 0,
      }));
      queryClient.clear();
    } catch (error) {
      console.error('Failed to clear offline data:', error);
    }
  }, [queryClient]);

  // Export offline data for backup
  const exportOfflineData = useCallback(() => {
    try {
      const offlineData = localStorage.getItem(STORAGE_KEY);
      const pendingActions = localStorage.getItem(ACTIONS_KEY);
      
      const exportData = {
        timestamp: new Date().toISOString(),
        cachedData: offlineData ? JSON.parse(offlineData) : {},
        pendingActions: pendingActions ? JSON.parse(pendingActions) : [],
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json',
      });
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `dashboard-offline-backup-${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export offline data:', error);
    }
  }, []);

  // Check if specific data is available offline
  const isDataAvailableOffline = useCallback((queryKey: string) => {
    try {
      const cachedData = localStorage.getItem(STORAGE_KEY);
      if (cachedData) {
        const data = JSON.parse(cachedData);
        return queryKey in data;
      }
      return false;
    } catch (error) {
      return false;
    }
  }, []);

  // Get offline status message
  const getOfflineStatusMessage = useCallback(() => {
    if (offlineState.isOnline) {
      if (offlineState.pendingActions.length > 0) {
        return `Online - ${offlineState.pendingActions.length} actions pending sync`;
      }
      return 'Online';
    } else {
      return `Offline - ${offlineState.pendingActions.length} actions queued`;
    }
  }, [offlineState]);

  return {
    // State
    ...offlineState,
    
    // Actions
    cacheData,
    addPendingAction,
    syncPendingActions,
    clearOfflineData,
    exportOfflineData,
    
    // Utilities
    isDataAvailableOffline,
    getOfflineStatusMessage,
    storagePercentageUsed: (offlineState.storageUsed / offlineState.storageLimit) * 100,
  };
};