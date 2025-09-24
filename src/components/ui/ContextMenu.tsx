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
  items: ContextMenuItem[];
  children: React.ReactNode;
  disabled?: boolean;
}

const ContextMenu: React.FC<ContextMenuProps> = ({ 
  items, 
  children, 
  disabled = false 
}: ContextMenuProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleContextMenu = (event: React.MouseEvent) => {
    if (disabled) return;
    
    event.preventDefault();
    event.stopPropagation();
    
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX;
    const y = event.clientY;
    
    setPosition({ x, y });
    setIsOpen(true);
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
    setIsOpen(false);
  };

  const closeMenu = () => {
    setIsOpen(false);
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
        closeMenu();
      }
    };

    const handleScroll = () => {
      closeMenu();
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
      closeMenu();
    }
  };

  // Adjust menu position to stay within viewport
  const getMenuStyle = (): React.CSSProperties => {
    const menuWidth = 200; // Approximate menu width
    const menuHeight = items.length * 40; // Approximate item height
    
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
          {items.map((item: ContextMenuItem, index: number) => (
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
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );

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

export default ContextMenu;