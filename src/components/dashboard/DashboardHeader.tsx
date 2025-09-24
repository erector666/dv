import React from 'react';
import { useAuth } from '../../context/AuthContext';

export interface DashboardHeaderProps {
  className?: string;
  showPerformanceToggle?: boolean;
  useVirtualization?: boolean;
  onToggleVirtualization?: () => void;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  className = '',
  showPerformanceToggle = false,
  useVirtualization = false,
  onToggleVirtualization,
}) => {
  const { currentUser } = useAuth();

  const getUserName = () => {
    if (currentUser?.displayName) {
      return currentUser.displayName.split(' ')[0];
    }
    if (currentUser?.email) {
      return currentUser.email.split('@')[0];
    }
    return 'User';
  };

  return (
    <div className={`bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 text-white ${className}`}>
      <div className="p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div className="mb-6 md:mb-0">
            <h1 className="text-3xl md:text-4xl font-bold mb-2">
              Welcome back, {getUserName()}! 👋
            </h1>
            <p className="text-blue-100 text-lg">
              {new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Performance Toggle for Development */}
            {showPerformanceToggle && process.env.NODE_ENV === 'development' && (
              <button
                onClick={onToggleVirtualization}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors"
                aria-label={useVirtualization ? 'Switch to standard view' : 'Switch to virtual view'}
              >
                {useVirtualization ? 'Standard View' : 'Virtual View'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardHeader;