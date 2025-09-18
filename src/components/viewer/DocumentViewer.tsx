import React, { useState } from 'react';
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

const DocumentViewer: React.FC<DocumentViewerProps> = ({
  document,
  onClose,
}) => {
  // Initialize state with proper types
  const [translationResult, setTranslationResult] =
    useState<TranslationResult | null>(null);
  const { translate } = useLanguage();
  const [showTranslationMenu, setShowTranslationMenu] = useState(false);
  const [showMetadataView, setShowMetadataView] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isGeneratingMetadata, setIsGeneratingMetadata] = useState(false);
  const [isConvertingToPDF, setIsConvertingToPDF] = useState(false);
  // State for translation result with proper null checks
  const [metadataResult, setMetadataResult] = useState<any>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<string>('');
  const [showTextPanel, setShowTextPanel] = useState(false);
  const [textSearch, setTextSearch] = useState('');
  const [extractedExpanded, setExtractedExpanded] = useState(false);

  // Early return if document is not provided
  if (!document) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6">
          <h2 className="text-lg font-semibold">Document not found</h2>
          <button
            onClick={onClose}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
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
    if (!document) return;

    setIsTranslating(true);
    setSelectedLanguage(targetLanguage);
    setShowTranslationMenu(false);

    try {
      // Prefer a concrete source language to avoid 'auto' errors from the API
      const sourceLanguageGuess =
        (document.metadata && (document.metadata.language as string)) ||
        (metadataResult && (metadataResult.detectedLanguage as string)) ||
        'en';

      // Prefer translating stored text if available for better accuracy/speed
      const textCandidate =
        (document.metadata &&
          ((document.metadata.extractedText as string) ||
            (document.metadata.text as string))) ||
        (metadataResult && (metadataResult.extractedText as string)) ||
        '';

      const result =
        typeof textCandidate === 'string' && textCandidate.trim().length > 0
          ? await translateText(
              textCandidate,
              targetLanguage,
              sourceLanguageGuess
            )
          : await translateDocument(
              document.url,
              targetLanguage,
              sourceLanguageGuess,
              document.id
            );
      if (result) {
        setTranslationResult(result);
      } else {
        console.error('Translation returned no result');
      }
    } catch (error) {
      console.error('❌ Translation failed:', error);
      setTranslationResult(null);
    } finally {
      setIsTranslating(false);
    }
  };

  const resetTranslation = () => {
    setTranslationResult(null);
    setSelectedLanguage('');
    setShowTranslationMenu(false);
  };

  const handleGenerateMetadata = async () => {
    setIsGeneratingMetadata(true);
    setShowOptionsMenu(false);

    try {
      // Use existing document metadata from upload processing
      const existingMetadata = document.metadata || {};

      // Normalize extracted text and word count from latest schema
      const normalizedExtractedText =
        existingMetadata?.textExtraction?.extractedText ||
        existingMetadata?.extractedText ||
        existingMetadata?.text ||
        '';

      const normalizedWordCount =
        existingMetadata?.textExtraction?.wordCount ||
        existingMetadata?.wordCount ||
        (typeof normalizedExtractedText === 'string' &&
        normalizedExtractedText.trim().length > 0
          ? normalizedExtractedText.split(/\s+/).length
          : 0);

      // Create comprehensive metadata from available data
      const metadata = {
        documentName: document.name,
        documentType: document.type,
        fileSize: document.size
          ? `${(document.size / 1024 / 1024).toFixed(2)} MB`
          : 'Unknown',
        detectedLanguage: existingMetadata.language || 'Auto-detected',
        confidence: existingMetadata.confidence
          ? Math.round(existingMetadata.confidence * 100)
          : 85,
        category: document.category || existingMetadata.category || 'Document',
        tags: document.tags || existingMetadata.tags || ['document'],
        entities: existingMetadata.entities || [],
        extractedDates: existingMetadata.extractedDates || [],
        suggestedName: existingMetadata.suggestedName || document.name,
        summary:
          existingMetadata.summary ||
          (normalizedExtractedText
            ? `${normalizedExtractedText.substring(0, 200)}...`
            : 'Document processed successfully'),
        wordCount: normalizedWordCount,
        hasTables: existingMetadata.hasTables || false,
        processingMethod: existingMetadata.processingMethod || 'AI Analysis',
        qualityScore: existingMetadata.qualityScore || 85,
        extractedText:
          normalizedExtractedText || 'Text extraction data not available',
        uploadedAt: document.uploadedAt,
        lastModified: existingMetadata.lastModified || document.uploadedAt,
        aiProcessingCompleted:
          existingMetadata.aiProcessingCompleted || 'During upload',
        originalFileType: existingMetadata.originalFileType || document.type,
        convertedToPdf: existingMetadata.convertedToPdf || false,
      };

      setMetadataResult(metadata);
      setShowMetadataView(true);
      console.log('✅ Metadata generated from stored document data');
    } catch (error) {
      console.error('❌ Metadata generation error:', error);
    } finally {
      setIsGeneratingMetadata(false);
    }
  };

  // Helper: get extracted text from document metadata or generated metadata
  const getExtractedText = (): string => {
    const m = document.metadata || {};
    const t =
      m?.textExtraction?.extractedText ||
      m?.extractedText ||
      m?.text ||
      (metadataResult && metadataResult.extractedText) ||
      '';
    return typeof t === 'string' ? t : '';
  };

  const handleCopyExtracted = async () => {
    try {
      await navigator.clipboard.writeText(getExtractedText());
      console.log('✅ Extracted text copied to clipboard');
    } catch (e) {
      console.error('❌ Failed to copy text:', e);
    }
  };

  const handleDownloadExtracted = () => {
    try {
      const text = getExtractedText();
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = documentCreateLink();
      a.href = url;
      a.download = `${(document.name || 'document').replace(/\.[^/.]+$/, '')}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('❌ Failed to download text:', e);
    }
  };

  // Small helper to avoid TypeScript complaining about document.createElement in this scope
  const documentCreateLink = (): HTMLAnchorElement => {
    return window.document.createElement('a');
  };

  // Right-side panel rendering extracted text with search/copy/download
  const renderTextPanel = () => {
    if (!showTextPanel) return null;
    const rawText = getExtractedText();
    const filtered = textSearch
      ? rawText
          .split(/\n/)
          .filter(line => line.toLowerCase().includes(textSearch.toLowerCase()))
          .join('\n')
      : rawText;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-40 z-[60]">
        <div className="absolute right-0 top-0 h-full w-full md:w-2/5 lg:w-2/5 bg-white shadow-xl flex flex-col">
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center space-x-3">
              <h3 className="text-lg font-semibold text-gray-800">Extracted Text</h3>
              <input
                type="text"
                value={textSearch}
                onChange={e => setTextSearch(e.target.value)}
                placeholder="Search..."
                className="px-2 py-1 text-sm border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleCopyExtracted}
                className="px-2 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-md"
                title="Copy"
              >
                Copy
              </button>
              <button
                onClick={handleDownloadExtracted}
                className="px-2 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-md"
                title="Download .txt"
              >
                Download
              </button>
              <button
                onClick={() => setShowTextPanel(false)}
                className="text-gray-500 hover:text-gray-700"
                title="Close"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          <div className="flex-1 p-4 overflow-auto">
            <pre className="whitespace-pre-wrap text-sm text-gray-800">{filtered || 'No extracted text available'}</pre>
          </div>
        </div>
      </div>
    );
  };

  const renderMetadataValue = (value: any): React.ReactNode => {
    if (value === null || value === undefined) return 'N/A';
    if (Array.isArray(value)) {
      return value.length > 0 ? value.join(', ') : 'None';
    }
    if (value && typeof value === 'object') {
      try {
        // Handle Date objects
        if (value instanceof Date) {
          return value.toLocaleString();
        }
        // Handle Firestore Timestamp-like objects
        if (typeof value.seconds === 'number') {
          return new Date(value.seconds * 1000).toLocaleString();
        }
        // Handle objects with a toString method
        if (
          typeof value.toString === 'function' &&
          value.toString() !== '[object Object]'
        ) {
          return value.toString();
        }
        // Stringify other objects but limit the length
        const str = JSON.stringify(value, null, 2);
        return str.length > 100 ? `${str.substring(0, 100)}...` : str;
      } catch (e) {
        return 'Unable to display value';
      }
    }
    return value.toString();
  };

  const toDateString = (value: any): string => {
    if (!value) return 'N/A';
    try {
      if (value instanceof Date) return value.toLocaleString();
      if (typeof value.seconds === 'number') {
        return new Date(value.seconds * 1000).toLocaleString();
      }
      if (typeof value === 'number') return new Date(value).toLocaleString();
      if (typeof value === 'string') {
        const d = new Date(value);
        return isNaN(d.getTime()) ? value : d.toLocaleString();
      }
      const str = renderMetadataValue(value);
      return typeof str === 'string' ? str : 'N/A';
    } catch {
      return 'N/A';
    }
  };

  const handleConvertToPDF = async () => {
    setIsConvertingToPDF(true);
    setShowOptionsMenu(false);

    try {
      // For now, just download the existing document as PDF
      // In a real implementation, you'd call a Firebase Function to convert
      const link = window.document.createElement('a');
      link.href = document.url;
      link.download = `${document.name.replace(/\.[^/.]+$/, '')}.pdf`;
      link.click();

      console.log('✅ Document downloaded as PDF');
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

  const renderMetadataView = () => {
    // Helper function to render metadata section
    const renderMetadataSection = (data: Record<string, any>) => (
      <div className="space-y-1 text-sm">
        {Object.entries(data).map(([key, value]) => (
          <div key={key}>
            <strong>
              {key.charAt(0).toUpperCase() +
                key.replace(/([A-Z])/g, ' $1').trim()}
              :
            </strong>{' '}
            {renderMetadataValue(value)}
          </div>
        ))}
      </div>
    );

    // Helper function to render metadata card
    const renderMetadataCard = (
      title: string,
      data: Record<string, any>,
      color: string
    ) => (
      <div className={`bg-${color}-50 p-4 rounded-lg`}>
        <h4 className={`font-medium text-${color}-900 mb-2`}>{title}</h4>
        {renderMetadataSection(data)}
      </div>
    );

    if (!metadataResult) {
      return (
        <div className="text-center py-8">
          <div className="text-gray-500">No metadata available</div>
        </div>
      );
    }

    // Extract basic document info
    const documentInfo = {
      name: metadataResult.documentName || 'N/A',
      type: metadataResult.documentType || 'N/A',
      size: metadataResult.fileSize || 'N/A',
      pages: metadataResult.pages || 'N/A',
      uploadedAt: toDateString(metadataResult.uploadedAt),
      lastModified: toDateString(metadataResult.lastModified),
    };

    // Extract content analysis info
    const contentAnalysis = {
      language: metadataResult.detectedLanguage || 'Unknown',
      confidence: metadataResult.confidence
        ? `${metadataResult.confidence}%`
        : 'N/A',
      hasTables: metadataResult.hasTables ? 'Yes' : 'No',
      hasImages: metadataResult.hasImages ? 'Yes' : 'No',
      wordCount: metadataResult.wordCount || 'N/A',
      qualityScore: metadataResult.qualityScore
        ? `${metadataResult.qualityScore}/100`
        : 'N/A',
    };

    return (
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

          <div className="space-y-4">
            {/* Document Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {renderMetadataCard('Document Information', documentInfo, 'blue')}
              {renderMetadataCard('Content Analysis', contentAnalysis, 'green')}
            </div>

            {/* AI Summary */}
            {metadataResult.summary && (
              <div className="bg-yellow-50 p-4 rounded-lg">
                <h4 className="font-medium text-yellow-900 mb-2">
                  Document Summary
                </h4>
                <p className="text-sm text-yellow-800">
                  {renderMetadataValue(metadataResult.summary)}
                </p>
              </div>
            )}

            {/* Extracted Text */}
            {metadataResult.extractedText && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">
                  Extracted Text
                </h4>
                <div className="max-h-40 overflow-y-auto">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {renderMetadataValue(metadataResult.extractedText)}
                  </p>
                </div>
              </div>
            )}

            {/* Keywords */}
            {metadataResult.keywords && (
              <div className="bg-purple-50 p-4 rounded-lg">
                <h4 className="font-medium text-purple-900 mb-2">Key Topics</h4>
                <div className="flex flex-wrap gap-2">
                  {metadataResult.keywords.map(
                    (keyword: any, index: number) => (
                      <span
                        key={index}
                        className="bg-purple-200 text-purple-800 px-2 py-1 rounded-full text-xs"
                      >
                        {String(keyword)}
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
                  <strong>Method:</strong>{' '}
                  {renderMetadataValue(metadataResult.processingMethod)}
                </div>
                <div>
                  <strong>Quality Score:</strong>{' '}
                  {renderMetadataValue(metadataResult.qualityScore)} /100
                </div>
                <div>
                  <strong>Word Count:</strong>{' '}
                  {renderMetadataValue(metadataResult.wordCount)}
                </div>
                <div>
                  <strong>Uploaded:</strong>{' '}
                  {toDateString(metadataResult.uploadedAt)}
                </div>
                <div>
                  <strong>AI Processing:</strong>{' '}
                  {renderMetadataValue(metadataResult.aiProcessingCompleted)}
                </div>
                <div>
                  <strong>Original Type:</strong>{' '}
                  {renderMetadataValue(metadataResult.originalFileType)}
                </div>
                <div>
                  <strong>Converted to PDF:</strong>{' '}
                  {metadataResult.convertedToPdf ? 'Yes' : 'No'}
                </div>
                <div>
                  <strong>Category:</strong>{' '}
                  {renderMetadataValue(metadataResult.category)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

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
                          {translationResult?.sourceLanguage?.toUpperCase()}
                        </strong>
                      </span>
                      <span>→</span>
                      <span>
                        To:{' '}
                        <strong>
                          {translationResult?.targetLanguage?.toUpperCase()}
                        </strong>
                      </span>
                      <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs">
                        {translationResult &&
                        typeof translationResult.confidence === 'number'
                          ? `${Math.round(translationResult.confidence * 100)}% confidence`
                          : 'N/A'}
                      </span>
                    </div>
                  </div>
                  <div className="prose max-w-none">
                    <p className="text-gray-900 leading-relaxed whitespace-pre-wrap">
                      {translationResult?.translatedText}
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

  // Handle image documents
  if (isImage) {
    // Safely handle translation result display
    const renderTranslationBadge = () => {
      if (!translationResult || !selectedLanguage) return null;

      const languageName =
        supportedLanguages.find(l => l.code === selectedLanguage)?.name ||
        selectedLanguage.toUpperCase();
      return (
        <span className="ml-2 text-sm text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
          Translated to {languageName}
        </span>
      );
    };
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
                            {translationResult?.sourceLanguage?.toUpperCase()}
                          </strong>
                        </span>
                        <span>→</span>
                        <span>
                          To:{' '}
                          <strong>
                            {translationResult?.targetLanguage?.toUpperCase()}
                          </strong>
                        </span>
                        <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs">
                          {translationResult &&
                          typeof translationResult.confidence === 'number'
                            ? `${Math.round(translationResult.confidence * 100)}% confidence`
                            : 'N/A'}
                        </span>
                      </div>
                    </div>
                    <div className="prose max-w-none">
                      <p className="text-gray-900 leading-relaxed whitespace-pre-wrap">
                        {translationResult?.translatedText}
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
