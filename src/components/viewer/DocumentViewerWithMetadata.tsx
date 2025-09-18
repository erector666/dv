import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '../../context/LanguageContext';
import {
  translateDocument,
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

const DocumentViewer: React.FC<DocumentViewerProps> = ({
  document,
  onClose,
}) => {
  const { translate } = useLanguage();
  const [showTranslationMenu, setShowTranslationMenu] = useState(false);
  const [showMetadataView, setShowMetadataView] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isGeneratingMetadata, setIsGeneratingMetadata] = useState(false);
  const [isConvertingToPDF, setIsConvertingToPDF] = useState(false);
  const [translationResult, setTranslationResult] =
    useState<TranslationResult | null>(null);
  const [metadataResult, setMetadataResult] = useState<any>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('');

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
    setShowTranslationMenu(false);

    try {
      const result = await translateDocument(
        document.url,
        targetLanguage,
        undefined,
        document.id
      );
      setTranslationResult(result);
    } catch (error) {
      console.error('❌ Translation failed:', error);
    } finally {
      setIsTranslating(false);
    }
  };

  const resetTranslation = () => {
    setTranslationResult(null);
    setSelectedLanguage('');
  };

  const handleGenerateMetadata = async () => {
    setIsGeneratingMetadata(true);
    setShowOptionsMenu(false);

    try {
      // Call backend function to generate AI metadata
      const response = await fetch('/api/generateMetadata', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentUrl: document.url,
          documentId: document.id,
          documentName: document.name,
          documentType: document.type,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setMetadataResult(result);
        setShowMetadataView(true);
      } else {
        console.error('❌ Metadata generation failed');
      }
    } catch (error) {
      console.error('❌ Metadata generation error:', error);
    } finally {
      setIsGeneratingMetadata(false);
    }
  };

  const handleConvertToPDF = async () => {
    setIsConvertingToPDF(true);
    setShowOptionsMenu(false);

    try {
      // Call backend function to convert document to PDF
      const response = await fetch('/api/convertToPDF', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentUrl: document.url,
          documentId: document.id,
          documentName: document.name,
          documentType: document.type,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        // Download the converted PDF
        const link = window.document.createElement('a');
        link.href = result.pdfUrl;
        link.download = `${document.name.replace(/\.[^/.]+$/, '')}.pdf`;
        link.click();
      } else {
        console.error('❌ PDF conversion failed');
      }
    } catch (error) {
      console.error('❌ PDF conversion error:', error);
    } finally {
      setIsConvertingToPDF(false);
    }
  };

  const resetMetadata = () => {
    setMetadataResult(null);
    setShowMetadataView(false);
  };

  const renderOptionsMenu = () => (
    <div className="relative">
      <motion.button
        onClick={() => setShowOptionsMenu(!showOptionsMenu)}
        disabled={isGeneratingMetadata || isConvertingToPDF}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg transition-all duration-200 ${
          isGeneratingMetadata || isConvertingToPDF
            ? 'bg-gray-100 text-gray-600 cursor-not-allowed'
            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-700'
        }`}
        title="Document Options"
      >
        {isGeneratingMetadata || isConvertingToPDF ? (
          <div className="flex items-center space-x-2">
            <div className="flex space-x-1">
              <motion.div
                className="w-1 h-1 bg-gray-600 rounded-full"
                animate={{ y: [0, -4, 0] }}
                transition={{
                  duration: 0.8,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
              <motion.div
                className="w-1 h-1 bg-gray-600 rounded-full"
                animate={{ y: [0, -4, 0] }}
                transition={{
                  duration: 0.8,
                  delay: 0.2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
              <motion.div
                className="w-1 h-1 bg-gray-600 rounded-full"
                animate={{ y: [0, -4, 0] }}
                transition={{
                  duration: 0.8,
                  delay: 0.4,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />
            </div>
            <span className="text-sm">
              {isGeneratingMetadata ? 'Generating...' : 'Converting...'}
            </span>
          </div>
        ) : (
          <>
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
              />
            </svg>
            <span className="text-sm font-medium">Options</span>
          </>
        )}
      </motion.button>

      {/* Options Menu */}
      <AnimatePresence>
        {showOptionsMenu && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="absolute top-full right-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-10 min-w-[200px]"
          >
            <div className="px-3 py-2 text-xs font-medium text-gray-500 border-b border-gray-100">
              Document Options:
            </div>

            <motion.button
              onClick={handleGenerateMetadata}
              whileHover={{ backgroundColor: '#f3f4f6' }}
              className="w-full flex items-center space-x-3 px-3 py-2 text-left hover:bg-gray-50 transition-colors"
            >
              <svg
                className="w-4 h-4 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <div>
                <div className="text-sm font-medium text-gray-700">
                  View Metadata
                </div>
                <div className="text-xs text-gray-500">
                  AI-generated document info
                </div>
              </div>
            </motion.button>

            <motion.button
              onClick={handleConvertToPDF}
              whileHover={{ backgroundColor: '#f3f4f6' }}
              className="w-full flex items-center space-x-3 px-3 py-2 text-left hover:bg-gray-50 transition-colors"
            >
              <svg
                className="w-4 h-4 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                />
              </svg>
              <div>
                <div className="text-sm font-medium text-gray-700">
                  Convert to PDF
                </div>
                <div className="text-xs text-gray-500">Download as PDF</div>
              </div>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  const renderMetadataView = () => (
    <div className="w-full h-full bg-gray-50 rounded-lg p-4 overflow-auto">
      <div className="bg-white rounded-lg p-6 shadow-sm">
        <div className="mb-4 pb-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            Document Metadata
          </h3>
          <button
            onClick={resetMetadata}
            className="text-gray-500 hover:text-gray-700 transition-colors"
            title="Close Metadata"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
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

        {metadataResult ? (
          <div className="space-y-4">
            {/* Document Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">
                  Document Information
                </h4>
                <div className="space-y-1 text-sm">
                  <div>
                    <strong>Name:</strong> {metadataResult.documentName}
                  </div>
                  <div>
                    <strong>Type:</strong> {metadataResult.documentType}
                  </div>
                  <div>
                    <strong>Size:</strong> {metadataResult.fileSize}
                  </div>
                  <div>
                    <strong>Pages:</strong> {metadataResult.pages || 'N/A'}
                  </div>
                </div>
              </div>

              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="font-medium text-green-900 mb-2">
                  Content Analysis
                </h4>
                <div className="space-y-1 text-sm">
                  <div>
                    <strong>Language:</strong> {metadataResult.detectedLanguage}
                  </div>
                  <div>
                    <strong>Confidence:</strong> {metadataResult.confidence}%
                  </div>
                  <div>
                    <strong>Has Tables:</strong>{' '}
                    {metadataResult.hasTables ? 'Yes' : 'No'}
                  </div>
                  <div>
                    <strong>Has Images:</strong>{' '}
                    {metadataResult.hasImages ? 'Yes' : 'No'}
                  </div>
                </div>
              </div>
            </div>

            {/* AI Summary */}
            {metadataResult.summary && (
              <div className="bg-yellow-50 p-4 rounded-lg">
                <h4 className="font-medium text-yellow-900 mb-2">AI Summary</h4>
                <p className="text-sm text-yellow-800">
                  {metadataResult.summary}
                </p>
              </div>
            )}

            {/* Keywords */}
            {metadataResult.keywords && (
              <div className="bg-purple-50 p-4 rounded-lg">
                <h4 className="font-medium text-purple-900 mb-2">Key Topics</h4>
                <div className="flex flex-wrap gap-2">
                  {metadataResult.keywords.map(
                    (keyword: string, index: number) => (
                      <span
                        key={index}
                        className="bg-purple-200 text-purple-800 px-2 py-1 rounded-full text-xs"
                      >
                        {keyword}
                      </span>
                    )
                  )}
                </div>
              </div>
            )}

            {/* Processing Info */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">
                Processing Information
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>Processed:</strong>{' '}
                  {new Date(metadataResult.processedAt).toLocaleString()}
                </div>
                <div>
                  <strong>Processing Time:</strong>{' '}
                  {metadataResult.processingTime}ms
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="text-gray-500">No metadata available</div>
          </div>
        )}
      </div>
    </div>
  );

  if (isPDF) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl w-11/12 h-5/6 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-xl font-semibold text-gray-800">
              {document.name}
              {translationResult && (
                <span className="ml-2 text-sm text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                  Translated to{' '}
                  {
                    supportedLanguages.find(l => l.code === selectedLanguage)
                      ?.name
                  }
                </span>
              )}
            </h2>
            <div className="flex items-center space-x-2">
              {/* Options Menu */}
              {renderOptionsMenu()}

              {/* Translation Button */}
              <div className="relative">
                <motion.button
                  onClick={() => setShowTranslationMenu(!showTranslationMenu)}
                  disabled={isTranslating}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg transition-all duration-200 ${
                    isTranslating
                      ? 'bg-blue-100 text-blue-600 cursor-not-allowed'
                      : 'text-blue-600 hover:bg-blue-50 hover:text-blue-700'
                  }`}
                  title="Translate Document"
                >
                  {isTranslating ? (
                    <div className="flex items-center space-x-2">
                      <div className="flex space-x-1">
                        <motion.div
                          className="w-1 h-1 bg-blue-600 rounded-full"
                          animate={{ y: [0, -4, 0] }}
                          transition={{
                            duration: 0.8,
                            repeat: Infinity,
                            ease: 'easeInOut',
                          }}
                        />
                        <motion.div
                          className="w-1 h-1 bg-blue-600 rounded-full"
                          animate={{ y: [0, -4, 0] }}
                          transition={{
                            duration: 0.8,
                            delay: 0.2,
                            repeat: Infinity,
                            ease: 'easeInOut',
                          }}
                        />
                        <motion.div
                          className="w-1 h-1 bg-blue-600 rounded-full"
                          animate={{ y: [0, -4, 0] }}
                          transition={{
                            duration: 0.8,
                            delay: 0.4,
                            repeat: Infinity,
                            ease: 'easeInOut',
                          }}
                        />
                      </div>
                      <span className="text-sm">Translating...</span>
                    </div>
                  ) : (
                    <>
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
                        />
                      </svg>
                      <span className="text-sm font-medium">Translate</span>
                    </>
                  )}
                </motion.button>

                {/* Translation Menu */}
                <AnimatePresence>
                  {showTranslationMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      className="absolute top-full right-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-10 min-w-[180px]"
                    >
                      <div className="px-3 py-2 text-xs font-medium text-gray-500 border-b border-gray-100">
                        Translate to:
                      </div>
                      {supportedLanguages.map(lang => (
                        <motion.button
                          key={lang.code}
                          onClick={() => handleTranslate(lang.code)}
                          whileHover={{ backgroundColor: '#f3f4f6' }}
                          className="w-full flex items-center space-x-3 px-3 py-2 text-left hover:bg-gray-50 transition-colors"
                        >
                          <span className="text-lg">{lang.flag}</span>
                          <span className="text-sm font-medium text-gray-700">
                            {lang.name}
                          </span>
                        </motion.button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Reset Translation Button */}
              {translationResult && (
                <motion.button
                  onClick={resetTranslation}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                  title="Show Original"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                </motion.button>
              )}

              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700 transition-colors"
                title={translate('viewer.close')}
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
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

          {/* PDF Viewer */}
          <div className="flex-1 p-4">
            {showMetadataView ? (
              renderMetadataView()
            ) : translationResult ? (
              <div className="w-full h-full bg-gray-50 rounded-lg p-4 overflow-auto">
                <div className="bg-white rounded-lg p-6 shadow-sm">
                  <div className="mb-4 pb-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      Translation Result
                    </h3>
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <span>
                        From:{' '}
                        <strong>
                          {translationResult.sourceLanguage.toUpperCase()}
                        </strong>
                      </span>
                      <span>→</span>
                      <span>
                        To:{' '}
                        <strong>
                          {translationResult.targetLanguage.toUpperCase()}
                        </strong>
                      </span>
                      <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs">
                        {Math.round(translationResult.confidence * 100)}%
                        confidence
                      </span>
                    </div>
                  </div>
                  <div className="prose max-w-none">
                    <p className="text-gray-900 leading-relaxed whitespace-pre-wrap">
                      {translationResult.translatedText}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <iframe
                src={document.url}
                className="w-full h-full border-0 rounded"
                title={document.name}
              />
            )}
          </div>
        </div>
      </div>
    );
  }

  // Similar structure for image viewer...
  if (isImage) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-4xl max-h-5/6 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-xl font-semibold text-gray-800">
              {document.name}
              {translationResult && (
                <span className="ml-2 text-sm text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                  Translated to{' '}
                  {
                    supportedLanguages.find(l => l.code === selectedLanguage)
                      ?.name
                  }
                </span>
              )}
            </h2>
            <div className="flex items-center space-x-2">
              {/* Options Menu */}
              {renderOptionsMenu()}

              {/* Translation Button */}
              <div className="relative">
                <motion.button
                  onClick={() => setShowTranslationMenu(!showTranslationMenu)}
                  disabled={isTranslating}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg transition-all duration-200 ${
                    isTranslating
                      ? 'bg-blue-100 text-blue-600 cursor-not-allowed'
                      : 'text-blue-600 hover:bg-blue-50 hover:text-blue-700'
                  }`}
                  title="Translate Document"
                >
                  {isTranslating ? (
                    <div className="flex items-center space-x-2">
                      <div className="flex space-x-1">
                        <motion.div
                          className="w-1 h-1 bg-blue-600 rounded-full"
                          animate={{ y: [0, -4, 0] }}
                          transition={{
                            duration: 0.8,
                            repeat: Infinity,
                            ease: 'easeInOut',
                          }}
                        />
                        <motion.div
                          className="w-1 h-1 bg-blue-600 rounded-full"
                          animate={{ y: [0, -4, 0] }}
                          transition={{
                            duration: 0.8,
                            delay: 0.2,
                            repeat: Infinity,
                            ease: 'easeInOut',
                          }}
                        />
                        <motion.div
                          className="w-1 h-1 bg-blue-600 rounded-full"
                          animate={{ y: [0, -4, 0] }}
                          transition={{
                            duration: 0.8,
                            delay: 0.4,
                            repeat: Infinity,
                            ease: 'easeInOut',
                          }}
                        />
                      </div>
                      <span className="text-sm">Translating...</span>
                    </div>
                  ) : (
                    <>
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
                        />
                      </svg>
                      <span className="text-sm font-medium">Translate</span>
                    </>
                  )}
                </motion.button>

                {/* Translation Menu */}
                <AnimatePresence>
                  {showTranslationMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      className="absolute top-full right-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-10 min-w-[180px]"
                    >
                      <div className="px-3 py-2 text-xs font-medium text-gray-500 border-b border-gray-100">
                        Translate to:
                      </div>
                      {supportedLanguages.map(lang => (
                        <motion.button
                          key={lang.code}
                          onClick={() => handleTranslate(lang.code)}
                          whileHover={{ backgroundColor: '#f3f4f6' }}
                          className="w-full flex items-center space-x-3 px-3 py-2 text-left hover:bg-gray-50 transition-colors"
                        >
                          <span className="text-lg">{lang.flag}</span>
                          <span className="text-sm font-medium text-gray-700">
                            {lang.name}
                          </span>
                        </motion.button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Reset Translation Button */}
              {translationResult && (
                <motion.button
                  onClick={resetTranslation}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="text-gray-500 hover:text-gray-700 transition-colors"
                  title="Show Original"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                </motion.button>
              )}

              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700 transition-colors"
                title={translate('viewer.close')}
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
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

          {/* Image Viewer */}
          <div className="p-4">
            {showMetadataView ? (
              renderMetadataView()
            ) : translationResult ? (
              <div className="flex space-x-4 h-full">
                {/* Original Image */}
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    Original
                  </h4>
                  <img
                    src={document.url}
                    alt={document.name}
                    className="max-w-full max-h-full object-contain mx-auto"
                  />
                </div>

                {/* Translation Results */}
                <div className="flex-1 bg-gray-50 rounded-lg p-4 overflow-auto">
                  <h4 className="text-sm font-medium text-gray-700 mb-4">
                    Translation Result
                  </h4>
                  <div className="bg-white rounded-lg p-4 shadow-sm">
                    <div className="mb-3 pb-3 border-b border-gray-200">
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span>
                          From:{' '}
                          <strong>
                            {translationResult.sourceLanguage.toUpperCase()}
                          </strong>
                        </span>
                        <span>→</span>
                        <span>
                          To:{' '}
                          <strong>
                            {translationResult.targetLanguage.toUpperCase()}
                          </strong>
                        </span>
                        <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs">
                          {Math.round(translationResult.confidence * 100)}%
                          confidence
                        </span>
                      </div>
                    </div>
                    <div className="prose max-w-none">
                      <p className="text-gray-900 leading-relaxed whitespace-pre-wrap">
                        {translationResult.translatedText}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <img
                src={document.url}
                alt={document.name}
                className="max-w-full max-h-full object-contain mx-auto"
              />
            )}
          </div>
        </div>
      </div>
    );
  }

  // Default viewer for other file types
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-11/12 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold text-gray-800">
            {document.name}
          </h2>
          <div className="flex items-center space-x-2">
            {/* Options Menu */}
            {renderOptionsMenu()}

            <a
              href={document.url}
              download={document.name}
              className="text-blue-600 hover:text-blue-800 transition-colors"
              title={translate('viewer.download')}
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </a>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 transition-colors"
              title={translate('viewer.close')}
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
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

        {/* Content */}
        <div className="p-6 text-center">
          {showMetadataView ? (
            renderMetadataView()
          ) : (
            <>
              <div className="text-gray-500 mb-4">
                <svg
                  className="w-16 h-16 mx-auto mb-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <p className="text-lg font-medium">
                  {translate('viewer.unsupported')}
                </p>
                <p className="text-sm text-gray-400 mt-1">
                  {translate('viewer.downloadToView')}
                </p>
              </div>

              <a
                href={document.url}
                download={document.name}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                {translate('viewer.download')}
              </a>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default DocumentViewer;
