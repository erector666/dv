import React, { createContext, useState, useContext, ReactNode } from 'react';
import { useQueryClient } from 'react-query';
import { useAuth } from './AuthContext';
import { UploadModal } from '../components/upload';

interface UploadModalContextType {
  openModal: () => void;
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

export const UploadModalProvider: React.FC<UploadModalProviderProps> = ({
  children,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();
  const { currentUser } = useAuth();

  const openModal = () => setIsOpen(true);
  const closeModal = () => setIsOpen(false);

  const handleUploadComplete = () => {
    // Debounce cache invalidation to prevent excessive re-renders during batch uploads
    setTimeout(() => {
      // Use the same query key as DocumentContext
      queryClient.invalidateQueries(['documents', currentUser?.uid]);
      // Also invalidate general documents queries for compatibility
      queryClient.invalidateQueries(['documents']);
    }, 500);

    // Close the modal
    closeModal();
  };

  return (
    <UploadModalContext.Provider value={{ openModal }}>
      {children}
      <UploadModal
        isOpen={isOpen}
        onClose={closeModal}
        onUploadComplete={handleUploadComplete}
      />
    </UploadModalContext.Provider>
  );
};
