import React from 'react';
import { Activity } from 'lucide-react';
import { Card } from '../ui';
import QuickUploadWidget from './QuickUploadWidget';
import { Document } from '../../services/documentService';

export interface DashboardSidebarProps {
  documents: Document[];
  onRefetch?: () => void;
  className?: string;
}

export const DashboardSidebar: React.FC<DashboardSidebarProps> = ({
  documents,
  onRefetch,
  className = '',
}) => {
  return (
    <div className={`lg:col-span-1 space-y-4 sm:space-y-6 order-2 lg:order-1 relative z-0 ${className}`}>
      {/* Quick Upload Widget - Primary upload method */}
      <QuickUploadWidget onUpload={onRefetch ? async () => { onRefetch(); } : undefined} />

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
                <div key={`activity-${doc.id || index}`} className="flex items-start space-x-3">
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
                      {new Date(doc.uploadedAt).toLocaleDateString()}
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
  );
};

export default DashboardSidebar;