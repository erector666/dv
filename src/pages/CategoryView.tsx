import React from 'react';
import { useParams } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';

const CategoryView: React.FC = () => {
  const { categoryId } = useParams<{ categoryId: string }>();
  const { translate } = useLanguage();
  
  // Map category ID to translation key
  const categoryKey = categoryId || 'other';
  
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">{translate(categoryKey)}</h1>
      
      {/* Document Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {/* Empty state */}
        <div className="col-span-full flex flex-col items-center justify-center py-12">
          <div className="w-24 h-24 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-4">
            <span className="text-4xl">📄</span>
          </div>
          <h2 className="text-xl font-medium mb-2">No documents yet</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-4 text-center max-w-md">
            Upload your first document to this category to get started
          </p>
          <button className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-md transition-colors">
            Upload Document
          </button>
        </div>
      </div>
    </div>
  );
};

export default CategoryView;
