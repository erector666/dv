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
import { Card, StatsCard } from '../components/ui';

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
        <Card variant="glass" className="col-span-full mb-6">
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
                    <Card
                      key={docKey}
                      variant="floating"
                      padding="sm"
                      className="cursor-pointer group hover:scale-[1.02] transition-all duration-300"
                      onClick={() => handleDocumentClick(doc)}
                    >
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
                    </Card>
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
        </Card>

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
                variant: 'glassPurple' as const,
              },
              {
                key: 'bills',
                icon: DollarSign,
                variant: 'neonGreen' as const,
              },
              {
                key: 'medical',
                icon: Heart,
                variant: 'gradientSunset' as const,
              },
              {
                key: 'insurance',
                icon: Shield,
                variant: 'neonBlue' as const,
              },
              {
                key: 'other',
                icon: FolderOpen,
                variant: 'glass' as const,
              },
            ].map(({ key, icon: IconComponent, variant }) => {
              // Ensure we have a valid key and translation
              const categoryKey = key || 'unknown';
              const categoryName = translate(categoryKey) || categoryKey;
              const count = getCategoryCount(categoryKey);

              return (
                <StatsCard
                  key={`category-${categoryKey}`}
                  variant={variant}
                  icon={<IconComponent className="w-6 h-6" />}
                  label={categoryName}
                  value={count}
                  className="h-40 cursor-pointer"
                  onClick={() => handleCategoryClick(categoryKey)}
                />
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
