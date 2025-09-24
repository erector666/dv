import { useState, useCallback, useRef, useEffect } from 'react';
import { FileUploadState, FileUploadStatus } from './useFileUploadState';

export interface UploadPriority {
  level: 'low' | 'normal' | 'high' | 'urgent';
  weight: number;
}

export interface QueuedUpload extends FileUploadState {
  priority: UploadPriority;
  attempts: number;
  maxRetries: number;
  backoffMultiplier: number;
  nextRetryTime?: number;
  uploadFunction: (file: File, onProgress: (progress: number) => void) => Promise<any>;
}

export interface QueueConfig {
  maxConcurrent: number;
  maxRetries: number;
  baseBackoffMs: number;
  maxBackoffMs: number;
  priorityWeights: Record<UploadPriority['level'], number>;
  networkAware: boolean;
  backgroundMode: boolean;
}

export interface NetworkCondition {
  type: 'slow-2g' | '2g' | '3g' | '4g' | 'wifi' | 'unknown';
  downlink: number;
  effectiveType: string;
  rtt: number;
}

const defaultConfig: QueueConfig = {
  maxConcurrent: 3,
  maxRetries: 3,
  baseBackoffMs: 1000,
  maxBackoffMs: 30000,
  priorityWeights: {
    urgent: 4,
    high: 3,
    normal: 2,
    low: 1,
  },
  networkAware: true,
  backgroundMode: false,
};

export const useSmartUploadQueue = (config: Partial<QueueConfig> = {}) => {
  const fullConfig = { ...defaultConfig, ...config };
  
  const [queue, setQueue] = useState<QueuedUpload[]>([]);
  const [activeUploads, setActiveUploads] = useState<Map<string, AbortController>>(new Map());
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [networkCondition, setNetworkCondition] = useState<NetworkCondition | null>(null);
  
  const processingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const backgroundSyncRef = useRef<ServiceWorkerRegistration | null>(null);

  // Network condition monitoring
  useEffect(() => {
    if (fullConfig.networkAware && 'connection' in navigator) {
      const connection = (navigator as any).connection;
      
      const updateNetworkCondition = () => {
        setNetworkCondition({
          type: connection.effectiveType || 'unknown',
          downlink: connection.downlink || 0,
          effectiveType: connection.effectiveType || 'unknown',
          rtt: connection.rtt || 0,
        });
      };

      updateNetworkCondition();
      connection.addEventListener('change', updateNetworkCondition);
      
      return () => {
        connection.removeEventListener('change', updateNetworkCondition);
      };
    }
  }, [fullConfig.networkAware]);

  // Adjust concurrent uploads based on network condition
  const getOptimalConcurrency = useCallback(() => {
    if (!fullConfig.networkAware || !networkCondition) {
      return fullConfig.maxConcurrent;
    }

    switch (networkCondition.type) {
      case 'slow-2g':
        return 1;
      case '2g':
        return 1;
      case '3g':
        return 2;
      case '4g':
      case 'wifi':
        return fullConfig.maxConcurrent;
      default:
        return Math.max(1, Math.floor(fullConfig.maxConcurrent / 2));
    }
  }, [fullConfig.maxConcurrent, fullConfig.networkAware, networkCondition]);

  // Calculate upload priority score
  const calculatePriorityScore = useCallback((upload: QueuedUpload): number => {
    const baseScore = fullConfig.priorityWeights[upload.priority.level];
    const sizeBonus = Math.max(0, 10 - upload.file.size / (1024 * 1024)); // Smaller files get priority
    const ageBonus = Math.min(5, (Date.now() - upload.created) / (1000 * 60)); // Older uploads get slight priority
    const retryPenalty = upload.attempts * 2; // Failed uploads get lower priority
    
    return baseScore + sizeBonus + ageBonus - retryPenalty;
  }, [fullConfig.priorityWeights]);

  // Sort queue by priority
  const sortQueueByPriority = useCallback((uploads: QueuedUpload[]): QueuedUpload[] => {
    return [...uploads].sort((a, b) => {
      const scoreA = calculatePriorityScore(a);
      const scoreB = calculatePriorityScore(b);
      return scoreB - scoreA; // Higher score first
    });
  }, [calculatePriorityScore]);

  // Add upload to queue
  const addToQueue = useCallback((
    fileState: FileUploadState,
    uploadFunction: QueuedUpload['uploadFunction'],
    priority: UploadPriority['level'] = 'normal',
    maxRetries?: number
  ) => {
    const queuedUpload: QueuedUpload = {
      ...fileState,
      priority: {
        level: priority,
        weight: fullConfig.priorityWeights[priority],
      },
      attempts: 0,
      maxRetries: maxRetries || fullConfig.maxRetries,
      backoffMultiplier: 1,
      uploadFunction,
    };

    setQueue(prev => sortQueueByPriority([...prev, queuedUpload]));
    return queuedUpload.id;
  }, [fullConfig.priorityWeights, fullConfig.maxRetries, sortQueueByPriority]);

  // Remove upload from queue
  const removeFromQueue = useCallback((uploadId: string) => {
    // Cancel if actively uploading
    const controller = activeUploads.get(uploadId);
    if (controller) {
      controller.abort();
      setActiveUploads(prev => {
        const newMap = new Map(prev);
        newMap.delete(uploadId);
        return newMap;
      });
    }

    setQueue(prev => prev.filter(upload => upload.id !== uploadId));
  }, [activeUploads]);

  // Update upload priority
  const updatePriority = useCallback((uploadId: string, priority: UploadPriority['level']) => {
    setQueue(prev => {
      const updated = prev.map(upload => 
        upload.id === uploadId
          ? {
              ...upload,
              priority: {
                level: priority,
                weight: fullConfig.priorityWeights[priority],
              },
            }
          : upload
      );
      return sortQueueByPriority(updated);
    });
  }, [fullConfig.priorityWeights, sortQueueByPriority]);

  // Calculate exponential backoff delay
  const calculateBackoffDelay = useCallback((upload: QueuedUpload): number => {
    const baseDelay = fullConfig.baseBackoffMs * Math.pow(2, upload.attempts) * upload.backoffMultiplier;
    const jitter = Math.random() * 0.3 * baseDelay; // Add jitter to prevent thundering herd
    return Math.min(baseDelay + jitter, fullConfig.maxBackoffMs);
  }, [fullConfig.baseBackoffMs, fullConfig.maxBackoffMs]);

  // Process single upload
  const processUpload = useCallback(async (upload: QueuedUpload): Promise<void> => {
    const controller = new AbortController();
    
    // Add to active uploads
    setActiveUploads(prev => new Map(prev).set(upload.id, controller));
    
    // Update status to uploading
    setQueue(prev => prev.map(u => 
      u.id === upload.id 
        ? { ...u, status: 'uploading' as FileUploadStatus, attempts: u.attempts + 1 }
        : u
    ));

    try {
      const onProgress = (progress: number) => {
        if (!controller.signal.aborted) {
          setQueue(prev => prev.map(u => 
            u.id === upload.id ? { ...u, progress } : u
          ));
        }
      };

      const result = await upload.uploadFunction(upload.file, onProgress);
      
      if (!controller.signal.aborted) {
        // Success - remove from queue
        setQueue(prev => prev.filter(u => u.id !== upload.id));
        setActiveUploads(prev => {
          const newMap = new Map(prev);
          newMap.delete(upload.id);
          return newMap;
        });
      }
      
    } catch (error) {
      if (!controller.signal.aborted) {
        const shouldRetry = upload.attempts < upload.maxRetries;
        
        if (shouldRetry) {
          // Calculate next retry time
          const backoffDelay = calculateBackoffDelay(upload);
          const nextRetryTime = Date.now() + backoffDelay;
          
          // Update upload with error and retry info
          setQueue(prev => prev.map(u => 
            u.id === upload.id 
              ? {
                  ...u,
                  status: 'error' as FileUploadStatus,
                  error: error instanceof Error ? error.message : 'Upload failed',
                  nextRetryTime,
                  backoffMultiplier: u.backoffMultiplier * 1.5, // Increase backoff for subsequent retries
                }
              : u
          ));
          
          // Schedule retry
          setTimeout(() => {
            setQueue(prev => prev.map(u => 
              u.id === upload.id && u.nextRetryTime === nextRetryTime
                ? { ...u, status: 'pending' as FileUploadStatus, nextRetryTime: undefined }
                : u
            ));
          }, backoffDelay);
          
        } else {
          // Max retries exceeded - mark as failed
          setQueue(prev => prev.map(u => 
            u.id === upload.id 
              ? {
                  ...u,
                  status: 'error' as FileUploadStatus,
                  error: `Upload failed after ${upload.maxRetries} attempts: ${error instanceof Error ? error.message : 'Unknown error'}`,
                }
              : u
          ));
        }
        
        // Remove from active uploads
        setActiveUploads(prev => {
          const newMap = new Map(prev);
          newMap.delete(upload.id);
          return newMap;
        });
      }
    }
  }, [calculateBackoffDelay]);

  // Main queue processor
  const processQueue = useCallback(async () => {
    if (isPaused || !isProcessing) return;

    const optimalConcurrency = getOptimalConcurrency();
    const currentActive = activeUploads.size;
    const availableSlots = optimalConcurrency - currentActive;
    
    if (availableSlots <= 0) return;

    // Get pending uploads that are ready to process
    const now = Date.now();
    const readyUploads = queue
      .filter(upload => 
        upload.status === 'pending' && 
        (!upload.nextRetryTime || upload.nextRetryTime <= now)
      )
      .slice(0, availableSlots);

    // Process uploads concurrently
    const promises = readyUploads.map(upload => processUpload(upload));
    await Promise.allSettled(promises);
    
  }, [isPaused, isProcessing, getOptimalConcurrency, activeUploads.size, queue, processUpload]);

  // Start queue processing
  const startProcessing = useCallback(() => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    setIsPaused(false);
    
    // Process immediately
    processQueue();
    
    // Set up interval for continuous processing
    processingIntervalRef.current = setInterval(() => {
      processQueue();
    }, 1000); // Check every second
    
  }, [isProcessing, processQueue]);

  // Stop queue processing
  const stopProcessing = useCallback(() => {
    setIsProcessing(false);
    
    if (processingIntervalRef.current) {
      clearInterval(processingIntervalRef.current);
      processingIntervalRef.current = null;
    }
    
    // Abort all active uploads
    activeUploads.forEach(controller => controller.abort());
    setActiveUploads(new Map());
    
  }, [activeUploads]);

  // Pause queue processing
  const pauseProcessing = useCallback(() => {
    setIsPaused(true);
  }, []);

  // Resume queue processing
  const resumeProcessing = useCallback(() => {
    setIsPaused(false);
  }, []);

  // Clear completed and failed uploads
  const clearCompleted = useCallback(() => {
    setQueue(prev => prev.filter(upload => 
      upload.status !== 'completed' && 
      (upload.status !== 'error' || upload.attempts < upload.maxRetries)
    ));
  }, []);

  // Clear all uploads
  const clearAll = useCallback(() => {
    stopProcessing();
    setQueue([]);
  }, [stopProcessing]);

  // Retry failed uploads
  const retryFailed = useCallback(() => {
    setQueue(prev => prev.map(upload => 
      upload.status === 'error' && upload.attempts < upload.maxRetries
        ? { 
            ...upload, 
            status: 'pending' as FileUploadStatus, 
            error: undefined,
            nextRetryTime: undefined,
            attempts: Math.max(0, upload.attempts - 1), // Give it another chance
          }
        : upload
    ));
  }, []);

  // Background sync registration (if supported)
  useEffect(() => {
    if (fullConfig.backgroundMode && 'serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(registration => {
        backgroundSyncRef.current = registration;
        
        // Register background sync if there are pending uploads
        if (queue.some(u => u.status === 'pending' || u.status === 'error')) {
          registration.sync.register('upload-queue').catch(console.error);
        }
      });
    }
  }, [fullConfig.backgroundMode, queue]);

  // Auto-start processing when uploads are added
  useEffect(() => {
    if (queue.some(u => u.status === 'pending') && !isProcessing && !isPaused) {
      startProcessing();
    }
  }, [queue, isProcessing, isPaused, startProcessing]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopProcessing();
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [stopProcessing]);

  // Queue statistics
  const queueStats = {
    total: queue.length,
    pending: queue.filter(u => u.status === 'pending').length,
    uploading: activeUploads.size,
    completed: queue.filter(u => u.status === 'completed').length,
    failed: queue.filter(u => u.status === 'error' && u.attempts >= u.maxRetries).length,
    retrying: queue.filter(u => u.status === 'error' && u.attempts < u.maxRetries).length,
  };

  return {
    // State
    queue,
    activeUploads: Array.from(activeUploads.keys()),
    isProcessing,
    isPaused,
    networkCondition,
    queueStats,
    
    // Queue management
    addToQueue,
    removeFromQueue,
    updatePriority,
    
    // Processing control
    startProcessing,
    stopProcessing,
    pauseProcessing,
    resumeProcessing,
    
    // Utilities
    clearCompleted,
    clearAll,
    retryFailed,
    
    // Configuration
    getOptimalConcurrency,
  };
};

export default useSmartUploadQueue;