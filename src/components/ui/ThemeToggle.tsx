import React from 'react';
import { SunIcon, MoonIcon } from '@heroicons/react/24/outline';
import { useTheme } from '../../context/ThemeContext';

interface ThemeToggleProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ 
  className = '', 
  size = 'md' 
}) => {
  const { theme, toggleTheme } = useTheme();

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12'
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  return (
    <button
      onClick={toggleTheme}
      className={`
        ${sizeClasses[size]}
        relative inline-flex items-center justify-center
        rounded-xl border border-gray-200 bg-white
        text-gray-700 shadow-soft transition-all duration-300
        hover:shadow-medium hover:scale-105
        focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
        dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200
        dark:hover:bg-gray-700 dark:focus:ring-offset-gray-900
        ${className}
      `}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      <div className="relative">
        {/* Sun Icon */}
        <SunIcon
          className={`
            ${iconSizes[size]}
            transition-all duration-300 ease-in-out
            ${theme === 'light' 
              ? 'rotate-0 scale-100 opacity-100' 
              : 'rotate-90 scale-0 opacity-0'
            }
            absolute inset-0
          `}
        />
        
        {/* Moon Icon */}
        <MoonIcon
          className={`
            ${iconSizes[size]}
            transition-all duration-300 ease-in-out
            ${theme === 'dark' 
              ? 'rotate-0 scale-100 opacity-100' 
              : '-rotate-90 scale-0 opacity-0'
            }
            absolute inset-0
          `}
        />
      </div>
    </button>
  );
};

export default ThemeToggle;
