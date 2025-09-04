import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { DocumentList } from '../components/documents';
import { useAuth } from '../context/AuthContext';
import { useQuery } from 'react-query';
import { getDocuments } from '../services/documentService';
import { formatFileSize, formatDate } from '../utils/formatters';

const Dashboard: React.FC = () => {
  const { translate } = useLanguage();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  // Fetch documents for category counts
  const { data: documents } = useQuery(
    ['documents', currentUser?.uid],
    () => getDocuments(currentUser?.uid || ''),
    {
      enabled: !!currentUser?.uid,
    }
  );

  // Get document counts by category
  const getCategoryCount = (category: string) => {
    if (!documents) return 0;
    return documents.filter(doc => doc.category === category).length;
  };

  // Handle category card click
  const handleCategoryClick = (category: string) => {
    navigate(`/category/${category}`);
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">{translate('dashboard')}</h1>

      {/* Documents Section */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">
          {translate('documents.title') || 'Your Documents'}
        </h2>
        <DocumentList />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Recent Uploads Section */}
        <div className="col-span-full bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">
            {translate('recentUploads')}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {documents && documents.length > 0 ? (
              // Show recent documents (last 4)
              documents
                .sort((a, b) => {
                  try {
                    const dateA = a.uploadedAt?.toDate?.() || new Date(a.uploadedAt || 0);
                    const dateB = b.uploadedAt?.toDate?.() || new Date(b.uploadedAt || 0);
                    
                    // Check if dates are valid
                    if (isNaN(dateA.getTime()) || isNaN(dateB.getTime())) {
                      return 0; // Keep original order if dates are invalid
                    }
                    
                    return dateB.getTime() - dateA.getTime();
                  } catch (error) {
                    console.error('Error sorting documents by date:', error);
                    return 0; // Keep original order on error
                  }
                })
                .slice(0, 4)
                .map((doc, index) => {
                                     // Ensure we have a valid key for React
                   const docKey = doc.id || `recent-doc-${index}-${doc.name || 'unnamed'}`;
                   console.log(`Rendering recent document ${index}:`, { 
                     id: doc.id, 
                     firestoreId: doc.firestoreId, 
                     name: doc.name, 
                     key: docKey 
                   });
                   
                   return (
                    <div
                      key={docKey}
                      className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600 hover:border-primary-300 dark:hover:border-primary-600 transition-colors cursor-pointer"
                      onClick={() => navigate(`/document/${doc.id}`)}
                    >
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900 rounded-lg flex items-center justify-center">
                          <span className="text-primary-600 dark:text-primary-400 text-lg">
                            📄
                          </span>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {doc.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {formatFileSize(doc.size)}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                          {formatDate(doc.uploadedAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
                })
            ) : (
              // Show empty state
              <div className="col-span-full bg-gray-100 dark:bg-gray-700 rounded-lg h-40 flex items-center justify-center">
                <div className="text-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-12 w-12 mx-auto text-gray-400 mb-2"
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
                  <p className="text-gray-500 dark:text-gray-400">
                    No documents uploaded yet
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Categories Section */}
        <div className="col-span-full">
          <h2 className="text-xl font-semibold mb-4">
            {translate('categories')}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {/* Category Cards */}
            {[
              {
                key: 'personal',
                icon: '📄',
                color:
                  'from-purple-100 to-purple-200 dark:from-purple-900/30 dark:to-purple-900/20',
              },
              {
                key: 'bills',
                icon: '💰',
                color:
                  'from-yellow-100 to-yellow-200 dark:from-yellow-900/30 dark:to-yellow-900/20',
              },
              {
                key: 'medical',
                icon: '🏥',
                color:
                  'from-red-100 to-red-200 dark:from-red-900/30 dark:to-red-900/20',
              },
              {
                key: 'insurance',
                icon: '🔒',
                color:
                  'from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-900/20',
              },
              {
                key: 'other',
                icon: '📁',
                color:
                  'from-gray-100 to-gray-200 dark:from-gray-900/30 dark:to-gray-900/20',
              },
            ].map(({ key, icon, color }) => {
              // Ensure we have a valid key and translation
              const categoryKey = key || 'unknown';
              const categoryName = translate(categoryKey) || categoryKey;
              
              return (
                <div
                  key={`category-${categoryKey}`}
                  onClick={() => handleCategoryClick(categoryKey)}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-100 dark:border-gray-700 cursor-pointer group"
                >
                <div className="p-6 flex flex-col items-center justify-center h-40">
                  <div
                    className={`w-16 h-16 rounded-full bg-gradient-to-br ${color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-200`}
                  >
                    <span className="text-2xl">{icon}</span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    {categoryName}
                  </h3>
                  <div className="text-3xl font-bold text-primary-600 dark:text-primary-400">
                    {getCategoryCount(categoryKey)}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {getCategoryCount(categoryKey) === 1
                      ? translate('document')
                      : translate('documents')}
                  </p>
                </div>
              </div>
            );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
