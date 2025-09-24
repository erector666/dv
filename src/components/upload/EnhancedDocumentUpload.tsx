import React, { useState, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { useUploadModal } from '../../context/UploadModalContext';
import { useAnnouncement } from '../../hooks/useAccessibility';
import useEnhancedAccessibility from '../../hooks/useEnhancedAccessibility';
import useMemoryManagement from '../../hooks/useMemoryManagement';
import useRenderOptimization from '../../hooks/useRenderOptimization';
import useFileUploadState, { FileUploadStatus } from '../../hooks/useFileUploadState';
import {
  uploadDocumentWithAI,
  DocumentUploadProgress,
} from '../../services/documentService';
import { uploadDocumentOptimized } from '../../services/documentServiceOptimized';
import CameraScanner from './CameraScanner';
import EnhancedCameraScanner from './EnhancedCameraScanner';

interface DocumentUploadProps {
  onUploadComplete?: (keepOpen?: boolean) => void;
  allowedFileTypes?: string[];
  maxFileSize?: number; // in MB
}

const DocumentUpload: React.FC<DocumentUploadProps> = ({
  onUploadComplete,
  allowedFileTypes = ['.pdf', '.doc', '.docx', '.txt', '.jpg', '.jpeg', '.png'],
  maxFileSize = 10, // Default 10MB
}) => {
  const { translate } = useLanguage();
  const { currentUser } = useAuth();
  const { uploadStatus, setUploadStatus, updateUploadStats } = useUploadModal();
  const { announce } = useAnnouncement();
  
  // Enhanced accessibility
  const {
    announceProgress,
    announceStatus,
    announceError,
    preferences,
    AnnouncementRegion,
    KeyboardHelp,
  } = useEnhancedAccessibility();
  
  // Memory management
  const {
    registerFile,
    registerBlobUrl,
    unregisterResource,
    memoryStats,
    isMemoryHigh,
    formatMemorySize,
  } = useMemoryManagement({
    maxMemoryMB: 300,
    warningThresholdMB: 200,
    autoCleanup: true,
  });
  
  // Render optimization
  const {
    useVirtualScroll,
    useOptimizedSearch,
    createDebouncedSetter,
    usePerformanceMonitor,
  } = useRenderOptimization();
  
  // Performance monitoring
  const performanceMetrics = usePerformanceMonitor('EnhancedDocumentUpload');
  
  const {
    fileStates,
    stats,
    addFiles,
    removeFile,
    removeFiles,
    updateFileProgress,
    updateFileAIProgress,
    setFileError,
    setFileCompleted,
    retryFile,
    pauseFile,
    resumeFile,
    cancelFile,
    clearCompleted,
    clearAll,
    getAllFiles,
    getFilesByStatus,
  } = useFileUploadState();

  const [isDragging, setIsDragging] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<'name' | 'size' | 'type' | 'status'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [fileTypeFilter, setFileTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<FileUploadStatus | 'all'>('all');
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [showInlineCamera, setShowInlineCamera] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('other');
  const [aiSuggestedCategory, setAiSuggestedCategory] = useState<string | null>(null);
  const [showAiSuggestion, setShowAiSuggestion] = useState(false);
  const [uploadQueue, setUploadQueue] = useState<string[]>([]);
  const [isPaused, setIsPaused] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Available categories
  const categories = [
    { key: 'personal', label: 'Personal', icon: '📄' },
    { key: 'bills', label: 'Bills & Financial', icon: '💰' },
    { key: 'medical', label: 'Medical', icon: '🏥' },
    { key: 'insurance', label: 'Insurance', icon: '🛡️' },
    { key: 'other', label: 'Other', icon: '📁' },
  ];

  // Function to suggest category based on file name and type
  const suggestCategoryFromFileName = (fileName: string, fileType: string): string | null => {
    const name = fileName.toLowerCase();
    
    // Medical keywords
    if (name.includes('medical') || name.includes('health') || name.includes('doctor') || 
        name.includes('prescription') || name.includes('lab') || name.includes('test') ||
        name.includes('insurance') && (name.includes('health') || name.includes('medical'))) {
      return 'medical';
    }
    
    // Financial/Bills keywords
    if (name.includes('bill') || name.includes('invoice') || name.includes('receipt') ||
        name.includes('payment') || name.includes('bank') || name.includes('statement') ||
        name.includes('tax') || name.includes('financial') || name.includes('expense')) {
      return 'bills';
    }
    
    // Insurance keywords
    if (name.includes('insurance') || name.includes('policy') || name.includes('claim') ||
        name.includes('coverage') || name.includes('premium')) {
      return 'insurance';
    }
    
    // Personal keywords
    if (name.includes('personal') || name.includes('private') || name.includes('id') ||
        name.includes('passport') || name.includes('license') || name.includes('certificate')) {
      return 'personal';
    }
    
    return null;
  };

  const validateFile = useCallback((file: File): string | null => {
    // Check file size
    if (file.size > maxFileSize * 1024 * 1024) {
      return translate('upload.error.fileSize', { maxSize: maxFileSize });
    }

    // Check file type
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!allowedFileTypes.includes(fileExtension)) {
      return translate('upload.error.fileType', {
        allowedTypes: allowedFileTypes.join(', '),
      });
    }

    return null;
  }, [maxFileSize, allowedFileTypes, translate]);

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleFileDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      const validFiles: File[] = [];
      const errors: string[] = [];

      droppedFiles.forEach(file => {
        const error = validateFile(file);
        if (error) {
          errors.push(`${file.name}: ${error}`);
        } else {
          validFiles.push(file);
        }
      });

      if (errors.length > 0) {
        announce(`File validation errors: ${errors.join(', ')}`, 'assertive');
      }

      if (validFiles.length > 0) {
        addFiles(validFiles, selectedCategory);
        announceStatus(`Added ${validFiles.length} files to upload queue`, `Files: ${validFiles.map(f => f.name).join(', ')}`);
        
        // Suggest category based on first file
        const suggestion = suggestCategoryFromFileName(validFiles[0].name, validFiles[0].type);
        if (suggestion && suggestion !== selectedCategory) {
          setAiSuggestedCategory(suggestion);
          setShowAiSuggestion(true);
        }
      }
    }
  }, [validateFile, addFiles, selectedCategory, announce]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files);
      const validFiles: File[] = [];
      const errors: string[] = [];

      selectedFiles.forEach(file => {
        const error = validateFile(file);
        if (error) {
          errors.push(`${file.name}: ${error}`);
        } else {
          validFiles.push(file);
        }
      });

      if (errors.length > 0) {
        announce(`File validation errors: ${errors.join(', ')}`, 'assertive');
      }

      if (validFiles.length > 0) {
        addFiles(validFiles, selectedCategory);
        announceStatus(`Added ${validFiles.length} files to upload queue`, `Files: ${validFiles.map(f => f.name).join(', ')}`);
        
        // Suggest category based on first file
        const suggestion = suggestCategoryFromFileName(validFiles[0].name, validFiles[0].type);
        if (suggestion && suggestion !== selectedCategory) {
          setAiSuggestedCategory(suggestion);
          setShowAiSuggestion(true);
        }
      }
    }
  }, [validateFile, addFiles, selectedCategory, announce]);

  const handleCameraCapture = useCallback((file: File) => {
    addFiles([file], selectedCategory);
    announceStatus('Photo captured and added to upload queue', file.name);
    
    // Suggest category based on captured file
    const suggestion = suggestCategoryFromFileName(file.name, file.type);
    if (suggestion && suggestion !== selectedCategory) {
      setAiSuggestedCategory(suggestion);
      setShowAiSuggestion(true);
    }
  }, [addFiles, selectedCategory, announce]);

  const handleSelectFile = useCallback((fileId: string, checked: boolean) => {
    setSelectedFiles(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(fileId);
      } else {
        newSet.delete(fileId);
      }
      return newSet;
    });
  }, []);

  const handleSelectAllFiles = useCallback(() => {
    const allFiles = getAllFiles();
    if (selectedFiles.size === allFiles.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(allFiles.map(f => f.id)));
    }
  }, [getAllFiles, selectedFiles.size]);

  const handleRemoveSelectedFiles = useCallback(() => {
    const selectedIds = Array.from(selectedFiles);
    removeFiles(selectedIds);
    setSelectedFiles(new Set());
    announce(`Removed ${selectedIds.length} files from queue`, 'polite');
  }, [selectedFiles, removeFiles, announce]);

  const handleBrowseClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const uploadFile = useCallback(async (fileId: string, abortSignal: AbortSignal) => {
    const fileState = fileStates.get(fileId);
    if (!fileState || !currentUser?.uid) return;

    try {
      const onProgress = (progress: DocumentUploadProgress) => {
        if (abortSignal.aborted) return;
        updateFileProgress(fileId, progress.progress);
      };

      const onAIProgress = (stage: string, progress: number) => {
        if (abortSignal.aborted) return;
        
        const stageMessages: { [key: string]: string } = {
          converting_to_pdf: 'Converting to PDF format...',
          uploading: 'Uploading file to storage...',
          creating_record: 'Creating document record...',
          processing_ai: 'Starting AI analysis...',
          ai_attempt_1: 'AI Analysis - Attempt 1/3...',
          ai_attempt_2: 'AI Analysis - Attempt 2/3 (retrying)...',
          ai_attempt_3: 'AI Analysis - Attempt 3/3 (final attempt)...',
          processing_with_ai: 'Connecting to AI services...',
          extracting_text: 'Extracting text from document...',
          analyzing_content: 'Analyzing document content...',
          classifying_document: 'Classifying document type...',
          generating_tags: 'Generating smart tags...',
          ai_completed: 'AI analysis completed successfully!',
          ai_failed_attempt_1: 'AI attempt 1 failed, retrying...',
          ai_failed_attempt_2: 'AI attempt 2 failed, final retry...',
          ai_failed_attempt_3: 'AI processing failed, continuing without AI...',
          updating_metadata: 'Updating document with AI results...',
          saving_to_database: 'Saving to database...',
          completed: 'Upload completed successfully!',
        };

        const message = stageMessages[stage] || `Processing: ${stage}`;
        updateFileAIProgress(fileId, stage, progress, message);
      };

      // Try optimized upload first, fall back to original if it fails
      let document;
      try {
        document = await uploadDocumentOptimized(
          fileState.file,
          currentUser.uid,
          fileState.category || selectedCategory,
          fileState.tags,
          undefined,
          onProgress,
          onAIProgress
        );
      } catch (optimizedError) {
        console.warn('Optimized upload failed, using original:', optimizedError);
        document = await uploadDocumentWithAI(
          fileState.file,
          currentUser.uid,
          fileState.category || selectedCategory,
          fileState.tags,
          undefined,
          onProgress,
          onAIProgress
        );
      }

      if (!abortSignal.aborted) {
        setFileCompleted(fileId, document.id);
        announce(`Successfully uploaded ${fileState.file.name}`, 'polite');
      }
    } catch (error) {
      if (!abortSignal.aborted) {
        console.error('Upload error:', error);
        setFileError(fileId, error instanceof Error ? error.message : 'Upload failed');
        announce(`Failed to upload ${fileState.file.name}`, 'assertive');
      }
    }
  }, [fileStates, currentUser, updateFileProgress, updateFileAIProgress, setFileCompleted, setFileError, selectedCategory, announce]);

  const processUploadQueue = useCallback(async () => {
    const pendingFiles = getFilesByStatus('pending');
    if (pendingFiles.length === 0) return;

    setUploadStatus('uploading');
    abortControllerRef.current = new AbortController();

    const batchSize = 3; // Upload 3 files concurrently
    const queue = [...pendingFiles];
    
    updateUploadStats({
      totalFiles: queue.length,
      totalSize: queue.reduce((sum, file) => sum + file.file.size, 0),
    });

    while (queue.length > 0 && !abortControllerRef.current.signal.aborted && !isPaused) {
      const batch = queue.splice(0, batchSize);
      
      // Update file status to uploading
      batch.forEach(fileState => {
        fileStates.set(fileState.id, { ...fileState, status: 'uploading' });
      });

      // Upload batch concurrently
      await Promise.allSettled(
        batch.map(fileState => uploadFile(fileState.id, abortControllerRef.current!.signal))
      );

      // Update stats
      const currentStats = stats;
      updateUploadStats({
        completedFiles: currentStats.completedFiles,
        uploadedSize: currentStats.uploadedSize,
      });
    }

    if (!abortControllerRef.current.signal.aborted && !isPaused) {
      setUploadStatus('completed');
      announce(`Upload completed! ${stats.completedFiles} files processed successfully.`, 'polite');
    }
  }, [getFilesByStatus, setUploadStatus, updateUploadStats, isPaused, uploadFile, fileStates, stats, announce]);

  const handleUpload = useCallback(async (uploadSelectedOnly: boolean = false) => {
    const filesToUpload = uploadSelectedOnly 
      ? getAllFiles().filter(f => selectedFiles.has(f.id) && f.status === 'pending')
      : getFilesByStatus('pending');

    if (filesToUpload.length === 0) {
      announce(uploadSelectedOnly ? 'No files selected for upload' : 'No files to upload', 'assertive');
      return;
    }

    if (!currentUser?.uid) {
      announce('Please sign in to upload files', 'assertive');
      return;
    }

    await processUploadQueue();
  }, [getAllFiles, getFilesByStatus, selectedFiles, processUploadQueue, currentUser, announce]);

  const handlePauseResume = useCallback(() => {
    if (isPaused) {
      setIsPaused(false);
      setUploadStatus('uploading');
      processUploadQueue();
      announce('Upload resumed', 'polite');
    } else {
      setIsPaused(true);
      setUploadStatus('paused');
      abortControllerRef.current?.abort();
      announce('Upload paused', 'polite');
    }
  }, [isPaused, setUploadStatus, processUploadQueue, announce]);

  const handleCancelUpload = useCallback(() => {
    abortControllerRef.current?.abort();
    setUploadStatus('idle');
    setIsPaused(false);
    
    // Cancel all uploading files
    getFilesByStatus('uploading').forEach(file => {
      cancelFile(file.id);
    });
    
    announce('Upload cancelled', 'polite');
  }, [setUploadStatus, getFilesByStatus, cancelFile, announce]);

  const getFilteredAndSortedFiles = useMemo(() => {
    let filteredFiles = getAllFiles();

    // Apply status filter
    if (statusFilter !== 'all') {
      filteredFiles = filteredFiles.filter(file => file.status === statusFilter);
    }

    // Apply file type filter
    if (fileTypeFilter !== 'all') {
      filteredFiles = filteredFiles.filter(file => {
        if (fileTypeFilter === 'images') {
          return file.file.type.startsWith('image/');
        } else if (fileTypeFilter === 'documents') {
          return (
            file.file.type.includes('pdf') ||
            file.file.type.includes('document') ||
            file.file.type.includes('text')
          );
        } else if (fileTypeFilter === 'pdf') {
          return file.file.type === 'application/pdf';
        }
        return true;
      });
    }

    // Apply sorting
    return filteredFiles.sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortBy) {
        case 'name':
          aValue = a.file.name.toLowerCase();
          bValue = b.file.name.toLowerCase();
          break;
        case 'size':
          aValue = a.file.size;
          bValue = b.file.size;
          break;
        case 'type':
          aValue = a.file.type || 'unknown';
          bValue = b.file.type || 'unknown';
          break;
        case 'status':
          aValue = a.status;
          bValue = b.status;
          break;
        default:
          aValue = a.file.name.toLowerCase();
          bValue = b.file.name.toLowerCase();
      }

      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });
  }, [getAllFiles, statusFilter, fileTypeFilter, sortBy, sortOrder]);

  const formatFileSize = useCallback((bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }, []);

  const formatTime = useCallback((ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }, []);

  const getStatusIcon = useCallback((status: FileUploadStatus) => {
    switch (status) {
      case 'pending': return '⏳';
      case 'uploading': return '📤';
      case 'processing': return '🤖';
      case 'completed': return '✅';
      case 'error': return '❌';
      case 'paused': return '⏸️';
      case 'cancelled': return '🚫';
      default: return '❓';
    }
  }, []);

  const getStatusColor = useCallback((status: FileUploadStatus) => {
    switch (status) {
      case 'pending': return 'text-gray-500';
      case 'uploading': return 'text-blue-500';
      case 'processing': return 'text-purple-500';
      case 'completed': return 'text-green-500';
      case 'error': return 'text-red-500';
      case 'paused': return 'text-yellow-500';
      case 'cancelled': return 'text-gray-400';
      default: return 'text-gray-500';
    }
  }, []);

  return (
    <div className="w-full space-y-6">
      {/* Drag & Drop Zone */}
      <motion.div
        className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-300 ${
          isDragging
            ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20 scale-105'
            : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600'
        }`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleFileDrop}
        onClick={handleBrowseClick}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          multiple
          onChange={handleFileSelect}
          accept={allowedFileTypes.join(',')}
        />

        <div className="flex flex-col items-center justify-center space-y-6">
          <motion.div
            className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg"
            animate={isDragging ? { rotate: 360 } : {}}
            transition={{ duration: 0.5 }}
          >
            <svg
              className="w-10 h-10 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
          </motion.div>

          <div className="space-y-2">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              {translate('upload.title')}
            </h3>
            <p className="text-base text-gray-600 dark:text-gray-300 max-w-md">
              {translate('upload.instructions')}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <motion.button
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-xl hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-lg hover:shadow-xl transition-all duration-200"
              onClick={e => {
                e.stopPropagation();
                handleBrowseClick();
              }}
              whileHover={{ y: -2 }}
              whileTap={{ y: 0 }}
            >
              {translate('upload.browse')}
            </motion.button>

            <div className="flex space-x-2">
              <motion.button
                className="px-4 py-3 bg-white text-blue-700 border border-blue-200 dark:bg-gray-800 dark:text-blue-300 dark:border-blue-700 font-medium rounded-xl hover:bg-blue-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-sm transition-all duration-200"
                onClick={e => {
                  e.stopPropagation();
                  setShowInlineCamera(!showInlineCamera);
                }}
                whileHover={{ y: -2 }}
                whileTap={{ y: 0 }}
              >
                📷 {showInlineCamera ? 'Hide' : 'Show'} Camera
              </motion.button>
              <motion.button
                className="px-4 py-3 bg-white text-purple-700 border border-purple-200 dark:bg-gray-800 dark:text-purple-300 dark:border-purple-700 font-medium rounded-xl hover:bg-purple-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 shadow-sm transition-all duration-200"
                onClick={e => {
                  e.stopPropagation();
                  setIsCameraOpen(true);
                }}
                whileHover={{ y: -2 }}
                whileTap={{ y: 0 }}
              >
                🖼️ Full Camera
              </motion.button>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center space-y-1 sm:space-y-0 sm:space-x-4 text-sm text-gray-500 dark:text-gray-400">
            <span>📄 PDF, JPG, PNG, DOCX</span>
            <span className="hidden sm:inline">•</span>
            <span>Max {maxFileSize}MB</span>
          </div>
        </div>
      </motion.div>

      {/* Inline Camera Scanner */}
      <AnimatePresence>
        {showInlineCamera && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  📷 Document Scanner
                </h3>
                <button
                  onClick={() => setShowInlineCamera(false)}
                  className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-white/50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  ✕
                </button>
              </div>
              <EnhancedCameraScanner
                onClose={() => setShowInlineCamera(false)}
                onCapture={handleCameraCapture}
                inline={true}
                maxPhotos={5}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Category Selection */}
      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
          📁 Select Category
        </h4>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Choose the category for your documents. This helps organize your files.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {categories.map((category) => (
            <button
              key={category.key}
              onClick={() => setSelectedCategory(category.key)}
              className={`p-3 rounded-lg border-2 transition-all duration-200 ${
                selectedCategory === category.key
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                  : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300'
              }`}
            >
              <div className="text-center">
                <div className="text-2xl mb-1">{category.icon}</div>
                <div className="text-xs font-medium">{category.label}</div>
              </div>
            </button>
          ))}
        </div>
        
        {/* AI Category Suggestion */}
        <AnimatePresence>
          {showAiSuggestion && aiSuggestedCategory && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-3 p-3 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg border border-purple-200 dark:border-purple-800"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">🤖</span>
                  <div>
                    <p className="text-sm font-medium text-purple-800 dark:text-purple-200">
                      AI Suggestion
                    </p>
                    <p className="text-xs text-purple-600 dark:text-purple-400">
                      Based on your file name, we suggest: {categories.find(c => c.key === aiSuggestedCategory)?.icon} {categories.find(c => c.key === aiSuggestedCategory)?.label}
                    </p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      setSelectedCategory(aiSuggestedCategory);
                      setShowAiSuggestion(false);
                    }}
                    className="px-3 py-1 text-xs bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
                  >
                    Use Suggestion
                  </button>
                  <button
                    onClick={() => setShowAiSuggestion(false)}
                    className="px-3 py-1 text-xs text-purple-600 hover:text-purple-800 transition-colors"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Upload Queue Stats */}
      {stats.totalFiles > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-xl"
        >
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-lg font-semibold text-blue-800 dark:text-blue-200">
              📊 Upload Queue ({stats.totalFiles} files)
            </h4>
            <div className="text-sm text-blue-600 dark:text-blue-400">
              {formatFileSize(stats.totalSize)}
            </div>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">⏳</div>
              <div className="text-xs text-gray-500">Pending</div>
              <div className="font-semibold">{stats.pendingFiles}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">📤</div>
              <div className="text-xs text-gray-500">Uploading</div>
              <div className="font-semibold">{stats.uploadingFiles}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">✅</div>
              <div className="text-xs text-gray-500">Completed</div>
              <div className="font-semibold">{stats.completedFiles}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">❌</div>
              <div className="text-xs text-gray-500">Failed</div>
              <div className="font-semibold">{stats.errorFiles}</div>
            </div>
          </div>

          {/* Overall Progress Bar */}
          <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-3 overflow-hidden mb-2">
            <motion.div
              className="h-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${stats.overallProgress}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
          
          <div className="flex justify-between text-sm text-blue-600 dark:text-blue-400">
            <span>{Math.round(stats.overallProgress)}% complete</span>
            {stats.estimatedTimeRemaining && (
              <span>ETA: {formatTime(stats.estimatedTimeRemaining)}</span>
            )}
          </div>
        </motion.div>
      )}

      {/* File Management Controls */}
      {stats.totalFiles > 0 && (
        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* Selection Controls */}
            <div className="flex items-center space-x-4">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={selectedFiles.size === stats.totalFiles}
                  onChange={handleSelectAllFiles}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium">
                  {selectedFiles.size === stats.totalFiles ? 'Deselect All' : 'Select All'}
                </span>
              </label>
              <span className="text-sm text-gray-500">
                {selectedFiles.size} of {stats.totalFiles} selected
              </span>
            </div>

            {/* Filters and Sort */}
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as FileUploadStatus | 'all')}
                className="px-2 py-1 text-xs border border-gray-300 rounded-md bg-white dark:bg-gray-700 dark:border-gray-600"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="uploading">Uploading</option>
                <option value="processing">Processing</option>
                <option value="completed">Completed</option>
                <option value="error">Error</option>
                <option value="paused">Paused</option>
              </select>

              <select
                value={fileTypeFilter}
                onChange={e => setFileTypeFilter(e.target.value)}
                className="px-2 py-1 text-xs border border-gray-300 rounded-md bg-white dark:bg-gray-700 dark:border-gray-600"
              >
                <option value="all">All Types</option>
                <option value="images">Images</option>
                <option value="documents">Documents</option>
                <option value="pdf">PDF Only</option>
              </select>

              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={e => {
                  const [newSortBy, newSortOrder] = e.target.value.split('-') as ['name' | 'size' | 'type' | 'status', 'asc' | 'desc'];
                  setSortBy(newSortBy);
                  setSortOrder(newSortOrder);
                }}
                className="px-2 py-1 text-xs border border-gray-300 rounded-md bg-white dark:bg-gray-700 dark:border-gray-600"
              >
                <option value="name-asc">Name ↑</option>
                <option value="name-desc">Name ↓</option>
                <option value="size-asc">Size ↑</option>
                <option value="size-desc">Size ↓</option>
                <option value="type-asc">Type ↑</option>
                <option value="type-desc">Type ↓</option>
                <option value="status-asc">Status ↑</option>
                <option value="status-desc">Status ↓</option>
              </select>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              {selectedFiles.size > 0 && (
                <button
                  onClick={handleRemoveSelectedFiles}
                  className="px-3 py-1 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20 rounded-md transition-colors"
                >
                  Remove ({selectedFiles.size})
                </button>
              )}
              <button
                onClick={clearCompleted}
                className="px-3 py-1 text-sm text-green-600 hover:text-green-800 hover:bg-green-50 dark:text-green-400 dark:hover:text-green-300 dark:hover:bg-green-900/20 rounded-md transition-colors"
              >
                Clear Completed
              </button>
              <button
                onClick={clearAll}
                className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-50 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:bg-gray-700 rounded-md transition-colors"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* File List */}
      {stats.totalFiles > 0 && (
        <div className="space-y-3">
          <h4 className="text-lg font-medium mb-4">
            Upload Queue ({getFilteredAndSortedFiles.length} files)
          </h4>
          <div className="max-h-96 overflow-y-auto space-y-2">
            <AnimatePresence>
              {getFilteredAndSortedFiles.map((fileState) => (
                <motion.div
                  key={fileState.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  whileHover={{ scale: 1.01 }}
                  className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm"
                >
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    {/* Selection Checkbox */}
                    <input
                      type="checkbox"
                      checked={selectedFiles.has(fileState.id)}
                      onChange={e => handleSelectFile(fileState.id, e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      disabled={uploadStatus === 'uploading'}
                    />

                    {/* File Icon */}
                    <div className="flex-shrink-0">
                      {fileState.file.type.startsWith('image/') ? (
                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                          🖼️
                        </div>
                      ) : fileState.file.type === 'application/pdf' ? (
                        <div className="w-10 h-10 bg-red-100 dark:bg-red-900 rounded-lg flex items-center justify-center">
                          📄
                        </div>
                      ) : (
                        <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                          📄
                        </div>
                      )}
                    </div>

                    {/* File Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {fileState.file.name}
                        </p>
                        <span className={`text-lg ${getStatusColor(fileState.status)}`}>
                          {getStatusIcon(fileState.status)}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                        <span>{formatFileSize(fileState.file.size)}</span>
                        <span>•</span>
                        <span className={getStatusColor(fileState.status)}>
                          {fileState.status.charAt(0).toUpperCase() + fileState.status.slice(1)}
                        </span>
                        {fileState.retryCount > 0 && (
                          <>
                            <span>•</span>
                            <span className="text-orange-500">
                              Retry {fileState.retryCount}
                            </span>
                          </>
                        )}
                      </div>
                      
                      {/* Progress Bar */}
                      {(fileState.status === 'uploading' || fileState.status === 'processing') && (
                        <div className="mt-2">
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                            <motion.div
                              className="h-1.5 bg-blue-500 rounded-full"
                              initial={{ width: 0 }}
                              animate={{ width: `${fileState.progress}%` }}
                              transition={{ duration: 0.3 }}
                            />
                          </div>
                          <div className="flex justify-between mt-1 text-xs text-gray-500">
                            <span>{Math.round(fileState.progress)}%</span>
                            {fileState.estimatedTimeRemaining && (
                              <span>ETA: {formatTime(fileState.estimatedTimeRemaining)}</span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* AI Progress */}
                      {fileState.aiProgress && fileState.status === 'processing' && (
                        <div className="mt-2 p-2 bg-purple-50 dark:bg-purple-900/20 rounded-md">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="text-xs text-purple-600 dark:text-purple-400">
                              🤖 {fileState.aiProgress.message}
                            </span>
                          </div>
                          <div className="w-full bg-purple-200 dark:bg-purple-800 rounded-full h-1 overflow-hidden">
                            <motion.div
                              className="h-1 bg-purple-500 rounded-full"
                              initial={{ width: 0 }}
                              animate={{ width: `${fileState.aiProgress.progress}%` }}
                              transition={{ duration: 0.3 }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Error Message */}
                      {fileState.status === 'error' && fileState.error && (
                        <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded-md">
                          <p className="text-xs text-red-600 dark:text-red-400">
                            ❌ {fileState.error}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center space-x-2 ml-2">
                    {fileState.status === 'error' && (
                      <button
                        onClick={() => retryFile(fileState.id)}
                        className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-900/20 rounded transition-colors"
                        title="Retry upload"
                      >
                        🔄
                      </button>
                    )}
                    {fileState.status === 'uploading' && (
                      <button
                        onClick={() => pauseFile(fileState.id)}
                        className="p-1 text-yellow-600 hover:text-yellow-800 hover:bg-yellow-50 dark:text-yellow-400 dark:hover:text-yellow-300 dark:hover:bg-yellow-900/20 rounded transition-colors"
                        title="Pause upload"
                      >
                        ⏸️
                      </button>
                    )}
                    {fileState.status === 'paused' && (
                      <button
                        onClick={() => resumeFile(fileState.id)}
                        className="p-1 text-green-600 hover:text-green-800 hover:bg-green-50 dark:text-green-400 dark:hover:text-green-300 dark:hover:bg-green-900/20 rounded transition-colors"
                        title="Resume upload"
                      >
                        ▶️
                      </button>
                    )}
                    {['pending', 'error', 'paused', 'completed'].includes(fileState.status) && (
                      <button
                        onClick={() => removeFile(fileState.id)}
                        className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20 rounded transition-colors"
                        title="Remove file"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Upload Control Buttons */}
      {stats.totalFiles > 0 && (
        <div className="flex flex-col sm:flex-row gap-3 sm:justify-between sm:items-center">
          <div className="flex flex-col sm:flex-row gap-3">
            {uploadStatus === 'idle' && stats.pendingFiles > 0 && (
              <>
                {selectedFiles.size > 0 && (
                  <motion.button
                    onClick={() => handleUpload(true)}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white font-medium rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
                  >
                    Upload Selected ({selectedFiles.size})
                  </motion.button>
                )}
                <motion.button
                  onClick={() => handleUpload(false)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-medium rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  Upload All ({stats.pendingFiles})
                </motion.button>
              </>
            )}

            {uploadStatus === 'uploading' && (
              <div className="flex gap-3">
                <motion.button
                  onClick={handlePauseResume}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-6 py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white font-medium rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  {isPaused ? '▶️ Resume' : '⏸️ Pause'}
                </motion.button>
                <motion.button
                  onClick={handleCancelUpload}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white font-medium rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
                >
                  🚫 Cancel
                </motion.button>
              </div>
            )}

            {uploadStatus === 'completed' && (
              <motion.button
                onClick={() => onUploadComplete?.(true)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white font-medium rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
              >
                📤 Upload More Files
              </motion.button>
            )}
          </div>
        </div>
      )}

      {/* Full Screen Camera Scanner */}
      {isCameraOpen && (
        <EnhancedCameraScanner
          onClose={() => setIsCameraOpen(false)}
          onCapture={handleCameraCapture}
          inline={false}
          maxPhotos={10}
        />
      )}

      {/* Accessibility Components */}
      <AnnouncementRegion />
      <KeyboardHelp />
      
      {/* Memory Usage Warning */}
      {isMemoryHigh && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed top-4 right-4 bg-orange-100 dark:bg-orange-900/20 border border-orange-300 dark:border-orange-700 rounded-lg p-3 shadow-lg z-40"
        >
          <div className="flex items-center space-x-2">
            <span className="text-orange-600 dark:text-orange-400">⚠️</span>
            <div>
              <p className="text-sm font-medium text-orange-800 dark:text-orange-200">
                High Memory Usage
              </p>
              <p className="text-xs text-orange-600 dark:text-orange-400">
                {formatMemorySize(memoryStats.estimatedFileMemory)} in use
              </p>
            </div>
          </div>
        </motion.div>
      )}
      
      {/* Performance Debug Info (dev only) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 left-4 bg-gray-900 text-white text-xs p-2 rounded opacity-50 hover:opacity-100 transition-opacity">
          <div>Renders: {performanceMetrics.renderCount}</div>
          <div>Avg: {performanceMetrics.averageRenderTime.toFixed(1)}ms</div>
          <div>Last: {performanceMetrics.lastRenderDuration}ms</div>
        </div>
      )}
    </div>
  );
};

export default DocumentUpload;