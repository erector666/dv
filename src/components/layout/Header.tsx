import React, { useState } from 'react';
import { useLanguage, LanguageType } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import ThemeToggle from '../ui/ThemeToggle';

interface HeaderProps {
  onMenuClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const { language, setLanguage, translate } = useLanguage();
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
    <header className="bg-light-bg dark:bg-dark-bg shadow-lg border-b border-light-border dark:border-dark-border backdrop-blur-sm py-3 px-4">
      <div className="flex items-center justify-between">
        {/* Mobile menu button */}
        <button
          onClick={onMenuClick}
          className="md:hidden p-2 rounded-md text-light-text-secondary dark:text-dark-text-secondary hover:bg-light-surface dark:hover:bg-dark-surface"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>

        {/* App Title/Logo */}
        <div className="flex-1 flex justify-center md:justify-start">
          <Link 
            to="/dashboard" 
            className="text-xl font-bold text-light-text dark:text-dark-text hover:text-spotify-green dark:hover:text-spotify-green transition-colors"
          >
            DocVault
          </Link>
        </div>

        {/* Right side actions */}
        <div className="flex items-center space-x-4">
          {/* Theme toggle */}
          <ThemeToggle size="md" />

          {/* Language selector */}
          <div className="relative">
            <button
              onClick={toggleLanguageMenu}
              className="p-2 rounded-full text-light-text-secondary dark:text-dark-text-secondary hover:bg-light-surface dark:hover:bg-dark-surface flex items-center"
              aria-label="Change language"
            >
              <span className="text-sm font-medium mr-1">
                {language.toUpperCase()}
              </span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            {/* Language dropdown */}
            {isLanguageMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-light-bg dark:bg-dark-surface rounded-md shadow-lg py-1 z-10 border border-light-border dark:border-dark-border">
                <button
                  onClick={() => handleLanguageChange('en')}
                  className={`block px-4 py-2 text-sm w-full text-left ${
                    language === 'en'
                      ? 'bg-spotify-green/20 text-spotify-green'
                      : 'hover:bg-light-surface dark:hover:bg-dark-surface text-light-text dark:text-dark-text'
                  }`}
                >
                  English
                </button>
                <button
                  onClick={() => handleLanguageChange('mk')}
                  className={`block px-4 py-2 text-sm w-full text-left ${
                    language === 'mk'
                      ? 'bg-spotify-green/20 text-spotify-green'
                      : 'hover:bg-light-surface dark:hover:bg-dark-surface text-light-text dark:text-dark-text'
                  }`}
                >
                  Македонски
                </button>
                <button
                  onClick={() => handleLanguageChange('fr')}
                  className={`block px-4 py-2 text-sm w-full text-left ${
                    language === 'fr'
                      ? 'bg-spotify-green/20 text-spotify-green'
                      : 'hover:bg-light-surface dark:hover:bg-dark-surface text-light-text dark:text-dark-text'
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
              className="flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-spotify-green"
              aria-label="User menu"
            >
              <div className="h-8 w-8 rounded-full bg-spotify-green/20 flex items-center justify-center text-spotify-green overflow-hidden">
                {currentUser?.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt="Profile"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span>{getInitials(currentUser?.displayName)}</span>
                )}
              </div>
            </button>

            {/* Profile dropdown */}
            {isProfileMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-light-bg dark:bg-dark-surface rounded-md shadow-lg py-1 z-10 border border-light-border dark:border-dark-border">
                <Link
                  to="/profile"
                  onClick={() => setIsProfileMenuOpen(false)}
                  className="block px-4 py-2 text-sm text-light-text dark:text-dark-text hover:bg-light-surface dark:hover:bg-dark-surface"
                >
                  Your Profile
                </Link>
                <Link
                  to="/settings"
                  onClick={() => setIsProfileMenuOpen(false)}
                  className="block px-4 py-2 text-sm text-light-text dark:text-dark-text hover:bg-light-surface dark:hover:bg-dark-surface"
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
