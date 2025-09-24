import { useEffect, useRef, useCallback, useState } from 'react';

interface MemoryStats {
  usedJSHeapSize?: number;
  totalJSHeapSize?: number;
  jsHeapSizeLimit?: number;
  estimatedFileMemory: number;
  totalManagedObjects: number;
  warnings: string[];
}

interface ManagedResource {
  id: string;
  type: 'file' | 'blob' | 'url' | 'stream' | 'canvas' | 'image';
  size: number;
  created: number;
  lastAccessed: number;
  resource: any;
  cleanup?: () => void;
}

export const useMemoryManagement = (options?: {
  maxMemoryMB?: number;
  warningThresholdMB?: number;
  autoCleanup?: boolean;
  cleanupIntervalMs?: number;
}) => {
  const {
    maxMemoryMB = 500, // 500MB limit
    warningThresholdMB = 300, // Warn at 300MB
    autoCleanup = true,
    cleanupIntervalMs = 30000, // Cleanup every 30 seconds
  } = options || {};

  const [memoryStats, setMemoryStats] = useState<MemoryStats>({
    estimatedFileMemory: 0,
    totalManagedObjects: 0,
    warnings: [],
  });

  const managedResources = useRef<Map<string, ManagedResource>>(new Map());
  const cleanupIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const memoryWarnings = useRef<Set<string>>(new Set());

  // Get memory information
  const getMemoryStats = useCallback((): MemoryStats => {
    const resources = Array.from(managedResources.current.values());
    const estimatedFileMemory = resources.reduce((total, resource) => total + resource.size, 0);
    const warnings: string[] = [];

    // Browser memory info (if available)
    let browserMemory: any = {};
    if ('memory' in performance) {
      const perfMemory = (performance as any).memory;
      browserMemory = {
        usedJSHeapSize: perfMemory.usedJSHeapSize,
        totalJSHeapSize: perfMemory.totalJSHeapSize,
        jsHeapSizeLimit: perfMemory.jsHeapSizeLimit,
      };
    }

    // Check for memory warnings
    const estimatedMB = estimatedFileMemory / (1024 * 1024);
    if (estimatedMB > warningThresholdMB) {
      warnings.push(`High file memory usage: ${estimatedMB.toFixed(1)}MB`);
    }

    if (browserMemory.usedJSHeapSize) {
      const usedMB = browserMemory.usedJSHeapSize / (1024 * 1024);
      if (usedMB > warningThresholdMB) {
        warnings.push(`High JavaScript heap usage: ${usedMB.toFixed(1)}MB`);
      }
    }

    // Check for old resources
    const now = Date.now();
    const oldResources = resources.filter(r => now - r.lastAccessed > 300000); // 5 minutes
    if (oldResources.length > 0) {
      warnings.push(`${oldResources.length} unused resources (older than 5 minutes)`);
    }

    return {
      ...browserMemory,
      estimatedFileMemory,
      totalManagedObjects: resources.length,
      warnings,
    };
  }, [warningThresholdMB]);

  // Register a resource for management
  const registerResource = useCallback((
    id: string,
    type: ManagedResource['type'],
    resource: any,
    size: number = 0,
    cleanup?: () => void
  ) => {
    const managedResource: ManagedResource = {
      id,
      type,
      size,
      created: Date.now(),
      lastAccessed: Date.now(),
      resource,
      cleanup,
    };

    managedResources.current.set(id, managedResource);

    // Auto-estimate size for common types
    if (size === 0) {
      if (type === 'file' && resource instanceof File) {
        managedResource.size = resource.size;
      } else if (type === 'blob' && resource instanceof Blob) {
        managedResource.size = resource.size;
      } else if (type === 'canvas' && resource instanceof HTMLCanvasElement) {
        managedResource.size = resource.width * resource.height * 4; // RGBA
      }
    }

    return id;
  }, []);

  // Access a resource (updates last accessed time)
  const accessResource = useCallback((id: string) => {
    const resource = managedResources.current.get(id);
    if (resource) {
      resource.lastAccessed = Date.now();
      return resource.resource;
    }
    return null;
  }, []);

  // Unregister and cleanup a resource
  const unregisterResource = useCallback((id: string) => {
    const resource = managedResources.current.get(id);
    if (resource) {
      // Call custom cleanup function
      if (resource.cleanup) {
        try {
          resource.cleanup();
        } catch (error) {
          console.warn(`Error during cleanup of resource ${id}:`, error);
        }
      }

      // Built-in cleanup for common types
      if (resource.type === 'url' && typeof resource.resource === 'string') {
        URL.revokeObjectURL(resource.resource);
      } else if (resource.type === 'stream' && resource.resource?.getTracks) {
        resource.resource.getTracks().forEach((track: MediaStreamTrack) => track.stop());
      } else if (resource.type === 'canvas' && resource.resource instanceof HTMLCanvasElement) {
        const ctx = resource.resource.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, resource.resource.width, resource.resource.height);
        }
      }

      managedResources.current.delete(id);
      return true;
    }
    return false;
  }, []);

  // Cleanup old or unused resources
  const cleanupOldResources = useCallback((maxAgeMs: number = 600000) => { // 10 minutes default
    const now = Date.now();
    const resourcesToCleanup: string[] = [];

    managedResources.current.forEach((resource, id) => {
      if (now - resource.lastAccessed > maxAgeMs) {
        resourcesToCleanup.push(id);
      }
    });

    let cleanedCount = 0;
    resourcesToCleanup.forEach(id => {
      if (unregisterResource(id)) {
        cleanedCount++;
      }
    });

    return cleanedCount;
  }, [unregisterResource]);

  // Force cleanup to reduce memory usage
  const forceCleanup = useCallback((targetReductionMB: number = 100) => {
    const resources = Array.from(managedResources.current.entries())
      .sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed); // Oldest first

    let cleanedMemory = 0;
    let cleanedCount = 0;
    const targetBytes = targetReductionMB * 1024 * 1024;

    for (const [id, resource] of resources) {
      if (cleanedMemory >= targetBytes) break;
      
      if (unregisterResource(id)) {
        cleanedMemory += resource.size;
        cleanedCount++;
      }
    }

    return { cleanedCount, cleanedMemory };
  }, [unregisterResource]);

  // Register file with automatic cleanup
  const registerFile = useCallback((file: File, id?: string): string => {
    const resourceId = id || `file_${file.name}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return registerResource(resourceId, 'file', file, file.size);
  }, [registerResource]);

  // Register blob URL with automatic cleanup
  const registerBlobUrl = useCallback((blob: Blob, id?: string): string => {
    const url = URL.createObjectURL(blob);
    const resourceId = id || `blob_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    registerResource(resourceId, 'url', url, blob.size, () => {
      URL.revokeObjectURL(url);
    });
    
    return url;
  }, [registerResource]);

  // Register media stream with cleanup
  const registerMediaStream = useCallback((stream: MediaStream, id?: string): string => {
    const resourceId = id || `stream_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    registerResource(resourceId, 'stream', stream, 0, () => {
      stream.getTracks().forEach(track => track.stop());
    });
    
    return resourceId;
  }, [registerResource]);

  // Register canvas with cleanup
  const registerCanvas = useCallback((canvas: HTMLCanvasElement, id?: string): string => {
    const resourceId = id || `canvas_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const size = canvas.width * canvas.height * 4; // RGBA bytes
    
    registerResource(resourceId, 'canvas', canvas, size, () => {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    });
    
    return resourceId;
  }, [registerResource]);

  // Check if memory usage is too high
  const isMemoryHigh = useCallback((): boolean => {
    const stats = getMemoryStats();
    const estimatedMB = stats.estimatedFileMemory / (1024 * 1024);
    
    if (estimatedMB > maxMemoryMB) return true;
    
    if (stats.usedJSHeapSize) {
      const usedMB = stats.usedJSHeapSize / (1024 * 1024);
      if (usedMB > maxMemoryMB) return true;
    }
    
    return false;
  }, [getMemoryStats, maxMemoryMB]);

  // Automatic cleanup interval
  useEffect(() => {
    if (autoCleanup) {
      cleanupIntervalRef.current = setInterval(() => {
        const cleanedCount = cleanupOldResources();
        
        // If memory is still high after cleanup, force more aggressive cleanup
        if (isMemoryHigh()) {
          const { cleanedCount: forceCleanedCount } = forceCleanup(50); // Try to free 50MB
          console.warn(`Memory usage high. Cleaned up ${cleanedCount + forceCleanedCount} resources.`);
        }
        
        // Update stats
        setMemoryStats(getMemoryStats());
      }, cleanupIntervalMs);
    }

    return () => {
      if (cleanupIntervalRef.current) {
        clearInterval(cleanupIntervalRef.current);
      }
    };
  }, [autoCleanup, cleanupIntervalMs, cleanupOldResources, isMemoryHigh, forceCleanup, getMemoryStats]);

  // Update stats periodically
  useEffect(() => {
    const updateStats = () => setMemoryStats(getMemoryStats());
    updateStats();
    
    const interval = setInterval(updateStats, 5000); // Update every 5 seconds
    return () => clearInterval(interval);
  }, [getMemoryStats]);

  // Cleanup all resources on unmount
  useEffect(() => {
    return () => {
      managedResources.current.forEach((resource, id) => {
        unregisterResource(id);
      });
    };
  }, [unregisterResource]);

  // Format memory size for display
  const formatMemorySize = useCallback((bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }, []);

  return {
    // Stats
    memoryStats,
    isMemoryHigh: isMemoryHigh(),
    
    // Resource management
    registerResource,
    unregisterResource,
    accessResource,
    
    // Specialized registration
    registerFile,
    registerBlobUrl,
    registerMediaStream,
    registerCanvas,
    
    // Cleanup
    cleanupOldResources,
    forceCleanup,
    
    // Utilities
    formatMemorySize,
    getMemoryStats,
  };
};

export default useMemoryManagement;