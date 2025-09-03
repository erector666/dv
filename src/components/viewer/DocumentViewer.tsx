import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { doc, getDoc } from 'firebase/firestore';
import { getDownloadURL, ref } from 'firebase/storage';
import { db, storage } from '../../services/firebase';

interface DocumentViewerProps {
  documentId: string;
  onClose?: () => void;
}

interface DocumentData {
  name: string;
  type: string;
  url: string;
  size: number;
  uploadedAt: any; // Firestore timestamp
}

const DocumentViewer: React.FC<DocumentViewerProps> = ({
  documentId,
  onClose,
}) => {
  const { translate } = useLanguage();
  const [document, setDocument] = useState<DocumentData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [viewerType, setViewerType] = useState<
    'pdf' | 'image' | 'text' | 'other'
  >('other');

  useEffect(() => {
    const fetchDocument = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get document metadata from Firestore
        const docRef = doc(db, `documents/${documentId}`);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
          setError(translate('viewer.error.notFound'));
          setLoading(false);
          return;
        }

        const documentData = docSnap.data() as DocumentData;

        // Determine viewer type based on file type
        if (documentData.type === 'application/pdf') {
          setViewerType('pdf');
        } else if (documentData.type.startsWith('image/')) {
          setViewerType('image');
        } else if (
          documentData.type === 'text/plain' ||
          documentData.type === 'text/html' ||
          documentData.type === 'application/json'
        ) {
          setViewerType('text');
        } else {
          setViewerType('other');
        }

        setDocument(documentData);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching document:', err);
        setError(translate('viewer.error.fetchFailed'));
        setLoading(false);
      }
    };

    if (documentId) {
      fetchDocument();
    }
  }, [documentId, translate]);

  const renderViewer = () => {
    if (!document) return null;

    switch (viewerType) {
      case 'pdf':
        return (
          <iframe
            src={`${document.url}#toolbar=0`}
            className="w-full h-full border-0"
            title={document.name}
          />
        );
      case 'image':
        return (
          <div className="flex items-center justify-center h-full">
            <img
              src={document.url}
              alt={document.name}
              className="max-w-full max-h-full object-contain"
            />
          </div>
        );
      case 'text':
        return (
          <div className="bg-white dark:bg-gray-800 p-4 rounded-md h-full overflow-auto">
            <iframe
              src={document.url}
              className="w-full h-full border-0"
              title={document.name}
            />
          </div>
        );
      default:
        return (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-16 w-16 text-gray-400 mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3 className="text-lg font-medium mb-2">
              {translate('viewer.unsupportedFormat')}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              {translate('viewer.downloadInstead')}
            </p>
            <a
              href={document.url}
              download={document.name}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              {translate('viewer.download')}
            </a>
          </div>
        );
    }
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl overflow-hidden flex flex-col w-full h-full">
      {/* Header */}
      <div className="bg-gray-100 dark:bg-gray-800 px-4 py-3 flex items-center justify-between border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center">
          <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 truncate">
            {document?.name || translate('viewer.loading')}
          </h2>
        </div>
        <div className="flex items-center space-x-2">
          {document && (
            <a
              href={document.url}
              download={document.name}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              title={translate('viewer.download')}
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
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
            </a>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              title={translate('viewer.close')}
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
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto relative">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : error ? (
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 p-4 rounded-md max-w-md text-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-10 w-10 mx-auto mb-3 text-red-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <h3 className="text-lg font-medium mb-2">
                {translate('viewer.error.title')}
              </h3>
              <p>{error}</p>
            </div>
          </div>
        ) : (
          renderViewer()
        )}
      </div>

      {/* Footer with metadata */}
      {document && (
        <div className="bg-gray-50 dark:bg-gray-800 px-4 py-3 border-t border-gray-200 dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400">
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <div>
              {translate('viewer.type')}: {document.type}
            </div>
            <div>
              {translate('viewer.size')}:{' '}
              {(document.size / 1024 / 1024).toFixed(2)} MB
            </div>
            {document.uploadedAt && (
              <div>
                {translate('viewer.uploaded')}:{' '}
                {document.uploadedAt.toDate
                  ? document.uploadedAt.toDate().toLocaleDateString()
                  : new Date(document.uploadedAt).toLocaleDateString()}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentViewer;
