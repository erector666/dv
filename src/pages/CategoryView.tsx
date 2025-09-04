import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQueryClient, useQuery } from 'react-query';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { UploadModal } from '../components/upload';
import { getDocuments } from '../services/documentService';
import { DocumentList } from '../components/documents';

const CategoryView: React.FC = () => {
  const { categoryId } = useParams<{ categoryId: string }>();
  const { translate } = useLanguage();
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  // Map category ID to display name
  const getCategoryDisplayName = (category: string) => {
    const categoryNames: Record<string, string> = {
      personal: 'Personal',
      financial: 'Financial',
      education: 'Education', 
      legal: 'Legal',
      government: 'Government',
      medical: 'Medical',
      insurance: 'Insurance',
      other: 'Other',
      bills: 'Financial', // Legacy mapping
    };
    return categoryNames[category] || category.charAt(0).toUpperCase() + category.slice(1);
  };

  const categoryDisplayName = getCategoryDisplayName(categoryId || 'other');

  // Fetch documents for this category
  const {
    data: documents,
    isLoading,
    isError,
  } = useQuery(
    ['documents', currentUser?.uid],
    () => getDocuments(currentUser?.uid || ''),
    {
      enabled: !!currentUser?.uid,
    }
  );

  // Filter documents by category
  const categoryDocuments =
    documents?.filter(doc => doc.category === categoryId) || [];

  const handleUploadComplete = () => {
    console.log(
      '🔄 Upload completed in CategoryView, invalidating documents cache...'
    );

    // Invalidate and refetch the documents query to show the new document
    queryClient.invalidateQueries(['documents']);

    // Close the upload modal
    setIsUploadModalOpen(false);
  };

  return (
    <>
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-2 transition-colors"
            >
              <svg
                className="w-5 h-5 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              Back to Dashboard
            </button>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {categoryDisplayName} Documents
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              {categoryDocuments.length}{' '}
              {categoryDocuments.length === 1
                ? translate('document')
                : translate('documents')}{' '}
              in this category
            </p>
          </div>

          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-lg transition-colors flex items-center space-x-2"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            <span>Upload Document</span>
          </button>
        </div>

        {/* Documents List */}
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : isError ? (
          <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-lg">
            <p className="text-red-600 dark:text-red-400 text-center">
              Error loading documents. Please try again.
            </p>
          </div>
        ) : categoryDocuments.length > 0 ? (
          <DocumentList category={categoryId} />
        ) : (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-12 text-center">
            <div className="w-24 h-24 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mx-auto mb-6">
              <span className="text-4xl">📄</span>
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              No documents in this category yet
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
              Upload your first document to the {categoryDisplayName}{' '}
              category to get started
            </p>
            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-lg transition-colors"
            >
              Upload Document
            </button>
          </div>
        )}
      </div>
      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUploadComplete={handleUploadComplete}
      />
    </>
  );
};

export default CategoryView;
