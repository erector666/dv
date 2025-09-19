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
import { DocumentViewer } from '../viewer';
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
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
            className={`bg-gradient-to-br from-white via-gray-50 to-white dark:from-gray-800 dark:via-gray-850 dark:to-gray-800 rounded-2xl shadow-md md:shadow-lg overflow-hidden cursor-pointer hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 ease-out border border-gray-200/60 dark:border-gray-700/60 backdrop-blur-sm ${
              isBatchMode && isSelected
                ? 'ring-2 ring-blue-400 bg-gradient-to-br from-blue-50 via-blue-100 to-blue-50 dark:from-blue-900/30 dark:via-blue-800/30 dark:to-blue-900/30 shadow-blue-200/50 dark:shadow-blue-900/50'
                : 'hover:border-gray-300/80 dark:hover:border-gray-600/80 hover:bg-gradient-to-br hover:from-gray-50 hover:via-white hover:to-gray-50 dark:hover:from-gray-750 dark:hover:via-gray-800 dark:hover:to-gray-750'
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
              <div className="p-3 md:p-4 flex items-start space-x-3 md:space-x-4">
                {/* Batch Mode Checkbox */}
                {isBatchMode && (
                  <div className="flex-shrink-0 pt-1">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={e => {
                        e.stopPropagation();
                        if (docId) {
                          toggleDocumentSelection(docId);
                        }
                      }}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                    />
                  </div>
                )}

                {/* Document Preview Thumbnail */}
                <div className="flex-shrink-0 relative">
                  {document.metadata?.thumbnailUrl ? (
                    <div className="w-14 h-14 md:w-16 md:h-16 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                      <img
                        src={document.metadata.thumbnailUrl}
                        alt={`${document.name} preview`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // Fallback to icon if thumbnail fails to load
                          e.currentTarget.style.display = 'none';
                          const nextElement = e.currentTarget.nextElementSibling as HTMLElement;
                          if (nextElement) {
                            nextElement.style.display = 'block';
                          }
                        }}
                      />
                      <div className="hidden w-full h-full flex items-center justify-center">
                        {getDocumentIcon(document.type)}
                      </div>
                    </div>
                  ) : (
                    <div className="w-14 h-14 md:w-16 md:h-16 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                      {getDocumentIcon(document.type)}
                    </div>
                  )}
                  
                  {/* Document Type Badge */}
                  <div className="absolute -bottom-0.5 -right-0.5 md:-bottom-1 md:-right-1 bg-white dark:bg-gray-800 rounded-full p-0.5 md:p-1 shadow-sm border border-gray-200 dark:border-gray-600">
                    <div className="w-3 h-3 md:w-4 md:h-4 text-gray-500 dark:text-gray-400">
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
                  
                  {/* Status Indicator */}
                  <div className="absolute -top-1 -left-1 md:-top-1.5 md:-left-1.5">
                    <div className={`w-3 h-3 md:w-4 md:h-4 rounded-full border-2 border-white dark:border-gray-800 ${
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
                </div>
                <div className="flex-1 min-w-0">
                <h3 className="text-base md:text-lg font-bold text-gray-900 dark:text-white truncate flex items-center gap-1 md:gap-2">
                  <span className="truncate bg-gradient-to-r from-gray-900 to-gray-700 dark:from-gray-100 dark:to-gray-300 bg-clip-text text-transparent">
                    {(document.metadata?.suggestedName && String(document.metadata.suggestedName)) ||
                      document.name ||
                      'Document'}
                  </span>
                    {(document.metadata?.language || document.metadata?.languageDetection?.language) && (
                      <span
                        className="flex-shrink-0 inline-flex items-center px-2 py-1 rounded-full text-[9px] md:text-[10px] font-bold bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 dark:from-blue-900/30 dark:to-indigo-900/30 dark:text-blue-200 border border-blue-200/50 dark:border-blue-700/50 shadow-sm"
                        title="Detected language"
                      >
                        {(document.metadata?.language || document.metadata?.languageDetection?.language || 'N/A')
                          .toString()
                          .toUpperCase()}
                      </span>
                    )}
                  </h3>
                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{document.name}</div>
                  
                  {/* Prominent Category Display */}
                  <div className="mt-1">
                  {document.category ? (
                    <span className="inline-flex items-center px-2 py-1 md:px-3 md:py-1.5 rounded-full text-[10px] md:text-xs font-semibold bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 dark:from-green-900/30 dark:to-emerald-900/30 dark:text-green-200 border border-green-200/50 dark:border-green-700/50 shadow-sm">
                      <span className="hidden md:inline">📁</span>
                      <span className="md:hidden">📂</span>
                      <span className="ml-1">{document.category}</span>
                      {document.metadata?.classificationConfidence && (
                        <span className="ml-1 px-1.5 py-0.5 rounded-full bg-green-200/60 dark:bg-green-800/60 text-green-700 dark:text-green-300 text-[9px] font-medium">
                          {Math.round(document.metadata.classificationConfidence * 100)}%
                        </span>
                      )}
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-1 md:px-3 md:py-1.5 rounded-full text-[10px] md:text-xs font-semibold bg-gradient-to-r from-gray-100 to-gray-200 text-gray-600 dark:from-gray-700/50 dark:to-gray-600/50 dark:text-gray-400 border border-gray-200/50 dark:border-gray-600/50 shadow-sm">
                      <span className="hidden md:inline">📁</span>
                      <span className="md:hidden">📂</span>
                      <span className="ml-1">No category</span>
                    </span>
                  )}
                  </div>
                  <div className="mt-1 flex flex-col space-y-0.5 md:space-y-1 text-xs md:text-sm text-gray-500 dark:text-gray-400">
                    <p className="flex items-center gap-1">
                      <span className="hidden md:inline">📄</span>
                      <span>{formatFileSize(document.size)}</span>
                    </p>
                    <p className="flex items-center gap-1">
                      <span className="hidden md:inline">📅</span>
                      <span>{formatDateWithFallback(document.uploadedAt, 'Recently uploaded')}</span>
                    </p>

                    {/* Enhanced Processing state */}
                    {document.status === 'processing' && (
                      <div className="mt-2 space-y-1">
                        <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                          <svg className="w-3 h-3 mr-1 animate-spin" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                          </svg>
                          Processing…
                        </div>
                        {document.metadata?.processingSteps && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            <div className="flex items-center space-x-1">
                              <span>Steps:</span>
                              {document.metadata.processingSteps.map((step: string, index: number) => (
                                <span key={index} className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-gray-100 dark:bg-gray-700">
                                  {step}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Document Status Indicators */}
                    {document.status !== 'processing' && (
                      <div className="mt-2 space-y-1">
                        {/* Status Badge */}
                        <div className="flex items-center space-x-2">
                          <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            document.status === 'ready' 
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : document.status === 'error'
                              ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                              : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                          }`}>
                            {document.status === 'ready' && '✅ Processed'}
                            {document.status === 'error' && '❌ Failed'}
                            {!document.status && '📄 Ready'}
                          </div>
                          
                          {/* Quality Score */}
                          {document.metadata?.qualityScore && (
                            <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                              📊 Quality: {Math.round(document.metadata.qualityScore * 100)}%
                            </div>
                          )}
                        </div>

                        {/* Processing Time */}
                        {document.metadata?.processingTime && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            ⏱️ Processed in {document.metadata.processingTime}ms
                          </div>
                        )}

                        {/* Error Information */}
                        {document.status === 'error' && document.metadata?.error && (
                          <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-2 rounded">
                            <strong>Error:</strong> {document.metadata.error}
                          </div>
                        )}
                      </div>
                    )}

                    {/* AI Processing Results */}
                    {document.status !== 'processing' && document.metadata?.aiProcessed && (
                      <div className="mt-2 space-y-1">
                        {/* AI Processing Badge */}
                        <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                          🤖 AI Processed
                        </div>

                        {/* Language */}
                        {document.metadata?.language && (
                          <p className="text-xs">
                            🌐 Language:{' '}
                            {document.metadata.language.toUpperCase()}
                            {document.metadata?.languageDetection
                              ?.confidence && (
                              <span className="text-gray-400 ml-1">
                                (
                                {Math.round(
                                  document.metadata.languageDetection
                                    .confidence * 100
                                )}
                                %)
                              </span>
                            )}
                          </p>
                        )}

                        {/* Category */}
                        {document.category && (
                          <p className="text-xs">
                            📁 Category: {document.category}
                            {document.metadata?.classificationConfidence && (
                              <span className="text-gray-400 ml-1">
                                (
                                {Math.round(
                                  document.metadata.classificationConfidence *
                                    100
                                )}
                                %)
                              </span>
                            )}
                          </p>
                        )}

                        {/* Extracted Dates */}
                        {document.metadata?.extractedDates &&
                          document.metadata.extractedDates.length > 0 && (
                            <div className="text-xs">
                              📅 Dates:{' '}
                              {document.metadata.extractedDates
                                .slice(0, 3)
                                .join(', ')}
                              {document.metadata.extractedDates.length > 3 && (
                                <span className="text-gray-400">
                                  {' '}
                                  (+
                                  {document.metadata.extractedDates.length -
                                    3}{' '}
                                  more)
                                </span>
                              )}
                            </div>
                          )}

                        {/* Suggested Name (if different from current name) */}
                        {document.metadata?.suggestedName &&
                          document.metadata.suggestedName !== document.name && (
                            <div className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-2">
                              <span>💡 Suggested: {document.metadata.suggestedName}</span>
                              {document.firestoreId && (
                                <button
                                  onClick={async e => {
                                    e.stopPropagation();
                                    try {
                                      const newBase = String(document.metadata?.suggestedName).replace(/[\\/:*?"<>|]/g, '').trim();
                                      await updateDocument(document.firestoreId!, {
                                        name: `${newBase}.pdf`,
                                        metadata: {
                                          ...(document.metadata || {}),
                                          suggestedName: newBase,
                                        } as any,
                                      } as any);
                                      refetch();
                                    } catch (err) {
                                      console.error('Failed to apply suggested name', err);
                                      alert('Failed to apply suggested name');
                                    }
                                  }}
                                  className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-200 hover:bg-blue-100 dark:hover:bg-blue-800"
                                  title="Rename to suggested"
                                >
                                  Apply
                                </button>
                              )}
                            </div>
                          )}

                        {/* Entities */}
                        {document.metadata?.entities &&
                          document.metadata.entities.length > 0 && (
                            <div className="text-xs">
                              👤 Entities:{' '}
                              {document.metadata.entities
                                .slice(0, 3)
                                .map(
                                  (entity: any) => entity.text || entity.name
                                )
                                .join(', ')}
                              {document.metadata.entities.length > 3 && (
                                <span className="text-gray-400">
                                  {' '}
                                  (+{document.metadata.entities.length - 3}{' '}
                                  more)
                                </span>
                              )}
                            </div>
                          )}

                        {/* Word Count */}
                        {document.metadata?.textExtraction?.wordCount &&
                          document.metadata.textExtraction.wordCount > 0 && (
                            <p className="text-xs">
                              📊 Words:{' '}
                              {document.metadata.textExtraction.wordCount.toLocaleString()}
                            </p>
                          )}

                        {/* Document Analytics */}
                        <div className="mt-2 space-y-1">
                          {/* View Count */}
                          {document.metadata?.viewCount && document.metadata.viewCount > 0 && (
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              👁️ Viewed {document.metadata.viewCount} time{document.metadata.viewCount !== 1 ? 's' : ''}
                            </div>
                          )}

                          {/* Last Accessed */}
                          {document.metadata?.lastAccessed && (
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              🕒 Last viewed: {formatDate(document.metadata.lastAccessed)}
                            </div>
                          )}

                          {/* Document Age */}
                          {document.uploadedAt && (
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              📅 Age: {(() => {
                                const now = new Date();
                                const uploaded = new Date(document.uploadedAt);
                                const diffTime = Math.abs(now.getTime() - uploaded.getTime());
                                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                if (diffDays === 1) return '1 day';
                                if (diffDays < 7) return `${diffDays} days`;
                                if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks`;
                                if (diffDays < 365) return `${Math.ceil(diffDays / 30)} months`;
                                return `${Math.ceil(diffDays / 365)} years`;
                              })()}
                            </div>
                          )}

                          {/* Security Indicators */}
                          <div className="flex items-center space-x-2">
                            {/* Encryption Status */}
                            {document.metadata?.encrypted && (
                              <div className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                🔒 Encrypted
                              </div>
                            )}

                            {/* Privacy Level */}
                            {document.metadata?.privacyLevel && (
                              <div className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs ${
                                document.metadata.privacyLevel === 'public' 
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                  : document.metadata.privacyLevel === 'private'
                                  ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                  : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                              }`}>
                                {document.metadata.privacyLevel === 'public' && '🌐 Public'}
                                {document.metadata.privacyLevel === 'private' && '🔐 Private'}
                                {document.metadata.privacyLevel === 'restricted' && '⚠️ Restricted'}
                              </div>
                            )}

                            {/* Sharing Status */}
                            {document.metadata?.sharedWith && document.metadata.sharedWith.length > 0 && (
                              <div className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                👥 Shared ({document.metadata.sharedWith.length})
                              </div>
                            )}

                            {/* Collaboration Status */}
                            {document.metadata?.collaborators && document.metadata.collaborators.length > 0 && (
                              <div className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                                🤝 {document.metadata.collaborators.length} collaborator{document.metadata.collaborators.length !== 1 ? 's' : ''}
                              </div>
                            )}

                            {/* Document Lock Status */}
                            {document.metadata?.locked && (
                              <div className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                                🔒 Locked
                              </div>
                            )}

                            {/* Document Archive Status */}
                            {document.metadata?.archived && (
                              <div className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                                📦 Archived
                              </div>
                            )}
                          </div>

                          {/* Document Health */}
                          {document.metadata?.healthScore && (
                            <div className="text-xs">
                              <div className="flex items-center space-x-1">
                                <span>🏥 Health:</span>
                                <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                                  <div 
                                    className={`h-1.5 rounded-full ${
                                      document.metadata.healthScore > 0.8 
                                        ? 'bg-green-500' 
                                        : document.metadata.healthScore > 0.6 
                                        ? 'bg-yellow-500' 
                                        : 'bg-red-500'
                                    }`}
                                    style={{ width: `${document.metadata.healthScore * 100}%` }}
                                  ></div>
                                </div>
                                <span className="text-gray-500 dark:text-gray-400">
                                  {Math.round(document.metadata.healthScore * 100)}%
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Document Version */}
                          {document.metadata?.version && (
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              📋 Version: {document.metadata.version}
                            </div>
                          )}

                          {/* Version History */}
                          {document.metadata?.versionHistory && document.metadata.versionHistory.length > 0 && (
                            <div className="text-xs">
                              <div className="flex items-center space-x-1">
                                <span className="text-gray-500 dark:text-gray-400">📚 Versions:</span>
                                <div className="flex space-x-1">
                                  {document.metadata.versionHistory.slice(0, 3).map((version: any, index: number) => (
                                    <span
                                      key={index}
                                      className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs ${
                                        index === 0 
                                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                                      }`}
                                      title={`Version ${version.number} - ${version.date}`}
                                    >
                                      v{version.number}
                                    </span>
                                  ))}
                                  {document.metadata.versionHistory.length > 3 && (
                                    <span className="text-gray-400">
                                      +{document.metadata.versionHistory.length - 3}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Change Tracking */}
                          {document.metadata?.lastModified && document.metadata.lastModified !== document.uploadedAt && (
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              🔄 Modified: {formatDate(document.metadata.lastModified)}
                            </div>
                          )}

                          {/* Document Changes */}
                          {document.metadata?.changes && document.metadata.changes.length > 0 && (
                            <div className="text-xs">
                              <div className="flex items-center space-x-1">
                                <span className="text-gray-500 dark:text-gray-400">📝 Changes:</span>
                                <span className="text-blue-600 dark:text-blue-400">
                                  {document.metadata.changes.length} edit{document.metadata.changes.length !== 1 ? 's' : ''}
                                </span>
                              </div>
                            </div>
                          )}

                          {/* AI Model Used */}
                          {document.metadata?.aiModel && (
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              🤖 AI Model: {document.metadata.aiModel}
                            </div>
                          )}

                          {/* Processing Confidence */}
                          {document.metadata?.overallConfidence && (
                            <div className="text-xs">
                              <div className="flex items-center space-x-1">
                                <span>🎯 Confidence:</span>
                                <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                                  <div 
                                    className={`h-1.5 rounded-full ${
                                      document.metadata.overallConfidence > 0.8 
                                        ? 'bg-green-500' 
                                        : document.metadata.overallConfidence > 0.6 
                                        ? 'bg-yellow-500' 
                                        : 'bg-red-500'
                                    }`}
                                    style={{ width: `${document.metadata.overallConfidence * 100}%` }}
                                  ></div>
                                </div>
                                <span className="text-gray-500 dark:text-gray-400">
                                  {Math.round(document.metadata.overallConfidence * 100)}%
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Document Analytics */}
                          {document.metadata?.analytics && (
                            <div className="mt-2 space-y-1">
                              <div className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                📊 Analytics
                              </div>
                              
                              {/* Download Count */}
                              {document.metadata.analytics.downloadCount && (
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  ⬇️ Downloads: {document.metadata.analytics.downloadCount}
                                </div>
                              )}

                              {/* Share Count */}
                              {document.metadata.analytics.shareCount && (
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  🔗 Shares: {document.metadata.analytics.shareCount}
                                </div>
                              )}

                              {/* Edit Count */}
                              {document.metadata.analytics.editCount && (
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  ✏️ Edits: {document.metadata.analytics.editCount}
                                </div>
                              )}

                              {/* Comment Count */}
                              {document.metadata.analytics.commentCount && (
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  💬 Comments: {document.metadata.analytics.commentCount}
                                </div>
                              )}

                              {/* Popularity Score */}
                              {document.metadata.analytics.popularityScore && (
                                <div className="text-xs">
                                  <div className="flex items-center space-x-1">
                                    <span className="text-gray-500 dark:text-gray-400">🔥 Popularity:</span>
                                    <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                                      <div 
                                        className={`h-1.5 rounded-full ${
                                          document.metadata.analytics.popularityScore > 0.8 
                                            ? 'bg-red-500' 
                                            : document.metadata.analytics.popularityScore > 0.6 
                                            ? 'bg-orange-500' 
                                            : 'bg-yellow-500'
                                        }`}
                                        style={{ width: `${document.metadata.analytics.popularityScore * 100}%` }}
                                      ></div>
                                    </div>
                                    <span className="text-gray-500 dark:text-gray-400">
                                      {Math.round(document.metadata.analytics.popularityScore * 100)}%
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Summary Preview */}
                        {document.metadata?.summary ? (
                          <div className="text-xs">
                            <div className="flex items-start space-x-2">
                              <span className="text-orange-600 dark:text-orange-400 mt-0.5">
                                📝
                              </span>
                              <div className="flex-1">
                                <span className="text-gray-700 dark:text-gray-300 font-medium">
                                  Summary:
                                </span>
                                <p className="text-gray-900 dark:text-gray-100 mt-1 leading-relaxed">
                                  {(() => {
                                    const summary = document.metadata.summary;

                                    // Check if this looks like raw PDF content
                                    const isRawPDF =
                                      /%PDF|obj|<<|>>|\/MediaBox|\/Parent|\/Resources|\/Contents|\/Font|\/ProcSet|\/XObject|\/ExtGState|\/Pattern|\/Shading|\/Annots|\/Metadata|\/StructTreeRoot|\/MarkInfo|\/Lang|\/Trailer|\/Root|\/Info|\/ID|\/Size|\/Prev|\/XRef|xref|startxref|trailer|endobj|endstream|stream|BT|ET|Td|Tj|TJ|Tf|Ts|Tc|Tw|Tm|T\*|TD|Tz|TL|Tr/.test(
                                        summary
                                      );

                                    if (isRawPDF) {
                                      // Show a user-friendly message for raw PDF content
                                      return 'Document processed successfully - content extracted and analyzed';
                                    }

                                    // For clean text, show the actual summary
                                    const cleanSummary = summary
                                      .replace(/\s+/g, ' ') // Normalize whitespace
                                      .trim();

                                    // If summary is too short, show a generic message
                                    if (cleanSummary.length < 20) {
                                      return 'Document content extracted successfully';
                                    }

                                    // Show cleaned summary (limited to 120 characters)
                                    return cleanSummary.length > 120
                                      ? `${cleanSummary.substring(0, 120)}...`
                                      : cleanSummary;
                                  })()}
                                </p>
                              </div>
                            </div>
                          </div>
                        ) : (
                          // Fallback when no summary is available
                          <div className="text-xs">
                            <div className="flex items-start space-x-2">
                              <span className="text-gray-500 dark:text-gray-400 mt-0.5">
                                📄
                              </span>
                              <div className="flex-1">
                                <span className="text-gray-500 dark:text-gray-400 font-medium">
                                  Status:
                                </span>
                                <p className="text-gray-500 dark:text-gray-400 mt-1">
                                  Document uploaded and stored successfully
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Tags */}
                  {document.tags && document.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {document.tags.slice(0, 3).map((tag, index) => (
                        <span
                          key={`${document.id || 'doc'}-tag-${index}-${tag || 'empty'}`}
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                        >
                          {tag}
                        </span>
                      ))}
                      {document.tags.length > 3 && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:text-gray-700 dark:text-gray-200">
                          +{document.tags.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex-shrink-0 flex items-center space-x-1 md:space-x-2">
                {/* Context menu provides view action - card click also opens document */}
                
                <button
                  onClick={e => handleReprocessSingleDocument(e, document)}
                  className="p-2 md:p-1 text-gray-400 hover:text-purple-600 dark:text-gray-500 dark:hover:text-purple-400 focus:outline-none rounded-xl bg-gradient-to-r from-gray-50 to-gray-100 hover:from-purple-50 hover:to-purple-100 dark:from-gray-800/50 dark:to-gray-700/50 dark:hover:from-purple-900/20 dark:hover:to-purple-800/20 transition-all duration-200 shadow-sm hover:shadow-md border border-gray-200/50 dark:border-gray-600/50 hover:border-purple-200/50 dark:hover:border-purple-700/50"
                  title="Reprocess this document"
                  disabled={!document.url || isReprocessing}
                >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 md:h-5 md:w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <polyline points="23 4 23 10 17 10"></polyline>
                      <polyline points="1 20 1 14 7 14"></polyline>
                      <path d="M3.51 9a9 9 0 0114.13-3.36L23 10"></path>
                      <path d="M20.49 15a9 9 0 01-14.13 3.36L1 14"></path>
                    </svg>
                  </button>
                  {document.firestoreId && document.firestoreId !== '' ? (
                  <button
                    onClick={e => handleDeleteClick(e, document)}
                    className="p-2 md:p-1 text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 focus:outline-none rounded-xl bg-gradient-to-r from-gray-50 to-gray-100 hover:from-red-50 hover:to-red-100 dark:from-gray-800/50 dark:to-gray-700/50 dark:hover:from-red-900/20 dark:hover:to-red-800/20 transition-all duration-200 shadow-sm hover:shadow-md border border-gray-200/50 dark:border-gray-600/50 hover:border-red-200/50 dark:hover:border-red-700/50"
                    title="Delete document"
                  >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4 md:h-5 md:w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1 1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  ) : (
                    <div
                      className="text-gray-300 dark:text-gray-600 cursor-not-allowed"
                      title="Cannot delete: Document ID missing in database"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </div>
                  )}
                </div>
              </div>

              {/* Document Quick Actions Toolbar */}
              <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 px-4 py-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                    {/* Quick Stats */}
                    <div className="flex items-center space-x-1">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      </svg>
                      <span>{document.status === 'ready' ? 'Processed' : document.status === 'error' ? 'Failed' : document.status === 'processing' ? 'Processing' : 'Ready'}</span>
                    </div>
                    
                    {document.metadata?.viewCount && (
                      <div className="flex items-center space-x-1">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M10 12a2 2 0 100-4 2 2 0 000 4z"/>
                          <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"/>
                        </svg>
                        <span>{document.metadata.viewCount} views</span>
                      </div>
                    )}

                    {document.metadata?.lastAccessed && (
                      <div className="flex items-center space-x-1">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"/>
                        </svg>
                        <span>Last: {formatDate(document.metadata.lastAccessed)}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    {/* Quick Action Buttons */}
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        // Open document viewer directly
                        if (onViewDocument) {
                          onViewDocument(document);
                        } else {
                          setDocumentToView(document);
                          setIsViewerModalOpen(true);
                        }
                      }}
                      className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:hover:bg-blue-800 transition-colors"
                      title="Open document viewer"
                    >
                      View
                    </button>
                    
                    {document.url && (
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          const link = window.document.createElement('a');
                          link.href = document.url;
                          link.download = document.name;
                          link.click();
                        }}
                        className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 dark:bg-green-900 dark:text-green-200 dark:hover:bg-green-800 transition-colors"
                        title="Download document"
                      >
                        Download
                      </button>
                    )}

                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-lg md:rounded-lg max-w-md w-full p-4 sm:p-6 md:dialog-fullscreen">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              {translate('documents.deleteConfirmation.title')}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              {translate('documents.deleteConfirmation.message', {
                name: selectedDocument?.name,
              })}
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-400"
              >
                {translate('common.cancel')}
              </button>
              <button
                onClick={confirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeleting ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Deleting...
                  </div>
                ) : (
                  translate('common.delete')
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Delete Confirmation Modal */}
      {isBatchDeleteModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-lg md:rounded-lg max-w-md w-full p-4 sm:p-6 md:dialog-fullscreen">
            <div className="flex items-center mb-4">
              <svg
                className="w-6 h-6 text-red-600 mr-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Confirm Batch Deletion
              </h3>
            </div>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              Are you sure you want to delete{' '}
              <strong>{selectedDocuments.size}</strong> selected documents? This
              action cannot be undone.
            </p>

            {/* Show list of documents to be deleted */}
            <div className="mb-6 max-h-32 overflow-y-auto bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
              <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                Documents to be deleted:
              </div>
              {filteredDocuments
                ?.filter(doc => {
                  const docId = doc.firestoreId || doc.id;
                  return docId && selectedDocuments.has(docId);
                })
                .map((doc, index) => (
                  <div
                    key={index}
                    className="text-sm text-gray-800 dark:text-gray-200 truncate"
                  >
                    • {doc.name}
                  </div>
                ))}
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={cancelBatchDelete}
                disabled={isBatchDeleting}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-400 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmBatchDelete}
                disabled={isBatchDeleting}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isBatchDeleting ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Deleting {selectedDocuments.size} files...
                  </div>
                ) : (
                  `Delete ${selectedDocuments.size} Documents`
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
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {documentToView.name}
              </h3>
              <button
                onClick={() => {
                  setIsViewerModalOpen(false);
                  setDocumentToView(null);
                }}
                className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 focus:outline-none"
                aria-label="Close"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div
              className="flex-1 p-4 overflow-hidden"
              style={{ paddingBottom: 'calc(1rem + var(--safe-bottom, 0px))' }}
            >
              <DocumentViewer
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

      {/* Enhanced Reprocess Modal */}
      {isReprocessModalOpen && (
        <ReprocessModal
          isOpen={isReprocessModalOpen}
          onClose={() => setIsReprocessModalOpen(false)}
          documentCount={
            reprocessTarget?.type === 'all'
              ? documents?.length || 0
              : reprocessTarget?.type === 'selected'
                ? selectedDocuments.size
                : undefined
          }
          document={
            reprocessTarget?.type === 'single' && reprocessTarget.document
              ? {
                  id:
                    (reprocessTarget.document.id || reprocessTarget.document.firestoreId || reprocessTarget.document.name) as string,
                  name: reprocessTarget.document.name,
                  category: (reprocessTarget.document.category as string) || '',
                  metadata: reprocessTarget.document.metadata as any,
                }
              : undefined
          }
          onReprocess={handleEnhancedReprocess}
          isProcessing={isReprocessing}
        />
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
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
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
