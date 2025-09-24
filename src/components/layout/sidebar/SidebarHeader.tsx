import React from 'react';
import { Link } from 'react-router-dom';

interface SidebarHeaderProps {
  isMobile?: boolean;
  onClose?: () => void;
}

const SidebarHeader: React.FC<SidebarHeaderProps> = ({ isMobile, onClose }) => {
  return (
    <div className="flex items-center justify-between p-4 border-b border-gray-200/60 dark:border-gray-700/60 bg-gradient-to-r from-gray-50 to-white dark:from-gray-850 dark:to-gray-800">
      <Link 
        to="/dashboard" 
        onClick={onClose}
        className="flex items-center hover:opacity-80 transition-opacity"
        aria-label="DocVault Dashboard"
      >
        <img
          src="/logo2.png"
          alt="DocVault Logo"
          className="h-8 w-8 rounded-full"
        />
        <span className="ml-2 text-xl font-semibold">DocVault</span>
      </Link>
      
      {isMobile && (
        <button
          onClick={onClose}
          className="p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700 transition-colors"
          aria-label="Close sidebar"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
};

export default SidebarHeader;