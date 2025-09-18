import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import {
  uploadDocumentWithAI,
  DocumentUploadProgress,
} from '../../services/documentService';
import CameraScanner from './CameraScanner';

interface DocumentUploadProps {
  onUploadComplete?: (documentId: string) => void;
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
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{
    [key: string]: number;
  }>({});
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [aiProgress, setAiProgress] = useState<{
    [key: string]: { stage: string; progress: number; message: string };
  }>({});
  const [showCompletionDialog, setShowCompletionDialog] = useState(false);
  const [completedFiles, setCompletedFiles] = useState<string[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<'name' | 'size' | 'type'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [fileTypeFilter, setFileTypeFilter] = useState<string>('all');
  const [totalFilesToUpload, setTotalFilesToUpload] = useState(0);
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const validateFile = (file: File): boolean => {
    // Check file size
    if (file.size > maxFileSize * 1024 * 1024) {
      setUploadError(
        translate('upload.error.fileSize', { maxSize: maxFileSize })
      );
      return false;
    }

    // Check file type
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!allowedFileTypes.includes(fileExtension)) {
      setUploadError(
        translate('upload.error.fileType', {
          allowedTypes: allowedFileTypes.join(', '),
        })
      );
      return false;
    }

    return true;
  };

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    setUploadError(null);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      const validFiles = droppedFiles.filter(validateFile);
      setFiles(prevFiles => [...prevFiles, ...validFiles]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files);
      const validFiles = selectedFiles.filter(validateFile);
      setFiles(prevFiles => [...prevFiles, ...validFiles]);
    }
  };

  const handleRemoveFile = (index: number) => {
    const fileToRemove = files[index];
    setFiles(prevFiles => prevFiles.filter((_, i) => i !== index));
    setSelectedFiles(prev => {
      const newSet = new Set(prev);
      newSet.delete(fileToRemove.name);
      return newSet;
    });
  };

  const handleSelectFile = (fileName: string, checked: boolean) => {
    setSelectedFiles(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(fileName);
      } else {
        newSet.delete(fileName);
      }
      return newSet;
    });
  };

  const handleSelectAllFiles = () => {
    if (selectedFiles.size === files.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(files.map(f => f.name)));
    }
  };

  const handleRemoveSelectedFiles = () => {
    setFiles(prevFiles => prevFiles.filter(f => !selectedFiles.has(f.name)));
    setSelectedFiles(new Set());
  };

  const handleClearAllFiles = () => {
    setFiles([]);
    setSelectedFiles(new Set());
    setUploadProgress({});
    setAiProgress({});
  };

  const handleCameraCapture = (file: File) => {
    setFiles(prev => [file, ...prev]);
  };

  const handleSortFiles = (newSortBy: 'name' | 'size' | 'type') => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setSortOrder('asc');
    }
  };

  const getFilteredAndSortedFiles = () => {
    let filteredFiles = files;

    // Apply file type filter
    if (fileTypeFilter !== 'all') {
      filteredFiles = files.filter(file => {
        if (fileTypeFilter === 'images') {
          return file.type.startsWith('image/');
        } else if (fileTypeFilter === 'documents') {
          return (
            file.type.includes('pdf') ||
            file.type.includes('document') ||
            file.type.includes('text')
          );
        } else if (fileTypeFilter === 'pdf') {
          return file.type === 'application/pdf';
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
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'size':
          aValue = a.size;
          bValue = b.size;
          break;
        case 'type':
          aValue = a.type || 'unknown';
          bValue = b.type || 'unknown';
          break;
        default:
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
      }

      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });
  };

  const handleUpload = async (uploadSelectedOnly: boolean = false) => {
    const filesToUpload = uploadSelectedOnly
      ? files.filter(f => selectedFiles.has(f.name))
      : files;

    if (filesToUpload.length === 0) {
      setUploadError(
        uploadSelectedOnly
          ? 'No files selected for upload'
          : translate('upload.error.noFiles')
      );
      return;
    }

    if (!currentUser?.uid) {
      setUploadError(translate('upload.error.notAuthenticated'));
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    setTotalFilesToUpload(filesToUpload.length);
    setCompletedFiles([]); // Reset completed files counter

    try {
      for (const file of filesToUpload) {
        // Use the AI-enhanced uploadDocumentWithAI service function
        const onProgress = (progress: DocumentUploadProgress) => {
          setUploadProgress(prev => ({
            ...prev,
            [file.name]: progress.progress,
          }));
        };

        const onAIProgress = (stage: string, progress: number) => {
          console.log(`🤖 AI Processing: ${stage} - ${progress}%`);

          // Map stage to user-friendly message - DETAILED PROGRESS FEEDBACK
          const stageMessages: { [key: string]: string } = {
            // Upload stages
            uploading_for_ai: 'Uploading original file for AI analysis...',
            processing_ai: 'Starting AI analysis...',

            // AI processing stages
            ai_attempt_1: 'AI Analysis - Attempt 1/3...',
            ai_attempt_2: 'AI Analysis - Attempt 2/3 (retrying)...',
            ai_attempt_3: 'AI Analysis - Attempt 3/3 (final attempt)...',
            processing_with_ai: 'Connecting to AI services...',
            extracting_text: 'Extracting text from document...',
            analyzing_content: 'Analyzing document content...',
            classifying_document: 'Classifying document type...',
            generating_tags: 'Generating smart tags...',
            ai_completed: 'AI analysis completed successfully!',

            // Error handling stages
            ai_failed_attempt_1: 'AI attempt 1 failed, retrying...',
            ai_failed_attempt_2: 'AI attempt 2 failed, final retry...',
            ai_failed_attempt_3:
              'AI processing failed, continuing without AI...',
            network_recovery: 'Network issue detected, recovering...',
            retrying_in_2s: 'Retrying in 2 seconds...',
            retrying_in_4s: 'Retrying in 4 seconds...',
            retrying_in_6s: 'Retrying in 6 seconds...',
            retrying_in_10s: 'Retrying in 10 seconds...',

            // Conversion stages
            converting_to_pdf: 'Converting to PDF format...',
            uploading_pdf: 'Uploading final PDF...',

            // Legacy stages
            detecting_language: 'Detecting document language...',
            generating_summary: 'Generating document summary...',
            updating_document: 'Saving document metadata...',
            completed: 'Upload completed successfully!',
          };

          const message = stageMessages[stage] || `Processing: ${stage}`;

          setAiProgress(prev => ({
            ...prev,
            [file.name]: { stage, progress, message },
          }));

          // If AI processing is complete, update the progress to show completion
          if (stage === 'completed') {
            setTimeout(() => {
              setAiProgress(prev => ({
                ...prev,
                [file.name]: {
                  ...prev[file.name],
                  message: '✅ Processing complete!',
                },
              }));
            }, 1000);
          }
        };

        const document = await uploadDocumentWithAI(
          file,
          currentUser.uid,
          undefined, // category
          undefined, // tags
          undefined, // metadata
          onProgress,
          onAIProgress
        );

        // Add to completed files
        setCompletedFiles(prev => [...prev, file.name]);

        // If this is the last file, trigger upload completion
        if (file === filesToUpload[filesToUpload.length - 1]) {
          // Only call onUploadComplete for the LAST file (closes modal)
          if (onUploadComplete) {
            onUploadComplete(document.id || '');
          }
          setShowCompletionDialog(true);
          // Reset after a delay to show the completion dialog
          setTimeout(() => {
            // Remove only the uploaded files from the list
            if (uploadSelectedOnly) {
              setFiles(prevFiles =>
                prevFiles.filter(f => !selectedFiles.has(f.name))
              );
              setSelectedFiles(new Set());
            } else {
              setFiles([]);
              setSelectedFiles(new Set());
            }
            setUploadProgress({});
            setAiProgress({});
            setCompletedFiles([]);
            setIsUploading(false);
            setShowCompletionDialog(false);
          }, 3000);
        }
      }
    } catch (error) {
      console.error('Upload error:', error);
      setUploadError(translate('upload.error.uploadFailed'));
      setIsUploading(false);
    }
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full">
      {/* Drag & Drop Zone - Optimized for mobile */}
      <motion.div
        className={`relative border-2 border-dashed rounded-xl sm:rounded-2xl p-4 sm:p-8 text-center cursor-pointer transition-all duration-300 ${
          isDragging
            ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20 scale-105'
            : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600'
        }`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleFileDrop}
        onClick={handleBrowseClick}
        aria-label={translate('upload.dropzone')}
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

        <div className="flex flex-col items-center justify-center space-y-4 sm:space-y-6">
          <motion.div
            className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg"
            animate={isDragging ? { rotate: 360 } : {}}
            transition={{ duration: 0.5 }}
          >
            <svg
              className="w-8 h-8 sm:w-10 sm:h-10 text-white"
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

          <div className="space-y-1 sm:space-y-2">
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
              {translate('upload.title')}
            </h3>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 max-w-md px-2">
              {translate('upload.instructions')}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3">
            <motion.button
              className="px-4 py-2 sm:px-6 sm:py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-lg sm:rounded-xl hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-lg hover:shadow-xl transition-all duration-200 text-sm sm:text-base"
              onClick={e => {
                e.stopPropagation();
                handleBrowseClick();
              }}
              whileHover={{ y: -2 }}
              whileTap={{ y: 0 }}
            >
              {translate('upload.browse')}
            </motion.button>

            <motion.button
              className="px-4 py-2 sm:px-6 sm:py-3 bg-white text-blue-700 border border-blue-200 dark:bg-gray-800 dark:text-blue-300 dark:border-blue-700 font-medium rounded-lg sm:rounded-xl hover:bg-blue-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-sm transition-all duration-200 text-sm sm:text-base"
              onClick={e => {
                e.stopPropagation();
                setIsCameraOpen(true);
              }}
              whileHover={{ y: -2 }}
              whileTap={{ y: 0 }}
            >
              Scan with Camera
            </motion.button>
          </div>

          <div className="flex flex-col sm:flex-row items-center space-y-1 sm:space-y-0 sm:space-x-4 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            <span>📄 PDF, JPG, PNG, DOCX</span>
            <span className="hidden sm:inline">•</span>
            <span>Max {maxFileSize}MB</span>
          </div>
        </div>
      </motion.div>

      {/* Batch Upload Progress */}
      {isUploading && totalFilesToUpload > 1 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <motion.div
                className="w-3 h-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
              <h4 className="text-lg font-semibold text-blue-800 dark:text-blue-200">
                📤 Batch Upload Progress
              </h4>
            </div>
            <span className="text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-800/50 px-3 py-1 rounded-full">
              {completedFiles.length} of {totalFilesToUpload} completed
            </span>
          </div>
          <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-3 overflow-hidden">
            <motion.div
              className="h-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full"
              initial={{ width: 0 }}
              animate={{
                width: `${(completedFiles.length / totalFilesToUpload) * 100}%`,
              }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
          <p className="text-sm text-blue-600 dark:text-blue-400 mt-2 text-center font-medium">
            {Math.round((completedFiles.length / totalFilesToUpload) * 100)}%
            complete
          </p>
        </motion.div>
      )}

      {/* AI Processing Status */}
      {isUploading && Object.keys(aiProgress).length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-2xl p-6 border border-blue-200 dark:border-blue-800"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <motion.div
                className="w-3 h-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                AI Processing
              </h4>
              <span className="text-sm text-gray-600 dark:text-gray-300">
                {Object.keys(aiProgress).length} file
                {Object.keys(aiProgress).length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          <div className="space-y-3">
            {Object.entries(aiProgress).map(([fileName, progress]) => (
              <motion.div
                key={fileName}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-blue-100 dark:border-blue-800"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-48">
                    {fileName}
                  </span>
                  <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                    {progress.progress}%
                  </span>
                </div>

                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                  <motion.div
                    className="h-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress.progress}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                  />
                </div>

                <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                  {progress.message}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Batch Actions Toolbar - Mobile Optimized */}
      {files.length > 0 && (
        <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          {/* Mobile Layout */}
          <div className="lg:hidden space-y-3">
            {/* Selection Controls */}
            <div className="flex items-center justify-between">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={selectedFiles.size === files.length}
                  onChange={handleSelectAllFiles}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm font-medium">
                  {selectedFiles.size === files.length
                    ? 'Deselect All'
                    : 'Select All'}
                </span>
              </label>
              <span className="text-xs text-gray-500">
                {selectedFiles.size}/{files.length} selected
              </span>
            </div>

            {/* Filter and Sort Row */}
            <div className="flex items-center gap-2">
              <select
                value={fileTypeFilter}
                onChange={e => setFileTypeFilter(e.target.value)}
                className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded-md bg-white dark:bg-gray-700 dark:border-gray-600"
              >
                <option value="all">All Files</option>
                <option value="images">Images</option>
                <option value="documents">Documents</option>
                <option value="pdf">PDF Only</option>
              </select>
              
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={e => {
                  const [newSortBy, newSortOrder] = e.target.value.split('-') as ['name' | 'size' | 'type', 'asc' | 'desc'];
                  setSortBy(newSortBy);
                  setSortOrder(newSortOrder);
                }}
                className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded-md bg-white dark:bg-gray-700 dark:border-gray-600"
              >
                <option value="name-asc">Name ↑</option>
                <option value="name-desc">Name ↓</option>
                <option value="size-asc">Size ↑</option>
                <option value="size-desc">Size ↓</option>
                <option value="type-asc">Type ↑</option>
                <option value="type-desc">Type ↓</option>
              </select>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              {selectedFiles.size > 0 && (
                <button
                  onClick={handleRemoveSelectedFiles}
                  className="flex-1 px-3 py-1.5 text-xs text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400 rounded-md"
                >
                  Remove ({selectedFiles.size})
                </button>
              )}
              <button
                onClick={handleClearAllFiles}
                className="flex-1 px-3 py-1.5 text-xs text-gray-600 bg-gray-100 dark:bg-gray-700 dark:text-gray-300 rounded-md"
              >
                Clear All
              </button>
            </div>
          </div>

          {/* Desktop Layout */}
          <div className="hidden lg:block">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={selectedFiles.size === files.length}
                    onChange={handleSelectAllFiles}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium">
                    {selectedFiles.size === files.length
                      ? 'Deselect All'
                      : 'Select All'}
                  </span>
                </label>
                <span className="text-sm text-gray-500">
                  {selectedFiles.size} of {files.length} files selected
                </span>
                <span className="text-xs text-gray-400 bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">
                  {getFilteredAndSortedFiles().length} files shown
                </span>
              </div>

              <div className="flex items-center space-x-4">
                {/* File Type Filter */}
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-500">Filter:</span>
                  <select
                    value={fileTypeFilter}
                    onChange={e => setFileTypeFilter(e.target.value)}
                    className="px-2 py-1 text-xs border border-gray-300 rounded-md bg-white dark:bg-gray-700 dark:border-gray-600 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">All Files</option>
                    <option value="images">Images</option>
                    <option value="documents">Documents</option>
                    <option value="pdf">PDF Only</option>
                  </select>
                </div>

                {/* Sorting Controls */}
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-500">Sort by:</span>
                  {(['name', 'size', 'type'] as const).map(sortOption => (
                    <button
                      key={sortOption}
                      onClick={() => handleSortFiles(sortOption)}
                      className={`px-2 py-1 text-xs rounded-md transition-colors ${
                        sortBy === sortOption
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                          : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:bg-gray-700'
                      }`}
                    >
                      {sortOption.charAt(0).toUpperCase() + sortOption.slice(1)}
                      {sortBy === sortOption && (
                        <span className="ml-1">
                          {sortOrder === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                <div className="flex items-center space-x-2">
                  {selectedFiles.size > 0 && (
                    <>
                      <button
                        onClick={handleRemoveSelectedFiles}
                        className="px-3 py-1 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20 rounded-md transition-colors"
                      >
                        Remove Selected ({selectedFiles.size})
                      </button>
                      <span className="text-gray-300">|</span>
                    </>
                  )}
                  <button
                    onClick={handleClearAllFiles}
                    className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-50 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:bg-gray-700 rounded-md transition-colors"
                  >
                    Clear All
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* File List - Mobile Optimized */}
      {files.length > 0 && (
        <div className="mt-4">
          <h4 className="text-lg font-medium mb-4">
            {translate('upload.selectedFiles')}
          </h4>
          <ul className="space-y-3">
            {getFilteredAndSortedFiles().map((file, index) => (
              <motion.li
                key={`${file.name}-${index}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.02, y: -2 }}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-md shadow-sm hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-start sm:items-center space-x-2 sm:space-x-3 flex-1">
                  {/* File Selection Checkbox */}
                  <input
                    type="checkbox"
                    checked={selectedFiles.has(file.name)}
                    onChange={e =>
                      handleSelectFile(file.name, e.target.checked)
                    }
                    className="mt-1 sm:mt-0 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    disabled={isUploading}
                  />

                  <div className="text-gray-500 dark:text-gray-400 flex-shrink-0">
                    {file.type.startsWith('image/') ? (
                      <svg
                        className="h-5 w-5 text-blue-500"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
                          clipRule="evenodd"
                        />
                      </svg>
                    ) : file.type === 'application/pdf' ? (
                      <svg
                        className="h-5 w-5 text-red-500"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
                          clipRule="evenodd"
                        />
                      </svg>
                    ) : (
                      <svg
                        className="h-5 w-5"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate max-w-[200px] sm:max-w-none">
                        {file.name}
                      </p>
                      {file.type !== 'application/pdf' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 mt-1 sm:mt-0 w-fit">
                          Will convert to PDF
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 mt-1">
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                      <span className="text-xs text-gray-400">•</span>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[150px] sm:max-w-none">
                        {file.type || 'Unknown type'}
                      </p>
                    </div>
                  </div>
                </div>

                {isUploading && uploadProgress[file.name] !== undefined ? (
                  <div className="w-full sm:w-32 mt-3 sm:mt-0">
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                      <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                        Uploading
                      </span>
                    </div>
                    <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <motion.div
                        className="h-2 bg-blue-500 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${uploadProgress[file.name]}%` }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                      ></motion.div>
                    </div>
                    <p className="text-xs text-right mt-1 text-blue-600 dark:text-blue-400">
                      {Math.round(uploadProgress[file.name])}%
                    </p>

                    {/* AI Processing Progress */}
                    {aiProgress[file.name] && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="mt-3 p-2 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800"
                      >
                        <div className="flex items-center space-x-2 mb-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                          <span className="text-xs font-medium text-green-700 dark:text-green-300">
                            AI Processing
                          </span>
                        </div>
                        <div className="h-2 bg-green-200 dark:bg-green-800 rounded-full overflow-hidden">
                    <motion.div
                      className="h-2 bg-green-500 rounded-full"
                      initial={{ width: 0 }}
                      animate={{
                        width: `${aiProgress[file.name].progress}%`,
                      }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                    ></motion.div>
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <motion.p
                            key={aiProgress[file.name].stage}
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-xs text-green-600 dark:text-green-400 font-medium"
                          >
                            🤖 {aiProgress[file.name].message}
                          </motion.p>
                          <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 rounded">
                            {aiProgress[file.name].progress}%
                          </span>
                        </div>
                      </motion.div>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      handleRemoveFile(index);
                    }}
                    className="text-red-500 hover:text-red-700 focus:outline-none mt-3 sm:mt-0 self-end sm:self-auto"
                    aria-label={translate('upload.removeFile')}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                )}
              </motion.li>
            ))}
          </ul>
        </div>
      )}

      {/* Error Message */}
      {uploadError && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-4 p-3 bg-red-100 text-red-700 rounded-md"
        >
          {uploadError}
        </motion.div>
      )}

      {/* Upload Buttons - Mobile Optimized */}
      {files.length > 0 && (
        <div className="mt-6 flex flex-col sm:flex-row gap-3 sm:justify-between sm:items-center">
          {selectedFiles.size > 0 && (
            <motion.button
              onClick={() => handleUpload(true)} // true = upload only selected
              disabled={isUploading}
              whileHover={!isUploading ? { scale: 1.05, y: -2 } : {}}
              whileTap={!isUploading ? { scale: 0.95 } : {}}
              className={`w-full sm:w-auto px-4 py-2 rounded-md text-white text-sm font-medium shadow-lg transition-all duration-200 ${
                isUploading
                  ? 'bg-gradient-to-r from-gray-400 to-gray-500 cursor-not-allowed shadow-md'
                  : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 hover:shadow-xl'
              }`}
            >
                {isUploading ? (
                  <div className="inline-flex items-center space-x-3">
                    <div className="flex space-x-1">
                      <motion.div
                        className="w-2 h-2 bg-white rounded-full"
                        animate={{
                          y: [0, -8, 0],
                          opacity: [0.4, 1, 0.4],
                        }}
                        transition={{
                          duration: 1.2,
                          repeat: Infinity,
                          ease: 'easeInOut',
                        }}
                      />
                      <motion.div
                        className="w-2 h-2 bg-white rounded-full"
                        animate={{
                          y: [0, -8, 0],
                          opacity: [0.4, 1, 0.4],
                        }}
                        transition={{
                          duration: 1.2,
                          delay: 0.2,
                          repeat: Infinity,
                          ease: 'easeInOut',
                        }}
                      />
                      <motion.div
                        className="w-2 h-2 bg-white rounded-full"
                        animate={{
                          y: [0, -8, 0],
                          opacity: [0.4, 1, 0.4],
                        }}
                        transition={{
                          duration: 1.2,
                          delay: 0.4,
                          repeat: Infinity,
                          ease: 'easeInOut',
                        }}
                      />
                    </div>
                    <motion.span
                      animate={{ opacity: [0.7, 1, 0.7] }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: 'easeInOut',
                      }}
                    >
                      {(() => {
                        const total = totalFilesToUpload || selectedFiles.size || files.length;
                        const current = Math.min(
                          completedFiles.length + 1,
                          total
                        );
                        return `Uploading ${current}/${total}`;
                      })()}
                    </motion.span>
                  </div>
                ) : (
                  `Upload Selected (${selectedFiles.size})`
                )}
            </motion.button>
          )}

          <motion.button
            onClick={() => handleUpload(false)} // false = upload all
            disabled={isUploading}
            whileHover={!isUploading ? { scale: 1.05, y: -2 } : {}}
            whileTap={!isUploading ? { scale: 0.95 } : {}}
            className={`w-full sm:w-auto px-6 py-2 rounded-md text-white font-medium shadow-lg transition-all duration-200 ${
              isUploading
                ? 'bg-gradient-to-r from-gray-400 to-gray-500 cursor-not-allowed shadow-md'
                : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 hover:shadow-xl'
            }`}
          >
              {isUploading ? (
                <div className="inline-flex items-center space-x-3">
                  <div className="flex space-x-1">
                    <motion.div
                      className="w-2 h-2 bg-white rounded-full"
                      animate={{
                        y: [0, -8, 0],
                        opacity: [0.4, 1, 0.4],
                      }}
                      transition={{
                        duration: 1.2,
                        repeat: Infinity,
                        ease: 'easeInOut',
                      }}
                    />
                    <motion.div
                      className="w-2 h-2 bg-white rounded-full"
                      animate={{
                        y: [0, -8, 0],
                        opacity: [0.4, 1, 0.4],
                      }}
                      transition={{
                        duration: 1.2,
                        delay: 0.2,
                        repeat: Infinity,
                        ease: 'easeInOut',
                      }}
                    />
                    <motion.div
                      className="w-2 h-2 bg-white rounded-full"
                      animate={{
                        y: [0, -8, 0],
                        opacity: [0.4, 1, 0.4],
                      }}
                      transition={{
                        duration: 1.2,
                        delay: 0.4,
                        repeat: Infinity,
                        ease: 'easeInOut',
                      }}
                    />
                  </div>
                  <motion.span
                    animate={{ opacity: [0.7, 1, 0.7] }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                  >
                    {(() => {
                      const total = totalFilesToUpload || files.length;
                      const current = Math.min(
                        completedFiles.length + 1,
                        total
                      );
                      return `Uploading ${current}/${total}`;
                    })()}
                  </motion.span>
                </div>
              ) : (
                `Upload All (${files.length})`
              )}
          </motion.button>
        </div>
      )}

      {/* AI Processing Completion Dialog */}
      {showCompletionDialog && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="bg-white dark:bg-gray-800 rounded-2xl p-8 max-w-lg w-full mx-4 shadow-2xl border border-green-200 dark:border-green-700"
          >
            <div className="text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{
                  delay: 0.2,
                  type: 'spring',
                  damping: 15,
                  stiffness: 300,
                }}
                className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-gradient-to-r from-green-100 to-blue-100 dark:from-green-900 to-blue-900"
              >
                <motion.div
                  animate={{
                    scale: [1, 1.1, 1],
                    rotate: [0, 5, -5, 0],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                >
                  🎉
                </motion.div>
              </motion.div>

              <motion.h3
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="mt-6 text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-blue-600 dark:from-green-400 dark:to-blue-400"
              >
                AI Processing Complete!
              </motion.h3>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="mt-3 text-lg text-gray-600 dark:text-gray-300 font-medium"
              >
                {completedFiles.length} file
                {completedFiles.length !== 1 ? 's' : ''} processed successfully
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="mt-4 p-4 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-xl border border-green-200 dark:border-green-700"
              >
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="text-center">
                    <p className="text-gray-500 dark:text-gray-400">
                      Total Size
                    </p>
                    <p className="font-bold text-green-600 dark:text-green-400">
                      {(
                        completedFiles.reduce((total, fileName) => {
                          const file = files.find(f => f.name === fileName);
                          return total + (file ? file.size : 0);
                        }, 0) /
                        1024 /
                        1024
                      ).toFixed(2)}{' '}
                      MB
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-gray-500 dark:text-gray-400">Files</p>
                    <p className="font-bold text-blue-600 dark:text-blue-400">
                      {completedFiles.length}
                    </p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="mt-6"
              >
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Files processed:
                </p>
                <div className="max-h-32 overflow-y-auto space-y-2">
                  {completedFiles.map((fileName, index) => (
                    <motion.li
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.7 + index * 0.1 }}
                      className="flex items-center justify-center space-x-3 p-2 bg-white dark:bg-gray-700 rounded-lg border border-green-200 dark:border-green-600"
                    >
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{
                          delay: 0.8 + index * 0.1,
                          type: 'spring',
                        }}
                        className="text-green-500 text-lg"
                      >
                        ✅
                      </motion.span>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate max-w-48">
                        {fileName}
                      </span>
                    </motion.li>
                  ))}
                </div>
              </motion.div>

              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                onClick={() => setShowCompletionDialog(false)}
                className="mt-6 px-6 py-2 bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-500 text-white font-medium rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
              >
                Awesome! 🚀
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {isCameraOpen && (
        <CameraScanner
          onClose={() => setIsCameraOpen(false)}
          onCapture={handleCameraCapture}
        />
      )}
    </div>
  );
};

export default DocumentUpload;
