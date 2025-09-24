import React, { useState, useEffect } from 'react';
import { 
  LoadingSpinner, 
  ListSkeleton, 
  EmptyDocumentList, 
  EmptySearchResults,
  NetworkError,
  useToast,
  createToastHelpers
} from '../ui';
import { useQuery } from 'react-query';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useSearch } from '../../context/SearchContext';
import { useBulkOperations } from '../../hooks/useBulkOperations';
import { useTouchGestures, SwipeableCard } from '../ui/MobileInteractions';
import { BulkOperationsPanel, BulkOperationsSummary } from '../ui/BulkOperationsPanel';
import { AccessibleButton, ToggleButton } from '../ui/AccessibleButton';
import { Trash2, Download, X } from 'lucide-react';
import {
  getUserDocuments,
  getDocuments,
  Document,
  deleteDocument,
  updateDocument,
  reprocessDocumentsWithNewAI,
} from '../../services/documentService';
import { DocumentViewer, DocumentViewerMobile } from '../viewer';
import { formatFileSize, formatDate, formatDateWithFallback } from '../../utils/formatters';
import { ReprocessModal } from '../ai';
import { reprocessDocumentsEnhanced, checkAIServiceHealth } from '../../services/dualAIService';
import { ContextMenu, ContextMenuItem, ContextMenuSection, ContextMenuSeparator } from '../ui/ContextMenu';
import { useContextMenu } from '../../hooks/useContextMenu';

interface DocumentListProps {
  category?: string;
  onViewDocument?: (document: Document) => void;
}

const DocumentList: React.FC<DocumentListProps> = ({
  category,
  onViewDocument,
}) => {
  const { currentUser } = useAuth();
  const { translate } = useLanguage();
  const { searchTerm } = useSearch();
  const { addToast } = useToast();
  const toast = createToastHelpers(addToast);

  const [selectedDocument, setSelectedDocument] = useState<Document | null>(
    null
  );
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [documentToView, setDocumentToView] = useState<Document | null>(null);
  const [isViewerModalOpen, setIsViewerModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Enhanced bulk operations
  const {
    selectedItems,
    selectedCount,
    toggleSelection,
    selectAll,
    clearSelection,
    selectByFilter,
    operations,
    operationsSummary,
    isProcessing,
    bulkDelete,
    bulkUpdate,
    bulkDownload,
    clearOperations,
  } = useBulkOperations();

  const [isBatchMode, setIsBatchMode] = useState(false);
  const [showBulkPanel, setShowBulkPanel] = useState(false);
  const [isReprocessing, setIsReprocessing] = useState(false);
  const [isReprocessModalOpen, setIsReprocessModalOpen] = useState(false);
  const [reprocessTarget, setReprocessTarget] = useState<
    { type: 'all' | 'selected' | 'single'; document?: Document }
  | null>(null);

  // Context menu state
  const { contextMenu, closeContextMenu, handleContextMenu, handleLongPress } = useContextMenu();

  // Fetch documents using React Query - get ALL documents and filter client-side
  const {
    data: documents,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery(
    ['documents', currentUser?.uid], // Remove category from cache key since we fetch all documents
    () => getDocuments(currentUser?.uid || ''), // Use getDocuments to fetch ALL documents
    {
      enabled: !!currentUser?.uid,
      staleTime: 60000, // 1 minute
      onSuccess: data => {
        // Documents fetched successfully - no logging needed
      },
      onError: err => {
        console.error('Error fetching documents:', err);
      },
    }
  );

  // Removed excessive debug logging to reduce console spam

  // Filter documents based on search term and category
  const filteredDocuments = documents?.filter(doc => {
    // First filter by category if specified
    if (category && category !== 'all') {
      const docCategory = doc.category?.toLowerCase();
      const filterCategory = category.toLowerCase();
      
      // Filtering logic continues below...
      
      
      // Handle special category mappings
      if (filterCategory === 'personal' && (!docCategory || docCategory === 'document')) {
        return true; // Include documents with no category or generic "document" in personal
      }
      
      // Handle financial category mapping (including legacy capitalized versions)
      if (filterCategory === 'financial') {
        return docCategory === 'financial' || 
               docCategory === 'finance' || 
               docCategory === 'bills' ||
               (docCategory && docCategory.includes('bill')) ||
               (docCategory && docCategory.includes('financial'));
      }
      
      // Handle bills category mapping
      if (filterCategory === 'bills') {
        return docCategory === 'bills' || 
               docCategory === 'financial' || 
               docCategory === 'finance' ||
               (docCategory && docCategory.includes('bill')) ||
               (docCategory && docCategory.includes('financial'));
      }
      
      // Handle education category mapping
      if (filterCategory === 'education') {
        return docCategory === 'education' || 
               docCategory === 'educational' ||
               docCategory === 'school' ||
               docCategory === 'university' ||
               docCategory === 'academic' ||
               (docCategory && docCategory.includes('certificate')) ||
               (docCategory && docCategory.includes('diploma')) ||
               (docCategory && docCategory.includes('attestation'));
      }
      
      // Handle legal category mapping
      if (filterCategory === 'legal') {
        return docCategory === 'legal' || 
               docCategory === 'law' ||
               docCategory === 'contract' ||
               docCategory === 'agreement';
      }
      
      // Handle medical category mapping
      if (filterCategory === 'medical') {
        return docCategory === 'medical' || 
               docCategory === 'health' ||
               docCategory === 'healthcare' ||
               docCategory === 'doctor' ||
               docCategory === 'hospital';
      }
      
      // Handle insurance category mapping
      if (filterCategory === 'insurance') {
        return docCategory === 'insurance' || 
               docCategory === 'insure';
      }
      
      // Handle government category mapping
      if (filterCategory === 'government') {
        return docCategory === 'government' || 
               docCategory === 'gov' ||
               docCategory === 'official' ||
               docCategory === 'public';
      }
      
      // Handle other category mapping - documents that don't fit predefined categories
      if (filterCategory === 'other') {
        const predefinedCategories = [
          'personal', 'financial', 'finance', 'bills', 'education', 'educational', 
          'school', 'university', 'academic', 'legal', 'law', 'contract', 
          'agreement', 'medical', 'health', 'healthcare', 'doctor', 'hospital',
          'insurance', 'insure', 'government', 'gov', 'official', 'public'
        ];
        return docCategory === 'other' || 
               (docCategory && !predefinedCategories.includes(docCategory));
      }
      
      // Default exact match (case insensitive)
      if (docCategory !== filterCategory) {
        return false; // Category doesn't match
      }
    }
    
    // Then filter by search term if provided
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    
    // Search in document name
    if (doc.name.toLowerCase().includes(searchLower)) return true;
    
    // Search in tags
    if (doc.tags && doc.tags.some(tag => tag.toLowerCase().includes(searchLower))) {
      return true;
    }
    
    // Search in category
    if (doc.category && doc.category.toLowerCase().includes(searchLower)) {
      return true;
    }
    
    // Search in metadata fields
    if (doc.metadata) {
      // Search in summary
      if (doc.metadata.summary && 
          doc.metadata.summary.toLowerCase().includes(searchLower)) {
        return true;
      }
      
      // Search in language
      if (doc.metadata.language && 
          doc.metadata.language.toLowerCase().includes(searchLower)) {
        return true;
      }
      
      // Search in detected text content
      if (doc.metadata.text && 
          doc.metadata.text.toLowerCase().includes(searchLower)) {
        return true;
      }
      
      // Search in any other metadata string values
      const metadataValues = Object.values(doc.metadata)
        .filter(value => typeof value === 'string')
        .map(value => value.toLowerCase());
      
      if (metadataValues.some(value => value.includes(searchLower))) {
        return true;
      }
    }
    
    return false;
  });

  // DEBUG: Prepare debug info for mobile viewing
  const debugInfo = {
    totalDocuments: documents?.length || 0,
    filteredDocuments: filteredDocuments?.length || 0,
    currentCategory: category || 'none',
    sampleCategories: documents?.slice(0, 5).map(d => ({ 
      name: d.name?.substring(0, 20) + '...', 
      category: d.category || 'no-category' 
    })) || []
  };

  // Handle document click - Open in new tab for quick viewing
  const handleDocumentClick = (document: Document) => {
    if (onViewDocument) {
      onViewDocument(document);
    } else {
      // Open document in new tab for quick viewing
      window.open(document.url, '_blank');
    }
  };

  // Context menu actions
  const handleViewDocument = (document: Document) => {
    closeContextMenu();
    // Full document viewer in modal with all features
    if (onViewDocument) {
      onViewDocument(document);
    } else {
      setDocumentToView(document);
      setIsViewerModalOpen(true);
    }
  };

  const handleReprocessDocument = (document: Document) => {
    closeContextMenu();
    setReprocessTarget({ type: 'single', document });
    setIsReprocessModalOpen(true);
  };

  const handleDeleteDocument = (document: Document) => {
    closeContextMenu();
    handleDeleteClick({ stopPropagation: () => {} } as React.MouseEvent, document);
  };

  const handleDownloadDocument = (document: Document) => {
    closeContextMenu();
    // Create a temporary link to download the document
    const link = window.document.createElement('a');
    link.href = document.url;
    link.download = document.name;
    link.target = '_blank';
    window.document.body.appendChild(link);
    link.click();
    window.document.body.removeChild(link);
  };

  // Handle document delete
  const handleDeleteClick = (e: React.MouseEvent, document: Document) => {
    // Check if document has a valid Firestore ID for deletion
    if (!document.firestoreId || document.firestoreId === '') {
      alert(
        'Cannot delete this document: Document ID is missing in database. This document may be corrupted.'
      );
      return;
    }

    e.stopPropagation();
    setSelectedDocument(document);
    setIsDeleteModalOpen(true);
  };

  // Confirm document deletion
  const confirmDelete = async () => {
    if (selectedDocument?.firestoreId) {
      try {
        setIsDeleting(true);
        await deleteDocument(
          selectedDocument.id || selectedDocument.name,
          selectedDocument.firestoreId
        );
        refetch();
        setIsDeleteModalOpen(false);
        setSelectedDocument(null);
      } catch (error) {
        console.error('Error deleting document:', error);
        alert(
          `Failed to delete document: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      } finally {
        setIsDeleting(false);
      }
    } else {
      alert('Cannot delete document: No Firestore ID found');
    }
  };

  // Enhanced batch operation handlers
  const toggleBatchMode = () => {
    setIsBatchMode(!isBatchMode);
    clearSelection();
    setShowBulkPanel(false);
  };

  const handleSelectAll = () => {
    if (filteredDocuments) {
      selectAll(filteredDocuments);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedCount === 0) return;
    
    const documentsToDelete = filteredDocuments?.filter(doc => {
      const docId = doc.firestoreId || doc.id;
      return docId && selectedItems.has(docId);
    }) || [];

    try {
      await bulkDelete(documentsToDelete);
      refetch();
    } catch (error) {
      console.error('Bulk delete failed:', error);
    }
  };

  const handleBulkDownload = async () => {
    if (selectedCount === 0) return;
    
    const documentsToDownload = filteredDocuments?.filter(doc => {
      const docId = doc.firestoreId || doc.id;
      return docId && selectedItems.has(docId);
    }) || [];

    try {
      await bulkDownload(documentsToDownload);
    } catch (error) {
      console.error('Bulk download failed:', error);
    }
  };

  const handleBulkReprocess = async () => {
    // TODO: Implement bulk reprocess
    console.log('Bulk reprocess not yet implemented');
  };

  const handleBulkCategorize = async () => {
    // TODO: Implement bulk categorize
    console.log('Bulk categorize not yet implemented');
  };

  const handleBulkTag = async () => {
    // TODO: Implement bulk tag
    console.log('Bulk tag not yet implemented');
  };


  const handleReprocessAllDocuments = async () => {
    if (!documents || documents.length === 0) {
      alert('No documents to reprocess');
      return;
    }

    // Open reprocess modal directly - no mock documents needed
    setReprocessTarget({ type: 'all' });
    setIsReprocessModalOpen(true);
  };

  const handleReprocessSelectedDocuments = () => {
    if (selectedCount === 0) {
      alert('Please select at least one document to reprocess');
      return;
    }
    setReprocessTarget({ type: 'selected' });
    setIsReprocessModalOpen(true);
  };

  const handleReprocessSingleDocument = (
    e: React.MouseEvent,
    document: Document
  ) => {
    e.stopPropagation();
    setReprocessTarget({ type: 'single', document });
    setIsReprocessModalOpen(true);
  };

  const handleReprocessConfirm = async () => {
    if (!reprocessTarget) return;
    
    // Use the existing enhanced reprocess function with 'both' mode
    await handleEnhancedReprocess('both');
  };



  const handleEnhancedReprocess = async (
    mode: 'huggingface' | 'deepseek' | 'both'
  ) => {
    if (!documents || documents.length === 0) return;

    setIsReprocessing(true);
    setIsReprocessModalOpen(false);

    try {
      let targetDescription = 'all documents';
      let documentUrls: string[] = [];
      const isNonEmptyString = (u: unknown): u is string =>
        typeof u === 'string' && u.length > 0;

      if (reprocessTarget?.type === 'selected') {
        const selectedDocs = (documents || []).filter(doc => {
          const id = doc.firestoreId || doc.id;
          return id && selectedItems.has(id);
        });
        documentUrls = selectedDocs
          .map(doc => doc.url)
          .filter(isNonEmptyString);
        targetDescription = `${selectedDocs.length} selected documents`;
      } else if (reprocessTarget?.type === 'single' && reprocessTarget.document) {
        documentUrls = [reprocessTarget.document.url].filter(isNonEmptyString);
        targetDescription = `document: ${reprocessTarget.document.name}`;
      } else {
        documentUrls = documents
          .map(doc => doc.url)
          .filter(isNonEmptyString);
        targetDescription = `${documents.length} documents`;
      }


      if (documentUrls.length === 0) {
        throw new Error('No valid document URLs found for reprocessing');
      }

      // Check AI service health first
      const healthCheck = await checkAIServiceHealth();
      
      if (!healthCheck.available) {
        throw new Error(`AI service is currently unavailable: ${healthCheck.error || 'Unknown error'}`);
      }

      // Try the enhanced reprocessing first
      let result;
      try {
        result = await reprocessDocumentsEnhanced(documentUrls, mode);
      } catch (enhancedError) {
        
        // Fallback to the older reprocessing method
        const documentsToReprocess = documents.filter(doc => 
          documentUrls.includes(doc.url)
        );
        
        result = await reprocessDocumentsWithNewAI(documentsToReprocess);
      }

      // Refresh the document list
      refetch();

      const successCount = result.results?.filter((r: any) => r.success).length || result.processed || 0;
      const failCount = (result.results?.length || 0) - successCount;

      let message = `✅ AI reprocessing completed!\n`;
      message += `• Successfully processed: ${successCount} documents\n`;
      if (failCount > 0) {
        message += `• Failed: ${failCount} documents\n`;
      }
      message += `• AI Mode: ${mode.toUpperCase()}\n\n`;
      message += 'The page will refresh to show updated information.';

      alert(message);
      window.location.reload();
    } catch (error) {
      console.error('Error in enhanced reprocessing:', error);
      let errorMessage = 'Unknown error';
      
      if (error instanceof Error) {
        errorMessage = error.message;
        
        // Provide more specific error messages
        if (errorMessage.includes('Failed to fetch')) {
          errorMessage = 'Network error: Unable to connect to AI processing service. Please check your internet connection and try again.';
        } else if (errorMessage.includes('404')) {
          errorMessage = 'AI processing service not found. The service may be temporarily unavailable.';
        } else if (errorMessage.includes('500')) {
          errorMessage = 'AI processing service error. Please try again in a few minutes.';
        } else if (errorMessage.includes('timeout')) {
          errorMessage = 'AI processing timed out. The documents may be too large or the service is busy.';
        }
      }
      
      alert(
        `❌ AI reprocessing failed: ${errorMessage}\n\nPlease try again or contact support if the issue persists.`
      );
    } finally {
      setIsReprocessing(false);
    }
  };


  // Get document icon based on file type
  const getDocumentIcon = (type: string) => {
    if (type.startsWith('image/')) {
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-8 w-8 text-blue-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      );
    } else if (type === 'application/pdf') {
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-8 w-8 text-red-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
          />
        </svg>
      );
    } else if (type.includes('word') || type.includes('document')) {
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-8 w-8 text-blue-700"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      );
    } else if (type.includes('spreadsheet') || type.includes('excel')) {
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-8 w-8 text-green-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      );
    } else {
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-8 w-8 text-gray-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
          />
        </svg>
      );
    }
  };

  if (isLoading) {
    return (
      <div role="status" aria-label="Loading documents">
        <ListSkeleton count={6} variant="document" />
      </div>
    );
  }

  if (isError) {
    console.error('❌ Document list error:', error);
    return (
      <NetworkError 
        onRetry={() => {
          refetch();
          toast.info('Retrying...', 'Attempting to reload documents');
        }}
      />
    );
  }

  if (!filteredDocuments?.length) {
    if (searchTerm) {
      return (
        <EmptySearchResults 
          searchTerm={searchTerm}
          onClearSearch={() => {
            // This would need to be connected to the search context
            toast.info('Search cleared', 'Showing all documents');
          }}
        />
      );
    }
    
    return (
      <EmptyDocumentList 
        category={category}
        onUpload={() => {
          // This would need to be connected to the upload modal
          toast.info('Opening upload', 'Upload your first document');
        }}
      />
    );
  }

  return (
    <>
      {/* SUCCESS MESSAGE - Categories are now working! */}
      {category && (
        <div className="mb-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-green-800 dark:text-green-200 mb-2">✅ Category Filtering Fixed!</h3>
          <div className="text-xs text-green-700 dark:text-green-300">
            <div>📂 Viewing: <strong>{category}</strong> category</div>
            <div>📊 Found: <strong>{debugInfo.filteredDocuments}</strong> documents in this category</div>
          </div>
        </div>
      )}

      {/* Enhanced Bulk Operations */}
      {(isBatchMode || selectedCount > 0 || operations.length > 0) && (
        <>
          {/* Desktop Bulk Operations Panel */}
          <div className="hidden md:block mb-6">
            <BulkOperationsPanel
              selectedCount={selectedCount}
              operations={operations}
              operationsSummary={operationsSummary}
              onBulkDelete={handleBulkDelete}
              onBulkDownload={handleBulkDownload}
              onBulkReprocess={handleBulkReprocess}
              onBulkCategorize={handleBulkCategorize}
              onBulkTag={handleBulkTag}
              onClearOperations={clearOperations}
              onClearSelection={clearSelection}
              isProcessing={isProcessing}
            />
          </div>

          {/* Mobile Bulk Operations Summary */}
          <div className="md:hidden">
            <BulkOperationsSummary
              selectedCount={selectedCount}
              onShowPanel={() => setShowBulkPanel(true)}
            />
          </div>
        </>
      )}

      {/* Simple Batch Mode Toggle */}
      <div className="mb-4 flex items-center justify-between">
        <ToggleButton
          pressed={isBatchMode}
          onPressedChange={toggleBatchMode}
          pressedVariant="primary"
          unpressedVariant="secondary"
          ariaLabel={isBatchMode ? 'Exit batch mode' : 'Enter batch mode'}
        >
          {isBatchMode ? 'Exit Batch Mode' : 'Batch Mode'}
        </ToggleButton>

        {isBatchMode && (
          <div className="flex items-center space-x-2">
            <AccessibleButton
              variant="ghost"
              size="sm"
              onClick={handleSelectAll}
              disabled={!filteredDocuments?.length}
            >
              Select All
            </AccessibleButton>
            <AccessibleButton
              variant="ghost"
              size="sm"
              onClick={clearSelection}
              disabled={selectedCount === 0}
            >
              Clear
            </AccessibleButton>
          </div>
        )}
      </div>


      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {filteredDocuments.map((document, index) => {
          // Ensure we have a valid key for React
          const documentKey =
            document.id || `doc-${index}-${document.name || 'unnamed'}`;
          // Document rendering

          const docId = document.firestoreId || document.id;
          const isSelected = docId ? selectedItems.has(docId) : false;

          const documentCard = (
            <div
              key={documentKey}
              className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 ease-out cursor-pointer group relative overflow-hidden ${
                isBatchMode && isSelected
                  ? 'ring-2 ring-blue-500 shadow-lg'
                  : 'hover:shadow-lg'
              }`}
              onClick={e => {
                if (isBatchMode && docId) {
                  e.stopPropagation();
                  toggleSelection(docId);
                } else {
                  // Open document viewer when card is clicked (non-batch mode)
                  handleDocumentClick(document);
                }
              }}
              onContextMenu={e => handleContextMenu(e, document)}
              onTouchStart={e => handleLongPress(e, document)}
            >
              {/* Large Thumbnail Section */}
              <div className="aspect-square bg-gray-50 dark:bg-gray-700 relative overflow-hidden">
                {/* Batch Mode Checkbox */}
                {isBatchMode && (
                  <div className="absolute top-2 left-2 z-10">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={e => {
                        e.stopPropagation();
                        if (docId) {
                          toggleSelection(docId);
                        }
                      }}
                      className="w-4 h-4 text-blue-600 bg-white border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 focus:ring-2"
                    />
                  </div>
                )}

                {/* Document Preview/Icon */}
                {document.metadata?.thumbnailUrl ? (
                  <img
                    src={document.metadata.thumbnailUrl}
                    alt={`${document.name} preview`}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    onError={(e) => {
                      // Fallback to icon if thumbnail fails to load
                      e.currentTarget.style.display = 'none';
                      const nextElement = e.currentTarget.nextElementSibling as HTMLElement;
                      if (nextElement) {
                        nextElement.style.display = 'flex';
                      }
                    }}
                  />
                ) : null}
                
                {/* Fallback Icon */}
                <div className={`w-full h-full flex items-center justify-center ${document.metadata?.thumbnailUrl ? 'hidden' : ''}`}>
                  <div className="w-16 h-16 text-gray-400 dark:text-gray-500">
                    {getDocumentIcon(document.type)}
                  </div>
                </div>

                {/* Status Indicator */}
                <div className="absolute top-2 right-2">
                  <div className={`w-3 h-3 rounded-full border-2 border-white ${
                    document.status === 'processing' 
                      ? 'bg-yellow-400 animate-pulse' 
                      : document.status === 'ready'
                      ? 'bg-green-400'
                      : document.status === 'error'
                      ? 'bg-red-400'
                      : 'bg-gray-400'
                  }`} title={
                    document.status === 'processing' 
                      ? 'Processing...' 
                      : document.status === 'ready'
                      ? 'Ready'
                      : document.status === 'error'
                      ? 'Error'
                      : 'Unknown status'
                  }></div>
                </div>

                {/* Document Type Badge */}
                <div className="absolute bottom-2 right-2 bg-white dark:bg-gray-800 rounded-full p-1 shadow-sm">
                  <div className="w-4 h-4 text-gray-500 dark:text-gray-400">
                    {document.type.startsWith('image/') && (
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
                      </svg>
                    )}
                    {document.type === 'application/pdf' && (
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                      </svg>
                    )}
                    {document.type.includes('word') && (
                      <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                      </svg>
                    )}
                  </div>
                </div>
              </div>

              {/* Document Info Section */}
              <div className="p-3">
                {/* Document Title */}
                <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate mb-1">
                  {(document.metadata?.suggestedName && String(document.metadata.suggestedName)) ||
                    document.name ||
                    'Document'}
                </h3>
                
                {/* Category Badge */}
                {document.category && (
                  <div className="mb-2">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                      {document.category}
                    </span>
                  </div>
                )}
                
                {/* File Info */}
                <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
                  <div className="flex justify-between">
                    <span>{formatFileSize(document.size)}</span>
                    {(document.metadata?.language || document.metadata?.languageDetection?.language) && (
                      <span className="font-medium">
                        {(document.metadata?.language || document.metadata?.languageDetection?.language || 'N/A')
                          .toString()
                          .toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div>{formatDateWithFallback(document.uploadedAt, 'Recent')}</div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end space-x-2">
                  <button
                    onClick={e => handleReprocessSingleDocument(e, document)}
                    className="p-2 text-gray-400 hover:text-purple-600 dark:text-gray-500 dark:hover:text-purple-400 focus:outline-none rounded-lg hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors"
                    title="Reprocess this document"
                    disabled={!document.url || isReprocessing}
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                  
                  <button
                    onClick={e => handleDeleteClick(e, document)}
                    className="p-2 text-gray-400 hover:text-red-600 dark:text-gray-500 dark:hover:text-red-400 focus:outline-none rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    title="Delete this document"
                    disabled={!document.firestoreId || document.firestoreId === ''}
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1 1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          );

          // Wrap with SwipeableCard for mobile interactions
          return (
            <SwipeableCard
              key={documentKey}
              leftAction={{
                icon: <Trash2 className="w-5 h-5" />,
                label: 'Delete',
                color: 'bg-red-500',
                action: () => handleDeleteClick({ stopPropagation: () => {} } as React.MouseEvent, document),
              }}
              rightAction={{
                icon: <Download className="w-5 h-5" />,
                label: 'Download',
                color: 'bg-blue-500',
                action: () => handleDownloadDocument(document),
              }}
              disabled={isBatchMode}
            >
              {documentCard}
            </SwipeableCard>
          );
        })}
      </div>

      {/* AI Reprocessing Modal */}
      {isReprocessModalOpen && reprocessTarget && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">
              {reprocessTarget.type === 'single'
                ? 'Reprocess Document'
                : 'Reprocess Selected Documents'}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {reprocessTarget.type === 'single'
                ? `Reprocess "${reprocessTarget.document?.name}" with enhanced AI?`
                : `Reprocess ${selectedCount} selected documents with enhanced AI?`}
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setIsReprocessModalOpen(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleReprocessConfirm}
                disabled={isReprocessing}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {isReprocessing ? 'Processing...' : 'Reprocess'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bulk Operations Panel */}
      {showBulkPanel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end justify-center z-50 md:hidden">
          <div className="bg-white dark:bg-gray-800 rounded-t-lg w-full max-h-[80vh] overflow-y-auto">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Bulk Operations
                </h3>
                <AccessibleButton
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowBulkPanel(false)}
                  icon={<X className="w-5 h-5" />}
                  ariaLabel="Close panel"
                />
              </div>
            </div>
            <div className="p-0">
              <BulkOperationsPanel
                selectedCount={selectedCount}
                operations={operations}
                operationsSummary={operationsSummary}
                onBulkDelete={handleBulkDelete}
                onBulkDownload={handleBulkDownload}
                onBulkReprocess={handleBulkReprocess}
                onBulkCategorize={handleBulkCategorize}
                onBulkTag={handleBulkTag}
                onClearOperations={clearOperations}
                onClearSelection={clearSelection}
                isProcessing={isProcessing}
                className="border-0 shadow-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* Document Viewer Modal */}
      {isViewerModalOpen && documentToView && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-lg md:rounded-lg w-full max-w-6xl h-[95vh] md:h-5/6 flex flex-col md:dialog-fullscreen">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                {documentToView.name}
              </h2>
              <button
                onClick={() => {
                  setIsViewerModalOpen(false);
                  setDocumentToView(null);
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Modal Content */}
            <div className="flex-1 overflow-hidden">
              <DocumentViewerMobile
                document={documentToView}
                onClose={() => {
                  setIsViewerModalOpen(false);
                  setDocumentToView(null);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Context Menu */}
      <ContextMenu
        isOpen={contextMenu.isOpen}
        onClose={closeContextMenu}
        position={contextMenu.position}
      >
        {contextMenu.data && (
          <>
            <ContextMenuSection>
              <ContextMenuItem
                label="View in Modal"
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                }
                onClick={() => handleViewDocument(contextMenu.data)}
                variant="primary"
                shortcut="Enter"
              />
              <ContextMenuItem
                label="Download"
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                }
                onClick={() => handleDownloadDocument(contextMenu.data)}
              />
            </ContextMenuSection>

            <ContextMenuSeparator />

            <ContextMenuSection>
              <ContextMenuItem
                label="Reprocess with AI"
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                }
                onClick={() => handleReprocessDocument(contextMenu.data)}
                disabled={!contextMenu.data.url || isReprocessing}
              />
            </ContextMenuSection>

            <ContextMenuSeparator />

            <ContextMenuSection>
              <ContextMenuItem
                label="Delete Document"
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1 1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                }
                onClick={() => handleDeleteDocument(contextMenu.data)}
                variant="danger"
                disabled={!contextMenu.data.firestoreId || contextMenu.data.firestoreId === ''}
                shortcut="Del"
              />
            </ContextMenuSection>
          </>
        )}
      </ContextMenu>
    </>
  );
};

export default DocumentList;
