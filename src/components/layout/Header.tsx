import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage, LanguageType } from '../../context/LanguageContext';
import { useUploadModal } from '../../context/UploadModalContext';
import { useAuth } from '../../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';

interface HeaderProps {
  onMenuClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const { theme, toggleTheme } = useTheme();
  const { language, setLanguage, translate } = useLanguage();
  const { openModal } = useUploadModal();
  const { logOut, currentUser } = useAuth();
  const navigate = useNavigate();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);

  const toggleProfileMenu = () => {
    setIsProfileMenuOpen(!isProfileMenuOpen);
    if (isLanguageMenuOpen) setIsLanguageMenuOpen(false);
  };

  const toggleLanguageMenu = () => {
    setIsLanguageMenuOpen(!isLanguageMenuOpen);
    if (isProfileMenuOpen) setIsProfileMenuOpen(false);
  };

  const handleLanguageChange = (lang: LanguageType) => {
    setLanguage(lang);
    setIsLanguageMenuOpen(false);
  };

  const getInitials = (name: string | null | undefined): string => {
    if (!name) return 'U';
    const names = name.split(' ');
    if (names.length > 1) {
      return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <header className="bg-white dark:bg-gray-800 shadow-md py-2 px-4">
      <div className="flex items-center justify-between">
        {/* Mobile menu button */}
        <button 
          onClick={onMenuClick}
          className="md:hidden p-2 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Search bar */}
        <div className="hidden md:flex flex-1 max-w-xl mx-4">
          <div className="relative w-full">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
              </svg>
            </div>
            <input 
              type="search" 
              className="block w-full p-2 pl-10 text-sm border border-gray-300 rounded-lg bg-gray-50 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white" 
              placeholder={`${translate('search')}...`} 
            />
          </div>
        </div>

        {/* Right side actions */}
        <div className="flex items-center space-x-4">
          {/* Upload Button */}
          <button 
            onClick={openModal}
            className="bg-primary-600 hover:bg-primary-700 text-white font-bold py-2 px-4 rounded-md flex items-center transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            {translate('upload')}
          </button>
          {/* Theme toggle */}
          <button 
            onClick={toggleTheme}
            className="p-2 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>

          {/* Language selector */}
          <div className="relative">
            <button 
              onClick={toggleLanguageMenu}
              className="p-2 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
              aria-label="Change language"
            >
              <span className="text-sm font-medium mr-1">{language.toUpperCase()}</span>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Language dropdown */}
            {isLanguageMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-10 border border-gray-200 dark:border-gray-700">
                <button 
                  onClick={() => handleLanguageChange('en')}
                  className={`block px-4 py-2 text-sm w-full text-left ${
                    language === 'en' 
                      ? 'bg-primary-50 dark:bg-primary-900 text-primary-600 dark:text-primary-300' 
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  English
                </button>
                <button 
                  onClick={() => handleLanguageChange('mk')}
                  className={`block px-4 py-2 text-sm w-full text-left ${
                    language === 'mk' 
                      ? 'bg-primary-50 dark:bg-primary-900 text-primary-600 dark:text-primary-300' 
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  Македонски
                </button>
                <button 
                  onClick={() => handleLanguageChange('fr')}
                  className={`block px-4 py-2 text-sm w-full text-left ${
                    language === 'fr' 
                      ? 'bg-primary-50 dark:bg-primary-900 text-primary-600 dark:text-primary-300' 
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  Français
                </button>
              </div>
            )}
          </div>

          {/* Profile */}
          <div className="relative">
            <button 
              onClick={toggleProfileMenu}
              className="flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              aria-label="User menu"
            >
              <div className="h-8 w-8 rounded-full bg-primary-200 dark:bg-primary-700 flex items-center justify-center text-primary-700 dark:text-primary-200 overflow-hidden">
                {currentUser?.photoURL ? (
                  <img src={currentUser.photoURL} alt="Profile" className="h-full w-full object-cover" />
                ) : (
                  <span>{getInitials(currentUser?.displayName)}</span>
                )}
              </div>
            </button>

            {/* Profile dropdown */}
            {isProfileMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-10 border border-gray-200 dark:border-gray-700">
                <Link 
                  to="/profile"
                  onClick={() => setIsProfileMenuOpen(false)}
                  className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  Your Profile
                </Link>
                <Link 
                  to="/settings"
                  onClick={() => setIsProfileMenuOpen(false)}
                  className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  Settings
                </Link>
                <button 
                  onClick={async () => {
                    try {
                      await logOut();
                      setIsProfileMenuOpen(false);
                      navigate('/');
                    } catch (error) {
                      console.error('Failed to sign out:', error);
                    }
                  }}
                  className="block w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  {translate('auth.signOut') || 'Sign out'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
