import React from 'react';
import { useDocuments } from '../../context/DocumentContext';
import SidebarHeader from './sidebar/SidebarHeader';
import SidebarNavigation from './sidebar/SidebarNavigation';
import SidebarCategories from './sidebar/SidebarCategories';
import SidebarStats from './sidebar/SidebarStats';

interface SidebarProps {
  isMobile?: boolean;
  onClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isMobile = false, onClose }) => {
  const { isLoading } = useDocuments();

  const handleLinkClick = () => {
    if (isMobile && onClose) {
      onClose();
    }
  };

  return (
    <div
      className={`h-full bg-gradient-to-b from-white via-gray-50 to-white dark:from-gray-800 dark:via-gray-850 dark:to-gray-800 shadow-xl border-r border-gray-200/60 dark:border-gray-700/60 backdrop-blur-sm flex flex-col ${
        isMobile
          ? 'fixed inset-y-0 left-0 z-50 w-[85vw] max-w-sm'
          : 'sticky top-0 w-60'
      }`}
      role="navigation"
      aria-label="Main navigation"
    >
      {/* Header */}
      <SidebarHeader isMobile={isMobile} onClose={onClose} />

      {/* Main Navigation */}
      <nav className="flex-1 overflow-y-auto py-4" aria-label="Document navigation">
        <div className="space-y-6 px-2">
          {/* Primary Navigation */}
          <SidebarNavigation onItemClick={handleLinkClick} />
          
          {/* Categories */}
          <SidebarCategories onItemClick={handleLinkClick} />
        </div>
      </nav>

      {/* Statistics */}
      <SidebarStats isCompact={isMobile} />
    </div>
  );
};

export default Sidebar;
