import React, { useState, useRef } from 'react';
import { Upload, X, FileText, Image, File, AlertCircle, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../ui';

interface QuickUploadWidgetProps {
  onUpload?: (files: File[]) => Promise<void>;
  className?: string;
}

interface UploadFile {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string | null;
}

const QuickUploadWidget: React.FC<QuickUploadWidgetProps> = ({ onUpload, className }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const acceptedTypes = {
    'application/pdf': '.pdf',
    'image/jpeg': '.jpg,.jpeg',
    'image/png': '.png',
    'image/gif': '.gif',
    'application/msword': '.doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return <Image className="w-5 h-5 text-blue-500" />;
    } else if (file.type === 'application/pdf') {
      return <FileText className="w-5 h-5 text-red-500" />;
    } else if (file.type.includes('word') || file.type.includes('document')) {
      return <FileText className="w-5 h-5 text-blue-700" />;
    }
    return <File className="w-5 h-5 text-gray-500" />;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const validateFile = (file: File): string | null => {
    // Check file type
    if (!Object.keys(acceptedTypes).includes(file.type)) {
      return `File type not supported. Accepted types: ${Object.values(acceptedTypes).join(', ')}`;
    }

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return 'File size must be less than 10MB';
    }

    return null;
  };

  const handleFiles = (files: FileList) => {
    const newUploadFiles: UploadFile[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const error = validateFile(file);
      
      newUploadFiles.push({
        file,
        progress: 0,
        status: error ? 'error' : 'pending',
        error: error || undefined,
      });
    }

    setUploadFiles(prev => [...prev, ...newUploadFiles]);
    setIsExpanded(true);

    // Start uploading valid files
    newUploadFiles
      .filter(uploadFile => uploadFile.status === 'pending')
      .forEach(uploadFile => uploadFile && simulateUpload(uploadFile));
  };

  const simulateUpload = async (uploadFile: UploadFile) => {
    // Update status to uploading
    setUploadFiles(prev =>
      prev.map(uf =>
        uf.file === uploadFile.file
          ? { ...uf, status: 'uploading' }
          : uf
      )
    );

    // Simulate upload progress
    for (let progress = 0; progress <= 100; progress += 10) {
      await new Promise(resolve => setTimeout(resolve, 100));
      
      setUploadFiles(prev =>
        prev.map(uf =>
          uf.file === uploadFile.file
            ? { ...uf, progress }
            : uf
        )
      );
    }

    // Mark as success
    setUploadFiles(prev =>
      prev.map(uf =>
        uf.file === uploadFile.file
          ? { ...uf, status: 'success', progress: 100 }
          : uf
      )
    );

    // Call onUpload callback if provided
    if (onUpload) {
      try {
        await onUpload([uploadFile.file]);
      } catch (error) {
        setUploadFiles(prev =>
          prev.map(uf =>
            uf.file === uploadFile.file
              ? { ...uf, status: 'error', error: 'Upload failed' }
              : uf
          )
        );
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFiles(files);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFiles(files);
    }
    // Reset input value
    e.target.value = '';
  };

  const removeFile = (fileToRemove: File) => {
    setUploadFiles(prev => prev.filter(uf => uf.file !== fileToRemove));
  };

  const clearAll = () => {
    setUploadFiles([]);
    setIsExpanded(false);
  };

  const hasFiles = uploadFiles.length > 0;
  const completedFiles = uploadFiles.filter(uf => uf.status === 'success').length;

  return (
    <div className={className}>
      <Card variant="glass" className="overflow-hidden">
        {/* Main Upload Area */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative transition-all duration-200 ${
            isDragOver
              ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-600'
              : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
          }`}
        >
          <div className="p-6 text-center">
            <div className="mb-4">
              <Upload className={`w-12 h-12 mx-auto transition-colors ${
                isDragOver ? 'text-blue-500' : 'text-gray-400'
              }`} />
            </div>
            
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Quick Upload
            </h3>
            
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Drag & drop files here or click to browse
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
              >
                Choose Files
              </button>
              
              <button
                onClick={() => navigate('/upload')}
                className="bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 px-6 py-2 rounded-lg font-medium transition-colors"
              >
                Advanced Upload
              </button>
            </div>
            
            <p className="text-xs text-gray-400 mt-3">
              Supports: PDF, Images, Word documents (max 10MB)
            </p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={Object.keys(acceptedTypes).join(',')}
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        {/* Upload Progress */}
        {hasFiles && (
          <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-gray-900 dark:text-white">
                  Upload Progress ({completedFiles}/{uploadFiles.length})
                </h4>
                <button
                  onClick={clearAll}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 max-h-40 overflow-y-auto">
                {uploadFiles.map((uploadFile, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    {getFileIcon(uploadFile.file)}
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {uploadFile.file.name}
                        </p>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs text-gray-500">
                            {formatFileSize(uploadFile.file.size)}
                          </span>
                          {uploadFile.status === 'success' && (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          )}
                          {uploadFile.status === 'error' && (
                            <AlertCircle className="w-4 h-4 text-red-500" />
                          )}
                          <button
                            onClick={() => removeFile(uploadFile.file)}
                            className="text-gray-400 hover:text-red-500"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      
                      {uploadFile.status === 'uploading' && (
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mt-1">
                          <div
                            className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                            style={{ width: `${uploadFile.progress}%` }}
                          />
                        </div>
                      )}
                      
                      {uploadFile.error && (
                        <p className="text-xs text-red-500 mt-1">
                          {uploadFile.error}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default QuickUploadWidget;