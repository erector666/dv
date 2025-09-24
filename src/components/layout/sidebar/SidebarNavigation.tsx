import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Settings } from 'lucide-react';
import { useLanguage } from '../../../context/LanguageContext';
import NavigationItem from './NavigationItem';

interface SidebarNavigationProps {
  onItemClick?: () => void;
}

const SidebarNavigation: React.FC<SidebarNavigationProps> = ({ onItemClick }) => {
  const { translate } = useLanguage();

  return (
    <div className="space-y-2">
      {/* Dashboard */}
      <NavigationItem
        id="dashboard"
        label={translate('dashboard') || 'Dashboard'}
        icon={LayoutDashboard}
        path="/dashboard"
        color="text-orange-500 dark:text-orange-400"
        onClick={onItemClick}
      />

      {/* Settings */}
      <NavigationItem
        id="settings"
        label={translate('settings') || 'Settings'}
        icon={Settings}
        path="/settings"
        color="text-slate-500 dark:text-slate-400"
        onClick={onItemClick}
      />
    </div>
  );
};

export default SidebarNavigation;