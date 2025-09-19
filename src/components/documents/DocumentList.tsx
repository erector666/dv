import React, { useState, useEffect } from 'react';

import { useQuery } from 'react-query';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useSearch } from '../../context/SearchContext';
import {
  getUserDocuments,
  Document,
  deleteDocument,
  updateDocument,
  improveDocumentCategories,
} from '../../services/documentService';
import { DocumentViewer, DocumentViewerMobile } from '../viewer';
import { formatFileSize, formatDate, formatDateWithFallback } from '../../utils/formatters';
import { ReprocessModal } from '../ai';
import { reprocessDocumentsEnhanced } from '../../services/dualAIService';
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

  const [selectedDocument, setSelectedDocument] = useState<Document | null>(
    null
  );
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [documentToView, setDocumentToView] = useState<Document | null>(null);
  const [isViewerModalOpen, setIsViewerModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Batch operations state
  const [selectedDocuments, setSelectedDocuments] = useState<Set<string>>(
    new Set()
  );
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [isBatchDeleteModalOpen, setIsBatchDeleteModalOpen] = useState(false);
  const [isBatchDeleting, setIsBatchDeleting] = useState(false);
  const [isReprocessing, setIsReprocessing] = useState(false);
  const [isReprocessModalOpen, setIsReprocessModalOpen] = useState(false);
  const [reprocessTarget, setReprocessTarget] = useState<
    { type: 'all' | 'selected' | 'single'; document?: Document }
  | null>(null);
  const [isImprovingCategories, setIsImprovingCategories] = useState(false);
  const [categoryImprovementProgress, setCategoryImprovementProgress] = useState<{
    processed: number;
    total: number;
    currentDoc?: string;
  } | null>(null);

  // Context menu state
  const { contextMenu, closeContextMenu, handleContextMenu, handleLongPress } = useContextMenu();

  // Fetch documents using React Query
  const {
    data: documents,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery(
    ['documents', currentUser?.uid, category],
    () => getUserDocuments(currentUser?.uid || '', category),
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
      
      // Debug individual document filtering
      console.log(`🔍 Filtering doc "${doc.name}":`, {
        docCategory,
        filterCategory,
        matches: false // Will be set below
      });
      
      // Handle special category mappings
      if (filterCategory === 'personal' && (!docCategory || docCategory === 'document')) {
        console.log(`✅ Personal match for "${doc.name}"`);
        return true; // Include documents with no category or generic "document" in personal
      }
      
      // Handle financial category mapping
      if (filterCategory === 'financial') {
        const isMatch = docCategory === 'financial' || 
               docCategory === 'finance' || 
               docCategory === 'bills' ||
               (docCategory && docCategory.includes('bill')) ||
               (docCategory && docCategory.includes('financial'));
        console.log(`💰 Financial check for "${doc.name}":`, {
          docCategory,
          isMatch,
          checks: {
            exactFinancial: docCategory === 'financial',
            exactFinance: docCategory === 'finance',
            exactBills: docCategory === 'bills',
            containsBill: docCategory && docCategory.includes('bill'),
            containsFinancial: docCategory && docCategory.includes('financial')
          }
        });
        return isMatch;
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
               docCategory === 'academic';
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

  // Debug logging to understand why no documents are showing
  console.log('🔍 DocumentList Debug:', {
    category,
    totalDocuments: documents?.length || 0,
    filteredDocuments: filteredDocuments?.length || 0,
    searchTerm,
    sampleDocuments: documents?.slice(0, 3).map(doc => ({
      name: doc.name,
      category: doc.category,
      hasCategory: !!doc.category
    }))
  });

  // Removed debug logging to reduce console spam

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

  // Batch operation handlers
  const toggleBatchMode = () => {
    setIsBatchMode(!isBatchMode);
    setSelectedDocuments(new Set());
  };

  const toggleDocumentSelection = (documentId: string) => {
    const newSelection = new Set(selectedDocuments);
    if (newSelection.has(documentId)) {
      newSelection.delete(documentId);
    } else {
      newSelection.add(documentId);
    }
    setSelectedDocuments(newSelection);
  };

  const selectAllDocuments = () => {
    if (filteredDocuments) {
      const allIds = new Set(
        filteredDocuments
          .map(doc => doc.firestoreId || doc.id)
          .filter(id => id !== undefined) as string[]
      );
      setSelectedDocuments(allIds);
    }
  };

  const deselectAllDocuments = () => {
    setSelectedDocuments(new Set());
  };

  const handleBatchDelete = () => {
    if (selectedDocuments.size === 0) return;
    setIsBatchDeleteModalOpen(true);
  };

  // Bulk download functionality
  const handleBulkDownload = async () => {
    if (selectedDocuments.size === 0) return;
    
    const documentsToDownload = filteredDocuments?.filter(doc => {
      const docId = doc.firestoreId || doc.id;
      return docId && selectedDocuments.has(docId);
    }) || [];

    if (documentsToDownload.length === 0) return;

    try {
      // For now, download documents individually
      // In a real implementation, you might want to create a ZIP file server-side
      for (const document of documentsToDownload) {
        const link = window.document.createElement('a');
        link.href = document.url;
        link.download = document.name;
        link.target = '_blank';
        window.document.body.appendChild(link);
        link.click();
        window.document.body.removeChild(link);
        
        // Small delay between downloads to avoid overwhelming the browser
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (error) {
      console.error('Error downloading documents:', error);
      alert('Error downloading documents. Please try again.');
    }
  };

  const confirmBatchDelete = async () => {
    if (selectedDocuments.size === 0) return;

    setIsBatchDeleting(true);
    const documentsToDelete =
      filteredDocuments?.filter(doc => {
        const docId = doc.firestoreId || doc.id;
        return docId && selectedDocuments.has(docId);
      }) || [];

    try {
      // Delete documents in parallel for better performance
      const deletePromises = documentsToDelete.map(async doc => {
        await deleteDocument(doc.id || doc.name, doc.firestoreId!);
      });

      await Promise.all(deletePromises);

      refetch();
      setSelectedDocuments(new Set());
      setIsBatchMode(false);
      setIsBatchDeleteModalOpen(false);
    } catch (error) {
      console.error('Batch deletion failed:', error);
      alert(
        `Failed to delete some documents: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } finally {
      setIsBatchDeleting(false);
    }
  };

  const cancelBatchDelete = () => {
    setIsBatchDeleteModalOpen(false);
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
    if (selectedDocuments.size === 0) {
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
          return id && selectedDocuments.has(id);
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

      console.log(
        `🚀 Starting enhanced reprocessing with ${mode} for ${targetDescription}`
      );

      const result = await reprocessDocumentsEnhanced(documentUrls, mode);

      console.log('✅ Enhanced reprocessing completed:', result);

      // Refresh the document list
      refetch();

      const successCount = result.results.filter(r => r.success).length;
      const failCount = result.results.length - successCount;

      let message = `✅ Enhanced reprocessing completed!\n`;
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
      alert(
        `❌ Enhanced reprocessing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } finally {
      setIsReprocessing(false);
    }
  };

  const handleImproveCategories = async () => {
    if (!currentUser?.uid) return;

    setIsImprovingCategories(true);
    setCategoryImprovementProgress({ processed: 0, total: 0 });

    try {
      console.log('🔧 Starting category improvement for user:', currentUser.uid);

      const result = await improveDocumentCategories(
        currentUser.uid,
        (processed, total, currentDoc) => {
          setCategoryImprovementProgress({ processed, total, currentDoc });
        }
      );

      console.log('✅ Category improvement completed:', result);

      // Refresh the document list
      refetch();

      let message = `✅ Category & Tag Improvement Completed!\n`;
      message += `• Documents processed: ${result.processed}\n`;
      message += `• Documents improved: ${result.improved}\n`;
      if (result.errors.length > 0) {
        message += `• Errors: ${result.errors.length}\n`;
      }
      message += `\nYour documents now have better categories and useful tags for easier sorting and searching!`;

      alert(message);
    } catch (error) {
      console.error('Error improving categories:', error);
      alert(
        `❌ Category improvement failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    } finally {
      setIsImprovingCategories(false);
      setCategoryImprovementProgress(null);
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
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (isError) {
    console.error('❌ Document list error:', error);
    return (
      <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-md">
        <p className="text-red-600 dark:text-red-400">
          {translate('documents.error.loading')}
        </p>
        <details className="mt-2 text-sm">
          <summary className="cursor-pointer">Error Details</summary>
          <pre className="mt-2 text-xs bg-red-100 p-2 rounded overflow-auto">
            {JSON.stringify(error, null, 2)}
          </pre>
        </details>
      </div>
    );
  }

  if (!filteredDocuments?.length) {
    return (
      <div className="bg-gray-50 dark:bg-gray-800 p-8 rounded-md text-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-16 w-16 mx-auto text-gray-400"
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
        <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-gray-100">
          {searchTerm
            ? translate('documents.noSearchResults')
            : category
              ? translate('documents.noCategoryDocuments')
              : translate('documents.noDocuments')}
        </h3>
        <p className="mt-2 text-gray-500 dark:text-gray-400">
          {translate('documents.uploadPrompt')}
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Batch Operations Toolbar */}
      <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-4">
          {/* Mobile-responsive batch mode header */}
          <div className="space-y-4">
            {/* Top row: Batch mode toggle and selection count */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <button
                  onClick={toggleBatchMode}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    isBatchMode
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  {isBatchMode ? '✅ Exit Batch Mode' : '📋 Batch Mode'}
                </button>

                {isBatchMode && (
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {selectedDocuments.size} of {filteredDocuments?.length || 0}{' '}
                    selected
                  </div>
                )}
              </div>

              {/* Enhanced Batch action buttons - responsive layout */}
              {isBatchMode && selectedDocuments.size > 0 && (
                <div className="space-y-3">
                  {/* Primary Actions Row */}
                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      onClick={handleBulkDownload}
                      disabled={selectedDocuments.size === 0}
                      className="px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center space-x-2 text-sm sm:text-base"
                    >
                      <svg
                        className="w-4 h-4 flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      <span className="hidden sm:inline">Download ({selectedDocuments.size})</span>
                      <span className="sm:hidden">Download</span>
                    </button>
                    
                    <button
                      onClick={handleReprocessSelectedDocuments}
                    disabled={selectedDocuments.size === 0 || isReprocessing}
                    className="px-3 sm:px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center space-x-2 text-sm sm:text-base"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="w-4 h-4 flex-shrink-0"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="23 4 23 10 17 10"></polyline>
                      <polyline points="1 20 1 14 7 14"></polyline>
                      <path d="M3.51 9a9 9 0 0114.13-3.36L23 10"></path>
                      <path d="M20.49 15a9 9 0 01-14.13 3.36L1 14"></path>
                    </svg>
                    <span className="hidden sm:inline">Reprocess Selected ({selectedDocuments.size})</span>
                    <span className="sm:hidden">Reprocess ({selectedDocuments.size})</span>
                  </button>
                  <button
                    onClick={handleBatchDelete}
                    disabled={selectedDocuments.size === 0}
                    className="px-3 sm:px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center space-x-2 text-sm sm:text-base"
                  >
                    <svg
                      className="w-4 h-4 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1 1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                    <span className="hidden sm:inline">Delete ({selectedDocuments.size})</span>
                    <span className="sm:hidden">Delete ({selectedDocuments.size})</span>
                  </button>
                  </div>
                  
                  {/* Secondary Actions Row - Category & Tag Management */}
                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      onClick={() => {/* TODO: Implement bulk category assignment */}}
                      disabled={selectedDocuments.size === 0}
                      className="px-3 sm:px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center space-x-2 text-sm sm:text-base"
                    >
                      <svg
                        className="w-4 h-4 flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                        />
                      </svg>
                      <span className="hidden sm:inline">Assign Category</span>
                      <span className="sm:hidden">Category</span>
                    </button>
                    
                    <button
                      onClick={() => {/* TODO: Implement bulk tag management */}}
                      disabled={selectedDocuments.size === 0}
                      className="px-3 sm:px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center space-x-2 text-sm sm:text-base"
                    >
                      <svg
                        className="w-4 h-4 flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                        />
                      </svg>
                      <span className="hidden sm:inline">Manage Tags</span>
                      <span className="sm:hidden">Tags</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom row: Select All / Deselect All buttons - only show when in batch mode */}
            {isBatchMode && (
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={selectAllDocuments}
                  className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                >
                  Select All
                </button>
                <button
                  onClick={deselectAllDocuments}
                  className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                >
                  Deselect All
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* AI Reprocessing and Category Improvement Buttons */}
      {!isBatchMode && documents && documents.length > 0 && (
        <div className="mb-6 space-y-4">
          {/* AI Reprocessing Button */}
          <div>
            <button
              onClick={handleReprocessAllDocuments}
              disabled={isReprocessing}
              className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 dark:disabled:bg-purple-800 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {isReprocessing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  <span>Reprocessing with New AI...</span>
                </>
              ) : (
                <>
                  <span>🚀 Enhanced AI Reprocessing (Choose Your AI)</span>
                </>
              )}
            </button>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Choose between Hugging Face, DeepSeek, or compare both AIs for
              optimal results.
            </p>
          </div>

          {/* Category Improvement Button */}
          <div>
            <button
              onClick={handleImproveCategories}
              disabled={isImprovingCategories}
              className="bg-green-600 hover:bg-green-700 disabled:bg-green-300 dark:disabled:bg-green-800 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {isImprovingCategories ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  <span>
                    Improving Categories... ({categoryImprovementProgress?.processed || 0}/{categoryImprovementProgress?.total || 0})
                  </span>
                </>
              ) : (
                <>
                  <span>🔧 Improve Document Categories</span>
                </>
              )}
            </button>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Fix documents with generic categories like "Document" by analyzing their content and assigning proper categories like Finance, Legal, Medical, etc. Also adds useful tags for better organization and search.
            </p>
            {categoryImprovementProgress?.currentDoc && (
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                Currently processing: {categoryImprovementProgress.currentDoc}
              </p>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {filteredDocuments.map((document, index) => {
          // Ensure we have a valid key for React
          const documentKey =
            document.id || `doc-${index}-${document.name || 'unnamed'}`;
          // Document rendering

          const docId = document.firestoreId || document.id;
          const isSelected = docId ? selectedDocuments.has(docId) : false;

          return (
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
                  toggleDocumentSelection(docId);
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
                          toggleDocumentSelection(docId);
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
                : `Reprocess ${selectedDocuments.size} selected documents with enhanced AI?`}
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

      {/* Batch Delete Confirmation Modal */}
      {isBatchDeleteModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">Delete Documents</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to delete {selectedDocuments.size} selected documents? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setIsBatchDeleteModalOpen(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={confirmBatchDelete}
                disabled={isBatchDeleting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {isBatchDeleting ? 'Deleting...' : (
                  selectedDocuments.size === 1
                    ? 'Delete Document'
                    : `Delete ${selectedDocuments.size} Documents`
                )}
              </button>
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
