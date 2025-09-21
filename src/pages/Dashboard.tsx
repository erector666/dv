import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { DocumentList } from '../components/documents';
import { useAuth } from '../context/AuthContext';
import { useQuery } from 'react-query';
import { getDocuments, Document } from '../services/documentService';
import { 
  FileText, 
  DollarSign, 
  Heart, 
  Shield, 
  FolderOpen, 
  TrendingUp,
  Search,
  BarChart3,
  Filter,
  Activity
} from 'lucide-react';
import { formatFileSize, formatDate } from '../utils/formatters';
import { DocumentViewer } from '../components/viewer';
import { Card, StatsCard } from '../components/ui';
import { SmartSearchWidget, QuickUploadWidget, AnalyticsWidget } from '../components/dashboard';

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

  // Memoized document statistics - calculated once per documents change
  const documentStats = useMemo(() => {
    if (!documents) {
      return {
        totalDocuments: 0,
        totalSize: 0,
        recentDocuments: 0,
        categoryCounts: {} as Record<string, number>,
        processingCount: 0
      };
    }

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const stats = documents.reduce((acc, doc) => {
      // Total documents
      acc.totalDocuments++;
      
      // Total size
      acc.totalSize += doc.size || 0;
      
      // Recent documents (last 7 days)
      const uploadDate = doc.uploadedAt?.toDate?.() || new Date(doc.uploadedAt || 0);
      if (uploadDate > weekAgo) {
        acc.recentDocuments++;
      }
      
      // Category counts
      const category = doc.category || 'other';
      acc.categoryCounts[category] = (acc.categoryCounts[category] || 0) + 1;
      
      // Processing count
      if (doc.status === 'processing') {
        acc.processingCount++;
      }
      
      return acc;
    }, {
      totalDocuments: 0,
      totalSize: 0,
      recentDocuments: 0,
      categoryCounts: {} as Record<string, number>,
      processingCount: 0
    });

    return stats;
  }, [documents]);

  // Memoized category count getter
  const getCategoryCount = useCallback((category: string) => {
    return documentStats.categoryCounts[category] || 0;
  }, [documentStats.categoryCounts]);

  // Memoized category click handler
  const handleCategoryClick = useCallback((category: string) => {
    navigate(`/category/${category}`);
  }, [navigate]);

  // Get user's name for personalized greeting
  const getUserName = () => {
    if (currentUser?.displayName) {
      return currentUser.displayName.split(' ')[0];
    }
    if (currentUser?.email) {
      return currentUser.email.split('@')[0];
    }
    return 'User';
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Hero Section with Personalized Welcome */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 text-white">
        <div className="p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div className="mb-6 md:mb-0">
              <h1 className="text-3xl md:text-4xl font-bold mb-2">
                Welcome back, {getUserName()}! 👋
              </h1>
              <p className="text-blue-100 text-lg">
                {new Date().toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Header search removed - using main SmartSearchWidget below */}
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6 -mt-4 sm:-mt-6 relative z-10">
        {/* Smart Search Widget */}
        <div className="mb-8 sm:mb-10 relative z-20">
          <SmartSearchWidget documents={documents} className="max-w-2xl mx-auto" />
        </div>

        {/* Mobile-Optimized Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8 relative z-10">
          <StatsCard
            variant="glass"
            icon={<FileText className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />}
            label="Total Documents"
            value={documentStats.totalDocuments}
            className="active:scale-95 transition-all duration-200 touch-manipulation"
            onClick={() => navigate('/search')}
          />
          <StatsCard
            variant="glassPurple"
            icon={<BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />}
            label="Storage Used"
            value={formatFileSize(documentStats.totalSize)}
            className="active:scale-95 transition-all duration-200 touch-manipulation"
            onClick={() => navigate('/settings')}
          />
          <StatsCard
            variant="neonGreen"
            icon={<TrendingUp className="w-5 h-5 sm:w-6 sm:h-6" />}
            label="This Week"
            value={documentStats.recentDocuments}
            className="active:scale-95 transition-all duration-200 touch-manipulation"
            onClick={() => navigate('/search')}
          />
          <StatsCard
            variant="gradientSunset"
            icon={<Activity className="w-5 h-5 sm:w-6 sm:h-6" />}
            label="Processing"
            value={documentStats.processingCount}
            className="active:scale-95 transition-all duration-200 touch-manipulation"
            onClick={() => navigate('/search')}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8 mb-6 sm:mb-8">
          {/* Sidebar Widgets */}
          <div className="lg:col-span-1 space-y-4 sm:space-y-6 order-2 lg:order-1 relative z-0">
            {/* Quick Upload Widget - Primary upload method */}
            <QuickUploadWidget />

            {/* Activity Feed */}
            <Card variant="floating" className="p-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center space-x-2">
                <Activity className="w-5 h-5 text-green-500" />
                <span>Recent Activity</span>
              </h3>
              <div className="space-y-4">
                {documents && documents.length > 0 ? (
                  documents
                    .sort((a, b) => {
                      const dateA = a.uploadedAt?.toDate?.() || new Date(a.uploadedAt || 0);
                      const dateB = b.uploadedAt?.toDate?.() || new Date(b.uploadedAt || 0);
                      return dateB.getTime() - dateA.getTime();
                    })
                    .slice(0, 3)
                    .map((doc, index) => (
                      <div key={index} className="flex items-start space-x-3">
                        <div className={`w-2 h-2 rounded-full mt-2 ${
                          doc.status === 'ready' ? 'bg-green-500' : 
                          doc.status === 'processing' ? 'bg-yellow-500' : 
                          'bg-blue-500'
                        }`}></div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {doc.status === 'ready' ? 'Processing completed' : 
                             doc.status === 'processing' ? 'Document processing' : 
                             'Document uploaded'}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {doc.name}
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-500">
                            {formatDate(doc.uploadedAt)}
                          </p>
                        </div>
                      </div>
                    ))
                ) : (
                  <div className="text-center py-4">
                    <Activity className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      No recent activity
                    </p>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Main Document List - Takes 3/4 width */}
          <div className="lg:col-span-3 order-1 lg:order-2 relative z-0">
            <Card variant="floating" className="h-full">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center space-x-3">
                  <FileText className="w-6 h-6 text-blue-600" />
                  <span>Your Documents</span>
                </h2>
                <div className="flex items-center space-x-2 sm:space-x-3">
                  {/* Advanced search removed - functionality integrated into SmartSearchWidget */}
                </div>
              </div>
              
              <DocumentList />
            </Card>
          </div>
        </div>

        {/* Enhanced Categories Section */}
        <Card variant="floating" className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center space-x-3">
              <FolderOpen className="w-6 h-6 text-indigo-600" />
              <span>Document Categories</span>
            </h2>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {documents?.length || 0} documents organized
            </div>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            {[
              {
                key: 'personal',
                icon: FileText,
                variant: 'glassPurple' as const,
                color: 'purple',
              },
              {
                key: 'bills',
                icon: DollarSign,
                variant: 'neonGreen' as const,
                color: 'green',
              },
              {
                key: 'medical',
                icon: Heart,
                variant: 'gradientSunset' as const,
                color: 'red',
              },
              {
                key: 'insurance',
                icon: Shield,
                variant: 'neonBlue' as const,
                color: 'blue',
              },
              {
                key: 'other',
                icon: FolderOpen,
                variant: 'glass' as const,
                color: 'gray',
              },
            ].map(({ key, icon: IconComponent, variant, color }) => {
              const categoryKey = key || 'unknown';
              const categoryName = translate(categoryKey) || categoryKey;
              const count = getCategoryCount(categoryKey);

              return (
                <div
                  key={`category-${categoryKey}`}
                  onClick={() => handleCategoryClick(categoryKey)}
                  className="group cursor-pointer"
                >
                  <Card
                    variant={variant}
                    className="h-24 sm:h-32 flex flex-col items-center justify-center text-center active:scale-95 hover:scale-105 transition-all duration-300 touch-manipulation"
                  >
                    <div className="mb-1 sm:mb-2 group-active:scale-95 group-hover:scale-110 transition-transform duration-200">
                      <IconComponent className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                    <div>
                      <p className={`text-base sm:text-lg font-bold mb-1 ${
                        variant?.includes('neon') || variant?.includes('gradient') 
                          ? 'text-white' 
                          : 'text-gray-900 dark:text-white'
                      }`}>
                        {count}
                      </p>
                      <p className={`text-xs font-medium ${
                        variant?.includes('neon') || variant?.includes('gradient')
                          ? 'text-gray-200'
                          : 'text-gray-600 dark:text-gray-400'
                      }`}>
                        {categoryName}
                      </p>
                    </div>
                  </Card>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Analytics Widget */}
        <AnalyticsWidget documents={documents} className="mb-8" />
      </div>

      {/* Mobile search removed - using main SmartSearchWidget which is mobile-responsive */}

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
