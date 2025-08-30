import React, { useState, ReactNode } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

interface LayoutProps {
  children?: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const toggleMobileSidebar = () => {
    setIsMobileSidebarOpen(!isMobileSidebarOpen);
  };

  const closeMobileSidebar = () => {
    setIsMobileSidebarOpen(false);
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      {/* Desktop Sidebar */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Mobile Sidebar */}
      {isMobileSidebarOpen && (
        <div className="md:hidden">
          <div 
            className="fixed inset-0 bg-gray-900 bg-opacity-50 z-40"
            onClick={closeMobileSidebar}
          ></div>
          <Sidebar isMobile onClose={closeMobileSidebar} />
        </div>
      )}

      {/* Main Content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header onMenuClick={toggleMobileSidebar} />
        
        <main className="flex-1 overflow-y-auto">
          {children || <Outlet />}
        </main>
      </div>
    </div>
  );
};

export default Layout;
