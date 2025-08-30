import React from 'react';
import { useLanguage, LanguageType } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

const Settings: React.FC = () => {
  const { language, setLanguage, translate } = useLanguage();
  const { theme, toggleTheme } = useTheme();

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setLanguage(e.target.value as LanguageType);
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">{translate('settings')}</h1>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 max-w-2xl">
        {/* Theme Settings */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Theme</h2>
          <div className="flex items-center">
            <span className="mr-4">{theme === 'light' ? translate('lightMode') : translate('darkMode')}</span>
            <button 
              onClick={toggleTheme}
              className="relative inline-flex items-center h-6 rounded-full w-12 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              style={{ backgroundColor: theme === 'dark' ? '#3b82f6' : '#e5e7eb' }}
            >
              <span 
                className={`inline-block w-4 h-4 transform transition-transform bg-white rounded-full ${
                  theme === 'dark' ? 'translate-x-7' : 'translate-x-1'
                }`} 
              />
            </button>
          </div>
        </div>
        
        {/* Language Settings */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Language</h2>
          <select 
            value={language} 
            onChange={handleLanguageChange}
            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
          >
            <option value="en">English</option>
            <option value="mk">Македонски</option>
            <option value="fr">Français</option>
          </select>
        </div>
      </div>
    </div>
  );
};

export default Settings;
