import React, { useState } from 'react';
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
  Upload,
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

  // Get document counts by category
  const getCategoryCount = (category: string) => {
    if (!documents) return 0;
    return documents.filter(doc => doc.category === category).length;
  };

  // Handle category card click
  const handleCategoryClick = (category: string) => {
    navigate(`/category/${category}`);
  };


  // Get total document statistics
  const getTotalDocuments = () => documents?.length || 0;
  const getTotalSize = () => documents?.reduce((total, doc) => total + (doc.size || 0), 0) || 0;
  const getRecentDocuments = () => documents?.filter(doc => {
    const uploadDate = doc.uploadedAt?.toDate?.() || new Date(doc.uploadedAt || 0);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return uploadDate > weekAgo;
  }).length || 0;

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
              <button
                onClick={() => navigate('/search')}
                className="bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 text-white px-4 sm:px-6 py-3 rounded-xl font-semibold transition-all duration-200 hover:scale-105 flex items-center justify-center space-x-2"
              >
                <Search className="w-5 h-5" />
                <span className="hidden sm:inline">Search Documents</span>
                <span className="sm:hidden">Search</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 sm:p-6 -mt-4 sm:-mt-6 relative z-10">
        {/* Smart Search Widget */}
        <div className="mb-6 sm:mb-8">
          <SmartSearchWidget documents={documents} className="max-w-2xl mx-auto" />
        </div>

        {/* Quick Stats Overview */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
          <StatsCard
            variant="glass"
            icon={<FileText className="w-6 h-6 text-blue-600" />}
            label="Total Documents"
            value={getTotalDocuments()}
            className="hover:scale-105 transition-transform duration-200"
          />
          <StatsCard
            variant="glassPurple"
            icon={<BarChart3 className="w-6 h-6 text-purple-600" />}
            label="Storage Used"
            value={formatFileSize(getTotalSize())}
            className="hover:scale-105 transition-transform duration-200"
          />
          <StatsCard
            variant="neonGreen"
            icon={<TrendingUp className="w-6 h-6" />}
            label="This Week"
            value={getRecentDocuments()}
            className="hover:scale-105 transition-transform duration-200"
          />
          <StatsCard
            variant="gradientSunset"
            icon={<Activity className="w-6 h-6" />}
            label="Processing"
            value={documents?.filter(d => d.status === 'processing').length || 0}
            className="hover:scale-105 transition-transform duration-200"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8 mb-6 sm:mb-8">
          {/* Sidebar Widgets */}
          <div className="lg:col-span-1 space-y-4 sm:space-y-6 order-2 lg:order-1">
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
          <div className="lg:col-span-3 order-1 lg:order-2">
            <Card variant="floating" className="h-full">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center space-x-3">
                  <FileText className="w-6 h-6 text-blue-600" />
                  <span>Your Documents</span>
                </h2>
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <button
                    onClick={() => navigate('/search')}
                    className="flex items-center space-x-1 sm:space-x-2 px-3 sm:px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm sm:text-base"
                  >
                    <Filter className="w-4 h-4" />
                    <span className="hidden sm:inline">Advanced Search</span>
                    <span className="sm:hidden">Search</span>
                  </button>
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
                    className="h-24 sm:h-32 flex flex-col items-center justify-center text-center hover:scale-105 transition-all duration-300"
                  >
                    <div className="mb-2 sm:mb-3 group-hover:scale-110 transition-transform duration-200">
                      <IconComponent className="w-6 h-6 sm:w-8 sm:h-8" />
                    </div>
                    <div>
                      <p className={`text-lg sm:text-2xl font-bold mb-1 ${
                        variant?.includes('neon') || variant?.includes('gradient') 
                          ? 'text-white' 
                          : 'text-gray-900 dark:text-white'
                      }`}>
                        {count}
                      </p>
                      <p className={`text-xs sm:text-sm font-medium ${
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

      {/* Mobile Quick Actions */}
      <div className="fixed bottom-6 right-4 md:hidden z-50 flex flex-col space-y-3">
        <button
          onClick={() => navigate('/search')}
          className="bg-purple-600 hover:bg-purple-700 text-white p-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-110"
          aria-label="Search documents"
        >
          <Search className="w-5 h-5" />
        </button>
        <button
          onClick={() => navigate('/upload')}
          className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-110"
          aria-label="Upload documents"
        >
          <Upload className="w-6 h-6" />
        </button>
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
