import React from 'react';
import { NavLink } from 'react-router-dom';
import { useQuery } from 'react-query';
import { useLanguage } from '../../context/LanguageContext';
import { useAuth } from '../../context/AuthContext';
import { getStorageUsage } from '../../services/storageService';
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
  HardDrive,
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

  // Fetch real storage usage data with error handling
  const {
    data: storageData,
    isLoading,
    error,
  } = useQuery('storageUsage', () => getStorageUsage(currentUser?.uid || ''), {
    enabled: !!currentUser?.uid,
    refetchInterval: 60000, // Refetch every 60 seconds (reduced from 30s)
    staleTime: 30000, // Consider data stale after 30 seconds
    retry: (failureCount, error) => {
      // Don't retry on authentication errors
      if (
        error instanceof Error &&
        error.message.includes('permission-denied')
      ) {
        return false;
      }
      // Retry up to 3 times for network errors
      return failureCount < 3;
    },
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    onError: error => {
      // Reduce error logging spam for network issues
      if (error instanceof Error && error.message.includes('QUIC')) {
        // Silent handling for QUIC errors to reduce console spam
        return;
      }
      console.warn('Storage usage query failed:', error);
    },
  });

  // Fetch documents for category counts
  const { data: documents } = useQuery(
    ['documents', currentUser?.uid],
    () => getDocuments(currentUser?.uid || ''),
    {
      enabled: !!currentUser?.uid,
      staleTime: 30000, // Consider data stale after 30 seconds
      refetchInterval: 60000, // Refetch every 60 seconds
    }
  );

  // Get document counts by category
  const getCategoryCount = (category: string) => {
    if (!documents) return 0;
    
    // Handle the bills/financial mapping
    if (category === 'financial') {
      return documents.filter(doc => doc.category === 'financial' || doc.category === 'bills').length;
    }
    
    return documents.filter(doc => doc.category === category).length;
  };

  const totalStorage = 10 * 1024 * 1024 * 1024; // 10 GB in bytes
  const usedStorage = storageData?.totalSize ?? 0;
  const usagePercentage =
    totalStorage > 0 ? (usedStorage / totalStorage) * 100 : 0;

  const handleLinkClick = () => {
    if (isMobile && onClose) {
      onClose();
    }
  };

  return (
    <div
      className={`h-full bg-white dark:bg-gray-800 shadow-md flex flex-col ${
        isMobile
          ? 'fixed inset-y-0 left-0 z-50 w-[85vw] max-w-sm'
          : 'sticky top-0 w-60'
      }`}
    >
      {/* Logo */}
      <div className="flex items-center p-4 border-b border-gray-200 dark:border-gray-700">
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
          </li>
        </ul>
      </nav>

      {/* Bottom Section */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700 mt-auto">
        {/* Storage Indicator */}
        <div className="mb-4">
          <div className="flex items-center mb-2">
            <HardDrive className="h-6 w-6 mr-2 text-gray-500 dark:text-gray-400" />
            <span className="text-sm font-medium">Storage</span>
          </div>
          <div>
            {isLoading ? (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Loading storage...
              </p>
            ) : error ? (
              <div>
                <p className="text-xs text-yellow-600 dark:text-yellow-400 mb-1">
                  Storage info temporarily unavailable
                </p>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-1">
                  <div
                    className="bg-gray-400 h-2 rounded-full"
                    style={{ width: '0%' }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  0 Bytes / {formatBytes(10 * 1024 * 1024 * 1024)} used
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Network connectivity issue. Will retry automatically.
                </p>
              </div>
            ) : storageData ? (
              <>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-1">
                  <div
                    className="bg-primary-600 h-2 rounded-full"
                    style={{ width: `${usagePercentage}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {formatBytes(usedStorage)} / {formatBytes(totalStorage)} used
                </p>
                {storageData.documentCount === 0 && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    No documents uploaded yet. Upload a file to see storage
                    usage.
                  </p>
                )}
                {storageData.documentCount > 0 && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    {storageData.documentCount} document
                    {storageData.documentCount !== 1 ? 's' : ''}
                  </p>
                )}
              </>
            ) : null}
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
