import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';

interface ContextMenuItem {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  disabled?: boolean;
  destructive?: boolean;
  divider?: boolean;
}

interface ContextMenuProps {
  items?: ContextMenuItem[];
  children: React.ReactNode;
  disabled?: boolean;
  // Alternative API for compatibility
  isOpen?: boolean;
  onClose?: () => void;
  position?: { x: number; y: number };
}

const ContextMenu: React.FC<ContextMenuProps> = ({ 
  items, 
  children, 
  disabled = false,
  // Alternative API props
  isOpen: externalIsOpen,
  onClose: externalOnClose,
  position: externalPosition
}: ContextMenuProps) => {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [internalPosition, setInternalPosition] = useState({ x: 0, y: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Use external state if provided, otherwise use internal state
  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;
  const position = externalPosition || internalPosition;
  const closeMenu = externalOnClose || (() => setInternalIsOpen(false));

  const handleContextMenu = (event: React.MouseEvent) => {
    if (disabled || externalIsOpen !== undefined) return; // Don't handle if using external state
    
    event.preventDefault();
    event.stopPropagation();
    
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX;
    const y = event.clientY;
    
    setInternalPosition({ x, y });
    setInternalIsOpen(true);
  };

  const handleClick = (event: React.MouseEvent) => {
    if (disabled) return;
    
    // Check if it's a right click or long press
    if (event.button === 2) {
      handleContextMenu(event);
    }
  };

  const handleItemClick = (item: ContextMenuItem) => {
    if (item.disabled) return;
    
    item.onClick();
    closeMenu();
  };

  const handleCloseMenu = () => {
    closeMenu();
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        handleCloseMenu();
      }
    };

    const handleScroll = () => {
      handleCloseMenu();
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('scroll', handleScroll, true);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('scroll', handleScroll, true);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      handleCloseMenu();
    }
  };

  // Adjust menu position to stay within viewport
  const getMenuStyle = (): React.CSSProperties => {
    const menuWidth = 200; // Approximate menu width
    const menuHeight = (items?.length || 5) * 40; // Approximate item height
    
    let { x, y } = position;
    
    // Adjust horizontal position
    if (x + menuWidth > window.innerWidth) {
      x = window.innerWidth - menuWidth - 10;
    }
    
    // Adjust vertical position
    if (y + menuHeight > window.innerHeight) {
      y = window.innerHeight - menuHeight - 10;
    }
    
    return {
      left: x,
      top: y,
      position: 'fixed',
      zIndex: 9999,
    };
  };

  const menuContent = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={menuRef}
          style={getMenuStyle()}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.1 }}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 min-w-[160px]"
          role="menu"
          aria-orientation="vertical"
        >
          {items ? (
            // Render items if provided
            items.map((item: ContextMenuItem, index: number) => (
              <React.Fragment key={item.id}>
                {item.divider && index > 0 && (
                  <div className="h-px bg-gray-200 dark:bg-gray-700 my-1" />
                )}
                <button
                  onClick={() => handleItemClick(item)}
                  disabled={item.disabled}
                  className={`
                    w-full flex items-center px-3 py-2 text-sm text-left transition-colors
                    ${item.disabled 
                      ? 'text-gray-400 dark:text-gray-500 cursor-not-allowed' 
                      : item.destructive
                        ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
                        : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }
                  `}
                  role="menuitem"
                >
                  {item.icon && (
                    <item.icon className="w-4 h-4 mr-2 flex-shrink-0" />
                  )}
                  {item.label}
                </button>
              </React.Fragment>
            ))
          ) : (
            // Render children if no items provided (alternative API)
            children
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );

  // If using external state (alternative API), only render the menu
  if (externalIsOpen !== undefined) {
    return typeof document !== 'undefined' ? createPortal(menuContent, document.body) : null;
  }

  // Original API - render trigger and menu
  return (
    <>
      <div
        ref={triggerRef}
        onContextMenu={handleContextMenu}
        onClick={handleClick}
        className={disabled ? '' : 'cursor-context-menu'}
      >
        {children}
      </div>
      {typeof document !== 'undefined' && createPortal(menuContent, document.body)}
    </>
  );
};

// Export types and components for compatibility
export type { ContextMenuItem as ContextMenuItemType };

// For compatibility with existing code that expects ContextMenuItem as a value
interface ContextMenuItemComponentProps {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  destructive?: boolean;
  shortcut?: string;
  variant?: string; // For compatibility
  children?: React.ReactNode;
}

export const ContextMenuItem: React.FC<ContextMenuItemComponentProps> = ({ 
  label, 
  icon, 
  onClick, 
  disabled = false, 
  destructive = false, 
  shortcut,
  variant,
  children 
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`
      w-full flex items-center justify-between px-3 py-2 text-sm text-left transition-colors
      ${disabled 
        ? 'text-gray-400 dark:text-gray-500 cursor-not-allowed' 
        : destructive
          ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
          : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
      }
    `}
    role="menuitem"
  >
    <div className="flex items-center">
      {icon && <span className="mr-2 flex-shrink-0">{icon}</span>}
      {label}
    </div>
    {shortcut && (
      <span className="text-xs text-gray-400 dark:text-gray-500 ml-4">
        {shortcut}
      </span>
    )}
    {children}
  </button>
);

export const ContextMenuSection = ({ children }: { children: React.ReactNode }) => (
  <div role="group">{children}</div>
);

export const ContextMenuSeparator = () => (
  <div className="h-px bg-gray-200 dark:bg-gray-700 my-1" />
);

// Named export for compatibility with existing imports
export { ContextMenu };

export default ContextMenu;