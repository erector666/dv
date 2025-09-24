import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  LayoutDashboard, 
  Search, 
  Upload, 
  FolderOpen, 
  Settings,
  User
} from 'lucide-react';
import { clsx } from 'clsx';
import { useUploadModal } from '../../context/UploadModalContext';

interface NavigationItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path?: string;
  action?: () => void;
  badge?: number;
}

const MobileNavigation: React.FC = () => {
  const location = useLocation();
  const { openModal } = useUploadModal();

  const navigationItems: NavigationItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      path: '/dashboard'
    },
    {
      id: 'search',
      label: 'Search',
      icon: Search,
      path: '/search'
    },
    {
      id: 'upload',
      label: 'Upload',
      icon: Upload,
      action: openModal
    },
    {
      id: 'documents',
      label: 'Documents',
      icon: FolderOpen,
      path: '/category/all'
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: User,
      path: '/profile'
    }
  ];

  const isActive = (item: NavigationItem) => {
    if (item.path) {
      return location.pathname === item.path || 
             (item.id === 'dashboard' && location.pathname === '/');
    }
    return false;
  };

  const handleItemClick = (item: NavigationItem) => {
    if (item.action) {
      item.action();
    }
  };

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 z-40 safe-bottom md:hidden"
      role="navigation"
      aria-label="Mobile navigation"
    >
      <div className="flex justify-around py-1">
        {navigationItems.map((item) => {
          const active = isActive(item);
          const Icon = item.icon;
          
          const content = (
            <motion.div
              className={clsx(
                'flex flex-col items-center py-2 px-3 rounded-lg transition-colors relative',
                'min-w-[60px] min-h-[56px] justify-center',
                active
                  ? 'text-primary-600 dark:text-primary-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              )}
              whileTap={{ scale: 0.95 }}
              role={item.action ? 'button' : undefined}
              tabIndex={0}
              aria-label={`${item.label}${item.badge ? ` (${item.badge} notifications)` : ''}`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleItemClick(item);
                }
              }}
            >
              {/* Active indicator */}
              {active && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-primary-50 dark:bg-primary-900/20 rounded-lg"
                  initial={false}
                  transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                />
              )}
              
              {/* Icon with badge */}
              <div className="relative z-10">
                <Icon className={clsx(
                  'w-5 h-5 mb-1 transition-transform duration-200',
                  active && 'scale-110'
                )} />
                
                {/* Badge */}
                {item.badge && item.badge > 0 && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold"
                    aria-label={`${item.badge} notifications`}
                  >
                    {item.badge > 9 ? '9+' : item.badge}
                  </motion.div>
                )}
              </div>
              
              {/* Label */}
              <span className={clsx(
                'text-xs font-medium leading-tight z-10 transition-all duration-200',
                active && 'font-semibold'
              )}>
                {item.label}
              </span>
            </motion.div>
          );

          if (item.path) {
            return (
              <NavLink
                key={item.id}
                to={item.path}
                className="flex-1 flex justify-center focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-inset rounded-lg"
              >
                {content}
              </NavLink>
            );
          }

          return (
            <button
              key={item.id}
              onClick={() => handleItemClick(item)}
              className="flex-1 flex justify-center focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-inset rounded-lg"
            >
              {content}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileNavigation;