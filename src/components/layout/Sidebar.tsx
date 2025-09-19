import React from 'react';
import { NavLink } from 'react-router-dom';
import { useQuery } from 'react-query';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { getDocuments } from '../../services/documentService';
import {
  LayoutDashboard,
  FileText,
  DollarSign,
  GraduationCap,
  Scale,
  Building2,
  Heart,
  Shield,
  FolderOpen,
  Settings,
} from 'lucide-react';

interface SidebarProps {
  isMobile?: boolean;
  onClose?: () => void;
}

const formatBytes = (bytes: number, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const Sidebar: React.FC<SidebarProps> = ({ isMobile = false, onClose }) => {
  const { translate } = useLanguage();
  const { currentUser } = useAuth();


  // Fetch documents for category counts and stats
  const { data: documents, isLoading: documentsLoading } = useQuery(
    ['documents', currentUser?.uid],
    () => getDocuments(currentUser?.uid || ''),
    {
      enabled: !!currentUser?.uid,
      staleTime: 30000, // Consider data stale after 30 seconds
      refetchInterval: 60000, // Refetch every 60 seconds
    }
  );

  // Get document counts by category (matching the DocumentList filtering logic)
  const getCategoryCount = (category: string) => {
    if (!documents) return 0;
    
    const filterCategory = category.toLowerCase();
    
    // Handle personal category
    if (filterCategory === 'personal') {
      return documents.filter(doc => {
        const docCategory = doc.category?.toLowerCase();
        return !docCategory || docCategory === 'document';
      }).length;
    }
    
    // Handle financial category mapping
    if (filterCategory === 'financial') {
      return documents.filter(doc => {
        const docCategory = doc.category?.toLowerCase();
        return docCategory === 'financial' || 
               docCategory === 'finance' || 
               docCategory === 'bills' ||
               (docCategory && docCategory.includes('bill')) ||
               (docCategory && docCategory.includes('financial'));
      }).length;
    }
    
    // Handle bills category mapping
    if (filterCategory === 'bills') {
      return documents.filter(doc => {
        const docCategory = doc.category?.toLowerCase();
        return docCategory === 'bills' || 
               docCategory === 'financial' || 
               docCategory === 'finance' ||
               (docCategory && docCategory.includes('bill')) ||
               (docCategory && docCategory.includes('financial'));
      }).length;
    }
    
    // Handle education category mapping
    if (filterCategory === 'education') {
      return documents.filter(doc => {
        const docCategory = doc.category?.toLowerCase();
        return docCategory === 'education' || 
               docCategory === 'educational' ||
               docCategory === 'school' ||
               docCategory === 'university' ||
               docCategory === 'academic';
      }).length;
    }
    
    // Handle legal category mapping
    if (filterCategory === 'legal') {
      return documents.filter(doc => {
        const docCategory = doc.category?.toLowerCase();
        return docCategory === 'legal' || 
               docCategory === 'law' ||
               docCategory === 'contract' ||
               docCategory === 'agreement';
      }).length;
    }
    
    // Handle medical category mapping
    if (filterCategory === 'medical') {
      return documents.filter(doc => {
        const docCategory = doc.category?.toLowerCase();
        return docCategory === 'medical' || 
               docCategory === 'health' ||
               docCategory === 'healthcare' ||
               docCategory === 'doctor' ||
               docCategory === 'hospital';
      }).length;
    }
    
    // Handle insurance category mapping
    if (filterCategory === 'insurance') {
      return documents.filter(doc => {
        const docCategory = doc.category?.toLowerCase();
        return docCategory === 'insurance' || 
               docCategory === 'insure';
      }).length;
    }
    
    // Handle government category mapping
    if (filterCategory === 'government') {
      return documents.filter(doc => {
        const docCategory = doc.category?.toLowerCase();
        return docCategory === 'government' || 
               docCategory === 'gov' ||
               docCategory === 'official' ||
               docCategory === 'public';
      }).length;
    }
    
    // Default exact match (case insensitive)
    return documents.filter(doc => {
      const docCategory = doc.category?.toLowerCase();
      return docCategory === filterCategory;
    }).length;
  };

  // Get count of documents with custom categories (not in predefined list)
  const getCustomCategoriesCount = () => {
    if (!documents) return 0;
    const predefinedCategories = ['personal', 'bills', 'financial', 'medical', 'insurance', 'other'];
    return documents.filter(doc => 
      doc.category && !predefinedCategories.includes(doc.category)
    ).length;
  };

  // Helper functions for the new stats section
  const getUniqueCategories = () => {
    if (!documents) return [];
    const categories = documents
      .map(doc => doc.category)
      .filter(Boolean)
      .filter((category, index, arr) => arr.indexOf(category) === index);
    return categories;
  };

  const getRecentDocuments = () => {
    if (!documents) return [];
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    return documents.filter(doc => {
      const uploadDate = doc.uploadedAt?.toDate ? doc.uploadedAt.toDate() : new Date(doc.uploadedAt);
      return uploadDate >= oneWeekAgo;
    });
  };

  const getProcessingDocuments = () => {
    if (!documents) return [];
    return documents.filter(doc => doc.status === 'processing');
  };

  const getLowConfidenceDocuments = () => {
    if (!documents) return [];
    return documents.filter(doc => 
      doc.metadata?.classificationConfidence && 
      doc.metadata.classificationConfidence < 0.6
    );
  };


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
    >
      {/* Logo */}
      <div className="flex items-center p-4 border-b border-gray-200/60 dark:border-gray-700/60 bg-gradient-to-r from-gray-50 to-white dark:from-gray-850 dark:to-gray-800">
        <img
          src="/logo2.png"
          alt="DocVault Logo"
          className="h-8 w-8 rounded-full"
        />
        <span className="ml-2 text-xl font-semibold">DocVault</span>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-2 px-2">
          {/* Dashboard */}
          <li>
            <NavLink
              to="/dashboard"
              onClick={handleLinkClick}
              className={({ isActive }) =>
                `flex items-center p-2 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-300'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                }`
              }
            >
              <LayoutDashboard className="h-6 w-6" />
              <span className="ml-3">{translate('dashboard')}</span>
            </NavLink>
          </li>

          {/* Categories */}
          <li className="pt-4">
            <div className="flex items-center px-2 mb-2">
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                {translate('categories')}
              </span>
            </div>

            {/* Personal */}
            <NavLink
              to="/category/personal"
              onClick={handleLinkClick}
              className={({ isActive }) =>
                `flex items-center justify-between p-2 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-300'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                }`
              }
            >
              <div className="flex items-center">
                <FileText className="h-6 w-6" />
                <span className="ml-3">{translate('personal')}</span>
              </div>
              {getCategoryCount('personal') > 0 && (
                <span className="bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-300 text-xs font-medium px-2 py-1 rounded-full">
                  {getCategoryCount('personal')}
                </span>
              )}
            </NavLink>

            {/* Financial */}
            <NavLink
              to="/category/financial"
              onClick={handleLinkClick}
              className={({ isActive }) =>
                `flex items-center justify-between p-2 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-300'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                }`
              }
            >
              <div className="flex items-center">
                <DollarSign className="h-6 w-6" />
                <span className="ml-3">Financial</span>
              </div>
              {getCategoryCount('financial') > 0 && (
                <span className="bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-300 text-xs font-medium px-2 py-1 rounded-full">
                  {getCategoryCount('financial')}
                </span>
              )}
            </NavLink>

            {/* Education */}
            <NavLink
              to="/category/education"
              onClick={handleLinkClick}
              className={({ isActive }) =>
                `flex items-center justify-between p-2 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-300'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                }`
              }
            >
              <div className="flex items-center">
                <GraduationCap className="h-6 w-6" />
                <span className="ml-3">Education</span>
              </div>
              {getCategoryCount('education') > 0 && (
                <span className="bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-300 text-xs font-medium px-2 py-1 rounded-full">
                  {getCategoryCount('education')}
                </span>
              )}
            </NavLink>

            {/* Legal */}
            <NavLink
              to="/category/legal"
              onClick={handleLinkClick}
              className={({ isActive }) =>
                `flex items-center justify-between p-2 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-300'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                }`
              }
            >
              <div className="flex items-center">
                <Scale className="h-6 w-6" />
                <span className="ml-3">Legal</span>
              </div>
              {getCategoryCount('legal') > 0 && (
                <span className="bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-300 text-xs font-medium px-2 py-1 rounded-full">
                  {getCategoryCount('legal')}
                </span>
              )}
            </NavLink>

            {/* Government */}
            <NavLink
              to="/category/government"
              onClick={handleLinkClick}
              className={({ isActive }) =>
                `flex items-center justify-between p-2 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-300'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                }`
              }
            >
              <div className="flex items-center">
                <Building2 className="h-6 w-6" />
                <span className="ml-3">Government</span>
              </div>
              {getCategoryCount('government') > 0 && (
                <span className="bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-300 text-xs font-medium px-2 py-1 rounded-full">
                  {getCategoryCount('government')}
                </span>
              )}
            </NavLink>

            {/* Medical */}
            <NavLink
              to="/category/medical"
              onClick={handleLinkClick}
              className={({ isActive }) =>
                `flex items-center justify-between p-2 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-300'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                }`
              }
            >
              <div className="flex items-center">
                <Heart className="h-6 w-6" />
                <span className="ml-3">{translate('medical')}</span>
              </div>
              {getCategoryCount('medical') > 0 && (
                <span className="bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-300 text-xs font-medium px-2 py-1 rounded-full">
                  {getCategoryCount('medical')}
                </span>
              )}
            </NavLink>

            {/* Insurance */}
            <NavLink
              to="/category/insurance"
              onClick={handleLinkClick}
              className={({ isActive }) =>
                `flex items-center justify-between p-2 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-300'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                }`
              }
            >
              <div className="flex items-center">
                <Shield className="h-6 w-6" />
                <span className="ml-3">{translate('insurance')}</span>
              </div>
              {getCategoryCount('insurance') > 0 && (
                <span className="bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-300 text-xs font-medium px-2 py-1 rounded-full">
                  {getCategoryCount('insurance')}
                </span>
              )}
            </NavLink>

            {/* Other */}
            <NavLink
              to="/category/other"
              onClick={handleLinkClick}
              className={({ isActive }) =>
                `flex items-center justify-between p-2 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-300'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                }`
              }
            >
              <div className="flex items-center">
                <FolderOpen className="h-6 w-6" />
                <span className="ml-3">{translate('other')}</span>
              </div>
              {getCategoryCount('other') > 0 && (
                <span className="bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-300 text-xs font-medium px-2 py-1 rounded-full">
                  {getCategoryCount('other')}
                </span>
              )}
            </NavLink>

            {/* Custom Categories */}
            {documents && getCustomCategoriesCount() > 0 && (
              <NavLink
                to="/category/custom"
                onClick={handleLinkClick}
                className={({ isActive }) =>
                  `flex items-center justify-between p-2 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-300'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`
                }
              >
                <div className="flex items-center">
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  <span className="ml-3">Custom</span>
                </div>
                <span className="bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-300 text-xs font-medium px-2 py-1 rounded-full">
                  {getCustomCategoriesCount()}
                </span>
              </NavLink>
            )}
          </li>
        </ul>
      </nav>

      {/* Bottom Section */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700 mt-auto">
        {/* Document Statistics */}
        <div className="mb-4">
          <div className="flex items-center mb-2">
            <LayoutDashboard className="h-6 w-6 mr-2 text-gray-500 dark:text-gray-400" />
            <span className="text-sm font-medium">Quick Stats</span>
          </div>
          <div>
            {documentsLoading ? (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Loading stats...
              </p>
            ) : documents ? (
              <>
                <div className="space-y-1">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    📄 {documents.length} total documents
                  </p>
                  {getUniqueCategories().length > 0 && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      📁 {getUniqueCategories().length} categories
                    </p>
                  )}
                  {getRecentDocuments().length > 0 && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      🕒 {getRecentDocuments().length} uploaded this week
                    </p>
                  )}
                  {getProcessingDocuments().length > 0 && (
                    <p className="text-xs text-blue-600 dark:text-blue-400">
                      ⚡ {getProcessingDocuments().length} being processed
                    </p>
                  )}
                  {getLowConfidenceDocuments().length > 0 && (
                    <p className="text-xs text-yellow-600 dark:text-yellow-400">
                      ⚠️ {getLowConfidenceDocuments().length} need review
                    </p>
                  )}
                </div>
                {documents.length === 0 && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    No documents yet. Upload your first file to get started!
                  </p>
                )}
              </>
            ) : (
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Unable to load document stats
              </p>
            )}
          </div>
        </div>

        {/* Settings Link */}
        <NavLink
          to="/settings"
          onClick={handleLinkClick}
          className={({ isActive }) =>
            `flex items-center p-2 rounded-lg transition-colors ${
              isActive
                ? 'bg-primary-100 dark:bg-primary-900 text-primary-600 dark:text-primary-300'
                : 'hover:bg-gray-100 dark:hover:bg-gray-700'
            }`
          }
        >
          <Settings className="h-6 w-6" />
          <span className="ml-3">{translate('settings')}</span>
        </NavLink>
      </div>
    </div>
  );
};

export default Sidebar;
