import React, { useState, ReactNode } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import MobileNavigation from './MobileNavigation';
import ChatBot from '../chat/ChatBot';
import { Button } from '../ui/Button';
import { useAuth } from '../../context/AuthContext';
import { useDocuments } from '../../context/DocumentContext';
import { useSwipeGestures } from '../../hooks/useSwipeGestures';
import { useFocusManagement } from '../../hooks/useFocusManagement';
import { MessageCircle } from 'lucide-react';

interface LayoutProps {
  children?: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const { currentUser } = useAuth();
  const { documents } = useDocuments();

  // Convert documents to the format expected by ChatBot
  const recentDocuments = documents
    .filter(doc => doc.id) // Filter out documents without IDs
    .slice(0, 10)
    .map(doc => ({
      id: doc.id!, // Non-null assertion since we filtered above
      name: doc.name,
      category: doc.category || 'uncategorized',
      uploadDate:
        doc.uploadedAt instanceof Date
          ? doc.uploadedAt
          : new Date(doc.uploadedAt || Date.now()),
      url: doc.url, // Add document URL for analysis
      size: doc.size, // Add document size
      type: doc.type, // Add document type
    }));

  const toggleMobileSidebar = () => {
    setIsMobileSidebarOpen(!isMobileSidebarOpen);
  };

  const closeMobileSidebar = () => {
    setIsMobileSidebarOpen(false);
  };

  const openMobileSidebar = () => {
    setIsMobileSidebarOpen(true);
  };

  const toggleChat = () => {
    setIsChatOpen(!isChatOpen);
  };

  // Focus management for mobile sidebar
  const { containerRef } = useFocusManagement({
    isOpen: isMobileSidebarOpen,
    onClose: closeMobileSidebar,
    trapFocus: true,
    restoreFocus: true,
    autoFocus: true
  });

  // Enable unified swipe gestures for sidebar
  useSwipeGestures({
    onSwipeRight: () => {
      if (!isMobileSidebarOpen) {
        openMobileSidebar();
      }
    },
    onSwipeLeft: () => {
      if (isMobileSidebarOpen) {
        closeMobileSidebar();
      }
    },
    edgeThreshold: 40,
    minSwipeDistance: 60,
    maxSwipeTime: 800,
    edgeOnly: false, // Allow swipes from anywhere for closing
    isEnabled: window.innerWidth < 768, // Only on mobile
    preventDefaultOnSwipe: true
  });

  const handleChatAction = (action: string, data?: any) => {
    setIsChatOpen(false); // Close chat after action

    switch (action) {
      case 'open_upload_modal':
        window.location.href = '/upload';
        break;
      case 'search_documents':
        // Navigate to dashboard with search focus
        window.location.href = '/dashboard';
        setTimeout(() => {
          const searchInput = document.querySelector(
            'input[type="search"]'
          ) as HTMLInputElement;
          if (searchInput) {
            searchInput.focus();
            if (data?.query) {
              searchInput.value = data.query;
              searchInput.dispatchEvent(new Event('input', { bubbles: true }));
            }
          }
        }, 100);
        break;
      case 'show_recent_documents':
        // Navigate to dashboard
        window.location.href = '/dashboard';
        break;
      case 'browse_categories':
        // Navigate to dashboard and scroll to categories
        window.location.href = '/dashboard';
        setTimeout(() => {
          const categoriesSection = document.querySelector(
            '[data-section="categories"]'
          );
          if (categoriesSection) {
            categoriesSection.scrollIntoView({ behavior: 'smooth' });
          }
        }, 100);
        break;
      case 'view_document':
        if (data?.id) {
          // Navigate to document view (if you have a document viewer route)
          console.log('View document:', data.id);
          // window.location.href = `/document/${data.id}`;
        }
        break;
      case 'explain_features':
      case 'show_tutorial':
        // Show help or tutorial
        alert(
          'Feature explanation coming soon! 🚀\n\nDocVault helps you:\n• Upload & organize documents\n• Search by content\n• Translate documents\n• Extract key information'
        );
        break;
      case 'organize_documents':
        // Navigate to dashboard with organization focus
        window.location.href = '/dashboard';
        break;
      case 'analyze_document':
        if (data?.id) {
          alert(
            `🔍 Deep Analysis\n\nAnalyzing document: ${data.id}\n\nThis feature will provide:\n• Content summary\n• Key information extraction\n• Document insights\n• Language detection\n\nComing soon! 🚀`
          );
        }
        break;
      case 'translate_document':
        if (data?.id) {
          alert(
            `🌍 Document Translation\n\nTranslating document: ${data.id}\n\nThis feature will:\n• Detect source language\n• Translate to target language\n• Preserve formatting\n• Generate translated PDF\n\nComing soon! 🚀`
          );
        }
        break;
      default:
      // Handle unknown actions silently
    }
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      {/* Swipe Hint for Mobile - only show when sidebar is closed and no documents */}
      {!isMobileSidebarOpen && documents.length === 0 && (
        <div className="md:hidden fixed left-0 top-1/2 transform -translate-y-1/2 z-30 pointer-events-none">
          <div className="w-1 h-12 bg-gradient-to-b from-transparent via-primary-500/30 to-transparent rounded-r-full animate-pulse"></div>
        </div>
      )}

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
            aria-hidden="true"
          ></div>
          <div ref={containerRef as React.RefObject<HTMLDivElement>}>
            <Sidebar isMobile onClose={closeMobileSidebar} />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <Header onMenuClick={toggleMobileSidebar} />

        <main className="flex-1 overflow-y-auto pb-20 md:pb-0">{children || <Outlet />}</main>
      </div>

      {/* Floating Chat Button - safe area aware */}
      {currentUser && (
        <Button
          onClick={toggleChat}
          className="fixed w-14 h-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 z-50"
          style={{
            right: '1.25rem',
            bottom: 'calc(1.25rem + var(--safe-bottom, 0px))',
          }}
          size="lg"
          title="Chat with Dorian - Your AI Assistant"
        >
          <MessageCircle className="w-6 h-6" />
        </Button>
      )}

      {/* Mobile Navigation */}
      <MobileNavigation />

      {/* ChatBot Modal */}
      <ChatBot
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        onAction={handleChatAction}
        recentDocuments={recentDocuments}
      />
    </div>
  );
};

export default Layout;
