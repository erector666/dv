import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../../context/LanguageContext';
import {
  translateDocument,
  translateText,
  TranslationResult,
} from '../../services/translationService';

interface DocumentViewerProps {
  document: {
    id?: string;
    name: string;
    url: string;
    type: string;
    uploadedAt: any;
    size?: number;
    category?: string;
    tags?: string[];
    metadata?: Record<string, any>;
  };
  onClose: () => void;
}

const DocumentViewerMobile: React.FC<DocumentViewerProps> = ({
  document,
  onClose,
}) => {
  const [translationResult, setTranslationResult] = useState<TranslationResult | null>(null);
  const { translate } = useLanguage();
  const [showMenu, setShowMenu] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [showMetadata, setShowMetadata] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'document' | 'metadata' | 'translation'>('document');
  const [documentLoadError, setDocumentLoadError] = useState(false);

  // Close modal with Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    window.document.body.style.overflow = 'hidden';
    return () => {
      window.document.body.style.overflow = 'unset';
    };
  }, []);

  if (!document) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg p-6 w-full max-w-sm">
          <h2 className="text-lg font-semibold mb-4">Document not found</h2>
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const isPDF = document.type === 'application/pdf';
  const isImage = document.type.startsWith('image/');

  // Supported languages for translation
  const supportedLanguages = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'mk', name: 'Македонски', flag: '🇲🇰' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
  ];

  const handleTranslate = async (targetLanguage: string) => {
    setIsTranslating(true);
    setSelectedLanguage(targetLanguage);
    setShowMenu(false);
    setActiveTab('translation');

    try {
      const sourceLanguage = document.metadata?.language || 'en';
      const extractedText = document.metadata?.extractedText || document.metadata?.text || '';

      const result = extractedText && extractedText.trim().length > 0
        ? await translateText(extractedText, targetLanguage, sourceLanguage)
        : await translateDocument(document.url, targetLanguage, sourceLanguage, document.id);

      if (result) {
        setTranslationResult(result);
      }
    } catch (error) {
      console.error('Translation failed:', error);
      setTranslationResult(null);
    } finally {
      setIsTranslating(false);
    }
  };

  const renderMetadataValue = (value: any): string => {
    if (value === null || value === undefined) return 'N/A';
    if (Array.isArray(value)) return value.length > 0 ? value.join(', ') : 'None';
    if (typeof value === 'object') {
      if (value.seconds) return new Date(value.seconds * 1000).toLocaleDateString();
      return 'Complex data';
    }
    return String(value);
  };

  const renderMobileMenu = () => (
    <AnimatePresence>
      {showMenu && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-[60]"
            onClick={() => setShowMenu(false)}
          />
          
          {/* Bottom Sheet Menu */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl z-[61] safe-bottom"
          >
            <div className="p-4">
              {/* Handle bar */}
              <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
              
              <h3 className="text-lg font-semibold mb-4">Document Actions</h3>
              
              <div className="space-y-2">
                {/* View Metadata */}
                <button
                  onClick={() => {
                    setActiveTab('metadata');
                    setShowMenu(false);
                  }}
                  className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 text-left"
                >
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <div>
                    <div className="font-medium">View Details</div>
                    <div className="text-xs text-gray-500">Document information</div>
                  </div>
                </button>

                {/* Translate */}
                <div className="border-t pt-2">
                  <div className="text-sm font-medium text-gray-500 mb-2">Translate to:</div>
                  {supportedLanguages.map(lang => (
                    <button
                      key={lang.code}
                      onClick={() => handleTranslate(lang.code)}
                      disabled={isTranslating}
                      className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 text-left disabled:opacity-50"
                    >
                      <span className="text-xl">{lang.flag}</span>
                      <span className="font-medium">{lang.name}</span>
                    </button>
                  ))}
                </div>

                {/* Download */}
                <a
                  href={document.url}
                  download={document.name}
                  className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 text-left"
                  onClick={() => setShowMenu(false)}
                >
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <div>
                    <div className="font-medium">Download</div>
                    <div className="text-xs text-gray-500">Save to device</div>
                  </div>
                </a>
              </div>
              
              {/* Cancel button */}
              <button
                onClick={() => setShowMenu(false)}
                className="w-full mt-4 p-3 text-gray-600 hover:bg-gray-50 rounded-lg font-medium"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'metadata':
        return (
          <div className="flex-1 overflow-y-auto p-4 pb-20">
            <div className="space-y-4">
              {/* Basic Info */}
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-3">Document Info</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Name:</span>
                    <span className="text-gray-900 font-medium text-right">{document.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Type:</span>
                    <span className="text-gray-900">{document.type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Size:</span>
                    <span className="text-gray-900">
                      {document.size ? `${(document.size / 1024 / 1024).toFixed(2)} MB` : 'Unknown'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Category:</span>
                    <span className="text-gray-900">{document.category || 'Uncategorized'}</span>
                  </div>
                </div>
              </div>

              {/* AI Analysis */}
              {document.metadata ? (
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <h3 className="font-semibold text-gray-900 mb-3">AI Analysis</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Language:</span>
                      <span className="text-gray-900">{document.metadata.language || 'Unknown'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Confidence:</span>
                      <span className="text-gray-900">
                        {document.metadata.confidence ? `${Math.round(document.metadata.confidence * 100)}%` : 'N/A'}
                      </span>
                    </div>
                    {document.metadata.wordCount && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Word Count:</span>
                        <span className="text-gray-900">{document.metadata.wordCount.toLocaleString()}</span>
                      </div>
                    )}
                    {document.metadata.qualityScore && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Quality Score:</span>
                        <span className="text-gray-900">{document.metadata.qualityScore}/100</span>
                      </div>
                    )}
                    {document.metadata.processingMethod && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Processing:</span>
                        <span className="text-gray-900">{document.metadata.processingMethod}</span>
                      </div>
                    )}
                    {document.metadata.aiProcessingCompleted && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">AI Processed:</span>
                        <span className="text-gray-900">
                          {document.metadata.aiProcessingCompleted === true ? 'Yes' : 
                           typeof document.metadata.aiProcessingCompleted === 'string' ? 
                           new Date(document.metadata.aiProcessingCompleted).toLocaleDateString() : 
                           'Yes'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <h3 className="font-semibold text-gray-900 mb-3">AI Analysis</h3>
                  <div className="text-center py-4">
                    <svg className="w-12 h-12 text-gray-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    <p className="text-sm text-gray-500">No AI analysis available</p>
                    <p className="text-xs text-gray-400 mt-1">Document may still be processing</p>
                  </div>
                </div>
              )}

              {/* Summary */}
              {document.metadata?.summary && (
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <h3 className="font-semibold text-gray-900 mb-3">Summary</h3>
                  <p className="text-sm text-gray-700">{document.metadata.summary}</p>
                </div>
              )}

              {/* Tags */}
              {document.tags && document.tags.length > 0 && (
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <h3 className="font-semibold text-gray-900 mb-3">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {document.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Extracted Text Preview */}
              {document.metadata?.extractedText && (
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <h3 className="font-semibold text-gray-900 mb-3">Extracted Text</h3>
                  <div className="max-h-32 overflow-y-auto">
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                      {document.metadata.extractedText.length > 200 
                        ? `${document.metadata.extractedText.substring(0, 200)}...`
                        : document.metadata.extractedText}
                    </p>
                  </div>
                </div>
              )}

              {/* Keywords */}
              {document.metadata?.keywords && document.metadata.keywords.length > 0 && (
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <h3 className="font-semibold text-gray-900 mb-3">Keywords</h3>
                  <div className="flex flex-wrap gap-2">
                    {document.metadata.keywords.map((keyword: any, index: number) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs"
                      >
                        {String(keyword)}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Document Properties */}
              <div className="bg-white rounded-lg p-4 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-3">Document Properties</h3>
                <div className="space-y-2 text-sm">
                  {document.metadata?.hasTables && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Contains Tables:</span>
                      <span className="text-gray-900">{document.metadata.hasTables ? 'Yes' : 'No'}</span>
                    </div>
                  )}
                  {document.metadata?.hasImages && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Contains Images:</span>
                      <span className="text-gray-900">{document.metadata.hasImages ? 'Yes' : 'No'}</span>
                    </div>
                  )}
                  {document.metadata?.convertedToPdf && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Converted to PDF:</span>
                      <span className="text-gray-900">{document.metadata.convertedToPdf ? 'Yes' : 'No'}</span>
                    </div>
                  )}
                  {document.metadata?.originalFileType && document.metadata.originalFileType !== document.type && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Original Type:</span>
                      <span className="text-gray-900">{document.metadata.originalFileType}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );

      case 'translation':
        return (
          <div className="flex-1 overflow-y-auto p-4 pb-20">
            {isTranslating ? (
              <div className="flex flex-col items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4" />
                <p className="text-gray-600">Translating document...</p>
              </div>
            ) : translationResult ? (
              <div className="space-y-4">
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-900">Translation</h3>
                    <div className="flex items-center space-x-2 text-xs">
                      <span className="text-gray-500">{translationResult.sourceLanguage?.toUpperCase()}</span>
                      <span>→</span>
                      <span className="font-medium">{translationResult.targetLanguage?.toUpperCase()}</span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {translationResult.translatedText}
                  </p>
                  {translationResult.confidence && (
                    <div className="mt-3 pt-3 border-t">
                      <span className="text-xs text-gray-500">
                        Confidence: {Math.round(translationResult.confidence * 100)}%
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <svg className="w-16 h-16 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                </svg>
                <p className="text-gray-500">No translation available</p>
                <button
                  onClick={() => setShowMenu(true)}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm"
                >
                  Translate Document
                </button>
              </div>
            )}
          </div>
        );

      default: // document view
        if (isPDF) {
          return documentLoadError ? (
            <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 p-8">
              <div className="text-center">
                <div className="text-6xl mb-4">📄</div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  Unable to Load Document
                </h3>
                <p className="text-gray-600 mb-4">
                  The document preview is unavailable.
                </p>
                <a
                  href={document.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download
                </a>
              </div>
            </div>
          ) : (
            <iframe
              src={document.url}
              className="flex-1 w-full border-0"
              title={document.name}
              onError={(e) => {
                console.error('Failed to load document in mobile viewer:', document.url, e);
                setDocumentLoadError(true);
              }}
              onLoad={() => {
                console.log('Document loaded successfully in mobile viewer:', document.url);
                setDocumentLoadError(false);
              }}
            />
          );
        } else if (isImage) {
          return (
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-gray-50">
              <img
                src={document.url}
                alt={document.name}
                className="max-w-full h-auto"
              />
            </div>
          );
        } else {
          return (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <svg className="w-20 h-20 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-lg font-medium text-gray-700 mb-2">Preview not available</p>
              <p className="text-sm text-gray-500 mb-6">This file type cannot be previewed</p>
              <a
                href={document.url}
                download={document.name}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium"
              >
                Download File
              </a>
            </div>
          );
        }
    }
  };

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      {/* Mobile Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between safe-top">
        <button
          onClick={onClose}
          className="p-2 -ml-2 rounded-lg hover:bg-gray-100"
          aria-label="Close"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        
        <div className="flex-1 mx-3">
          <h2 className="text-base font-semibold text-gray-900 truncate">
            {document.name}
          </h2>
          <p className="text-xs text-gray-500">
            {document.size ? `${(document.size / 1024 / 1024).toFixed(1)} MB` : ''} • {document.category || 'Document'}
          </p>
        </div>
        
        <button
          onClick={() => setShowMenu(true)}
          className="p-2 -mr-2 rounded-lg hover:bg-gray-100"
          aria-label="Menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
          </svg>
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="bg-gray-50 border-b border-gray-200">
        <div className="flex">
          <button
            onClick={() => setActiveTab('document')}
            className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'document'
                ? 'text-blue-600 border-blue-600'
                : 'text-gray-500 border-transparent'
            }`}
          >
            Document
          </button>
          <button
            onClick={() => setActiveTab('metadata')}
            className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'metadata'
                ? 'text-blue-600 border-blue-600'
                : 'text-gray-500 border-transparent'
            }`}
          >
            Details
          </button>
          <button
            onClick={() => setActiveTab('translation')}
            className={`flex-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'translation'
                ? 'text-blue-600 border-blue-600'
                : 'text-gray-500 border-transparent'
            }`}
          >
            Translation
          </button>
        </div>
      </div>

      {/* Content */}
      {renderContent()}

      {/* Mobile Menu */}
      {renderMobileMenu()}

      {/* Floating Action Button for quick actions */}
      {activeTab === 'document' && (
        <div className="fixed bottom-6 right-6 z-50">
          <motion.a
            href={document.url}
            download={document.name}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="flex items-center justify-center w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg"
            aria-label="Download"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </motion.a>
        </div>
      )}

      <style>{`
        .safe-top {
          padding-top: env(safe-area-inset-top, 12px);
        }
        .safe-bottom {
          padding-bottom: env(safe-area-inset-bottom, 20px);
        }
      `}</style>
    </div>
  );
};

export default DocumentViewerMobile;