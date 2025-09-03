import React, { createContext, useState, useContext, ReactNode } from 'react';
import { useQueryClient } from 'react-query';
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

  const openModal = () => setIsOpen(true);
  const closeModal = () => setIsOpen(false);

  const handleUploadComplete = () => {
    console.log('🔄 Upload completed, invalidating documents cache...');

    // Invalidate and refetch the documents query to show the new document
    queryClient.invalidateQueries(['documents']);

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
