import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { motion } from 'framer-motion';

interface SidebarProps {
  isMobile?: boolean;
  onClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isMobile = false, onClose }) => {
  const { translate } = useLanguage();
  const [isExpanded, setIsExpanded] = useState(!isMobile);

  const handleToggle = () => {
    setIsExpanded(!isExpanded);
  };

  const handleLinkClick = () => {
    if (isMobile && onClose) {
      onClose();
    }
  };

  const sidebarVariants = {
    expanded: { width: '240px' },
    collapsed: { width: '64px' }
  };

  const textVariants = {
    expanded: { opacity: 1, display: 'block' },
    collapsed: { opacity: 0, display: 'none' }
  };

  return (
    <motion.div
      className={`h-full bg-white dark:bg-gray-800 shadow-md flex flex-col ${
        isMobile ? 'fixed inset-y-0 left-0 z-50' : 'sticky top-0'
      }`}
      initial={isMobile ? 'collapsed' : 'expanded'}
      animate={isExpanded ? 'expanded' : 'collapsed'}
      variants={sidebarVariants}
      transition={{ duration: 0.3 }}
    >
      {/* Logo */}
      <div className="flex items-center p-4 border-b border-gray-200 dark:border-gray-700">
        <span className="text-2xl font-bold text-primary-600">AV</span>
        <motion.span 
          className="ml-2 text-xl font-semibold"
          variants={textVariants}
        >
          AppVault
        </motion.span>
      </div>

      {/* Toggle button (only for desktop) */}
      {!isMobile && (
        <button 
          onClick={handleToggle}
          className="absolute -right-3 top-12 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full p-1 shadow-md"
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className={`h-4 w-4 text-gray-600 dark:text-gray-300 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}

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
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <motion.span className="ml-3" variants={textVariants}>
                {translate('dashboard')}
              </motion.span>
            </NavLink>
          </li>

          {/* Categories */}
          <li className="pt-4">
            <div className="flex items-center px-2 mb-2">
              <motion.span 
                className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                variants={textVariants}
              >
                {translate('categories')}
              </motion.span>
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
              <span className="text-xl">📄</span>
              <motion.span className="ml-3" variants={textVariants}>
                {translate('personal')}
              </motion.span>
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
              <span className="text-xl">💰</span>
              <motion.span className="ml-3" variants={textVariants}>
                {translate('bills')}
              </motion.span>
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
              <span className="text-xl">🏥</span>
              <motion.span className="ml-3" variants={textVariants}>
                {translate('medical')}
              </motion.span>
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
              <span className="text-xl">🔒</span>
              <motion.span className="ml-3" variants={textVariants}>
                {translate('insurance')}
              </motion.span>
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
              <span className="text-xl">📁</span>
              <motion.span className="ml-3" variants={textVariants}>
                {translate('other')}
              </motion.span>
            </NavLink>
          </li>
        </ul>
      </nav>

      {/* Bottom Section */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
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
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <motion.span className="ml-3" variants={textVariants}>
            {translate('settings')}
          </motion.span>
        </NavLink>
      </div>
    </motion.div>
  );
};

export default Sidebar;
