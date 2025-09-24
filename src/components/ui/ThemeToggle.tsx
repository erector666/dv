import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

interface ThemeToggleProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  className = '',
  size = 'md',
}) => {
  const { theme, toggleTheme } = useTheme();

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  return (
    <button
      onClick={toggleTheme}
      className={`
        ${sizeClasses[size]}
        relative inline-flex items-center justify-center
        rounded-xl border border-light-border bg-light-bg
        text-light-text shadow-soft transition-all duration-300
        hover:shadow-medium hover:scale-105
        focus:outline-none focus:ring-2 focus:ring-spotify-green focus:ring-offset-2
        dark:border-dark-border dark:bg-dark-surface dark:text-dark-text
        dark:hover:bg-dark-bg dark:focus:ring-offset-dark-bg
        ${className}
      `}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      <div className="relative flex items-center justify-center">
        {/* Sun Icon */}
        <Sun
          className={`
            ${iconSizes[size]}
            transition-all duration-300 ease-in-out
            ${
              theme === 'light'
                ? 'rotate-0 scale-100 opacity-100'
                : 'rotate-90 scale-0 opacity-0'
            }
            absolute
          `}
        />

        {/* Moon Icon */}
        <Moon
          className={`
            ${iconSizes[size]}
            transition-all duration-300 ease-in-out
            ${
              theme === 'dark'
                ? 'rotate-0 scale-100 opacity-100'
                : '-rotate-90 scale-0 opacity-0'
            }
            absolute
          `}
        />
      </div>
    </button>
  );
};

export default ThemeToggle;
