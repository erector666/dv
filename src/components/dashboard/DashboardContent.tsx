import React, { Suspense } from 'react';
import { FileText } from 'lucide-react';
import { Card } from '../ui';
import { DocumentListLoadingState } from '../ui/LoadingStates';
import { Document } from '../../services/documentService';

// Lazy load document components
const DocumentList = React.lazy(() => import('../documents/DocumentList'));

export interface DashboardContentProps {
  documents: Document[];
  totalDocuments: number;
  useVirtualization?: boolean;
  onDocumentClick?: (document: Document) => void;
  onDeleteDocument?: (document: Document) => void;
  onReprocessDocument?: (document: Document) => void;
  onDownloadDocument?: (document: Document) => void;
  className?: string;
}

export const DashboardContent: React.FC<DashboardContentProps> = ({
  documents,
  totalDocuments,
  useVirtualization = false,
  onDocumentClick,
  onDeleteDocument,
  onReprocessDocument,
  onDownloadDocument,
  className = '',
}) => {
  return (
    <div className={`lg:col-span-3 order-1 lg:order-2 relative z-0 ${className}`}>
      <Card variant="floating" className="h-full">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center space-x-3">
            <FileText className="w-6 h-6 text-blue-600" />
            <span>Your Documents</span>
          </h2>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {documents.length} of {totalDocuments} documents
          </div>
        </div>
        
        {/* Optimized Document List */}
        <Suspense fallback={<DocumentListLoadingState count={12} />}>
          <DocumentList />
        </Suspense>
      </Card>
    </div>
  );
};

export default DashboardContent;