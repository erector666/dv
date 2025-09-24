import { useCallback } from 'react';
import { Document } from '../services/documentService';

export interface DocumentInteractionHandlers {
  handleDocumentClick: (document: Document) => void;
  handleDeleteDocument: (document: Document) => void;
  handleReprocessDocument: (document: Document) => void;
  handleDownloadDocument: (document: Document) => void;
  handleViewDocument: (document: Document) => void;
}

export interface UseDocumentInteractionsProps {
  onDocumentClick?: (document: Document) => void;
  onDeleteDocument?: (document: Document) => void;
  onReprocessDocument?: (document: Document) => void;
  onDownloadDocument?: (document: Document) => void;
  onViewDocument?: (document: Document) => void;
}

/**
 * Optimized document interaction handlers
 * Provides memoized callbacks to prevent unnecessary re-renders
 */
export const useDocumentInteractions = ({
  onDocumentClick,
  onDeleteDocument,
  onReprocessDocument,
  onDownloadDocument,
  onViewDocument,
}: UseDocumentInteractionsProps = {}): DocumentInteractionHandlers => {
  
  const handleDocumentClick = useCallback((document: Document) => {
    if (onDocumentClick) {
      onDocumentClick(document);
    } else {
      // Default behavior: open in new tab
      window.open(document.url, '_blank');
    }
  }, [onDocumentClick]);

  const handleDeleteDocument = useCallback((document: Document) => {
    if (onDeleteDocument) {
      onDeleteDocument(document);
    } else {
      // Default behavior: show confirmation
      const confirmed = window.confirm(`Are you sure you want to delete "${document.name}"?`);
      if (confirmed) {
        console.log('Delete document:', document.name);
        // TODO: Implement default delete logic
      }
    }
  }, [onDeleteDocument]);

  const handleReprocessDocument = useCallback((document: Document) => {
    if (onReprocessDocument) {
      onReprocessDocument(document);
    } else {
      // Default behavior: show processing message
      console.log('Reprocess document:', document.name);
      // TODO: Implement default reprocess logic
    }
  }, [onReprocessDocument]);

  const handleDownloadDocument = useCallback((document: Document) => {
    if (onDownloadDocument) {
      onDownloadDocument(document);
    } else {
      // Default behavior: create download link
      const link = window.document.createElement('a');
      link.href = document.url;
      link.download = document.name;
      link.target = '_blank';
      
      // Temporarily add to DOM and click
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
    }
  }, [onDownloadDocument]);

  const handleViewDocument = useCallback((document: Document) => {
    if (onViewDocument) {
      onViewDocument(document);
    } else {
      // Default behavior: same as document click
      handleDocumentClick(document);
    }
  }, [onViewDocument, handleDocumentClick]);

  return {
    handleDocumentClick,
    handleDeleteDocument,
    handleReprocessDocument,
    handleDownloadDocument,
    handleViewDocument,
  };
};

export default useDocumentInteractions;