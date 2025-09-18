import React, { useState } from 'react';
import { X, RefreshCw, HelpCircle } from 'lucide-react';

interface ReprocessModalProps {
  isOpen: boolean;
  onClose: () => void;
  document?: {
    id: string;
    name: string;
    category: string;
    metadata?: {
      selectedAI?: 'huggingface' | 'deepseek';
      huggingFaceAnalysis?: any;
      deepSeekAnalysis?: any;
      reprocessingHistory?: any[];
    };
  };
  documentCount?: number; // For batch processing
  onReprocess: (mode: 'huggingface' | 'deepseek' | 'both') => Promise<void>;
  isProcessing?: boolean;
}

const ReprocessModal: React.FC<ReprocessModalProps> = ({
  isOpen,
  onClose,
  document,
  documentCount,
  onReprocess,
  isProcessing = false,
}) => {
  const [selectedMode, setSelectedMode] = useState<
    'huggingface' | 'deepseek' | 'both' | null
  >(null);

  if (!isOpen) return null;

  const currentAI = document?.metadata?.selectedAI || 'unknown';
  const hasHistory =
    document?.metadata?.reprocessingHistory &&
    document.metadata.reprocessingHistory.length > 0;
  const isBatchMode = !document && documentCount;
  const displayName = isBatchMode
    ? `${documentCount} Documents`
    : document?.name || 'Document';

  const handleReprocess = async (mode: 'huggingface' | 'deepseek' | 'both') => {
    setSelectedMode(mode);
    await onReprocess(mode);
    setSelectedMode(null);
  };

  const getAIDisplayName = (ai: string) => {
    switch (ai) {
      case 'huggingface':
        return '🤗 Hugging Face';
      case 'deepseek':
        return '🧠 DeepSeek';
      default:
        return '❓ Unknown';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-lg md:rounded-lg shadow-xl w-full max-w-2xl max-h-[95vh] overflow-hidden md:dialog-fullscreen">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
              <RefreshCw className="w-6 h-6 mr-2" />
              Reprocess Document
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {isBatchMode ? 'Batch Processing:' : 'File:'}{' '}
              <span className="font-medium">{displayName}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div
          className="p-4 sm:p-6"
          style={{ paddingBottom: 'calc(1rem + var(--safe-bottom, 0px))' }}
        >
          {/* Current Status */}
          {!isBatchMode && (
            <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                Current Classification
              </h3>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Classified by:{' '}
                    <span className="font-medium">
                      {getAIDisplayName(currentAI)}
                    </span>
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Category:{' '}
                    <span className="font-medium text-gray-900 dark:text-white">
                      {document?.category}
                    </span>
                  </p>
                </div>
                {hasHistory && (
                  <div className="text-right">
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Reprocessed{' '}
                      {document?.metadata?.reprocessingHistory?.length} times
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Batch Mode Info */}
          {isBatchMode && (
            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <h3 className="font-medium text-blue-900 dark:text-blue-200 mb-2">
                Batch Processing Mode
              </h3>
              <p className="text-sm text-blue-800 dark:text-blue-300">
                You're about to reprocess{' '}
                <strong>{documentCount} documents</strong> with your chosen AI.
                This will update their categories, names, and extracted
                information.
              </p>
            </div>
          )}

          {/* Reprocessing Options */}
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900 dark:text-white mb-4">
              Choose Reprocessing Method
            </h3>

            {/* Hugging Face Option */}
            <button
              onClick={() => handleReprocess('huggingface')}
              disabled={isProcessing && selectedMode !== 'huggingface'}
              className={`w-full p-4 border-2 rounded-lg text-left transition-all duration-200 ${
                isProcessing && selectedMode === 'huggingface'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-600 hover:border-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/10'
              } ${isProcessing && selectedMode !== 'huggingface' ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="text-2xl mr-3">🤗</div>
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      Hugging Face AI
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Fast, efficient classification with specialized models
                    </p>
                  </div>
                </div>
                {isProcessing && selectedMode === 'huggingface' && (
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-500 border-t-transparent"></div>
                )}
              </div>
            </button>

            {/* DeepSeek Option */}
            <button
              onClick={() => handleReprocess('deepseek')}
              disabled={isProcessing && selectedMode !== 'deepseek'}
              className={`w-full p-4 border-2 rounded-lg text-left transition-all duration-200 ${
                isProcessing && selectedMode === 'deepseek'
                  ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                  : 'border-gray-200 dark:border-gray-600 hover:border-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/10'
              } ${isProcessing && selectedMode !== 'deepseek' ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="text-2xl mr-3">🧠</div>
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      DeepSeek AI
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Advanced reasoning and contextual analysis
                    </p>
                  </div>
                </div>
                {isProcessing && selectedMode === 'deepseek' && (
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-purple-500 border-t-transparent"></div>
                )}
              </div>
            </button>

            {/* Both Option */}
            <button
              onClick={() => handleReprocess('both')}
              disabled={isProcessing && selectedMode !== 'both'}
              className={`w-full p-4 border-2 rounded-lg text-left transition-all duration-200 ${
                isProcessing && selectedMode === 'both'
                  ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                  : 'border-gray-200 dark:border-gray-600 hover:border-green-300 hover:bg-green-50 dark:hover:bg-green-900/10'
              } ${isProcessing && selectedMode !== 'both' ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="text-2xl mr-3">🎯</div>
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white">
                      Compare Both AIs
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Run both analyses and choose the best result
                    </p>
                  </div>
                </div>
                {isProcessing && selectedMode === 'both' && (
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-green-500 border-t-transparent"></div>
                )}
              </div>
            </button>
          </div>

          {/* Info Box */}
          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="flex items-start">
              <HelpCircle className="w-5 h-5 text-blue-500 mr-2 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="text-blue-800 dark:text-blue-200 font-medium mb-1">
                  How Reprocessing Works:
                </p>
                <ul className="text-blue-700 dark:text-blue-300 space-y-1 text-xs">
                  <li>• Uses the original extracted text (no quality loss)</li>
                  <li>• Applies latest AI models and improvements</li>
                  <li>• Saves processing history for comparison</li>
                  <li>• You can always switch between AI results</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-gray-700 p-4">
          <div className="flex justify-between items-center">
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 disabled:opacity-50"
            >
              Cancel
            </button>
            {isProcessing && (
              <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-400 border-t-transparent mr-2"></div>
                Processing with{' '}
                {selectedMode === 'both'
                  ? 'both AIs'
                  : getAIDisplayName(selectedMode || '')}
                ...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReprocessModal;
