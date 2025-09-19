import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { DocumentList } from '../components/documents';
import { useAuth } from '../context/AuthContext';
import { useQuery } from 'react-query';
import { getDocuments, Document } from '../services/documentService';
import { FileText, DollarSign, Heart, Shield, FolderOpen } from 'lucide-react';
import { formatFileSize, formatDate } from '../utils/formatters';
import { DocumentViewer } from '../components/viewer';

const Dashboard: React.FC = () => {
  const { translate } = useLanguage();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  // Document viewer state
  const [documentToView, setDocumentToView] = useState<Document | null>(null);
  const [isViewerModalOpen, setIsViewerModalOpen] = useState(false);

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

  // Handle document click - open in viewer modal
  const handleDocumentClick = (document: Document) => {
    setDocumentToView(document);
    setIsViewerModalOpen(true);
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
        <div className="col-span-full relative overflow-hidden rounded-2xl mb-6">
          {/* Glassmorphism background */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/80 to-white/60 dark:from-gray-800/80 dark:to-gray-900/60 backdrop-blur-xl border border-white/20 dark:border-gray-700/30 rounded-2xl" />
          
          {/* Content */}
          <div className="relative p-6">
          <h2 className="text-xl font-semibold mb-4">
            {translate('recentUploads')}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {documents && documents.length > 0 ? (
              // Show recent documents (last 4)
              documents
                .sort((a, b) => {
                  try {
                    const dateA =
                      a.uploadedAt?.toDate?.() || new Date(a.uploadedAt || 0);
                    const dateB =
                      b.uploadedAt?.toDate?.() || new Date(b.uploadedAt || 0);

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
                  const docKey =
                    doc.id || `recent-doc-${index}-${doc.name || 'unnamed'}`;

                  return (
                    <div
                      key={docKey}
                      className="relative group cursor-pointer overflow-hidden rounded-xl transform-gpu transition-all duration-300 hover:scale-[1.02]"
                      onClick={() => handleDocumentClick(doc)}
                    >
                      {/* Glassmorphism background */}
                      <div className="absolute inset-0 bg-gradient-to-br from-white/60 to-gray-50/80 dark:from-gray-800/60 dark:to-gray-900/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 rounded-xl" />
                      
                      {/* Hover gradient overlay */}
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl" />
                      
                      {/* Content */}
                      <div className="relative p-4">
                        <div className="flex items-center space-x-3">
                          <div className="flex-shrink-0 group-hover:scale-110 transition-transform duration-200">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center shadow-md group-hover:shadow-lg transition-all duration-200">
                              <span className="text-white text-lg drop-shadow-sm">
                                📄
                              </span>
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200">
                              {doc.name}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors duration-200">
                              {formatFileSize(doc.size)}
                            </p>
                            <p className="text-xs text-gray-400 dark:text-gray-500">
                              {formatDate(doc.uploadedAt)}
                            </p>
                          </div>
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
                icon: FileText,
                color:
                  'from-purple-100 to-purple-200 dark:from-purple-900/30 dark:to-purple-900/20',
              },
              {
                key: 'bills',
                icon: DollarSign,
                color:
                  'from-yellow-100 to-yellow-200 dark:from-yellow-900/30 dark:to-yellow-900/20',
              },
              {
                key: 'medical',
                icon: Heart,
                color:
                  'from-red-100 to-red-200 dark:from-red-900/30 dark:to-red-900/20',
              },
              {
                key: 'insurance',
                icon: Shield,
                color:
                  'from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-900/20',
              },
              {
                key: 'other',
                icon: FolderOpen,
                color:
                  'from-gray-100 to-gray-200 dark:from-gray-900/30 dark:to-gray-900/20',
              },
            ].map(({ key, icon: IconComponent, color }) => {
              // Ensure we have a valid key and translation
              const categoryKey = key || 'unknown';
              const categoryName = translate(categoryKey) || categoryKey;

              return (
                <div
                  key={`category-${categoryKey}`}
                  onClick={() => handleCategoryClick(categoryKey)}
                  className="relative overflow-hidden rounded-2xl cursor-pointer group transform-gpu"
                >
                  {/* Glassmorphism background with subtle gradient */}
                  <div className="absolute inset-0 bg-gradient-to-br from-white/80 to-white/40 dark:from-gray-800/80 dark:to-gray-900/40 backdrop-blur-xl border border-white/20 dark:border-gray-700/30 rounded-2xl" />
                  
                  {/* Animated gradient overlay */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${color} opacity-0 group-hover:opacity-20 transition-all duration-500 rounded-2xl`} />
                  
                  {/* Floating glow effect */}
                  <div className="absolute inset-0 rounded-2xl shadow-lg group-hover:shadow-2xl group-hover:shadow-blue-500/20 dark:group-hover:shadow-blue-500/10 transition-all duration-300" />
                  
                  {/* Content */}
                  <div className="relative p-6 flex flex-col items-center justify-center h-40 group-hover:scale-[1.02] transition-transform duration-300">
                    {/* Icon with enhanced styling */}
                    <div className="relative mb-4 group-hover:scale-110 transition-transform duration-300">
                      <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300`}>
                        <IconComponent className="w-8 h-8 text-white drop-shadow-sm" />
                      </div>
                      {/* Subtle glow behind icon */}
                      <div className={`absolute inset-0 w-16 h-16 rounded-2xl bg-gradient-to-br ${color} blur-xl opacity-30 group-hover:opacity-50 transition-opacity duration-300 -z-10`} />
                    </div>
                    
                    {/* Category name with gradient text */}
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 group-hover:bg-gradient-to-r group-hover:from-blue-600 group-hover:to-purple-600 group-hover:bg-clip-text group-hover:text-transparent transition-all duration-300">
                      {categoryName}
                    </h3>
                    
                    {/* Count with enhanced styling */}
                    <div className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent group-hover:from-purple-600 group-hover:to-pink-600 transition-all duration-300">
                      {getCategoryCount(categoryKey)}
                    </div>
                    
                    {/* Label */}
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors duration-300">
                      {getCategoryCount(categoryKey) === 1
                        ? translate('document')
                        : translate('documents')}
                    </p>
                  </div>
                  
                  {/* Subtle border animation */}
                  <div className="absolute inset-0 rounded-2xl border-2 border-transparent group-hover:border-gradient-to-r group-hover:from-blue-500/50 group-hover:to-purple-500/50 transition-all duration-300" />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Document Viewer Modal */}
      {documentToView && isViewerModalOpen && (
        <DocumentViewer
          document={documentToView}
          onClose={() => {
            setIsViewerModalOpen(false);
            setDocumentToView(null);
          }}
        />
      )}
    </div>
  );
};

export default Dashboard;
