import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { Document } from '../../services/documentService';
import {
  getSupportedLanguages,
  translateDocument,
  SupportedLanguage,
  TranslationResult,
} from '../../services/translationService';
import { useLanguage } from '../../context/LanguageContext';

interface DocumentTranslationProps {
  document: Document;
  onTranslationComplete?: (translatedDocument: Document) => void;
  onCancel?: () => void;
}

const DocumentTranslation: React.FC<DocumentTranslationProps> = ({
  document,
  onTranslationComplete,
  onCancel,
}) => {
  const { translate } = useLanguage();
  const [targetLanguage, setTargetLanguage] = useState<string>('');
  const [translationInProgress, setTranslationInProgress] =
    useState<boolean>(false);
  const queryClient = useQueryClient();

  // Get supported languages
  const {
    data: languages,
    isLoading: isLoadingLanguages,
    isError: isLanguagesError,
  } = useQuery('supportedLanguages', getSupportedLanguages);

  // Filter out the current document language from the options
  const availableLanguages = languages?.filter(
    (lang: SupportedLanguage) => lang.code !== document.metadata?.language
  );

  // Translation mutation
  const translateMutation = useMutation(
    async () => {
      setTranslationInProgress(true);
      const translationResult = await translateDocument(
        document.url,
        targetLanguage,
        document.metadata?.language
      );
      
      // Create a new document object with translated content
      const translatedDocument: Document = {
        ...document,
        id: `${document.id}_translated_${targetLanguage}`,
        name: `${document.name} (${targetLanguage})`,
        metadata: {
          ...document.metadata,
          language: targetLanguage,
          translation: {
            sourceLanguage: document.metadata?.language || 'unknown',
            targetLanguage: targetLanguage,
            confidence: translationResult.confidence,
            quality: translationResult.quality.assessment,
            translatedAt: new Date().toISOString(),
          },
        },
        // Note: In a real implementation, you might want to save this to Firestore
        // For now, we'll just return the translated document object
      };
      
      return translatedDocument;
    },
    {
      onSuccess: (translatedDocument: Document) => {
        // Invalidate and refetch documents query to update the list
        queryClient.invalidateQueries(['documents']);

        if (onTranslationComplete) {
          onTranslationComplete(translatedDocument);
        }

        setTranslationInProgress(false);
      },
      onError: (error: Error) => {
        console.error('Translation error:', error);
        setTranslationInProgress(false);
      },
    }
  );

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (targetLanguage) {
      translateMutation.mutate();
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
        {translate('translation.title')}
      </h2>

      <div className="mb-4">
        <p className="text-gray-600 dark:text-gray-300 mb-2">
          {translate('translation.documentName')}:{' '}
          <span className="font-medium">{document.name}</span>
        </p>
        <p className="text-gray-600 dark:text-gray-300">
          {translate('translation.sourceLanguage')}:{' '}
          <span className="font-medium">
            {document.metadata?.language
              ? languages?.find(
                  (l: SupportedLanguage) =>
                    l.code === document.metadata?.language
                )?.name || document.metadata.language
              : translate('translation.unknown')}
          </span>
        </p>
      </div>

      {isLoadingLanguages ? (
        <div className="flex justify-center my-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : isLanguagesError ? (
        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-md my-4">
          <p className="text-red-600 dark:text-red-400">
            {translate('translation.error.languages')}
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label
              htmlFor="targetLanguage"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
            >
              {translate('translation.selectTargetLanguage')}
            </label>
            <select
              id="targetLanguage"
              value={targetLanguage}
              onChange={e => setTargetLanguage(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              required
              disabled={translationInProgress}
            >
              <option value="">
                {translate('translation.selectLanguage')}
              </option>
              {availableLanguages?.map((language: SupportedLanguage) => (
                <option key={language.code} value={language.code}>
                  {language.name}
                </option>
              ))}
            </select>
          </div>

          {translateMutation.isError && (
            <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-md mb-4">
              <p className="text-red-600 dark:text-red-400">
                {translate('translation.error.translating')}
              </p>
            </div>
          )}

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-400"
              disabled={translationInProgress}
            >
              {translate('common.cancel')}
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!targetLanguage || translationInProgress}
            >
              {translationInProgress ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {translate('translation.translating')}
                </div>
              ) : (
                translate('translation.translate')
              )}
            </button>
          </div>
        </form>
      )}

      {/* Translation Progress */}
      {translationInProgress && (
        <div className="mt-6">
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
            <div className="bg-blue-600 h-2.5 rounded-full animate-pulse w-full"></div>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            {translate('translation.processingDocument')}
          </p>
        </div>
      )}
    </div>
  );
};

export default DocumentTranslation;
