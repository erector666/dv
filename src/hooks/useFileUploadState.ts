import { useState, useCallback, useMemo } from 'react';

export type FileUploadStatus = 'pending' | 'uploading' | 'processing' | 'completed' | 'error' | 'paused' | 'cancelled';

export interface FileUploadState {
  id: string;
  file: File;
  status: FileUploadStatus;
  progress: number;
  aiProgress?: {
    stage: string;
    progress: number;
    message: string;
  };
  error?: string;
  uploadStartTime?: number;
  uploadEndTime?: number;
  estimatedTimeRemaining?: number;
  retryCount: number;
  category?: string;
  tags?: string[];
  documentId?: string;
}

export interface UploadQueueStats {
  totalFiles: number;
  pendingFiles: number;
  uploadingFiles: number;
  processingFiles: number;
  completedFiles: number;
  errorFiles: number;
  pausedFiles: number;
  cancelledFiles: number;
  totalSize: number;
  uploadedSize: number;
  overallProgress: number;
  estimatedTimeRemaining?: number;
}

export const useFileUploadState = () => {
  const [fileStates, setFileStates] = useState<Map<string, FileUploadState>>(new Map());

  const addFiles = useCallback((files: File[], category?: string, tags?: string[]) => {
    setFileStates(prev => {
      const newMap = new Map(prev);
      files.forEach(file => {
        const id = `${file.name}-${file.size}-${Date.now()}-${Math.random()}`;
        newMap.set(id, {
          id,
          file,
          status: 'pending',
          progress: 0,
          retryCount: 0,
          category,
          tags,
        });
      });
      return newMap;
    });
  }, []);

  const removeFile = useCallback((id: string) => {
    setFileStates(prev => {
      const newMap = new Map(prev);
      newMap.delete(id);
      return newMap;
    });
  }, []);

  const removeFiles = useCallback((ids: string[]) => {
    setFileStates(prev => {
      const newMap = new Map(prev);
      ids.forEach(id => newMap.delete(id));
      return newMap;
    });
  }, []);

  const updateFileState = useCallback((id: string, updates: Partial<FileUploadState>) => {
    setFileStates(prev => {
      const newMap = new Map(prev);
      const existing = newMap.get(id);
      if (existing) {
        newMap.set(id, { ...existing, ...updates });
      }
      return newMap;
    });
  }, []);

  const updateFileProgress = useCallback((id: string, progress: number, estimatedTime?: number) => {
    updateFileState(id, { 
      progress, 
      estimatedTimeRemaining: estimatedTime,
      uploadStartTime: progress > 0 && !fileStates.get(id)?.uploadStartTime ? Date.now() : fileStates.get(id)?.uploadStartTime
    });
  }, [updateFileState, fileStates]);

  const updateFileAIProgress = useCallback((id: string, stage: string, progress: number, message: string) => {
    updateFileState(id, {
      aiProgress: { stage, progress, message }
    });
  }, [updateFileState]);

  const setFileError = useCallback((id: string, error: string) => {
    updateFileState(id, { 
      status: 'error', 
      error,
      uploadEndTime: Date.now()
    });
  }, [updateFileState]);

  const setFileCompleted = useCallback((id: string, documentId?: string) => {
    updateFileState(id, { 
      status: 'completed', 
      progress: 100,
      documentId,
      uploadEndTime: Date.now()
    });
  }, [updateFileState]);

  const retryFile = useCallback((id: string) => {
    const fileState = fileStates.get(id);
    if (fileState && fileState.status === 'error') {
      updateFileState(id, {
        status: 'pending',
        error: undefined,
        progress: 0,
        retryCount: fileState.retryCount + 1,
        uploadStartTime: undefined,
        uploadEndTime: undefined,
      });
    }
  }, [fileStates, updateFileState]);

  const pauseFile = useCallback((id: string) => {
    updateFileState(id, { status: 'paused' });
  }, [updateFileState]);

  const resumeFile = useCallback((id: string) => {
    const fileState = fileStates.get(id);
    if (fileState && fileState.status === 'paused') {
      updateFileState(id, { status: 'pending' });
    }
  }, [fileStates, updateFileState]);

  const cancelFile = useCallback((id: string) => {
    updateFileState(id, { 
      status: 'cancelled',
      uploadEndTime: Date.now()
    });
  }, [updateFileState]);

  const clearCompleted = useCallback(() => {
    setFileStates(prev => {
      const newMap = new Map();
      prev.forEach((state, id) => {
        if (state.status !== 'completed') {
          newMap.set(id, state);
        }
      });
      return newMap;
    });
  }, []);

  const clearAll = useCallback(() => {
    setFileStates(new Map());
  }, []);

  // Computed stats
  const stats = useMemo((): UploadQueueStats => {
    const files = Array.from(fileStates.values());
    const totalFiles = files.length;
    const totalSize = files.reduce((sum, file) => sum + file.file.size, 0);
    const uploadedSize = files.reduce((sum, file) => {
      return sum + (file.file.size * file.progress / 100);
    }, 0);

    const statusCounts = files.reduce((counts, file) => {
      counts[file.status] = (counts[file.status] || 0) + 1;
      return counts;
    }, {} as Record<FileUploadStatus, number>);

    const overallProgress = totalSize > 0 ? (uploadedSize / totalSize) * 100 : 0;

    // Calculate estimated time remaining based on upload speed
    const uploadingFiles = files.filter(f => f.status === 'uploading' && f.uploadStartTime);
    let estimatedTimeRemaining: number | undefined;
    
    if (uploadingFiles.length > 0 && overallProgress > 0) {
      const avgSpeed = uploadingFiles.reduce((sum, file) => {
        const elapsed = Date.now() - (file.uploadStartTime || Date.now());
        const uploaded = file.file.size * file.progress / 100;
        return sum + (uploaded / elapsed);
      }, 0) / uploadingFiles.length;

      if (avgSpeed > 0) {
        const remainingSize = totalSize - uploadedSize;
        estimatedTimeRemaining = remainingSize / avgSpeed;
      }
    }

    return {
      totalFiles,
      pendingFiles: statusCounts.pending || 0,
      uploadingFiles: statusCounts.uploading || 0,
      processingFiles: statusCounts.processing || 0,
      completedFiles: statusCounts.completed || 0,
      errorFiles: statusCounts.error || 0,
      pausedFiles: statusCounts.paused || 0,
      cancelledFiles: statusCounts.cancelled || 0,
      totalSize,
      uploadedSize,
      overallProgress,
      estimatedTimeRemaining,
    };
  }, [fileStates]);

  // Getters
  const getFileState = useCallback((id: string) => fileStates.get(id), [fileStates]);
  const getAllFiles = useCallback(() => Array.from(fileStates.values()), [fileStates]);
  const getFilesByStatus = useCallback((status: FileUploadStatus) => {
    return Array.from(fileStates.values()).filter(file => file.status === status);
  }, [fileStates]);

  return {
    // State
    fileStates,
    stats,
    
    // Actions
    addFiles,
    removeFile,
    removeFiles,
    updateFileState,
    updateFileProgress,
    updateFileAIProgress,
    setFileError,
    setFileCompleted,
    retryFile,
    pauseFile,
    resumeFile,
    cancelFile,
    clearCompleted,
    clearAll,
    
    // Getters
    getFileState,
    getAllFiles,
    getFilesByStatus,
  };
};

export default useFileUploadState;