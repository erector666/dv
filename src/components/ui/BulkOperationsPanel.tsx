import React, { useState } from 'react';
import { 
  Trash2, 
  Download, 
  RefreshCw, 
  Tag, 
  FolderOpen, 
  X, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Card } from './Card';
import { AccessibleButton, ButtonGroup, ToggleButton } from './AccessibleButton';
import { LoadingProgress } from './LoadingStates';
import { BulkOperation, BulkOperationResult } from '../../hooks/useBulkOperations';
import { clsx } from 'clsx';

export interface BulkOperationsPanelProps {
  selectedCount: number;
  operations: BulkOperation[];
  operationsSummary: {
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    total: number;
    isActive: boolean;
  };
  onBulkDelete: () => void;
  onBulkDownload: () => void;
  onBulkReprocess: () => void;
  onBulkCategorize: () => void;
  onBulkTag: () => void;
  onClearOperations: () => void;
  onClearSelection: () => void;
  isProcessing: boolean;
  className?: string;
}

export const BulkOperationsPanel: React.FC<BulkOperationsPanelProps> = ({
  selectedCount,
  operations,
  operationsSummary,
  onBulkDelete,
  onBulkDownload,
  onBulkReprocess,
  onBulkCategorize,
  onBulkTag,
  onClearOperations,
  onClearSelection,
  isProcessing,
  className,
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  const hasSelection = selectedCount > 0;
  const hasOperations = operations.length > 0;

  if (!hasSelection && !hasOperations) {
    return null;
  }

  return (
    <Card variant="floating" className={clsx('sticky top-4 z-30', className)}>
      <div className="p-4">
        {/* Selection Summary */}
        {hasSelection && (
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                <CheckCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  {selectedCount} item{selectedCount !== 1 ? 's' : ''} selected
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Choose an action to perform
                </p>
              </div>
            </div>
            <AccessibleButton
              variant="ghost"
              size="sm"
              onClick={onClearSelection}
              ariaLabel="Clear selection"
              icon={<X className="w-4 h-4" />}
            />
          </div>
        )}

        {/* Bulk Actions */}
        {hasSelection && (
          <div className="space-y-3 mb-4">
            {/* Primary Actions */}
            <ButtonGroup ariaLabel="Primary bulk actions" className="w-full">
              <AccessibleButton
                variant="primary"
                size="md"
                onClick={onBulkDownload}
                disabled={isProcessing}
                icon={<Download className="w-4 h-4" />}
                className="flex-1"
                ariaLabel={`Download ${selectedCount} selected items`}
              >
                <span className="hidden sm:inline">Download</span>
                <span className="sm:hidden">DL</span>
              </AccessibleButton>
              
              <AccessibleButton
                variant="secondary"
                size="md"
                onClick={onBulkReprocess}
                disabled={isProcessing}
                icon={<RefreshCw className="w-4 h-4" />}
                className="flex-1"
                ariaLabel={`Reprocess ${selectedCount} selected items`}
              >
                <span className="hidden sm:inline">Reprocess</span>
                <span className="sm:hidden">AI</span>
              </AccessibleButton>
            </ButtonGroup>

            {/* Secondary Actions */}
            <ButtonGroup ariaLabel="Secondary bulk actions" className="w-full">
              <AccessibleButton
                variant="secondary"
                size="md"
                onClick={onBulkCategorize}
                disabled={isProcessing}
                icon={<FolderOpen className="w-4 h-4" />}
                className="flex-1"
                ariaLabel={`Set category for ${selectedCount} selected items`}
              >
                <span className="hidden sm:inline">Category</span>
                <span className="sm:hidden">Cat</span>
              </AccessibleButton>
              
              <AccessibleButton
                variant="secondary"
                size="md"
                onClick={onBulkTag}
                disabled={isProcessing}
                icon={<Tag className="w-4 h-4" />}
                className="flex-1"
                ariaLabel={`Add tags to ${selectedCount} selected items`}
              >
                <span className="hidden sm:inline">Tags</span>
                <span className="sm:hidden">Tag</span>
              </AccessibleButton>
            </ButtonGroup>

            {/* Delete Action - Separate for Safety */}
            <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
              {!showConfirmDelete ? (
                <AccessibleButton
                  variant="danger"
                  size="md"
                  onClick={() => setShowConfirmDelete(true)}
                  disabled={isProcessing}
                  icon={<Trash2 className="w-4 h-4" />}
                  className="w-full"
                  ariaLabel={`Delete ${selectedCount} selected items`}
                >
                  Delete Selected ({selectedCount})
                </AccessibleButton>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-red-600 dark:text-red-400 font-medium text-center">
                    Delete {selectedCount} item{selectedCount !== 1 ? 's' : ''}? This cannot be undone.
                  </p>
                  <ButtonGroup className="w-full">
                    <AccessibleButton
                      variant="secondary"
                      size="sm"
                      onClick={() => setShowConfirmDelete(false)}
                      className="flex-1"
                    >
                      Cancel
                    </AccessibleButton>
                    <AccessibleButton
                      variant="danger"
                      size="sm"
                      onClick={() => {
                        onBulkDelete();
                        setShowConfirmDelete(false);
                      }}
                      disabled={isProcessing}
                      className="flex-1"
                    >
                      Delete
                    </AccessibleButton>
                  </ButtonGroup>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Operations Status */}
        {hasOperations && (
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div className="flex items-center justify-center w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                  {operationsSummary.isActive ? (
                    <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400 animate-pulse" />
                  ) : (
                    <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {operationsSummary.isActive ? 'Processing...' : 'Operations Complete'}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {operationsSummary.completed} completed, {operationsSummary.failed} failed
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <ToggleButton
                  pressed={showDetails}
                  onPressedChange={setShowDetails}
                  variant="ghost"
                  size="sm"
                  icon={showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  ariaLabel={showDetails ? 'Hide details' : 'Show details'}
                />
                
                {!operationsSummary.isActive && (
                  <AccessibleButton
                    variant="ghost"
                    size="sm"
                    onClick={onClearOperations}
                    icon={<X className="w-4 h-4" />}
                    ariaLabel="Clear operations"
                  />
                )}
              </div>
            </div>

            {/* Operations Progress */}
            {operationsSummary.isActive && (
              <div className="mb-3">
                <LoadingProgress
                  progress={(operationsSummary.completed / operationsSummary.total) * 100}
                  message={`${operationsSummary.processing + operationsSummary.pending} remaining`}
                />
              </div>
            )}

            {/* Operations Details */}
            {showDetails && (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {operations.map((operation) => (
                  <div
                    key={operation.id}
                    className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg"
                  >
                    <div className="flex items-center space-x-3 flex-1 min-w-0">
                      <div className="flex-shrink-0">
                        {operation.status === 'completed' && (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        )}
                        {operation.status === 'failed' && (
                          <AlertCircle className="w-4 h-4 text-red-500" />
                        )}
                        {operation.status === 'processing' && (
                          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        )}
                        {operation.status === 'pending' && (
                          <Clock className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {operation.documentName}
                        </p>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                            {operation.type}
                          </span>
                          {operation.status === 'processing' && (
                            <span className="text-xs text-blue-600 dark:text-blue-400">
                              {operation.progress}%
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {operation.error && (
                      <div className="text-xs text-red-500 dark:text-red-400 max-w-32 truncate">
                        {operation.error}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};

// Bulk operations summary component for mobile
export const BulkOperationsSummary: React.FC<{
  selectedCount: number;
  onShowPanel: () => void;
  className?: string;
}> = ({ selectedCount, onShowPanel, className }) => {
  if (selectedCount === 0) return null;

  return (
    <div
      className={clsx(
        'fixed bottom-6 left-1/2 transform -translate-x-1/2 z-40',
        'bg-blue-600 text-white px-4 py-2 rounded-full shadow-lg',
        'flex items-center space-x-2 cursor-pointer',
        'hover:bg-blue-700 transition-colors',
        className
      )}
      onClick={onShowPanel}
    >
      <CheckCircle className="w-4 h-4" />
      <span className="font-medium">
        {selectedCount} selected
      </span>
      <ChevronUp className="w-4 h-4" />
    </div>
  );
};

export default BulkOperationsPanel;