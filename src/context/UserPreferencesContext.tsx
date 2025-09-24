import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface UserPreferences {
  // Display preferences
  viewMode: 'grid' | 'list' | 'table';
  itemsPerPage: number;
  showPreviews: boolean;
  compactMode: boolean;
  
  // Sorting preferences
  defaultSortBy: 'date' | 'name' | 'size' | 'type';
  defaultSortOrder: 'asc' | 'desc';
  
  // Performance preferences
  enableAnimations: boolean;
  autoRefresh: boolean;
  lazyLoading: boolean;
  
  // Accessibility preferences
  highContrast: boolean;
  reducedMotion: boolean;
  largeText: boolean;
  keyboardNavigation: boolean;
  
  // Feature preferences
  showTutorials: boolean;
  autoSave: boolean;
  enableNotifications: boolean;
  
  // Upload preferences
  defaultCategory: string;
  autoProcessAI: boolean;
  compressionLevel: 'low' | 'medium' | 'high';
}

interface UserPreferencesContextType {
  preferences: UserPreferences;
  updatePreference: <K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K]
  ) => void;
  resetPreferences: () => void;
  exportPreferences: () => string;
  importPreferences: (data: string) => boolean;
}

const defaultPreferences: UserPreferences = {
  // Display
  viewMode: 'grid',
  itemsPerPage: 20,
  showPreviews: true,
  compactMode: false,
  
  // Sorting
  defaultSortBy: 'date',
  defaultSortOrder: 'desc',
  
  // Performance
  enableAnimations: true,
  autoRefresh: false,
  lazyLoading: true,
  
  // Accessibility
  highContrast: false,
  reducedMotion: false,
  largeText: false,
  keyboardNavigation: true,
  
  // Features
  showTutorials: true,
  autoSave: true,
  enableNotifications: true,
  
  // Upload
  defaultCategory: 'personal',
  autoProcessAI: true,
  compressionLevel: 'medium'
};

const UserPreferencesContext = createContext<UserPreferencesContextType | undefined>(undefined);

export const useUserPreferences = () => {
  const context = useContext(UserPreferencesContext);
  if (!context) {
    throw new Error('useUserPreferences must be used within a UserPreferencesProvider');
  }
  return context;
};

interface UserPreferencesProviderProps {
  children: ReactNode;
}

export const UserPreferencesProvider: React.FC<UserPreferencesProviderProps> = ({ children }) => {
  const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences);

  // Load preferences from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('userPreferences');
      if (stored) {
        const parsed = JSON.parse(stored);
        setPreferences({ ...defaultPreferences, ...parsed });
      }
    } catch (error) {
      console.warn('Failed to load user preferences:', error);
    }
  }, []);

  // Detect system preferences
  useEffect(() => {
    // Detect reduced motion preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mediaQuery.matches) {
      updatePreference('reducedMotion', true);
      updatePreference('enableAnimations', false);
    }

    // Detect high contrast preference
    const contrastQuery = window.matchMedia('(prefers-contrast: high)');
    if (contrastQuery.matches) {
      updatePreference('highContrast', true);
    }

    // Listen for changes
    const handleMotionChange = (e: MediaQueryListEvent) => {
      updatePreference('reducedMotion', e.matches);
      updatePreference('enableAnimations', !e.matches);
    };

    const handleContrastChange = (e: MediaQueryListEvent) => {
      updatePreference('highContrast', e.matches);
    };

    mediaQuery.addEventListener('change', handleMotionChange);
    contrastQuery.addEventListener('change', handleContrastChange);

    return () => {
      mediaQuery.removeEventListener('change', handleMotionChange);
      contrastQuery.removeEventListener('change', handleContrastChange);
    };
  }, []);

  const updatePreference = <K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K]
  ) => {
    setPreferences(prev => {
      const updated = { ...prev, [key]: value };
      
      // Save to localStorage
      try {
        localStorage.setItem('userPreferences', JSON.stringify(updated));
      } catch (error) {
        console.warn('Failed to save user preferences:', error);
      }
      
      return updated;
    });
  };

  const resetPreferences = () => {
    setPreferences(defaultPreferences);
    try {
      localStorage.removeItem('userPreferences');
    } catch (error) {
      console.warn('Failed to clear user preferences:', error);
    }
  };

  const exportPreferences = () => {
    return JSON.stringify(preferences, null, 2);
  };

  const importPreferences = (data: string): boolean => {
    try {
      const parsed = JSON.parse(data);
      const validPreferences = { ...defaultPreferences, ...parsed };
      setPreferences(validPreferences);
      localStorage.setItem('userPreferences', JSON.stringify(validPreferences));
      return true;
    } catch (error) {
      console.error('Failed to import preferences:', error);
      return false;
    }
  };

  // Apply preferences to document root for CSS custom properties
  useEffect(() => {
    const root = document.documentElement;
    
    // Apply accessibility preferences
    if (preferences.highContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }

    if (preferences.reducedMotion) {
      root.classList.add('reduce-motion');
    } else {
      root.classList.remove('reduce-motion');
    }

    if (preferences.largeText) {
      root.classList.add('large-text');
    } else {
      root.classList.remove('large-text');
    }

    // Set CSS custom properties
    root.style.setProperty('--animations-enabled', preferences.enableAnimations ? '1' : '0');
    root.style.setProperty('--compact-mode', preferences.compactMode ? '1' : '0');
  }, [preferences]);

  const value: UserPreferencesContextType = {
    preferences,
    updatePreference,
    resetPreferences,
    exportPreferences,
    importPreferences
  };

  return (
    <UserPreferencesContext.Provider value={value}>
      {children}
    </UserPreferencesContext.Provider>
  );
};