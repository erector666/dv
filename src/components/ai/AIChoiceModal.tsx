import React, { useState } from 'react';
import { X } from 'lucide-react';

export interface AIAnalysisResult {
  category: string;
  confidence: number;
  tags: string[];
  suggestedName: string;
  language: string;
  summary?: string;
  reasoning?: string;
  entities?: any[];
  extractedDates?: string[];
  processingTime?: number;
}

interface AIChoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  huggingFaceResult: AIAnalysisResult;
  deepSeekResult: AIAnalysisResult;
  fileName: string;
  onChoose: (
    aiType: 'huggingface' | 'deepseek',
    result: AIAnalysisResult
  ) => void;
  isProcessing?: boolean;
}

const AIChoiceModal: React.FC<AIChoiceModalProps> = ({
  isOpen,
  onClose,
  huggingFaceResult,
  deepSeekResult,
  fileName,
  onChoose,
  isProcessing = false,
}) => {
  const [selectedAI] = useState<'huggingface' | 'deepseek' | null>(null);

  if (!isOpen) return null;

  const handleChoose = (aiType: 'huggingface' | 'deepseek') => {
    const result =
      aiType === 'huggingface' ? huggingFaceResult : deepSeekResult;
    onChoose(aiType, result);
  };

  const formatConfidence = (confidence: number) => {
    return `${Math.round(confidence * 100)}%`;
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-600 dark:text-green-400';
    if (confidence >= 0.6) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-lg md:rounded-lg shadow-xl w-full max-w-6xl max-h-[95vh] overflow-hidden md:dialog-fullscreen">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
              🤖 Choose Your AI Classification
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              File: <span className="font-medium">{fileName}</span>
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
          className="p-4 sm:p-6 overflow-y-auto max-h-[calc(95vh-160px)]"
          style={{ paddingBottom: 'calc(1rem + var(--safe-bottom, 0px))' }}
        >
          {isProcessing ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent mx-auto mb-4"></div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  Processing with Dual AI...
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Running both Hugging Face and DeepSeek analysis in parallel
                </p>
              </div>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              {/* Hugging Face Results */}
              <div
                className={`ai-option border-2 rounded-lg p-6 transition-all duration-200 ${
                  selectedAI === 'huggingface'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-600 hover:border-blue-300'
                }`}
              >
                <div className="ai-header mb-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
                      🤗 Hugging Face AI
                    </h3>
                    <span
                      className={`text-sm font-medium ${getConfidenceColor(huggingFaceResult.confidence)}`}
                    >
                      {formatConfidence(huggingFaceResult.confidence)} confident
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Fast, efficient, specialized models
                  </p>
                </div>

                <div className="results space-y-3 mb-6">
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">
                      Category:
                    </span>
                    <span className="ml-2 px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-sm">
                      {huggingFaceResult.category}
                    </span>
                  </div>

                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">
                      Suggested Name:
                    </span>
                    <p className="text-gray-900 dark:text-white mt-1 font-medium">
                      {huggingFaceResult.suggestedName}
                    </p>
                  </div>

                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">
                      Tags:
                    </span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {huggingFaceResult.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">
                      Language:
                    </span>
                    <span className="ml-2 text-gray-900 dark:text-white">
                      {huggingFaceResult.language}
                    </span>
                  </div>

                  {huggingFaceResult.entities &&
                    huggingFaceResult.entities.length > 0 && (
                      <div>
                        <span className="font-medium text-gray-700 dark:text-gray-300">
                          Entities:
                        </span>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          Found {huggingFaceResult.entities.length} entities
                        </p>
                      </div>
                    )}
                </div>

                <button
                  onClick={() => handleChoose('huggingface')}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center"
                >
                  ✅ Use Hugging Face Results
                </button>
              </div>

              {/* DeepSeek Results */}
              <div
                className={`ai-option border-2 rounded-lg p-6 transition-all duration-200 ${
                  selectedAI === 'deepseek'
                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                    : 'border-gray-200 dark:border-gray-600 hover:border-purple-300'
                }`}
              >
                <div className="ai-header mb-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
                      🧠 DeepSeek AI
                    </h3>
                    <span
                      className={`text-sm font-medium ${getConfidenceColor(deepSeekResult.confidence)}`}
                    >
                      {formatConfidence(deepSeekResult.confidence)} confident
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Advanced reasoning, contextual analysis
                  </p>
                </div>

                <div className="results space-y-3 mb-6">
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">
                      Category:
                    </span>
                    <span className="ml-2 px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded text-sm">
                      {deepSeekResult.category}
                    </span>
                  </div>

                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">
                      Suggested Name:
                    </span>
                    <p className="text-gray-900 dark:text-white mt-1 font-medium">
                      {deepSeekResult.suggestedName}
                    </p>
                  </div>

                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">
                      Tags:
                    </span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {deepSeekResult.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">
                      Language:
                    </span>
                    <span className="ml-2 text-gray-900 dark:text-white">
                      {deepSeekResult.language}
                    </span>
                  </div>

                  {deepSeekResult.summary && (
                    <div>
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        Summary:
                      </span>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-3">
                        {deepSeekResult.summary}
                      </p>
                    </div>
                  )}

                  {deepSeekResult.reasoning && (
                    <div>
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        AI Reasoning:
                      </span>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1 italic">
                        {deepSeekResult.reasoning}
                      </p>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => handleChoose('deepseek')}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center"
                >
                  ✅ Use DeepSeek Results
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {!isProcessing && (
          <div className="border-t border-gray-200 dark:border-gray-700 p-4">
            <div className="text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                💡 Both analyses are saved in metadata. You can reprocess later
                to try the other AI.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AIChoiceModal;
