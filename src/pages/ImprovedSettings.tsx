import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Settings as SettingsIcon, 
  Palette, 
  Accessibility, 
  Zap,
  Download,
  Upload as UploadIcon,
  Save,
  RotateCcw,
  Search,
  Globe,
  Shield,
  Code,
  FileUp,
  Check,
  AlertTriangle,
  Info,
  X,
  ChevronRight,
  Monitor,
  Sun,
  Moon,
  Smartphone
} from 'lucide-react';
import { useUnifiedSettings, SettingsSection } from '../context/UnifiedSettingsContext';
import { useToast, createToastHelpers } from '../components/ui/FeedbackSystem';
import { Card, CardHeader, CardTitle, CardContent, Button } from '../components/ui';
import { LanguageType } from '../context/LanguageContext';

// Settings section configuration
const SETTINGS_SECTIONS = [
  {
    id: 'display' as SettingsSection,
    label: 'Display & Theme',
    icon: Palette,
    description: 'Customize appearance, theme, and layout preferences',
  },
  {
    id: 'accessibility' as SettingsSection,
    label: 'Accessibility',
    icon: Accessibility,
    description: 'Improve usability with accessibility options',
  },
  {
    id: 'performance' as SettingsSection,
    label: 'Performance',
    icon: Zap,
    description: 'Optimize app performance and loading behavior',
  },
  {
    id: 'upload' as SettingsSection,
    label: 'Upload & Processing',
    icon: FileUp,
    description: 'Configure document upload and AI processing settings',
  },
  {
    id: 'privacy' as SettingsSection,
    label: 'Privacy & Data',
    icon: Shield,
    description: 'Control data collection and privacy settings',
  },
  {
    id: 'advanced' as SettingsSection,
    label: 'Advanced',
    icon: Code,
    description: 'Developer and experimental features',
  },
];

// Language options
const LANGUAGE_OPTIONS = [
  { code: 'en' as LanguageType, name: 'English', flag: '🇺🇸' },
  { code: 'mk' as LanguageType, name: 'Македонски', flag: '🇲🇰' },
  { code: 'fr' as LanguageType, name: 'Français', flag: '🇫🇷' },
];

// Theme options
const THEME_OPTIONS = [
  { value: 'light', label: 'Light', icon: Sun, description: 'Light theme' },
  { value: 'dark', label: 'Dark', icon: Moon, description: 'Dark theme' },
  { value: 'system', label: 'System', icon: Monitor, description: 'Follow system preference' },
];

const ImprovedSettings: React.FC = () => {
  const {
    settings,
    updateSetting,
    updateSettings,
    resetSettings,
    resetSection,
    exportSettings,
    importSettings,
    isLoading,
    hasUnsavedChanges,
    saveSettings,
    getSettingsBySection,
  } = useUnifiedSettings();
  
  const { addToast } = useToast();
  const toast = createToastHelpers(addToast);
  
  const [activeSection, setActiveSection] = useState<SettingsSection>('display');
  const [searchTerm, setSearchTerm] = useState('');
  const [showResetConfirm, setShowResetConfirm] = useState<SettingsSection | 'all' | null>(null);
  const [importResult, setImportResult] = useState<{ success: boolean; errors: string[] } | null>(null);

  // Filter settings based on search
  const filteredSections = useMemo(() => {
    if (!searchTerm) return SETTINGS_SECTIONS;
    
    return SETTINGS_SECTIONS.filter(section =>
      section.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      section.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm]);

  // Handle export
  const handleExportSettings = () => {
    try {
      const data = exportSettings();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `appvault-settings-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('Settings Exported', 'Your settings have been downloaded as a JSON file.');
    } catch (error) {
      toast.error('Export Failed', 'Failed to export settings.');
    }
  };

  // Handle import
  const handleImportSettings = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result as string;
        const result = importSettings(data);
        setImportResult(result);
        
        if (result.success) {
          toast.success('Settings Imported', `Successfully imported settings${result.errors.length > 0 ? ' with some warnings' : ''}.`);
        } else {
          toast.error('Import Failed', 'The settings file is invalid or corrupted.');
        }
      } catch (error) {
        toast.error('Import Failed', 'Failed to read the settings file.');
        setImportResult({ success: false, errors: ['Failed to read file'] });
      }
    };
    reader.readAsText(file);
    
    // Reset the input
    event.target.value = '';
  };

  // Handle reset
  const handleReset = async (target: SettingsSection | 'all') => {
    try {
      if (target === 'all') {
        resetSettings();
        toast.success('Settings Reset', 'All settings have been reset to defaults.');
      } else {
        resetSection(target);
        toast.success('Section Reset', `${SETTINGS_SECTIONS.find(s => s.id === target)?.label} settings have been reset.`);
      }
    } catch (error) {
      toast.error('Reset Failed', 'Failed to reset settings.');
    } finally {
      setShowResetConfirm(null);
    }
  };

  // Save settings manually
  const handleSaveSettings = async () => {
    try {
      await saveSettings();
      toast.success('Settings Saved', 'All settings have been saved successfully.');
    } catch (error) {
      toast.error('Save Failed', 'Failed to save settings.');
    }
  };

  // Render setting control based on type
  const renderSettingControl = (key: string, value: any, schema: any) => {
    const commonProps = {
      className: "transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500",
    };

    if (schema.type === 'boolean') {
      return (
        <label className="flex items-center space-x-3 cursor-pointer">
          <input
            type="checkbox"
            checked={value}
            onChange={(e) => updateSetting(key as any, e.target.checked)}
            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          <span className="text-gray-700 dark:text-gray-300">{key.replace(/([A-Z])/g, ' $1').toLowerCase()}</span>
        </label>
      );
    }

    if (schema.type === 'number') {
      return (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {key.replace(/([A-Z])/g, ' $1')} ({value})
          </label>
          <input
            type="range"
            min={schema.min}
            max={schema.max}
            value={value}
            onChange={(e) => updateSetting(key as any, parseInt(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>{schema.min}</span>
            <span>{schema.max}</span>
          </div>
        </div>
      );
    }

    if (schema.type === 'string' && schema.values) {
      return (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {key.replace(/([A-Z])/g, ' $1')}
          </label>
          <select
            value={value}
            onChange={(e) => updateSetting(key as any, e.target.value)}
            className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500"
          >
            {schema.values.map((option: string) => (
              <option key={option} value={option}>
                {option.charAt(0).toUpperCase() + option.slice(1)}
              </option>
            ))}
          </select>
        </div>
      );
    }

    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {key.replace(/([A-Z])/g, ' $1')}
        </label>
        <input
          type="text"
          value={value}
          onChange={(e) => updateSetting(key as any, e.target.value)}
          className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500"
        />
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Settings
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Customize your AppVault experience
        </p>
        {hasUnsavedChanges && (
          <div className="mt-2 inline-flex items-center px-3 py-1 rounded-full text-sm bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200">
            <AlertTriangle className="w-4 h-4 mr-1" />
            Unsaved changes
          </div>
        )}
      </div>

      {/* Search Bar */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search settings..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Navigation */}
        <div className="lg:col-span-1">
          <Card className="sticky top-6">
            <CardContent className="p-4">
              <nav className="space-y-2">
                {filteredSections.map((section) => {
                  const Icon = section.icon;
                  const isActive = activeSection === section.id;
                  
                  return (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors text-left ${
                        isActive
                          ? 'bg-primary-100 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                    >
                      <Icon className="w-5 h-5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{section.label}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {section.description}
                        </div>
                      </div>
                      <ChevronRight className={`w-4 h-4 transition-transform ${isActive ? 'rotate-90' : ''}`} />
                    </button>
                  );
                })}
              </nav>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              {/* Display Settings */}
              {activeSection === 'display' && (
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <Palette className="w-5 h-5" />
                        <span>Display & Theme</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Theme Selection */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                          Theme Preference
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {THEME_OPTIONS.map((option) => {
                            const Icon = option.icon;
                            const isSelected = settings.theme === option.value;
                            
                            return (
                              <button
                                key={option.value}
                                onClick={() => updateSetting('theme', option.value as any)}
                                className={`flex items-center space-x-3 p-4 rounded-lg border-2 transition-colors ${
                                  isSelected
                                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                }`}
                              >
                                <Icon className="w-5 h-5" />
                                <div className="text-left">
                                  <div className="font-medium">{option.label}</div>
                                  <div className="text-xs text-gray-500">{option.description}</div>
                                </div>
                                {isSelected && <Check className="w-5 h-5 text-primary-500 ml-auto" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Language Selection */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                          Language
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {LANGUAGE_OPTIONS.map((lang) => {
                            const isSelected = settings.language === lang.code;
                            
                            return (
                              <button
                                key={lang.code}
                                onClick={() => updateSetting('language', lang.code)}
                                className={`flex items-center space-x-3 p-4 rounded-lg border-2 transition-colors ${
                                  isSelected
                                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                                }`}
                              >
                                <span className="text-2xl">{lang.flag}</span>
                                <div className="text-left flex-1">
                                  <div className="font-medium">{lang.name}</div>
                                  <div className="text-xs text-gray-500">{lang.code.toUpperCase()}</div>
                                </div>
                                {isSelected && <Check className="w-5 h-5 text-primary-500" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* View Mode */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                          Default View Mode
                        </label>
                        <select
                          value={settings.viewMode}
                          onChange={(e) => updateSetting('viewMode', e.target.value as any)}
                          className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500"
                        >
                          <option value="grid">Grid View</option>
                          <option value="list">List View</option>
                          <option value="table">Table View</option>
                        </select>
                      </div>

                      {/* Items per page */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                          Items per page: {settings.itemsPerPage}
                        </label>
                        <input
                          type="range"
                          min={5}
                          max={200}
                          value={settings.itemsPerPage}
                          onChange={(e) => updateSetting('itemsPerPage', parseInt(e.target.value))}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                        />
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                          <span>5</span>
                          <span>200</span>
                        </div>
                      </div>

                      {/* Display Options */}
                      <div className="space-y-4">
                        <h4 className="font-medium text-gray-900 dark:text-white">Display Options</h4>
                        
                        <label className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={settings.showPreviews}
                            onChange={(e) => updateSetting('showPreviews', e.target.checked)}
                            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                          />
                          <span className="text-gray-700 dark:text-gray-300">Show document previews</span>
                        </label>

                        <label className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={settings.compactMode}
                            onChange={(e) => updateSetting('compactMode', e.target.checked)}
                            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                          />
                          <span className="text-gray-700 dark:text-gray-300">Compact mode (more items per screen)</span>
                        </label>

                        <label className="flex items-center space-x-3">
                          <input
                            type="checkbox"
                            checked={settings.enableAnimations}
                            onChange={(e) => updateSetting('enableAnimations', e.target.checked)}
                            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                          />
                          <span className="text-gray-700 dark:text-gray-300">Enable animations and transitions</span>
                        </label>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Accessibility Settings */}
              {activeSection === 'accessibility' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Accessibility className="w-5 h-5" />
                      <span>Accessibility Options</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <label className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={settings.highContrast}
                          onChange={(e) => updateSetting('highContrast', e.target.checked)}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <div>
                          <span className="text-gray-700 dark:text-gray-300">High contrast mode</span>
                          <p className="text-sm text-gray-500">Increases contrast for better visibility</p>
                        </div>
                      </label>

                      <label className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={settings.reducedMotion}
                          onChange={(e) => updateSetting('reducedMotion', e.target.checked)}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <div>
                          <span className="text-gray-700 dark:text-gray-300">Reduce motion and animations</span>
                          <p className="text-sm text-gray-500">Minimizes animations that may cause discomfort</p>
                        </div>
                      </label>

                      <label className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={settings.largeText}
                          onChange={(e) => updateSetting('largeText', e.target.checked)}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <div>
                          <span className="text-gray-700 dark:text-gray-300">Large text size</span>
                          <p className="text-sm text-gray-500">Increases text size throughout the app</p>
                        </div>
                      </label>

                      <label className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={settings.keyboardNavigation}
                          onChange={(e) => updateSetting('keyboardNavigation', e.target.checked)}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <div>
                          <span className="text-gray-700 dark:text-gray-300">Enhanced keyboard navigation</span>
                          <p className="text-sm text-gray-500">Improved keyboard shortcuts and focus indicators</p>
                        </div>
                      </label>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Performance Settings */}
              {activeSection === 'performance' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Zap className="w-5 h-5" />
                      <span>Performance Settings</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <label className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={settings.lazyLoading}
                          onChange={(e) => updateSetting('lazyLoading', e.target.checked)}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <div>
                          <span className="text-gray-700 dark:text-gray-300">Enable lazy loading for images</span>
                          <p className="text-sm text-gray-500">Load images only when they come into view</p>
                        </div>
                      </label>

                      <label className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={settings.autoRefresh}
                          onChange={(e) => updateSetting('autoRefresh', e.target.checked)}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <div>
                          <span className="text-gray-700 dark:text-gray-300">Auto-refresh document list</span>
                          <p className="text-sm text-gray-500">Automatically refresh the document list every 30 seconds</p>
                        </div>
                      </label>
                    </div>

                    {/* Sorting preferences */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                          Default Sort By
                        </label>
                        <select
                          value={settings.defaultSortBy}
                          onChange={(e) => updateSetting('defaultSortBy', e.target.value as any)}
                          className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500"
                        >
                          <option value="date">Date</option>
                          <option value="name">Name</option>
                          <option value="size">Size</option>
                          <option value="type">Type</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                          Default Sort Order
                        </label>
                        <select
                          value={settings.defaultSortOrder}
                          onChange={(e) => updateSetting('defaultSortOrder', e.target.value as any)}
                          className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500"
                        >
                          <option value="asc">Ascending</option>
                          <option value="desc">Descending</option>
                        </select>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Upload Settings */}
              {activeSection === 'upload' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <FileUp className="w-5 h-5" />
                      <span>Upload & Processing</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                          Default Category
                        </label>
                        <select
                          value={settings.defaultCategory}
                          onChange={(e) => updateSetting('defaultCategory', e.target.value)}
                          className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500"
                        >
                          <option value="personal">Personal</option>
                          <option value="bills">Bills</option>
                          <option value="medical">Medical</option>
                          <option value="insurance">Insurance</option>
                          <option value="other">Other</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                          Compression Level
                        </label>
                        <select
                          value={settings.compressionLevel}
                          onChange={(e) => updateSetting('compressionLevel', e.target.value as any)}
                          className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500"
                        >
                          <option value="low">Low (Better quality)</option>
                          <option value="medium">Medium (Balanced)</option>
                          <option value="high">High (Smaller files)</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <label className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={settings.autoProcessAI}
                          onChange={(e) => updateSetting('autoProcessAI', e.target.checked)}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <div>
                          <span className="text-gray-700 dark:text-gray-300">Auto-process with AI</span>
                          <p className="text-sm text-gray-500">Automatically extract text and metadata from uploaded documents</p>
                        </div>
                      </label>

                      <label className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={settings.autoSave}
                          onChange={(e) => updateSetting('autoSave', e.target.checked)}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <div>
                          <span className="text-gray-700 dark:text-gray-300">Auto-save changes</span>
                          <p className="text-sm text-gray-500">Automatically save document changes as you type</p>
                        </div>
                      </label>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Privacy Settings */}
              {activeSection === 'privacy' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Shield className="w-5 h-5" />
                      <span>Privacy & Data</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <label className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={settings.analyticsEnabled}
                          onChange={(e) => updateSetting('analyticsEnabled', e.target.checked)}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <div>
                          <span className="text-gray-700 dark:text-gray-300">Enable analytics</span>
                          <p className="text-sm text-gray-500">Help improve the app by sharing anonymous usage data</p>
                        </div>
                      </label>

                      <label className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={settings.crashReportingEnabled}
                          onChange={(e) => updateSetting('crashReportingEnabled', e.target.checked)}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <div>
                          <span className="text-gray-700 dark:text-gray-300">Enable crash reporting</span>
                          <p className="text-sm text-gray-500">Automatically send crash reports to help fix bugs</p>
                        </div>
                      </label>

                      <label className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={settings.enableNotifications}
                          onChange={(e) => updateSetting('enableNotifications', e.target.checked)}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <div>
                          <span className="text-gray-700 dark:text-gray-300">Enable notifications</span>
                          <p className="text-sm text-gray-500">Receive notifications about uploads, processing, and other events</p>
                        </div>
                      </label>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Advanced Settings */}
              {activeSection === 'advanced' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Code className="w-5 h-5" />
                      <span>Advanced Settings</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                      <div className="flex items-start space-x-3">
                        <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                            Advanced Features
                          </h4>
                          <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                            These settings are for advanced users and developers. Changing them may affect app stability.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <label className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={settings.showTutorials}
                          onChange={(e) => updateSetting('showTutorials', e.target.checked)}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <div>
                          <span className="text-gray-700 dark:text-gray-300">Show tutorials and onboarding</span>
                          <p className="text-sm text-gray-500">Display helpful tutorials for new features</p>
                        </div>
                      </label>

                      <label className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={settings.developerMode}
                          onChange={(e) => updateSetting('developerMode', e.target.checked)}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <div>
                          <span className="text-gray-700 dark:text-gray-300">Developer mode</span>
                          <p className="text-sm text-gray-500">Enable developer tools and advanced features</p>
                        </div>
                      </label>

                      <label className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={settings.debugMode}
                          onChange={(e) => updateSetting('debugMode', e.target.checked)}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <div>
                          <span className="text-gray-700 dark:text-gray-300">Debug mode</span>
                          <p className="text-sm text-gray-500">Show detailed error messages and debug information</p>
                        </div>
                      </label>

                      <label className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={settings.experimentalFeatures}
                          onChange={(e) => updateSetting('experimentalFeatures', e.target.checked)}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <div>
                          <span className="text-gray-700 dark:text-gray-300">Experimental features</span>
                          <p className="text-sm text-gray-500">Enable experimental features that are still in development</p>
                        </div>
                      </label>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Section Actions */}
              <Card className="bg-gray-50 dark:bg-gray-800">
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                        {SETTINGS_SECTIONS.find(s => s.id === activeSection)?.label} Settings
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {hasUnsavedChanges ? 'You have unsaved changes' : 'All changes are automatically saved'}
                      </p>
                    </div>
                    
                    <div className="flex space-x-3">
                      <Button
                        variant="outline"
                        onClick={() => setShowResetConfirm(activeSection)}
                        size="sm"
                      >
                        Reset Section
                      </Button>
                      
                      {hasUnsavedChanges && (
                        <Button
                          variant="primary"
                          onClick={handleSaveSettings}
                          leftIcon={<Save className="w-4 h-4" />}
                          size="sm"
                        >
                          Save Now
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Global Actions */}
      <Card className="bg-gray-50 dark:bg-gray-800">
        <CardHeader>
          <CardTitle>Settings Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Button
              variant="outline"
              onClick={handleExportSettings}
              leftIcon={<Download className="w-4 h-4" />}
              className="justify-center"
            >
              Export Settings
            </Button>
            
            <label className="relative">
              <input
                type="file"
                accept=".json"
                onChange={handleImportSettings}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <Button
                variant="outline"
                leftIcon={<UploadIcon className="w-4 h-4" />}
                className="w-full justify-center"
              >
                Import Settings
              </Button>
            </label>
            
            <Button
              variant="danger"
              onClick={() => setShowResetConfirm('all')}
              leftIcon={<RotateCcw className="w-4 h-4" />}
              className="justify-center"
            >
              Reset All
            </Button>
          </div>

          {/* Import Result */}
          {importResult && (
            <div className={`mt-4 p-4 rounded-lg ${
              importResult.success 
                ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' 
                : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
            }`}>
              <div className="flex items-start space-x-3">
                {importResult.success ? (
                  <Check className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                ) : (
                  <X className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <h4 className={`text-sm font-medium ${
                    importResult.success 
                      ? 'text-green-800 dark:text-green-200' 
                      : 'text-red-800 dark:text-red-200'
                  }`}>
                    Import {importResult.success ? 'Successful' : 'Failed'}
                  </h4>
                  {importResult.errors.length > 0 && (
                    <ul className={`text-sm mt-2 space-y-1 ${
                      importResult.success 
                        ? 'text-green-700 dark:text-green-300' 
                        : 'text-red-700 dark:text-red-300'
                    }`}>
                      {importResult.errors.map((error, index) => (
                        <li key={index}>• {error}</li>
                      ))}
                    </ul>
                  )}
                </div>
                <button
                  onClick={() => setImportResult(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6"
          >
            <div className="flex items-center space-x-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-red-500" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Confirm Reset
              </h3>
            </div>
            
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to reset {showResetConfirm === 'all' ? 'all settings' : `${SETTINGS_SECTIONS.find(s => s.id === showResetConfirm)?.label} settings`} to their default values? This action cannot be undone.
            </p>
            
            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={() => setShowResetConfirm(null)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={() => handleReset(showResetConfirm)}
                className="flex-1"
              >
                Reset
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default ImprovedSettings;