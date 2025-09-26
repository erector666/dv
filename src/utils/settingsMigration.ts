import { UnifiedSettings } from '../context/UnifiedSettingsContext';
import { LanguageType } from '../context/LanguageContext';

// Legacy settings interfaces for migration
interface LegacyUserPreferences {
  viewMode: 'grid' | 'list' | 'table';
  itemsPerPage: number;
  showPreviews: boolean;
  compactMode: boolean;
  defaultSortBy: 'date' | 'name' | 'size' | 'type';
  defaultSortOrder: 'asc' | 'desc';
  enableAnimations: boolean;
  autoRefresh: boolean;
  lazyLoading: boolean;
  highContrast: boolean;
  reducedMotion: boolean;
  largeText: boolean;
  keyboardNavigation: boolean;
  showTutorials: boolean;
  autoSave: boolean;
  enableNotifications: boolean;
  defaultCategory: string;
  autoProcessAI: boolean;
  compressionLevel: 'low' | 'medium' | 'high';
}

interface LegacySettings {
  theme?: 'light' | 'dark';
  language?: LanguageType;
  userPreferences?: LegacyUserPreferences;
}

// Migration utility class
export class SettingsMigration {
  private static readonly LEGACY_KEYS = {
    THEME: 'theme',
    LANGUAGE: 'language',
    USER_PREFERENCES: 'userPreferences',
  };

  private static readonly UNIFIED_KEY = 'unifiedSettings';
  private static readonly MIGRATION_FLAG = 'settingsMigrated';

  /**
   * Check if migration is needed
   */
  static needsMigration(): boolean {
    try {
      // Check if migration has already been completed
      if (localStorage.getItem(this.MIGRATION_FLAG) === 'true') {
        return false;
      }

      // Check if unified settings already exist
      if (localStorage.getItem(this.UNIFIED_KEY)) {
        return false;
      }

      // Check if any legacy settings exist
      const hasLegacyTheme = localStorage.getItem(this.LEGACY_KEYS.THEME) !== null;
      const hasLegacyLanguage = localStorage.getItem(this.LEGACY_KEYS.LANGUAGE) !== null;
      const hasLegacyPreferences = localStorage.getItem(this.LEGACY_KEYS.USER_PREFERENCES) !== null;

      return hasLegacyTheme || hasLegacyLanguage || hasLegacyPreferences;
    } catch (error) {
      console.warn('Failed to check migration status:', error);
      return false;
    }
  }

  /**
   * Migrate legacy settings to unified format
   */
  static async migrateLegacySettings(): Promise<{
    success: boolean;
    migratedSettings: Partial<UnifiedSettings>;
    errors: string[];
  }> {
    const errors: string[] = [];
    const migratedSettings: Partial<UnifiedSettings> = {};

    try {
      // Migrate theme settings
      const legacyTheme = localStorage.getItem(this.LEGACY_KEYS.THEME);
      if (legacyTheme && ['light', 'dark'].includes(legacyTheme)) {
        migratedSettings.theme = legacyTheme as 'light' | 'dark';
      }

      // Migrate language settings
      const legacyLanguage = localStorage.getItem(this.LEGACY_KEYS.LANGUAGE);
      if (legacyLanguage && ['en', 'mk', 'fr'].includes(legacyLanguage)) {
        migratedSettings.language = legacyLanguage as LanguageType;
      }

      // Migrate user preferences
      const legacyPreferencesStr = localStorage.getItem(this.LEGACY_KEYS.USER_PREFERENCES);
      if (legacyPreferencesStr) {
        try {
          const legacyPreferences = JSON.parse(legacyPreferencesStr) as LegacyUserPreferences;
          
          // Map legacy preferences to unified settings
          Object.entries(legacyPreferences).forEach(([key, value]) => {
            if (this.isValidSettingValue(key, value)) {
              (migratedSettings as any)[key] = value;
            } else {
              errors.push(`Invalid value for ${key}: ${value}`);
            }
          });
        } catch (error) {
          errors.push('Failed to parse legacy user preferences');
        }
      }

      // Detect and migrate system preferences if not already set
      if (!migratedSettings.theme) {
        const systemPrefersDark = window.matchMedia?.('(prefers-color-scheme: dark)')?.matches;
        migratedSettings.theme = systemPrefersDark ? 'dark' : 'light';
      }

      if (!migratedSettings.language) {
        const browserLanguage = navigator.language.split('-')[0];
        migratedSettings.language = ['en', 'mk', 'fr'].includes(browserLanguage) 
          ? browserLanguage as LanguageType 
          : 'en';
      }

      // Add new settings with sensible defaults
      const newSettings = {
        analyticsEnabled: true,
        crashReportingEnabled: true,
        developerMode: false,
        debugMode: false,
        experimentalFeatures: false,
      };

      Object.assign(migratedSettings, newSettings);

      // Save migrated settings
      if (Object.keys(migratedSettings).length > 0) {
        localStorage.setItem(this.UNIFIED_KEY, JSON.stringify(migratedSettings));
      }

      // Mark migration as complete
      localStorage.setItem(this.MIGRATION_FLAG, 'true');

      // Clean up legacy settings (optional - can be kept for rollback)
      this.cleanupLegacySettings();

      return {
        success: true,
        migratedSettings,
        errors,
      };
    } catch (error) {
      errors.push(`Migration failed: ${error}`);
      return {
        success: false,
        migratedSettings: {},
        errors,
      };
    }
  }

  /**
   * Validate setting value against expected types
   */
  private static isValidSettingValue(key: string, value: any): boolean {
    const validationRules: Record<string, (val: any) => boolean> = {
      viewMode: (val) => ['grid', 'list', 'table'].includes(val),
      itemsPerPage: (val) => typeof val === 'number' && val >= 5 && val <= 200,
      showPreviews: (val) => typeof val === 'boolean',
      compactMode: (val) => typeof val === 'boolean',
      defaultSortBy: (val) => ['date', 'name', 'size', 'type'].includes(val),
      defaultSortOrder: (val) => ['asc', 'desc'].includes(val),
      enableAnimations: (val) => typeof val === 'boolean',
      autoRefresh: (val) => typeof val === 'boolean',
      lazyLoading: (val) => typeof val === 'boolean',
      highContrast: (val) => typeof val === 'boolean',
      reducedMotion: (val) => typeof val === 'boolean',
      largeText: (val) => typeof val === 'boolean',
      keyboardNavigation: (val) => typeof val === 'boolean',
      showTutorials: (val) => typeof val === 'boolean',
      autoSave: (val) => typeof val === 'boolean',
      enableNotifications: (val) => typeof val === 'boolean',
      defaultCategory: (val) => typeof val === 'string',
      autoProcessAI: (val) => typeof val === 'boolean',
      compressionLevel: (val) => ['low', 'medium', 'high'].includes(val),
    };

    const validator = validationRules[key];
    return validator ? validator(value) : false;
  }

  /**
   * Clean up legacy settings from localStorage
   */
  private static cleanupLegacySettings(): void {
    try {
      Object.values(this.LEGACY_KEYS).forEach(key => {
        localStorage.removeItem(key);
      });
    } catch (error) {
      console.warn('Failed to cleanup legacy settings:', error);
    }
  }

  /**
   * Rollback to legacy settings (for emergency use)
   */
  static rollbackToLegacySettings(): boolean {
    try {
      // Remove unified settings
      localStorage.removeItem(this.UNIFIED_KEY);
      localStorage.removeItem(this.MIGRATION_FLAG);
      
      console.warn('Rolled back to legacy settings. Please refresh the page.');
      return true;
    } catch (error) {
      console.error('Failed to rollback settings:', error);
      return false;
    }
  }

  /**
   * Export current settings for backup before migration
   */
  static exportLegacySettings(): string | null {
    try {
      const legacySettings: LegacySettings = {};
      
      const theme = localStorage.getItem(this.LEGACY_KEYS.THEME);
      if (theme) legacySettings.theme = theme as 'light' | 'dark';
      
      const language = localStorage.getItem(this.LEGACY_KEYS.LANGUAGE);
      if (language) legacySettings.language = language as LanguageType;
      
      const preferences = localStorage.getItem(this.LEGACY_KEYS.USER_PREFERENCES);
      if (preferences) {
        legacySettings.userPreferences = JSON.parse(preferences);
      }

      return JSON.stringify({
        legacySettings,
        exportedAt: new Date().toISOString(),
        version: 'legacy',
      }, null, 2);
    } catch (error) {
      console.error('Failed to export legacy settings:', error);
      return null;
    }
  }

  /**
   * Get migration status and information
   */
  static getMigrationStatus(): {
    needsMigration: boolean;
    hasUnifiedSettings: boolean;
    hasLegacySettings: boolean;
    migrationCompleted: boolean;
  } {
    const needsMigration = this.needsMigration();
    const hasUnifiedSettings = localStorage.getItem(this.UNIFIED_KEY) !== null;
    const migrationCompleted = localStorage.getItem(this.MIGRATION_FLAG) === 'true';
    
    const hasLegacySettings = Object.values(this.LEGACY_KEYS).some(
      key => localStorage.getItem(key) !== null
    );

    return {
      needsMigration,
      hasUnifiedSettings,
      hasLegacySettings,
      migrationCompleted,
    };
  }

  /**
   * Perform automatic migration if needed
   */
  static async autoMigrate(): Promise<void> {
    if (!this.needsMigration()) {
      return;
    }

    console.log('🔄 Migrating settings to unified format...');
    
    const result = await this.migrateLegacySettings();
    
    if (result.success) {
      console.log('✅ Settings migration completed successfully');
      if (result.errors.length > 0) {
        console.warn('⚠️ Migration warnings:', result.errors);
      }
    } else {
      console.error('❌ Settings migration failed:', result.errors);
    }
  }
}

// Auto-migration hook for React components
export const useSettingsMigration = () => {
  const [migrationStatus, setMigrationStatus] = React.useState(() => 
    SettingsMigration.getMigrationStatus()
  );

  React.useEffect(() => {
    const performMigration = async () => {
      if (migrationStatus.needsMigration) {
        await SettingsMigration.autoMigrate();
        setMigrationStatus(SettingsMigration.getMigrationStatus());
      }
    };

    performMigration();
  }, []);

  return {
    ...migrationStatus,
    migrate: SettingsMigration.migrateLegacySettings,
    rollback: SettingsMigration.rollbackToLegacySettings,
    exportLegacy: SettingsMigration.exportLegacySettings,
  };
};

// Import React for the hook
import React from 'react';