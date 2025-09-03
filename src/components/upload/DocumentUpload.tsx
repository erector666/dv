import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { uploadDocument, DocumentUploadProgress } from '../../services/documentService';

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
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
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
      setUploadError(translate('upload.error.fileSize', { maxSize: maxFileSize }));
      return false;
    }

    // Check file type
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!allowedFileTypes.includes(fileExtension)) {
      setUploadError(translate('upload.error.fileType', { allowedTypes: allowedFileTypes.join(', ') }));
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
    setFiles(prevFiles => prevFiles.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      setUploadError(translate('upload.error.noFiles'));
      return;
    }

    if (!currentUser?.uid) {
      setUploadError(translate('upload.error.notAuthenticated'));
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      for (const file of files) {
        // Use the proper uploadDocument service function
        const onProgress = (progress: DocumentUploadProgress) => {
          setUploadProgress(prev => ({
            ...prev,
            [file.name]: progress.progress
          }));
        };

        const document = await uploadDocument(
          file,
          currentUser.uid,
          undefined, // category
          undefined, // tags
          undefined, // metadata
          onProgress
        );

        if (onUploadComplete) {
          onUploadComplete(document.id || '');
        }

        // If this is the last file, reset the component
        if (file === files[files.length - 1]) {
          setFiles([]);
          setUploadProgress({});
          setIsUploading(false);
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
    <div className="w-full max-w-3xl mx-auto">
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          isDragging ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-700'
        }`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleFileDrop}
        onClick={handleBrowseClick}
        aria-label={translate('upload.dropzone')}
      >
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          multiple
          onChange={handleFileSelect}
          accept={allowedFileTypes.join(',')}
        />
        
        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="text-4xl text-blue-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <h3 className="text-lg font-medium">{translate('upload.title')}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {translate('upload.instructions')}
          </p>
          <button
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            onClick={(e) => {
              e.stopPropagation();
              handleBrowseClick();
            }}
          >
            {translate('upload.browse')}
          </button>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {translate('upload.allowedTypes', { types: allowedFileTypes.join(', ') })}
          </p>
        </div>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="mt-6">
          <h4 className="text-md font-medium mb-2">{translate('upload.selectedFiles')}</h4>
          <ul className="space-y-2">
            {files.map((file, index) => (
              <motion.li
                key={`${file.name}-${index}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-md"
              >
                <div className="flex items-center space-x-3">
                  <div className="text-gray-500 dark:text-gray-400">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                
                {isUploading && uploadProgress[file.name] !== undefined ? (
                  <div className="w-24">
                    <div className="h-2 bg-gray-200 rounded-full">
                      <div
                        className="h-2 bg-blue-500 rounded-full"
                        style={{ width: `${uploadProgress[file.name]}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-right mt-1">{Math.round(uploadProgress[file.name])}%</p>
                  </div>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveFile(index);
                    }}
                    className="text-red-500 hover:text-red-700 focus:outline-none"
                    aria-label={translate('upload.removeFile')}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
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

      {/* Upload Button */}
      {files.length > 0 && (
        <div className="mt-6 flex justify-end">
          <button
            onClick={handleUpload}
            disabled={isUploading}
            className={`px-6 py-2 rounded-md text-white ${
              isUploading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-blue-500 hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
            }`}
          >
            {isUploading ? translate('upload.uploading') : translate('upload.uploadFiles')}
          </button>
        </div>
      )}
    </div>
  );
};

export default DocumentUpload;
