import { useState, useCallback, useMemo } from 'react';
import { useMutation, useQueryClient } from 'react-query';
import { Document, deleteDocument, updateDocument } from '../services/documentService';

export interface BulkOperation {
  id: string;
  type: 'delete' | 'update' | 'download' | 'reprocess' | 'categorize' | 'tag';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  error?: string;
  documentId: string;
  documentName: string;
}

export interface BulkOperationResult {
  successful: number;
  failed: number;
  total: number;
  operations: BulkOperation[];
  errors: string[];
}

export const useBulkOperations = () => {
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [operations, setOperations] = useState<BulkOperation[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const queryClient = useQueryClient();

  // Toggle item selection
  const toggleSelection = useCallback((itemId: string) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  }, []);

  // Select all items
  const selectAll = useCallback((items: Document[]) => {
    const allIds = new Set(
      items
        .map(item => item.firestoreId || item.id)
        .filter(id => id !== undefined) as string[]
    );
    setSelectedItems(allIds);
  }, []);

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedItems(new Set());
  }, []);

  // Select items by filter
  const selectByFilter = useCallback((
    items: Document[], 
    filter: (item: Document) => boolean
  ) => {
    const filteredIds = new Set(
      items
        .filter(filter)
        .map(item => item.firestoreId || item.id)
        .filter(id => id !== undefined) as string[]
    );
    setSelectedItems(filteredIds);
  }, []);

  // Update operation status
  const updateOperation = useCallback((operationId: string, updates: Partial<BulkOperation>) => {
    setOperations(prev => 
      prev.map(op => 
        op.id === operationId ? { ...op, ...updates } : op
      )
    );
  }, []);

  // Bulk delete mutation
  const bulkDeleteMutation = useMutation(
    async (documents: Document[]): Promise<BulkOperationResult> => {
      const operations: BulkOperation[] = documents.map(doc => ({
        id: `delete-${doc.firestoreId || doc.id}-${Date.now()}`,
        type: 'delete' as const,
        status: 'pending' as const,
        progress: 0,
        documentId: doc.firestoreId || doc.id || '',
        documentName: doc.name,
      }));

      setOperations(operations);
      setIsProcessing(true);

      const results: BulkOperationResult = {
        successful: 0,
        failed: 0,
        total: documents.length,
        operations: [],
        errors: [],
      };

      // Process deletions in batches of 5 to avoid overwhelming the server
      const batchSize = 5;
      for (let i = 0; i < documents.length; i += batchSize) {
        const batch = documents.slice(i, i + batchSize);
        const batchPromises = batch.map(async (doc, batchIndex) => {
          const globalIndex = i + batchIndex;
          const operation = operations[globalIndex];
          
          try {
            updateOperation(operation.id, { status: 'processing', progress: 10 });
            
            await deleteDocument(doc.id || doc.name, doc.firestoreId!);
            
            updateOperation(operation.id, { 
              status: 'completed', 
              progress: 100 
            });
            
            results.successful++;
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            updateOperation(operation.id, { 
              status: 'failed', 
              progress: 0, 
              error: errorMessage 
            });
            
            results.failed++;
            results.errors.push(`Failed to delete ${doc.name}: ${errorMessage}`);
          }
        });

        await Promise.all(batchPromises);
        
        // Small delay between batches to prevent overwhelming
        if (i + batchSize < documents.length) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      results.operations = operations;
      setIsProcessing(false);
      
      return results;
    },
    {
      onSuccess: () => {
        // Invalidate and refetch documents
        queryClient.invalidateQueries(['documents']);
        clearSelection();
      },
    }
  );

  // Bulk update mutation (for category/tag changes)
  const bulkUpdateMutation = useMutation(
    async ({ 
      documents, 
      updates 
    }: { 
      documents: Document[], 
      updates: Partial<Document> 
    }): Promise<BulkOperationResult> => {
      const operations: BulkOperation[] = documents.map(doc => ({
        id: `update-${doc.firestoreId || doc.id}-${Date.now()}`,
        type: 'update' as const,
        status: 'pending' as const,
        progress: 0,
        documentId: doc.firestoreId || doc.id || '',
        documentName: doc.name,
      }));

      setOperations(operations);
      setIsProcessing(true);

      const results: BulkOperationResult = {
        successful: 0,
        failed: 0,
        total: documents.length,
        operations: [],
        errors: [],
      };

      // Process updates in batches
      const batchSize = 10;
      for (let i = 0; i < documents.length; i += batchSize) {
        const batch = documents.slice(i, i + batchSize);
        const batchPromises = batch.map(async (doc, batchIndex) => {
          const globalIndex = i + batchIndex;
          const operation = operations[globalIndex];
          
          try {
            updateOperation(operation.id, { status: 'processing', progress: 50 });
            
            await updateDocument(doc.firestoreId!, updates);
            
            updateOperation(operation.id, { 
              status: 'completed', 
              progress: 100 
            });
            
            results.successful++;
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            updateOperation(operation.id, { 
              status: 'failed', 
              progress: 0, 
              error: errorMessage 
            });
            
            results.failed++;
            results.errors.push(`Failed to update ${doc.name}: ${errorMessage}`);
          }
        });

        await Promise.all(batchPromises);
        
        if (i + batchSize < documents.length) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }

      results.operations = operations;
      setIsProcessing(false);
      
      return results;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['documents']);
        clearSelection();
      },
    }
  );

  // Bulk download function
  const bulkDownload = useCallback(async (documents: Document[]): Promise<BulkOperationResult> => {
    const operations: BulkOperation[] = documents.map(doc => ({
      id: `download-${doc.firestoreId || doc.id}-${Date.now()}`,
      type: 'download' as const,
      status: 'pending' as const,
      progress: 0,
      documentId: doc.firestoreId || doc.id || '',
      documentName: doc.name,
    }));

    setOperations(operations);
    setIsProcessing(true);

    const results: BulkOperationResult = {
      successful: 0,
      failed: 0,
      total: documents.length,
      operations: [],
      errors: [],
    };

    try {
      // For bulk downloads, we'll download files individually with delays
      for (let i = 0; i < documents.length; i++) {
        const doc = documents[i];
        const operation = operations[i];
        
        try {
          updateOperation(operation.id, { status: 'processing', progress: 50 });
          
          // Create download link
          const link = window.document.createElement('a');
          link.href = doc.url;
          link.download = doc.name;
          link.target = '_blank';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          updateOperation(operation.id, { 
            status: 'completed', 
            progress: 100 
          });
          
          results.successful++;
          
          // Delay between downloads to prevent browser blocking
          if (i < documents.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          updateOperation(operation.id, { 
            status: 'failed', 
            progress: 0, 
            error: errorMessage 
          });
          
          results.failed++;
          results.errors.push(`Failed to download ${doc.name}: ${errorMessage}`);
        }
      }
    } finally {
      results.operations = operations;
      setIsProcessing(false);
    }

    return results;
  }, [updateOperation]);

  // Clear completed operations
  const clearOperations = useCallback(() => {
    setOperations([]);
  }, []);

  // Get operations summary
  const operationsSummary = useMemo(() => {
    const pending = operations.filter(op => op.status === 'pending').length;
    const processing = operations.filter(op => op.status === 'processing').length;
    const completed = operations.filter(op => op.status === 'completed').length;
    const failed = operations.filter(op => op.status === 'failed').length;
    
    return {
      pending,
      processing,
      completed,
      failed,
      total: operations.length,
      isActive: pending > 0 || processing > 0,
    };
  }, [operations]);

  return {
    // Selection state
    selectedItems,
    selectedCount: selectedItems.size,
    
    // Selection actions
    toggleSelection,
    selectAll,
    clearSelection,
    selectByFilter,
    
    // Operations state
    operations,
    operationsSummary,
    isProcessing,
    
    // Bulk operations
    bulkDelete: bulkDeleteMutation.mutateAsync,
    bulkUpdate: bulkUpdateMutation.mutateAsync,
    bulkDownload,
    
    // Operation management
    clearOperations,
    
    // Mutation states
    isDeleting: bulkDeleteMutation.isLoading,
    isUpdating: bulkUpdateMutation.isLoading,
    deleteError: bulkDeleteMutation.error,
    updateError: bulkUpdateMutation.error,
  };
};