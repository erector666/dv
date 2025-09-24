import React, { Suspense } from 'react';
import { useAuth } from '../context/AuthContext';
import { DocumentViewer } from '../components/viewer';
import { Card } from '../components/ui';
import { Activity } from 'lucide-react';
import { 
  SmartSearchWidget, 
  AnalyticsWidget,
  DashboardHeader,
  DashboardStats,
  DashboardSidebar,
  DashboardContent,
  DashboardCategories
} from '../components/dashboard';
import { useOptimizedDocuments } from '../hooks/useOptimizedDocuments';
import { useDashboardState } from '../hooks/useDashboardState';
import { useDocumentInteractions } from '../hooks/useDocumentInteractions';
import { DashboardErrorBoundary } from '../components/error/DashboardErrorBoundary';
import { DashboardLoadingState } from '../components/ui/LoadingStates';
import { Document } from '../services/documentService';

const Dashboard: React.FC = () => {
  const { currentUser } = useAuth();

  // Centralized dashboard state management
  const {
    documentToView,
    isViewerModalOpen,
    useVirtualization,
    isLoading: dashboardLoading,
    error: dashboardError,
    actions: {
      openDocumentViewer,
      closeDocumentViewer,
      toggleVirtualization,
      setUseVirtualization,
      setLoading,
      setError,
    },
  } = useDashboardState();

  // Use optimized documents hook with filters
  const {
    documents,
    allDocuments,
    documentStats,
    isLoading,
    isError,
    error,
    getCategoryCount,
    refetch,
  } = useOptimizedDocuments(currentUser?.uid || '');

  // Document interaction handlers
  const documentHandlers = useDocumentInteractions({
    onDocumentClick: openDocumentViewer,
    onViewDocument: openDocumentViewer,
    // Other handlers can be customized as needed
  });

  // Show loading state
  if (isLoading && !documents.length) {
    return <DashboardLoadingState message="Loading your dashboard..." />;
  }

  // Show error state
  if (isError) {
    return (
      <DashboardErrorBoundary
        fallback={
          <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
            <Card variant="floating" className="max-w-md w-full text-center">
              <div className="p-6">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Activity className="w-8 h-8 text-red-600 dark:text-red-400" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  Failed to Load Dashboard
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  {error instanceof Error ? error.message : 'An unexpected error occurred'}
                </p>
                <button
                  onClick={() => refetch()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Try Again
                </button>
              </div>
            </Card>
          </div>
        }
      >
        <div />
      </DashboardErrorBoundary>
    );
  }

  return (
    <DashboardErrorBoundary>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Modular Dashboard Header */}
        <DashboardHeader
          showPerformanceToggle={documents.length > 20}
          useVirtualization={useVirtualization}
          onToggleVirtualization={toggleVirtualization}
        />

        <div className="p-4 sm:p-6 -mt-4 sm:-mt-6 relative z-10">
          {/* Smart Search Widget */}
          <div className="mb-8 sm:mb-10 relative z-20">
            <SmartSearchWidget documents={allDocuments} className="max-w-2xl mx-auto" />
          </div>

          {/* Modular Dashboard Stats */}
          <DashboardStats documentStats={documentStats} />

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8 mb-6 sm:mb-8">
            {/* Modular Sidebar */}
            <DashboardSidebar documents={allDocuments} onRefetch={refetch} />

            {/* Modular Main Content */}
            <DashboardContent
              documents={documents}
              totalDocuments={documentStats.totalDocuments}
              useVirtualization={useVirtualization}
              onDocumentClick={documentHandlers.handleDocumentClick}
              onDeleteDocument={documentHandlers.handleDeleteDocument}
              onReprocessDocument={documentHandlers.handleReprocessDocument}
              onDownloadDocument={documentHandlers.handleDownloadDocument}
            />
          </div>

          {/* Modular Categories Section */}
          <DashboardCategories
            documentStats={documentStats}
            getCategoryCount={getCategoryCount}
          />

          {/* Analytics Widget */}
          <Suspense fallback={<div className="h-64 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />}>
            <AnalyticsWidget documents={allDocuments} className="mb-8" />
          </Suspense>
        </div>

        {/* Document Viewer Modal */}
        {documentToView && isViewerModalOpen && (
          <DocumentViewer
            document={documentToView}
            onClose={closeDocumentViewer}
          />
        )}
      </div>
    </DashboardErrorBoundary>
  );
};

export default Dashboard;
