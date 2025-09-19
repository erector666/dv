import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface ContextMenuProps {
  isOpen: boolean;
  onClose: () => void;
  position: { x: number; y: number };
  children: React.ReactNode;
  className?: string;
}

interface ContextMenuItemProps {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'default' | 'danger' | 'primary';
  shortcut?: string;
}

interface ContextMenuSectionProps {
  items: ContextMenuItemProps[];
  separator?: boolean;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  isOpen,
  onClose,
  position,
  children,
  className = '',
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div
      ref={menuRef}
      className={`fixed z-50 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 py-2 min-w-[200px] backdrop-blur-sm ${className}`}
      style={{
        left: Math.min(position.x, window.innerWidth - 220),
        top: Math.min(position.y, window.innerHeight - 200),
      }}
    >
      {children}
    </div>,
    document.body
  );
};

export const ContextMenuItem: React.FC<ContextMenuItemProps> = ({
  label,
  icon,
  onClick,
  disabled = false,
  variant = 'default',
  shortcut,
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return 'text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20';
      case 'primary':
        return 'text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20';
      default:
        return 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700';
    }
  };

  return (
    <button
      onClick={() => {
        if (!disabled) {
          onClick();
        }
      }}
      disabled={disabled}
      className={`w-full flex items-center px-4 py-2.5 text-sm font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${getVariantStyles()}`}
    >
      <div className="flex items-center justify-center w-5 h-5 mr-3">
        {icon}
      </div>
      <span className="flex-1 text-left">{label}</span>
      {shortcut && (
        <span className="text-xs text-gray-400 dark:text-gray-500 ml-2">
          {shortcut}
        </span>
      )}
    </button>
  );
};

export const ContextMenuSection: React.FC<{
  children: React.ReactNode;
  separator?: boolean;
}> = ({ children, separator = false }) => (
  <div className={separator ? 'border-t border-gray-200 dark:border-gray-700 my-1' : ''}>
    {children}
  </div>
);

export const ContextMenuSeparator: React.FC = () => (
  <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
);

export { type ContextMenuItemProps, type ContextMenuSectionProps };