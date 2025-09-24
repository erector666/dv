import { useState, useCallback } from 'react';
import { Document } from '../services/documentService';

export interface DashboardState {
  // Document viewer state
  documentToView: Document | null;
  isViewerModalOpen: boolean;
  
  // Performance settings
  useVirtualization: boolean;
  
  // UI state
  isLoading: boolean;
  error: Error | null;
}

export interface DashboardActions {
  // Document viewer actions
  openDocumentViewer: (document: Document) => void;
  closeDocumentViewer: () => void;
  
  // Performance actions
  toggleVirtualization: () => void;
  setUseVirtualization: (value: boolean) => void;
  
  // UI actions
  setLoading: (loading: boolean) => void;
  setError: (error: Error | null) => void;
  clearError: () => void;
}

const initialState: DashboardState = {
  documentToView: null,
  isViewerModalOpen: false,
  useVirtualization: false,
  isLoading: false,
  error: null,
};

/**
 * Centralized dashboard state management hook
 * Provides optimized state updates and memoized actions
 */
export const useDashboardState = () => {
  const [state, setState] = useState<DashboardState>(initialState);

  // Memoized actions to prevent unnecessary re-renders
  const actions: DashboardActions = {
    openDocumentViewer: useCallback((document: Document) => {
      setState(prev => ({
        ...prev,
        documentToView: document,
        isViewerModalOpen: true,
      }));
    }, []),

    closeDocumentViewer: useCallback(() => {
      setState(prev => ({
        ...prev,
        documentToView: null,
        isViewerModalOpen: false,
      }));
    }, []),

    toggleVirtualization: useCallback(() => {
      setState(prev => ({
        ...prev,
        useVirtualization: !prev.useVirtualization,
      }));
    }, []),

    setUseVirtualization: useCallback((value: boolean) => {
      setState(prev => ({
        ...prev,
        useVirtualization: value,
      }));
    }, []),

    setLoading: useCallback((loading: boolean) => {
      setState(prev => ({
        ...prev,
        isLoading: loading,
      }));
    }, []),

    setError: useCallback((error: Error | null) => {
      setState(prev => ({
        ...prev,
        error,
        isLoading: false, // Clear loading when error occurs
      }));
    }, []),

    clearError: useCallback(() => {
      setState(prev => ({
        ...prev,
        error: null,
      }));
    }, []),
  };

  return {
    ...state,
    actions,
  };
};

export default useDashboardState;