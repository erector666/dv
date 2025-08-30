import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { getUserDocuments, Document, deleteDocument } from '../../services/documentService';
import { formatFileSize, formatDate } from '../../utils/formatters';

interface DocumentListProps {
  category?: string;
  searchTerm?: string;
  onViewDocument?: (document: Document) => void;
}

const DocumentList: React.FC<DocumentListProps> = ({ 
  category, 
  searchTerm = '',
  onViewDocument 
}) => {
  const { currentUser } = useAuth();
  const { translate } = useLanguage();
  const navigate = useNavigate();
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Fetch documents using React Query
  const { 
    data: documents, 
    isLoading, 
    isError, 
    refetch 
  } = useQuery(
    ['documents', currentUser?.uid, category],
    () => getUserDocuments(currentUser?.uid || '', category),
    {
      enabled: !!currentUser,
      staleTime: 60000, // 1 minute
    }
  );

  // Filter documents based on search term
  const filteredDocuments = documents?.filter(doc => 
    doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (doc.tags && doc.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())))
  );

  // Handle document click
  const handleDocumentClick = (document: Document) => {
    if (onViewDocument) {
      onViewDocument(document);
    } else {
      navigate(`/document/${document.id}`);
    }
  };

  // Handle document delete
  const handleDeleteClick = (e: React.MouseEvent, document: Document) => {
    e.stopPropagation();
    setSelectedDocument(document);
    setIsDeleteModalOpen(true);
  };

  // Confirm document deletion
  const confirmDelete = async () => {
    if (selectedDocument?.id) {
      try {
        await deleteDocument(selectedDocument.id);
        refetch();
        setIsDeleteModalOpen(false);
        setSelectedDocument(null);
      } catch (error) {
        console.error('Error deleting document:', error);
      }
    }
  };

  // Get document icon based on file type
  const getDocumentIcon = (type: string) => {
    if (type.startsWith('image/')) {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      );
    } else if (type === 'application/pdf') {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      );
    } else if (type.includes('word') || type.includes('document')) {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    } else if (type.includes('spreadsheet') || type.includes('excel')) {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    } else {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
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
    return (
      <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-md">
        <p className="text-red-600 dark:text-red-400">
          {translate('documents.error.loading')}
        </p>
      </div>
    );
  }

  if (!filteredDocuments?.length) {
    return (
      <div className="bg-gray-50 dark:bg-gray-800 p-8 rounded-md text-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDocuments.map((document) => (
          <div 
            key={document.id} 
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
                  <p>{formatDate(document.uploadedAt.toDate ? document.uploadedAt.toDate() : new Date(document.uploadedAt))}</p>
                </div>
                {document.tags && document.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {document.tags.slice(0, 3).map((tag, index) => (
                      <span 
                        key={index} 
                        className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                      >
                        {tag}
                      </span>
                    ))}
                    {document.tags.length > 3 && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                        +{document.tags.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </div>
              <div className="flex-shrink-0">
                <button
                  onClick={(e) => handleDeleteClick(e, document)}
                  className="text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 focus:outline-none"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              {translate('documents.deleteConfirmation.title')}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              {translate('documents.deleteConfirmation.message', { name: selectedDocument?.name })}
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
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                {translate('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DocumentList;
