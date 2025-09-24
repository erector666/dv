import React from 'react';
import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { ContextMenu } from '../../ui';

interface NavigationItemProps {
  id: string;
  label: string;
  icon: any; // Flexible icon type
  path: string;
  count?: number;
  color: string;
  isLoading?: boolean;
  onClick?: () => void;
  children?: React.ReactNode;
  contextMenu?: {
    items: Array<{
      id: string;
      label: string;
      icon?: React.ComponentType<{ className?: string }>;
      onClick: () => void;
      disabled?: boolean;
      destructive?: boolean;
      divider?: boolean;
    }>;
  };
}

const NavigationItem: React.FC<NavigationItemProps> = React.memo(({
  id,
  label,
  icon: Icon,
  path,
  count,
  color,
  isLoading = false,
  onClick,
  children,
  contextMenu
}) => {
  const navigationContent = (
    <NavLink
      to={path}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center justify-between p-2 rounded-lg transition-all duration-200 group ${
          isActive
            ? 'bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-300 shadow-sm'
            : 'hover:bg-gray-100 dark:hover:bg-gray-700 hover:shadow-sm'
        }`
      }
      aria-describedby={count !== undefined ? `${id}-count` : undefined}
    >
      <div className="flex items-center min-w-0 flex-1">
        <Icon 
          className={`h-5 w-5 flex-shrink-0 transition-transform duration-200 group-hover:scale-110 ${color}`}
          aria-hidden="true"
        />
        <span className="ml-3 text-sm font-medium truncate">
          {label}
        </span>
      </div>
      
      {/* Count Badge */}
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="w-6 h-5 bg-gray-200 dark:bg-gray-600 rounded animate-pulse"
          />
        ) : count !== undefined && count > 0 ? (
          <motion.span
            key="count"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            id={`${id}-count`}
            className="bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-300 text-xs font-medium px-2 py-1 rounded-full min-w-[1.5rem] text-center"
            aria-label={`${count} documents`}
          >
            {count > 999 ? '999+' : count}
          </motion.span>
        ) : null}
      </AnimatePresence>
      
      {children}
    </NavLink>
  );

  if (contextMenu) {
    return (
      <ContextMenu items={contextMenu.items}>
        {navigationContent}
      </ContextMenu>
    );
  }

  return navigationContent;
});

NavigationItem.displayName = 'NavigationItem';

export default NavigationItem;