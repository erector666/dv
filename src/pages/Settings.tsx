import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Settings as SettingsIcon, 
  User, 
  Palette, 
  Accessibility, 
  Zap,
  Download,
  Upload as UploadIcon,
  Save,
  RotateCcw
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { useUserPreferences } from '../context/UserPreferencesContext';
import { useToast, createToastHelpers } from '../components/ui/FeedbackSystem';
import { Card, CardHeader, CardTitle, CardContent, Button } from '../components/ui';

const Settings: React.FC = () => {
  const { language, setLanguage } = useLanguage();
  const { theme, setTheme } = useTheme();
  const { preferences, updatePreference, resetPreferences, exportPreferences, importPreferences } = useUserPreferences();
  const { addToast } = useToast();
  const toast = createToastHelpers(addToast);
  
  const [activeTab, setActiveTab] = useState<'display' | 'accessibility' | 'performance' | 'data'>('display');

  const handleExportSettings = () => {
    const data = exportPreferences();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'appvault-settings.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('Settings Exported', 'Your settings have been downloaded as a JSON file.');
  };

  const handleImportSettings = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result as string;
        const success = importPreferences(data);
        
        if (success) {
          toast.success('Settings Imported', 'Your settings have been successfully imported.');
        } else {
          toast.error('Import Failed', 'The settings file is invalid or corrupted.');
        }
      } catch (error) {
        toast.error('Import Failed', 'Failed to read the settings file.');
      }
    };
    reader.readAsText(file);
    
    // Reset the input
    event.target.value = '';
  };

  const handleResetSettings = () => {
    resetPreferences();
    toast.warning('Settings Reset', 'All settings have been reset to defaults.');
  };

  const tabs = [
    { id: 'display', label: 'Display', icon: Palette },
    { id: 'accessibility', label: 'Accessibility', icon: Accessibility },
    { id: 'performance', label: 'Performance', icon: Zap },
    { id: 'data', label: 'Data & Privacy', icon: SettingsIcon }
  ];

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Settings
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Customize your AppVault experience
        </p>
      </div>

      {/* Tab Navigation */}
      <Card className="p-1">
        <div className="flex flex-wrap gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                  activeTab === tab.id
                    ? 'bg-primary-100 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800'
                }`}
                aria-label={`${tab.label} settings`}
                role="tab"
                aria-selected={activeTab === tab.id}
              >
                <Icon className="w-4 h-4" />
                <span className="font-medium">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </Card>

      {/* Tab Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {activeTab === 'display' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Display Preferences</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Theme Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Theme
                  </label>
                  <div className="flex space-x-3">
                    {(['light', 'dark'] as const).map((themeOption) => (
                      <button
                        key={themeOption}
                        onClick={() => setTheme(themeOption)}
                        className={`flex items-center space-x-2 px-4 py-3 rounded-lg border-2 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                          theme === themeOption
                            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                        aria-label={`Set theme to ${themeOption}`}
                      >
                        <div className={`w-4 h-4 rounded-full ${
                          themeOption === 'light' ? 'bg-yellow-400' : 'bg-gray-800'
                        }`} />
                        <span className="capitalize">{themeOption}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* View Mode */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Default View Mode
                  </label>
                  <select
                    value={preferences.viewMode}
                    onChange={(e) => updatePreference('viewMode', e.target.value as any)}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500"
                    aria-label="Select default view mode for documents"
                  >
                    <option value="grid">Grid View</option>
                    <option value="list">List View</option>
                    <option value="table">Table View</option>
                  </select>
                </div>

                {/* Other display options */}
                <div className="space-y-4">
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={preferences.showPreviews}
                      onChange={(e) => updatePreference('showPreviews', e.target.checked)}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-gray-700 dark:text-gray-300">Show document previews</span>
                  </label>

                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={preferences.compactMode}
                      onChange={(e) => updatePreference('compactMode', e.target.checked)}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-gray-700 dark:text-gray-300">Compact mode (more items per screen)</span>
                  </label>

                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={preferences.enableAnimations}
                      onChange={(e) => updatePreference('enableAnimations', e.target.checked)}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-gray-700 dark:text-gray-300">Enable animations and transitions</span>
                  </label>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'accessibility' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Accessibility Options</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={preferences.highContrast}
                      onChange={(e) => updatePreference('highContrast', e.target.checked)}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-gray-700 dark:text-gray-300">High contrast mode</span>
                  </label>

                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={preferences.reducedMotion}
                      onChange={(e) => updatePreference('reducedMotion', e.target.checked)}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-gray-700 dark:text-gray-300">Reduce motion and animations</span>
                  </label>

                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={preferences.largeText}
                      onChange={(e) => updatePreference('largeText', e.target.checked)}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-gray-700 dark:text-gray-300">Large text size</span>
                  </label>

                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={preferences.keyboardNavigation}
                      onChange={(e) => updatePreference('keyboardNavigation', e.target.checked)}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-gray-700 dark:text-gray-300">Enhanced keyboard navigation</span>
                  </label>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'performance' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Performance Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={preferences.lazyLoading}
                      onChange={(e) => updatePreference('lazyLoading', e.target.checked)}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-gray-700 dark:text-gray-300">Enable lazy loading for images</span>
                  </label>

                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={preferences.autoRefresh}
                      onChange={(e) => updatePreference('autoRefresh', e.target.checked)}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-gray-700 dark:text-gray-300">Auto-refresh document list</span>
                  </label>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      Items per page
                    </label>
                    <select
                      value={preferences.itemsPerPage}
                      onChange={(e) => updatePreference('itemsPerPage', parseInt(e.target.value))}
                      className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500"
                    >
                      <option value={10}>10 items</option>
                      <option value={20}>20 items</option>
                      <option value={50}>50 items</option>
                      <option value={100}>100 items</option>
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'data' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Data Management</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={preferences.autoSave}
                      onChange={(e) => updatePreference('autoSave', e.target.checked)}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-gray-700 dark:text-gray-300">Auto-save changes</span>
                  </label>

                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={preferences.enableNotifications}
                      onChange={(e) => updatePreference('enableNotifications', e.target.checked)}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-gray-700 dark:text-gray-300">Enable notifications</span>
                  </label>
                </div>

                {/* Settings Import/Export */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                    Settings Backup
                  </h3>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                      variant="outline"
                      onClick={handleExportSettings}
                      leftIcon={<Download className="w-4 h-4" />}
                      ariaLabel="Export settings to file"
                    >
                      Export Settings
                    </Button>
                    
                    <label className="relative">
                      <input
                        type="file"
                        accept=".json"
                        onChange={handleImportSettings}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        aria-label="Import settings from file"
                      />
                      <Button
                        variant="outline"
                        leftIcon={<UploadIcon className="w-4 h-4" />}
                        className="w-full"
                      >
                        Import Settings
                      </Button>
                    </label>
                    
                    <Button
                      variant="danger"
                      onClick={handleResetSettings}
                      leftIcon={<RotateCcw className="w-4 h-4" />}
                      ariaLabel="Reset all settings to defaults"
                    >
                      Reset All
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </motion.div>

      {/* Settings Summary */}
      <Card className="bg-gray-50 dark:bg-gray-800">
        <CardContent className="text-center py-8">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            Settings Applied Successfully
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Your preferences are automatically saved and will be remembered across sessions.
          </p>
          <div className="flex justify-center">
            <Button
              variant="primary"
              onClick={() => toast.success('Settings Saved', 'All your preferences have been saved.')}
              leftIcon={<Save className="w-4 h-4" />}
            >
              Save Changes
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;