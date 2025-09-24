import React from 'react';
import { Card } from '../ui';
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
      {/* Upload components removed - will be replaced with new buttons */}
    </div>
  );
};

export default DashboardSidebar;