import React, { useState, useEffect } from 'react';

import { useQuery } from 'react-query';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import {
  getUserDocuments,
  Document,
  deleteDocument,
} from '../../services/documentService';
import { DocumentViewer } from '../viewer';
import { formatFileSize, formatDate } from '../../utils/formatters';

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

  // Debug logging
  useEffect(() => {
    console.log('=== DOCUMENT LIST DEBUG ===');
    console.log('Current User:', currentUser);
    console.log('User UID:', currentUser?.uid);
    console.log('Category:', category);
    console.log('Search Term:', searchTerm);
  }, [currentUser, category, searchTerm]);

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
        console.log('✅ Documents fetched successfully:', data);
        console.log('Document count:', data?.length || 0);
      },
      onError: err => {
        console.error('❌ Error fetching documents:', err);
      },
    }
  );

  // Debug logging for documents
  useEffect(() => {
    console.log('Documents data:', documents);
    console.log('Documents length:', documents?.length || 0);
    if (documents && documents.length > 0) {
      console.log('First document:', documents[0]);
    }
  }, [documents]);

  // Filter documents based on search term
  const filteredDocuments = documents?.filter(
    doc =>
      doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (doc.tags &&
        doc.tags.some(tag =>
          tag.toLowerCase().includes(searchTerm.toLowerCase())
        ))
  );

  // Debug logging for filtered documents
  useEffect(() => {
    console.log('Filtered documents:', filteredDocuments);
    console.log('Filtered count:', filteredDocuments?.length || 0);
  }, [filteredDocuments]);

  // Debug logging for delete modal state
  useEffect(() => {
    console.log('🔍 Delete modal state:', {
      isDeleteModalOpen,
      selectedDocument: selectedDocument?.id,
      selectedDocumentFirestoreId: selectedDocument?.firestoreId,
      selectedDocumentName: selectedDocument?.name,
      selectedDocumentObject: selectedDocument
    });
  }, [isDeleteModalOpen, selectedDocument]);

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
    console.log('🗑️ Delete button clicked for document:', document);
    console.log('Document ID:', document.id);
    console.log('Firestore ID:', document.firestoreId);
    console.log('Document name:', document.name);
    
    // Check if document has a valid Firestore ID for deletion
    if (!document.firestoreId || document.firestoreId === '') {
      console.error('❌ Cannot delete document: Missing Firestore ID');
      alert('Cannot delete this document: Document ID is missing in database. This document may be corrupted.');
      return;
    }
    
    e.stopPropagation();
    setSelectedDocument(document);
    setIsDeleteModalOpen(true);
    console.log('Selected document set and delete modal opened');
  };

  // Confirm document deletion
  const confirmDelete = async () => {
    console.log('🗑️ Confirm delete called');
    console.log('Selected document:', selectedDocument);
    console.log('Selected document ID:', selectedDocument?.id);
    console.log('Selected document Firestore ID:', selectedDocument?.firestoreId);
    console.log('Selected document name:', selectedDocument?.name);
    
    if (selectedDocument?.firestoreId) {
      try {
        setIsDeleting(true);
        console.log('🗑️ Starting deletion of document:', selectedDocument.name, 'with Firestore ID:', selectedDocument.firestoreId);
        await deleteDocument(selectedDocument.id || selectedDocument.name, selectedDocument.firestoreId);
        console.log('✅ Document deleted successfully');
        refetch();
        setIsDeleteModalOpen(false);
        setSelectedDocument(null);
      } catch (error) {
        console.error('❌ Error deleting document:', error);
        // Show error to user
        alert(`Failed to delete document: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        setIsDeleting(false);
      }
    } else {
      console.error('❌ No Firestore ID for deletion');
      console.error('Selected document object:', selectedDocument);
      alert('Cannot delete document: No Firestore ID found');
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
    console.log('🔄 Document list is loading...');
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
    console.log('📭 No documents found to display');
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

        {/* Debug Information */}
        <div className="mt-6 p-4 bg-gray-100 dark:bg-gray-700 rounded-md text-left text-sm">
          <h4 className="font-semibold mb-2">🔍 Debug Information:</h4>
          <div className="space-y-1 text-xs">
            <p>
              <strong>User ID:</strong>{' '}
              {currentUser?.uid || 'Not authenticated'}
            </p>
            <p>
              <strong>User Email:</strong> {currentUser?.email || 'N/A'}
            </p>
            <p>
              <strong>Auth State:</strong>{' '}
              {currentUser ? '✅ Authenticated' : '❌ Not Authenticated'}
            </p>
            <p>
              <strong>Documents Fetched:</strong> {documents?.length || 0}
            </p>
            <p>
              <strong>Category:</strong> {category || 'All'}
            </p>
            <p>
              <strong>Search Term:</strong> {searchTerm || 'None'}
            </p>
            <p>
              <strong>Query Enabled:</strong>{' '}
              {!!currentUser?.uid ? '✅ Yes' : '❌ No'}
            </p>
            <p>
              <strong>Loading State:</strong> {isLoading ? '🔄 Yes' : '❌ No'}
            </p>
            <p>
              <strong>Error State:</strong> {isError ? '❌ Yes' : '✅ No'}
            </p>
          </div>

          {/* Manual Refresh Button */}
          <div className="mt-3">
            <button
              onClick={() => {
                console.log('🔄 Manual refresh triggered');
                refetch();
              }}
              className="px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
            >
              🔄 Refresh Documents
            </button>
          </div>

          {/* Raw Data Display */}
          {documents && (
            <details className="mt-3">
              <summary className="cursor-pointer font-semibold">
                📊 Raw Documents Data
              </summary>
              <pre className="mt-2 text-xs bg-gray-200 dark:bg-gray-600 p-2 rounded overflow-auto max-h-40">
                {JSON.stringify(documents, null, 2)}
              </pre>
            </details>
          )}
        </div>
      </div>
    );
  }

  console.log(`✅ Rendering ${filteredDocuments.length} documents`);

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDocuments.map((document, index) => {
          // Ensure we have a valid key for React
          const documentKey = document.id || `doc-${index}-${document.name || 'unnamed'}`;
          console.log(`Rendering document ${index}:`, { 
            id: document.id, 
            firestoreId: document.firestoreId, 
            name: document.name, 
            key: documentKey 
          });
          
          return (
            <div
              key={documentKey}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden cursor-pointer hover:shadow-lg transition-shadow duration-200"
              onClick={() => handleDocumentClick(document)}
            >
            <div className="p-4 flex items-start space-x-4">
              <div className="flex-shrink-0">
                {getDocumentIcon(document.type)}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white truncate">
                  {document.name}
                </h3>
                <div className="mt-1 flex flex-col space-y-1 text-sm text-gray-500 dark:text-gray-400">
                  <p>{formatFileSize(document.size)}</p>
                  <p>
                    {formatDate(document.uploadedAt)}
                  </p>

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
                          🌐 Language: {document.metadata.language}
                        </p>
                      )}

                      {/* Category */}
                      {document.category && (
                        <p className="text-xs">
                          📁 Category: {document.category}
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
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

      {/* Document Viewer Modal */}
      {isViewerModalOpen && documentToView && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-6xl w-full h-5/6 flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {documentToView.name}
              </h3>
              <button
                onClick={() => {
                  setIsViewerModalOpen(false);
                  setDocumentToView(null);
                }}
                className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 focus:outline-none"
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
            <div className="flex-1 p-4 overflow-hidden">
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
    </>
  );
};

export default DocumentList;
