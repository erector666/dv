import React, { createContext, useState, useContext, ReactNode, useCallback } from 'react';
import { useQueryClient } from 'react-query';
import { UploadModal } from '../components/upload';

export type UploadStatus = 'idle' | 'uploading' | 'completed' | 'error' | 'paused';

export interface UploadStats {
  totalFiles: number;
  completedFiles: number;
  failedFiles: number;
  totalSize: number;
  uploadedSize: number;
  estimatedTimeRemaining?: number;
}

interface UploadModalContextType {
  isOpen: boolean;
  uploadStatus: UploadStatus;
  uploadStats: UploadStats;
  openModal: () => void;
  closeModal: () => void;
  setUploadStatus: (status: UploadStatus) => void;
  updateUploadStats: (stats: Partial<UploadStats>) => void;
  resetUploadStats: () => void;
}

const UploadModalContext = createContext<UploadModalContextType | undefined>(
  undefined
);

export const useUploadModal = () => {
  const context = useContext(UploadModalContext);
  if (!context) {
    throw new Error(
      'useUploadModal must be used within an UploadModalProvider'
    );
  }
  return context;
};

interface UploadModalProviderProps {
  children: ReactNode;
}

const initialUploadStats: UploadStats = {
  totalFiles: 0,
  completedFiles: 0,
  failedFiles: 0,
  totalSize: 0,
  uploadedSize: 0,
  estimatedTimeRemaining: undefined,
};

export const UploadModalProvider: React.FC<UploadModalProviderProps> = ({
  children,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle');
  const [uploadStats, setUploadStats] = useState<UploadStats>(initialUploadStats);
  const queryClient = useQueryClient();

  const openModal = useCallback(() => {
    setIsOpen(true);
    if (uploadStatus === 'completed' || uploadStatus === 'error') {
      setUploadStatus('idle');
      resetUploadStats();
    }
  }, [uploadStatus]);

  const closeModal = useCallback(() => {
    setIsOpen(false);
    // Reset status after a delay to allow for smooth closing animation
    setTimeout(() => {
      if (uploadStatus !== 'uploading') {
        setUploadStatus('idle');
        resetUploadStats();
      }
    }, 300);
  }, [uploadStatus]);

  const updateUploadStats = useCallback((stats: Partial<UploadStats>) => {
    setUploadStats(prev => ({ ...prev, ...stats }));
  }, []);

  const resetUploadStats = useCallback(() => {
    setUploadStats(initialUploadStats);
  }, []);

  const handleUploadComplete = useCallback((keepOpen?: boolean) => {
    // Debounce cache invalidation to prevent excessive re-renders during batch uploads
    setTimeout(() => {
      queryClient.invalidateQueries(['documents']);
    }, 500);

    setUploadStatus('completed');

    // Only close modal if not requested to keep open
    if (!keepOpen) {
      setTimeout(() => {
        closeModal();
      }, 2000); // Give time to show completion state
    }
  }, [queryClient, closeModal]);

  return (
    <UploadModalContext.Provider 
      value={{ 
        isOpen,
        uploadStatus,
        uploadStats,
        openModal,
        closeModal,
        setUploadStatus,
        updateUploadStats,
        resetUploadStats,
      }}
    >
      {children}
      <UploadModal
        isOpen={isOpen}
        onClose={closeModal}
        onUploadComplete={handleUploadComplete}
      />
    </UploadModalContext.Provider>
  );
};
