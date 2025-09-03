import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';

const NotFound: React.FC = () => {
  const { translate } = useLanguage();

  return (
    <div className="flex flex-col items-center justify-center h-screen p-6 text-center">
      <h1 className="text-6xl font-bold text-primary-600 mb-4">404</h1>
      <h2 className="text-2xl font-semibold mb-6">Page Not Found</h2>
      <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md">
        The page you are looking for doesn't exist or has been moved.
      </p>
      <Link
        to="/dashboard"
        className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2 rounded-md transition-colors"
      >
        {translate('dashboard')}
      </Link>
    </div>
  );
};

export default NotFound;
