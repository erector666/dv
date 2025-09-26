import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { LanguageType } from './LanguageContext';

// Unified Settings Interface
export interface UnifiedSettings {
  // Theme Settings
  theme: 'light' | 'dark' | 'system';
  
  // Language Settings
  language: LanguageType;
  
  // Display Settings
  viewMode: 'grid' | 'list' | 'table';
  itemsPerPage: number;
  showPreviews: boolean;
  compactMode: boolean;
  
  // Sorting Settings
  defaultSortBy: 'date' | 'name' | 'size' | 'type';
  defaultSortOrder: 'asc' | 'desc';
  
  // Performance Settings
  enableAnimations: boolean;
  autoRefresh: boolean;
  lazyLoading: boolean;
  
  // Accessibility Settings
  highContrast: boolean;
  reducedMotion: boolean;
  largeText: boolean;
  keyboardNavigation: boolean;
  
  // Feature Settings
  showTutorials: boolean;
  autoSave: boolean;
  enableNotifications: boolean;
  
  // Upload Settings
  defaultCategory: string;
  autoProcessAI: boolean;
  compressionLevel: 'low' | 'medium' | 'high';
  
  // Privacy Settings
  analyticsEnabled: boolean;
  crashReportingEnabled: boolean;
  
  // Advanced Settings
  developerMode: boolean;
  debugMode: boolean;
  experimentalFeatures: boolean;
}

// Settings validation schema
const SETTINGS_SCHEMA = {
  theme: { type: 'string', values: ['light', 'dark', 'system'] },
  language: { type: 'string', values: ['en', 'mk', 'fr'] },
  viewMode: { type: 'string', values: ['grid', 'list', 'table'] },
  itemsPerPage: { type: 'number', min: 5, max: 200 },
  showPreviews: { type: 'boolean' },
  compactMode: { type: 'boolean' },
  defaultSortBy: { type: 'string', values: ['date', 'name', 'size', 'type'] },
  defaultSortOrder: { type: 'string', values: ['asc', 'desc'] },
  enableAnimations: { type: 'boolean' },
  autoRefresh: { type: 'boolean' },
  lazyLoading: { type: 'boolean' },
  highContrast: { type: 'boolean' },
  reducedMotion: { type: 'boolean' },
  largeText: { type: 'boolean' },
  keyboardNavigation: { type: 'boolean' },
  showTutorials: { type: 'boolean' },
  autoSave: { type: 'boolean' },
  enableNotifications: { type: 'boolean' },
  defaultCategory: { type: 'string' },
  autoProcessAI: { type: 'boolean' },
  compressionLevel: { type: 'string', values: ['low', 'medium', 'high'] },
  analyticsEnabled: { type: 'boolean' },
  crashReportingEnabled: { type: 'boolean' },
  developerMode: { type: 'boolean' },
  debugMode: { type: 'boolean' },
  experimentalFeatures: { type: 'boolean' },
} as const;

// Default settings with system preference detection
const getDefaultSettings = (): UnifiedSettings => {
  const systemTheme = window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ? 'dark' : 'light';
  const systemReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
  const systemHighContrast = window.matchMedia?.('(prefers-contrast: high)')?.matches ?? false;
  const browserLanguage = navigator.language.split('-')[0];
  const detectedLanguage = ['en', 'mk', 'fr'].includes(browserLanguage) ? browserLanguage as LanguageType : 'en';

  return {
    // Theme
    theme: 'system',
    
    // Language
    language: detectedLanguage,
    
    // Display
    viewMode: 'grid',
    itemsPerPage: 20,
    showPreviews: true,
    compactMode: false,
    
    // Sorting
    defaultSortBy: 'date',
    defaultSortOrder: 'desc',
    
    // Performance
    enableAnimations: !systemReducedMotion,
    autoRefresh: false,
    lazyLoading: true,
    
    // Accessibility
    highContrast: systemHighContrast,
    reducedMotion: systemReducedMotion,
    largeText: false,
    keyboardNavigation: true,
    
    // Features
    showTutorials: true,
    autoSave: true,
    enableNotifications: true,
    
    // Upload
    defaultCategory: 'personal',
    autoProcessAI: true,
    compressionLevel: 'medium',
    
    // Privacy
    analyticsEnabled: true,
    crashReportingEnabled: true,
    
    // Advanced
    developerMode: false,
    debugMode: false,
    experimentalFeatures: false,
  };
};

// Settings validation function
const validateSetting = <K extends keyof UnifiedSettings>(
  key: K,
  value: unknown
): value is UnifiedSettings[K] => {
  const schema = SETTINGS_SCHEMA[key];
  
  if (schema.type === 'boolean') {
    return typeof value === 'boolean';
  }
  
  if (schema.type === 'number') {
    if (typeof value !== 'number') return false;
    if ('min' in schema && value < schema.min) return false;
    if ('max' in schema && value > schema.max) return false;
    return true;
  }
  
  if (schema.type === 'string') {
    if (typeof value !== 'string') return false;
    if ('values' in schema && !schema.values.includes(value as any)) return false;
    return true;
  }
  
  return false;
};

// Settings Context Interface
interface UnifiedSettingsContextType {
  settings: UnifiedSettings;
  updateSetting: <K extends keyof UnifiedSettings>(key: K, value: UnifiedSettings[K]) => void;
  updateSettings: (updates: Partial<UnifiedSettings>) => void;
  resetSettings: () => void;
  resetSection: (section: SettingsSection) => void;
  exportSettings: () => string;
  importSettings: (data: string) => { success: boolean; errors: string[] };
  isLoading: boolean;
  hasUnsavedChanges: boolean;
  saveSettings: () => Promise<void>;
  getSettingsBySection: (section: SettingsSection) => Partial<UnifiedSettings>;
}

// Settings sections for better organization
export type SettingsSection = 'display' | 'accessibility' | 'performance' | 'privacy' | 'advanced' | 'upload';

const SETTINGS_SECTIONS: Record<SettingsSection, (keyof UnifiedSettings)[]> = {
  display: ['theme', 'language', 'viewMode', 'itemsPerPage', 'showPreviews', 'compactMode'],
  accessibility: ['highContrast', 'reducedMotion', 'largeText', 'keyboardNavigation'],
  performance: ['enableAnimations', 'autoRefresh', 'lazyLoading', 'defaultSortBy', 'defaultSortOrder'],
  privacy: ['analyticsEnabled', 'crashReportingEnabled', 'enableNotifications'],
  advanced: ['developerMode', 'debugMode', 'experimentalFeatures', 'showTutorials'],
  upload: ['defaultCategory', 'autoProcessAI', 'compressionLevel', 'autoSave'],
};

const UnifiedSettingsContext = createContext<UnifiedSettingsContextType | undefined>(undefined);

// Custom hook
export const useUnifiedSettings = () => {
  const context = useContext(UnifiedSettingsContext);
  if (!context) {
    throw new Error('useUnifiedSettings must be used within a UnifiedSettingsProvider');
  }
  return context;
};

// Debounce utility
const useDebounce = <T extends any[]>(callback: (...args: T) => void, delay: number) => {
  const timeoutRef = React.useRef<NodeJS.Timeout>();
  
  return useCallback((...args: T) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => callback(...args), delay);
  }, [callback, delay]);
};

// Provider Component
interface UnifiedSettingsProviderProps {
  children: React.ReactNode;
}

export const UnifiedSettingsProvider: React.FC<UnifiedSettingsProviderProps> = ({ children }) => {
  const [settings, setSettings] = useState<UnifiedSettings>(getDefaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<Partial<UnifiedSettings>>({});

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setIsLoading(true);
        const stored = localStorage.getItem('unifiedSettings');
        if (stored) {
          const parsed = JSON.parse(stored);
          const validatedSettings = { ...getDefaultSettings() };
          
          // Validate and merge stored settings
          Object.entries(parsed).forEach(([key, value]) => {
            if (key in SETTINGS_SCHEMA && validateSetting(key as keyof UnifiedSettings, value)) {
              (validatedSettings as any)[key] = value;
            }
          });
          
          setSettings(validatedSettings);
        }
      } catch (error) {
        console.warn('Failed to load settings:', error);
        setSettings(getDefaultSettings());
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  // Debounced save function
  const debouncedSave = useDebounce((settingsToSave: UnifiedSettings) => {
    try {
      localStorage.setItem('unifiedSettings', JSON.stringify(settingsToSave));
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  }, 1000);

  // Update single setting
  const updateSetting = useCallback(<K extends keyof UnifiedSettings>(
    key: K,
    value: UnifiedSettings[K]
  ) => {
    if (!validateSetting(key, value)) {
      console.warn(`Invalid value for setting ${key}:`, value);
      return;
    }

    setSettings(prev => {
      const updated = { ...prev, [key]: value };
      debouncedSave(updated);
      return updated;
    });
    
    setHasUnsavedChanges(true);
    setPendingChanges(prev => ({ ...prev, [key]: value }));
  }, [debouncedSave]);

  // Update multiple settings
  const updateSettings = useCallback((updates: Partial<UnifiedSettings>) => {
    const validUpdates: Partial<UnifiedSettings> = {};
    
    Object.entries(updates).forEach(([key, value]) => {
      if (key in SETTINGS_SCHEMA && validateSetting(key as keyof UnifiedSettings, value)) {
        (validUpdates as any)[key] = value;
      }
    });

    setSettings(prev => {
      const updated = { ...prev, ...validUpdates };
      debouncedSave(updated);
      return updated;
    });
    
    setHasUnsavedChanges(true);
    setPendingChanges(prev => ({ ...prev, ...validUpdates }));
  }, [debouncedSave]);

  // Reset all settings
  const resetSettings = useCallback(() => {
    const defaults = getDefaultSettings();
    setSettings(defaults);
    setHasUnsavedChanges(false);
    setPendingChanges({});
    
    try {
      localStorage.removeItem('unifiedSettings');
    } catch (error) {
      console.warn('Failed to clear settings:', error);
    }
  }, []);

  // Reset settings section
  const resetSection = useCallback((section: SettingsSection) => {
    const defaults = getDefaultSettings();
    const sectionKeys = SETTINGS_SECTIONS[section];
    const sectionDefaults: Partial<UnifiedSettings> = {};
    
    sectionKeys.forEach(key => {
      (sectionDefaults as any)[key] = defaults[key];
    });
    
    updateSettings(sectionDefaults);
  }, [updateSettings]);

  // Export settings
  const exportSettings = useCallback(() => {
    const exportData = {
      settings,
      exportedAt: new Date().toISOString(),
      version: '1.0.0',
    };
    return JSON.stringify(exportData, null, 2);
  }, [settings]);

  // Import settings
  const importSettings = useCallback((data: string): { success: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    try {
      const parsed = JSON.parse(data);
      
      if (!parsed.settings || typeof parsed.settings !== 'object') {
        errors.push('Invalid settings format');
        return { success: false, errors };
      }
      
      const validSettings: Partial<UnifiedSettings> = {};
      
      Object.entries(parsed.settings).forEach(([key, value]) => {
        if (key in SETTINGS_SCHEMA) {
          if (validateSetting(key as keyof UnifiedSettings, value)) {
            (validSettings as any)[key] = value;
          } else {
            errors.push(`Invalid value for ${key}: ${value}`);
          }
        } else {
          errors.push(`Unknown setting: ${key}`);
        }
      });
      
      if (Object.keys(validSettings).length > 0) {
        updateSettings(validSettings);
        return { success: true, errors };
      } else {
        errors.push('No valid settings found');
        return { success: false, errors };
      }
    } catch (error) {
      errors.push('Failed to parse settings file');
      return { success: false, errors };
    }
  }, [updateSettings]);

  // Force save settings
  const saveSettings = useCallback(async () => {
    try {
      localStorage.setItem('unifiedSettings', JSON.stringify(settings));
      setHasUnsavedChanges(false);
      setPendingChanges({});
    } catch (error) {
      console.error('Failed to save settings:', error);
      throw error;
    }
  }, [settings]);

  // Get settings by section
  const getSettingsBySection = useCallback((section: SettingsSection) => {
    const sectionKeys = SETTINGS_SECTIONS[section];
    const sectionSettings: Partial<UnifiedSettings> = {};
    
    sectionKeys.forEach(key => {
      (sectionSettings as any)[key] = settings[key];
    });
    
    return sectionSettings;
  }, [settings]);

  // Apply settings to DOM
  useEffect(() => {
    const root = document.documentElement;
    
    // Theme
    const effectiveTheme = settings.theme === 'system' 
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : settings.theme;
    
    root.classList.remove('light', 'dark');
    root.classList.add(effectiveTheme);
    
    // Language
    root.setAttribute('lang', settings.language);
    
    // Accessibility
    root.classList.toggle('high-contrast', settings.highContrast);
    root.classList.toggle('reduce-motion', settings.reducedMotion);
    root.classList.toggle('large-text', settings.largeText);
    
    // CSS custom properties
    root.style.setProperty('--animations-enabled', settings.enableAnimations ? '1' : '0');
    root.style.setProperty('--compact-mode', settings.compactMode ? '1' : '0');
    
    // Meta theme color
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', effectiveTheme === 'dark' ? '#0f172a' : '#ffffff');
    }
  }, [settings]);

  // Listen for system preference changes
  useEffect(() => {
    if (settings.theme !== 'system') return;
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      // Trigger re-render for system theme
      setSettings(prev => ({ ...prev }));
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [settings.theme]);

  const value = useMemo<UnifiedSettingsContextType>(() => ({
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
  }), [
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
  ]);

  return (
    <UnifiedSettingsContext.Provider value={value}>
      {children}
    </UnifiedSettingsContext.Provider>
  );
};

// Compatibility hooks for existing code
export const useTheme = () => {
  const { settings, updateSetting } = useUnifiedSettings();
  
  return {
    theme: settings.theme === 'system' 
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : settings.theme,
    setTheme: (theme: 'light' | 'dark') => updateSetting('theme', theme),
    toggleTheme: () => {
      const currentTheme = settings.theme === 'system' 
        ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
        : settings.theme;
      updateSetting('theme', currentTheme === 'light' ? 'dark' : 'light');
    },
  };
};

export const useLanguage = () => {
  const { settings, updateSetting } = useUnifiedSettings();
  
  return {
    language: settings.language,
    setLanguage: (language: LanguageType) => updateSetting('language', language),
    translate: (key: string, params?: Record<string, any>) => {
      // This should integrate with the existing translation system
      return key; // Placeholder
    },
  };
};

export const useUserPreferences = () => {
  const { settings, updateSetting, updateSettings, resetSettings, exportSettings, importSettings } = useUnifiedSettings();
  
  return {
    preferences: settings,
    updatePreference: updateSetting,
    updatePreferences: updateSettings,
    resetPreferences: resetSettings,
    exportPreferences: exportSettings,
    importPreferences: (data: string) => {
      const result = importSettings(data);
      return result.success;
    },
  };
};