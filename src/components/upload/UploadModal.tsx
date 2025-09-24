import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DocumentUpload } from '.';
import EnhancedDocumentUpload from './EnhancedDocumentUpload';
import { useFocusTrap } from '../../hooks/useAccessibility';
import { useUploadModal } from '../../context/UploadModalContext';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadComplete?: (keepOpen?: boolean) => void;
}

const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onUploadComplete,
}) => {
  const focusTrapRef = useFocusTrap(isOpen);
  const { uploadStatus } = useUploadModal();
  const [useEnhancedUpload, setUseEnhancedUpload] = useState(true);
  const [showCompletionOptions, setShowCompletionOptions] = useState(false);

  if (!isOpen) return null;

  const handleUploadComplete = (keepOpen?: boolean) => {
    if (keepOpen) {
      setShowCompletionOptions(true);
      // Don't close modal, let user decide
    } else {
      onUploadComplete?.(false);
    }
  };

  const handleKeepModalOpen = () => {
    setShowCompletionOptions(false);
    // Modal stays open for more uploads
  };

  const handleCloseModal = () => {
    setShowCompletionOptions(false);
    onUploadComplete?.(false);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-labelledby="upload-modal-title"
        aria-describedby="upload-modal-description"
      >
        <motion.div
          ref={focusTrapRef}
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col md:dialog-fullscreen"
          onClick={e => e.stopPropagation()}
        >
          {/* Header - Compact for mobile, sticky on small screens */}
          <div className="relative bg-gradient-to-r from-blue-600 to-purple-600 p-4 sm:p-6 text-white flex-shrink-0 sticky top-0 z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <svg
                    className="w-4 h-4 sm:w-6 sm:h-6"
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
                </div>
                <div>
                  <h2 id="upload-modal-title" className="text-lg sm:text-2xl font-bold">
                    Upload Documents
                  </h2>
                  <p id="upload-modal-description" className="text-blue-100 text-xs sm:text-sm">
                    Enhanced upload with smart queue management
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {/* Upload Mode Toggle */}
                <button
                  onClick={() => setUseEnhancedUpload(!useEnhancedUpload)}
                  className="px-2 py-1 text-xs bg-white/20 hover:bg-white/30 rounded-md transition-colors"
                  title={useEnhancedUpload ? 'Switch to simple mode' : 'Switch to enhanced mode'}
                >
                  {useEnhancedUpload ? '🚀' : '📄'}
                </button>
                <button
                  onClick={onClose}
                  className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors"
                  aria-label="Close"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>
            
            {/* Upload Status Indicator */}
            {uploadStatus !== 'idle' && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-3 px-3 py-1 bg-white/20 rounded-full inline-flex items-center space-x-2"
              >
                <div className={`w-2 h-2 rounded-full ${
                  uploadStatus === 'uploading' ? 'bg-yellow-300 animate-pulse' :
                  uploadStatus === 'completed' ? 'bg-green-300' :
                  uploadStatus === 'error' ? 'bg-red-300' :
                  uploadStatus === 'paused' ? 'bg-orange-300' :
                  'bg-blue-300'
                }`} />
                <span className="text-xs font-medium">
                  {uploadStatus.charAt(0).toUpperCase() + uploadStatus.slice(1)}
                </span>
              </motion.div>
            )}
          </div>

          {/* Content - Optimized for mobile and better visibility */}
          <div
            className="flex-1 overflow-y-auto p-4 sm:p-6"
            style={{ paddingBottom: 'calc(1rem + var(--safe-bottom, 0px))' }}
          >
            {useEnhancedUpload ? (
              <EnhancedDocumentUpload onUploadComplete={handleUploadComplete} />
            ) : (
              <DocumentUpload onUploadComplete={handleUploadComplete} />
            )}
          </div>

          {/* Upload Completion Options Modal */}
          <AnimatePresence>
            {showCompletionOptions && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/50 flex items-center justify-center z-20"
              >
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md mx-4 shadow-2xl"
                >
                  <div className="text-center">
                    <div className="text-4xl mb-4">🎉</div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                      Upload Complete!
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                      Your files have been successfully uploaded. What would you like to do next?
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <button
                        onClick={handleKeepModalOpen}
                        className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all duration-200 font-medium"
                      >
                        📤 Upload More Files
                      </button>
                      <button
                        onClick={handleCloseModal}
                        className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-200 font-medium"
                      >
                        ✅ Done
                      </button>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default UploadModal;
