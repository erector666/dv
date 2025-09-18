import React, { useState, useEffect } from 'react';

import { useQuery } from 'react-query';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import {
  getUserDocuments,
  Document,
  deleteDocument,
  reprocessDocumentsWithNewAI,
} from '../../services/documentService';
import { DocumentViewer } from '../viewer';
import { formatFileSize, formatDate } from '../../utils/formatters';
import { ReprocessModal } from '../ai';
import { reprocessDocumentsEnhanced } from '../../services/dualAIService';

interface DocumentListProps {
  category?: string;
  searchTerm?: string;
  onViewDocument?: (document: Document) => void;
}

const DocumentList: React.FC<DocumentListProps> = ({
  category,
  searchTerm = '',
  onViewDocument,
}) => {
  const { currentUser } = useAuth();
  const { translate } = useLanguage();

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

  // Filter documents based on search term
  const filteredDocuments = documents?.filter(
    doc =>
      doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (doc.tags &&
        doc.tags.some(tag =>
          tag.toLowerCase().includes(searchTerm.toLowerCase())
        ))
  );

  // Removed debug logging to reduce console spam

  // Removed debug logging to reduce console spam

  // Handle document click
  const handleDocumentClick = (document: Document) => {
    if (onViewDocument) {
      onViewDocument(document);
    } else {
      // Open document in modal instead of navigating to route
      setDocumentToView(document);
      setIsViewerModalOpen(true);
    }
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
    setIsReprocessModalOpen(true);
  };

  const handleEnhancedReprocess = async (
    mode: 'huggingface' | 'deepseek' | 'both'
  ) => {
    if (!documents || documents.length === 0) return;

    setIsReprocessing(true);
    setIsReprocessModalOpen(false);

    try {
      console.log(
        `🚀 Starting enhanced reprocessing with ${mode} for ${documents.length} documents`
      );

      const documentUrls = documents.map(doc => doc.url).filter(Boolean);
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
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
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
                <>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {selectedDocuments.size} of {filteredDocuments?.length || 0}{' '}
                    selected
                  </div>

                  <div className="flex items-center space-x-2">
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
                </>
              )}
            </div>

            {isBatchMode && selectedDocuments.size > 0 && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleBatchDelete}
                  disabled={selectedDocuments.size === 0}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                  <span>Delete Selected ({selectedDocuments.size})</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* AI Reprocessing Button */}
      {!isBatchMode && documents && documents.length > 0 && (
        <div className="mb-6">
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
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
              className={`bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden cursor-pointer hover:shadow-lg transition-all duration-200 ${
                isBatchMode && isSelected
                  ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : ''
              }`}
              onClick={e => {
                if (isBatchMode && docId) {
                  e.stopPropagation();
                  toggleDocumentSelection(docId);
                } else if (!isBatchMode) {
                  handleDocumentClick(document);
                }
              }}
            >
              <div className="p-4 flex items-start space-x-4">
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

                <div className="flex-shrink-0">
                  {getDocumentIcon(document.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white truncate flex items-center gap-2">
                    <span className="truncate">{document.name}</span>
                    {(document.metadata?.language || document.metadata?.languageDetection?.language) && (
                      <span
                        className="flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                        title="Detected language"
                      >
                        {(document.metadata?.language || document.metadata?.languageDetection?.language || 'N/A')
                          .toString()
                          .toUpperCase()}
                      </span>
                    )}
                  </h3>
                  <div className="mt-1 flex flex-col space-y-1 text-sm text-gray-500 dark:text-gray-400">
                    <p>{formatFileSize(document.size)}</p>
                    <p>{formatDate(document.uploadedAt)}</p>

                    {/* AI Processing Results */}
                    {document.metadata?.aiProcessed && (
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
                            <p className="text-xs text-blue-600 dark:text-blue-400">
                              💡 Suggested: {document.metadata.suggestedName}
                            </p>
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
                <div className="flex-shrink-0">
                  {document.firestoreId && document.firestoreId !== '' ? (
                    <button
                      onClick={e => handleDeleteClick(e, document)}
                      className="text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 focus:outline-none"
                      title="Delete document"
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
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
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
          documentCount={documents?.length || 0}
          onReprocess={handleEnhancedReprocess}
          isProcessing={isReprocessing}
        />
      )}
    </>
  );
};

export default DocumentList;
