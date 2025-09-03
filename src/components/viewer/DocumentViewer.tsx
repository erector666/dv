import React from 'react';
import { useLanguage } from '../../context/LanguageContext';

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

const DocumentViewer: React.FC<DocumentViewerProps> = ({ document, onClose }) => {
  const { translate } = useLanguage();

  const isPDF = document.type === 'application/pdf';
  const isImage = document.type.startsWith('image/');

  if (isPDF) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl w-11/12 h-5/6 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-xl font-semibold text-gray-800">
              {document.name}
            </h2>
            <div className="flex items-center space-x-2">
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700 transition-colors"
                title={translate('viewer.close')}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* PDF Viewer */}
          <div className="flex-1 p-4">
            <iframe
              src={document.url}
              className="w-full h-full border-0 rounded"
              title={document.name}
            />
          </div>
        </div>
      </div>
    );
  }

  if (isImage) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-4xl max-h-5/6 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-xl font-semibold text-gray-800">
              {document.name}
            </h2>
            <div className="flex items-center space-x-2">
              <button
                onClick={onClose}
                className="text-gray-500 hover:text-gray-700 transition-colors"
                title={translate('viewer.close')}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Image Viewer */}
          <div className="p-4">
            <img
              src={document.url}
              alt={document.name}
              className="max-w-full max-h-full object-contain mx-auto"
            />
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
            <a
              href={document.url}
              download={document.name}
              className="text-blue-600 hover:text-blue-800 transition-colors"
              title={translate('viewer.download')}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </a>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 transition-colors"
              title={translate('viewer.close')}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 text-center">
          <div className="text-gray-500 mb-4">
            <svg className="w-16 h-16 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-lg font-medium">{translate('viewer.unsupported')}</p>
            <p className="text-sm text-gray-400 mt-1">
                              {translate('viewer.downloadToView')}
            </p>
          </div>
          
          <a
            href={document.url}
            download={document.name}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
                          {translate('viewer.download')}
          </a>
        </div>
      </div>
    </div>
  );
};

export default DocumentViewer;
