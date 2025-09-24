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
    <div className={`bg-dark-bg text-white ${className}`}>
      <div className="px-3 py-1.5 md:px-4 md:py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center transition-all duration-300 hover:bg-white/30 hover:scale-105">
              <span className="text-xs font-medium">{getUserName().charAt(0).toUpperCase()}</span>
            </div>
            <div className="animate-fade-in">
              <h1 className="text-sm md:text-base font-medium leading-tight transition-all duration-300 hover:text-white/90">
                Welcome back, {getUserName()}
              </h1>
              <p className="text-white/50 text-xs transition-all duration-300 hover:text-white/70">
                {new Date().toLocaleDateString('en-US', { 
                  weekday: 'short', 
                  month: 'short', 
                  day: 'numeric',
                  year: 'numeric'
                })}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-1.5">
            {/* Performance Toggle for Development */}
            {showPerformanceToggle && process.env.NODE_ENV === 'development' && (
              <button
                onClick={onToggleVirtualization}
                className="px-2 py-0.5 bg-white/20 hover:bg-white/30 rounded text-xs font-medium transition-all duration-300 hover:scale-105 active:scale-95"
                aria-label={useVirtualization ? 'Switch to standard view' : 'Switch to virtual view'}
              >
                {useVirtualization ? 'Std' : 'Virt'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardHeader;