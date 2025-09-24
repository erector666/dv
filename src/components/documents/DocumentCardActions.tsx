import React, { useState } from 'react';
import { 
  Eye, 
  Download, 
  RefreshCw, 
  Trash2, 
  MoreVertical,
  X
} from 'lucide-react';
import { Document } from '../../services/documentService';

interface DocumentCardActionsProps {
  document: Document;
  onViewDocument: (document: Document) => void;
  onDownloadDocument: (document: Document) => void;
  onReprocessDocument: (document: Document) => void;
  onDeleteDocument: (document: Document) => void;
  isReprocessing?: boolean;
  className?: string;
}

export const DocumentCardActions: React.FC<DocumentCardActionsProps> = ({
  document,
  onViewDocument,
  onDownloadDocument,
  onReprocessDocument,
  onDeleteDocument,
  isReprocessing = false,
  className = ''
}) => {
  const [showActions, setShowActions] = useState(false);

  const handleActionClick = (action: () => void) => {
    action();
    setShowActions(false);
  };

  const actions = [
    {
      label: 'View',
      icon: <Eye className="w-4 h-4" />,
      onClick: () => handleActionClick(() => onViewDocument(document)),
      variant: 'primary' as const,
    },
    {
      label: 'Download',
      icon: <Download className="w-4 h-4" />,
      onClick: () => handleActionClick(() => onDownloadDocument(document)),
      variant: 'default' as const,
    },
    {
      label: 'Reprocess',
      icon: <RefreshCw className="w-4 h-4" />,
      onClick: () => handleActionClick(() => onReprocessDocument(document)),
      variant: 'default' as const,
      disabled: !document.url || isReprocessing,
    },
    {
      label: 'Delete',
      icon: <Trash2 className="w-4 h-4" />,
      onClick: () => handleActionClick(() => onDeleteDocument(document)),
      variant: 'danger' as const,
      disabled: !document.firestoreId || document.firestoreId === '',
    },
  ];

  return (
    <div className={`relative ${className}`}>
      {/* Action Toggle Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          setShowActions(!showActions);
        }}
        className="absolute top-2 right-2 z-10 p-2 bg-white dark:bg-gray-800 rounded-full shadow-md hover:shadow-lg transition-all duration-200 opacity-0 group-hover:opacity-100 focus:opacity-100"
        aria-label="Document actions"
      >
        <MoreVertical className="w-4 h-4 text-gray-600 dark:text-gray-400" />
      </button>

      {/* Actions Dropdown */}
      {showActions && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-20"
            onClick={() => setShowActions(false)}
          />
          
          {/* Actions Panel */}
          <div className="absolute top-10 right-2 z-30 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-2 min-w-[160px]">
            {actions.map((action, index) => (
              <button
                key={index}
                onClick={action.onClick}
                disabled={action.disabled}
                className={`w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  action.variant === 'danger' 
                    ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20' 
                    : action.variant === 'primary'
                    ? 'text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                    : 'text-gray-700 dark:text-gray-300'
                }`}
              >
                {action.icon}
                <span className="text-sm font-medium">{action.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default DocumentCardActions;
