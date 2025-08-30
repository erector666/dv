import React from 'react';
import { NavLink } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  isMobile?: boolean;
  onClose?: () => void;
}

const formatBytes = (bytes: number, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const Sidebar: React.FC<SidebarProps> = ({ isMobile = false, onClose }) => {
  const { translate } = useLanguage();
  const { currentUser } = useAuth();

  // Temporarily disable storage usage until Firebase function is properly deployed
  const storageData = { totalSize: 0 };
  const isLoading = false;
  const error = null;

  const totalStorage = 10 * 1024 * 1024 * 1024; // 10 GB in bytes
  const usedStorage = storageData?.totalSize ?? 0;
  const usagePercentage = totalStorage > 0 ? (usedStorage / totalStorage) * 100 : 0;

  const handleLinkClick = () => {
    if (isMobile && onClose) {
      onClose();
    }
  };

  return (
    <div
      className={`h-full bg-white dark:bg-gray-800 shadow-md flex flex-col w-60 ${
        isMobile ? 'fixed inset-y-0 left-0 z-50' : 'sticky top-0'
      }`}
    >
      {/* Logo */}
      <div className="flex items-center p-4 border-b border-gray-200 dark:border-gray-700">
        <img src="/logo2.png" alt="DocVault Logo" className="h-8 w-8 rounded-full" />
        <span className="ml-2 text-xl font-semibold">
          DocVault
        </span>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-2 px-2">
          {/* Dashboard */}
          <li>
            <NavLink 
              to="/dashboard" 
              onClick={handleLinkClick}
              className={({ isActive }) => 
                `flex items-center p-2 rounded-lg transition-colors ${
                  isActive 
                    ? 'bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-300' 
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                }`
              }
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span className="ml-3">
                {translate('dashboard')}
              </span>
            </NavLink>
          </li>

          {/* Categories */}
          <li className="pt-4">
            <div className="flex items-center px-2 mb-2">
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {translate('categories')}
              </span>
            </div>

            {/* Personal */}
            <NavLink 
              to="/category/personal" 
              onClick={handleLinkClick}
              className={({ isActive }) => 
                `flex items-center p-2 rounded-lg transition-colors ${
                  isActive 
                    ? 'bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-300' 
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                }`
              }
            >
              <span className="text-3xl">📄</span>
              <span className="ml-3">
                {translate('personal')}
              </span>
            </NavLink>

            {/* Bills */}
            <NavLink 
              to="/category/bills" 
              onClick={handleLinkClick}
              className={({ isActive }) => 
                `flex items-center p-2 rounded-lg transition-colors ${
                  isActive 
                    ? 'bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-300' 
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                }`
              }
            >
              <span className="text-3xl">💰</span>
              <span className="ml-3">
                {translate('bills')}
              </span>
            </NavLink>

            {/* Medical */}
            <NavLink 
              to="/category/medical" 
              onClick={handleLinkClick}
              className={({ isActive }) => 
                `flex items-center p-2 rounded-lg transition-colors ${
                  isActive 
                    ? 'bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-300' 
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                }`
              }
            >
              <span className="text-3xl">🏥</span>
              <span className="ml-3">
                {translate('medical')}
              </span>
            </NavLink>

            {/* Insurance */}
            <NavLink 
              to="/category/insurance" 
              onClick={handleLinkClick}
              className={({ isActive }) => 
                `flex items-center p-2 rounded-lg transition-colors ${
                  isActive 
                    ? 'bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-300' 
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                }`
              }
            >
              <span className="text-3xl">🔒</span>
              <span className="ml-3">
                {translate('insurance')}
              </span>
            </NavLink>

            {/* Other */}
            <NavLink 
              to="/category/other" 
              onClick={handleLinkClick}
              className={({ isActive }) => 
                `flex items-center p-2 rounded-lg transition-colors ${
                  isActive 
                    ? 'bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-300' 
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                }`
              }
            >
              <span className="text-3xl">📁</span>
              <span className="ml-3">
                {translate('other')}
              </span>
            </NavLink>
          </li>
        </ul>
      </nav>

      {/* Bottom Section */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700 mt-auto">
        {/* Storage Indicator */}
        <div className="mb-4">
          <div className="flex items-center mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-gray-500 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
            </svg>
            <span className="text-sm font-medium">
              Storage
            </span>
          </div>
          <div>
            {storageData && (
              <>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-1">
                  <div className="bg-primary-600 h-2 rounded-full" style={{ width: `${usagePercentage}%` }}></div>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {formatBytes(usedStorage)} / {formatBytes(totalStorage)} used
                </p>
              </>
            )}
          </div>
        </div>

        {/* Settings Link */}
        <NavLink 
          to="/settings" 
          onClick={handleLinkClick}
          className={({ isActive }) => 
            `flex items-center p-2 rounded-lg transition-colors ${
              isActive 
                ? 'bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-300' 
                : 'hover:bg-gray-100 dark:hover:bg-gray-700'
            }`
          }
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="ml-3">
            {translate('settings')}
          </span>
        </NavLink>
      </div>
    </div>
  );
};

export default Sidebar;
