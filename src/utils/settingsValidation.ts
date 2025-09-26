import { UnifiedSettings } from '../context/UnifiedSettingsContext';

// Validation rules for settings
export interface ValidationRule {
  type: 'string' | 'number' | 'boolean';
  required?: boolean;
  values?: readonly string[];
  min?: number;
  max?: number;
  pattern?: RegExp;
  custom?: (value: any) => boolean | string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// Settings validation schema
export const SETTINGS_VALIDATION_SCHEMA: Record<keyof UnifiedSettings, ValidationRule> = {
  // Theme Settings
  theme: {
    type: 'string',
    required: true,
    values: ['light', 'dark', 'system'],
  },
  
  // Language Settings
  language: {
    type: 'string',
    required: true,
    values: ['en', 'mk', 'fr'],
  },
  
  // Display Settings
  viewMode: {
    type: 'string',
    required: true,
    values: ['grid', 'list', 'table'],
  },
  itemsPerPage: {
    type: 'number',
    required: true,
    min: 5,
    max: 200,
    custom: (value) => {
      if (value % 5 !== 0) {
        return 'Items per page should be divisible by 5';
      }
      return true;
    },
  },
  showPreviews: {
    type: 'boolean',
    required: true,
  },
  compactMode: {
    type: 'boolean',
    required: true,
  },
  
  // Sorting Settings
  defaultSortBy: {
    type: 'string',
    required: true,
    values: ['date', 'name', 'size', 'type'],
  },
  defaultSortOrder: {
    type: 'string',
    required: true,
    values: ['asc', 'desc'],
  },
  
  // Performance Settings
  enableAnimations: {
    type: 'boolean',
    required: true,
  },
  autoRefresh: {
    type: 'boolean',
    required: true,
  },
  lazyLoading: {
    type: 'boolean',
    required: true,
  },
  
  // Accessibility Settings
  highContrast: {
    type: 'boolean',
    required: true,
  },
  reducedMotion: {
    type: 'boolean',
    required: true,
    custom: (value, allSettings) => {
      // Warning if animations are enabled but reduced motion is also enabled
      if (value && allSettings?.enableAnimations) {
        return 'Consider disabling animations when reduced motion is enabled';
      }
      return true;
    },
  },
  largeText: {
    type: 'boolean',
    required: true,
  },
  keyboardNavigation: {
    type: 'boolean',
    required: true,
  },
  
  // Feature Settings
  showTutorials: {
    type: 'boolean',
    required: true,
  },
  autoSave: {
    type: 'boolean',
    required: true,
  },
  enableNotifications: {
    type: 'boolean',
    required: true,
  },
  
  // Upload Settings
  defaultCategory: {
    type: 'string',
    required: true,
    values: ['personal', 'bills', 'medical', 'insurance', 'other'],
  },
  autoProcessAI: {
    type: 'boolean',
    required: true,
  },
  compressionLevel: {
    type: 'string',
    required: true,
    values: ['low', 'medium', 'high'],
  },
  
  // Privacy Settings
  analyticsEnabled: {
    type: 'boolean',
    required: true,
  },
  crashReportingEnabled: {
    type: 'boolean',
    required: true,
  },
  
  // Advanced Settings
  developerMode: {
    type: 'boolean',
    required: true,
  },
  debugMode: {
    type: 'boolean',
    required: true,
    custom: (value, allSettings) => {
      // Debug mode should only be enabled with developer mode
      if (value && !allSettings?.developerMode) {
        return 'Debug mode requires developer mode to be enabled';
      }
      return true;
    },
  },
  experimentalFeatures: {
    type: 'boolean',
    required: true,
    custom: (value, allSettings) => {
      // Experimental features should only be enabled with developer mode
      if (value && !allSettings?.developerMode) {
        return 'Experimental features require developer mode to be enabled';
      }
      return true;
    },
  },
};

/**
 * Validate a single setting value
 */
export function validateSetting<K extends keyof UnifiedSettings>(
  key: K,
  value: unknown,
  allSettings?: Partial<UnifiedSettings>
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const rule = SETTINGS_VALIDATION_SCHEMA[key];

  if (!rule) {
    errors.push(`Unknown setting: ${key}`);
    return { isValid: false, errors, warnings };
  }

  // Check required
  if (rule.required && (value === undefined || value === null)) {
    errors.push(`${key} is required`);
    return { isValid: false, errors, warnings };
  }

  // Skip further validation if value is undefined/null and not required
  if (value === undefined || value === null) {
    return { isValid: true, errors, warnings };
  }

  // Type validation
  if (rule.type === 'boolean' && typeof value !== 'boolean') {
    errors.push(`${key} must be a boolean`);
  } else if (rule.type === 'number' && typeof value !== 'number') {
    errors.push(`${key} must be a number`);
  } else if (rule.type === 'string' && typeof value !== 'string') {
    errors.push(`${key} must be a string`);
  }

  // Value validation for strings
  if (rule.type === 'string' && typeof value === 'string' && rule.values) {
    if (!rule.values.includes(value as any)) {
      errors.push(`${key} must be one of: ${rule.values.join(', ')}`);
    }
  }

  // Range validation for numbers
  if (rule.type === 'number' && typeof value === 'number') {
    if (rule.min !== undefined && value < rule.min) {
      errors.push(`${key} must be at least ${rule.min}`);
    }
    if (rule.max !== undefined && value > rule.max) {
      errors.push(`${key} must be at most ${rule.max}`);
    }
  }

  // Pattern validation for strings
  if (rule.type === 'string' && typeof value === 'string' && rule.pattern) {
    if (!rule.pattern.test(value)) {
      errors.push(`${key} format is invalid`);
    }
  }

  // Custom validation
  if (rule.custom && typeof rule.custom === 'function') {
    const customResult = rule.custom(value, allSettings);
    if (customResult !== true) {
      if (typeof customResult === 'string') {
        // If it's a warning (doesn't prevent saving)
        if (customResult.toLowerCase().includes('consider') || customResult.toLowerCase().includes('warning')) {
          warnings.push(customResult);
        } else {
          errors.push(customResult);
        }
      } else {
        errors.push(`${key} failed custom validation`);
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate all settings
 */
export function validateSettings(settings: Partial<UnifiedSettings>): ValidationResult {
  const allErrors: string[] = [];
  const allWarnings: string[] = [];

  // Validate each setting
  Object.entries(settings).forEach(([key, value]) => {
    const result = validateSetting(key as keyof UnifiedSettings, value, settings);
    allErrors.push(...result.errors);
    allWarnings.push(...result.warnings);
  });

  // Cross-setting validations
  const crossValidationResult = performCrossValidation(settings);
  allErrors.push(...crossValidationResult.errors);
  allWarnings.push(...crossValidationResult.warnings);

  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings,
  };
}

/**
 * Perform cross-setting validations
 */
function performCrossValidation(settings: Partial<UnifiedSettings>): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Performance vs. Accessibility checks
  if (settings.enableAnimations && settings.reducedMotion) {
    warnings.push('Animations are enabled but reduced motion is also enabled. Consider disabling animations for better accessibility.');
  }

  // Debug mode dependencies
  if (settings.debugMode && !settings.developerMode) {
    errors.push('Debug mode requires developer mode to be enabled.');
  }

  // Experimental features dependencies
  if (settings.experimentalFeatures && !settings.developerMode) {
    errors.push('Experimental features require developer mode to be enabled.');
  }

  // Performance recommendations
  if (settings.itemsPerPage && settings.itemsPerPage > 100 && !settings.lazyLoading) {
    warnings.push('Large page sizes without lazy loading may impact performance. Consider enabling lazy loading.');
  }

  // Accessibility recommendations
  if (settings.highContrast && !settings.largeText) {
    warnings.push('High contrast mode works best with large text enabled.');
  }

  // Privacy recommendations
  if (!settings.analyticsEnabled && !settings.crashReportingEnabled) {
    warnings.push('Disabling both analytics and crash reporting may limit our ability to improve the app.');
  }

  return { isValid: errors.length === 0, errors, warnings };
}

/**
 * Sanitize settings by removing invalid values and applying defaults
 */
export function sanitizeSettings(
  settings: Partial<UnifiedSettings>,
  defaults: UnifiedSettings
): UnifiedSettings {
  const sanitized = { ...defaults };

  Object.entries(settings).forEach(([key, value]) => {
    const validationResult = validateSetting(key as keyof UnifiedSettings, value, settings);
    
    if (validationResult.isValid) {
      (sanitized as any)[key] = value;
    } else {
      console.warn(`Invalid value for ${key}, using default:`, validationResult.errors);
    }
  });

  return sanitized;
}

/**
 * Get setting recommendations based on current values
 */
export function getSettingRecommendations(settings: UnifiedSettings): string[] {
  const recommendations: string[] = [];

  // Performance recommendations
  if (settings.itemsPerPage > 50 && settings.enableAnimations) {
    recommendations.push('Consider reducing items per page or disabling animations for better performance');
  }

  // Accessibility recommendations
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches && settings.enableAnimations) {
    recommendations.push('Your system prefers reduced motion. Consider disabling animations');
  }

  if (window.matchMedia && window.matchMedia('(prefers-contrast: high)').matches && !settings.highContrast) {
    recommendations.push('Your system prefers high contrast. Consider enabling high contrast mode');
  }

  // Battery/performance recommendations
  if (settings.autoRefresh && settings.itemsPerPage > 100) {
    recommendations.push('Auto-refresh with large page sizes may drain battery faster');
  }

  // Privacy recommendations
  if (settings.analyticsEnabled && settings.debugMode) {
    recommendations.push('Debug mode may send additional data when analytics is enabled');
  }

  return recommendations;
}

/**
 * Check for conflicting settings
 */
export function checkSettingConflicts(settings: UnifiedSettings): Array<{
  conflict: string;
  severity: 'error' | 'warning' | 'info';
  suggestion: string;
}> {
  const conflicts = [];

  // Animation conflicts
  if (settings.enableAnimations && settings.reducedMotion) {
    conflicts.push({
      conflict: 'Animations enabled with reduced motion',
      severity: 'warning' as const,
      suggestion: 'Disable animations when reduced motion is preferred',
    });
  }

  // Performance conflicts
  if (settings.autoRefresh && settings.itemsPerPage > 100 && !settings.lazyLoading) {
    conflicts.push({
      conflict: 'High refresh rate with large page size and no lazy loading',
      severity: 'warning' as const,
      suggestion: 'Enable lazy loading or reduce items per page for better performance',
    });
  }

  // Developer mode conflicts
  if ((settings.debugMode || settings.experimentalFeatures) && !settings.developerMode) {
    conflicts.push({
      conflict: 'Advanced features enabled without developer mode',
      severity: 'error' as const,
      suggestion: 'Enable developer mode to use debug mode or experimental features',
    });
  }

  // Accessibility conflicts
  if (settings.compactMode && settings.largeText) {
    conflicts.push({
      conflict: 'Compact mode with large text may cause layout issues',
      severity: 'info' as const,
      suggestion: 'Consider disabling compact mode when using large text',
    });
  }

  return conflicts;
}

/**
 * Validate settings import data
 */
export function validateImportData(data: string): {
  isValid: boolean;
  settings?: Partial<UnifiedSettings>;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    const parsed = JSON.parse(data);
    
    if (!parsed.settings) {
      errors.push('Import data must contain a "settings" object');
      return { isValid: false, errors, warnings };
    }

    // Validate version compatibility
    if (parsed.version && parsed.version !== '1.0.0') {
      warnings.push(`Import data version (${parsed.version}) may not be fully compatible`);
    }

    // Validate settings
    const validationResult = validateSettings(parsed.settings);
    errors.push(...validationResult.errors);
    warnings.push(...validationResult.warnings);

    // Additional import-specific validations
    if (parsed.exportedAt) {
      const exportDate = new Date(parsed.exportedAt);
      const daysSinceExport = (Date.now() - exportDate.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysSinceExport > 365) {
        warnings.push('Import data is over a year old and may contain outdated settings');
      }
    }

    return {
      isValid: errors.length === 0,
      settings: parsed.settings,
      errors,
      warnings,
    };
  } catch (error) {
    errors.push('Invalid JSON format');
    return { isValid: false, errors, warnings };
  }
}

/**
 * Get default values for settings
 */
export function getDefaultSettings(): UnifiedSettings {
  const systemTheme = window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ? 'dark' : 'light';
  const systemReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
  const systemHighContrast = window.matchMedia?.('(prefers-contrast: high)')?.matches ?? false;
  const browserLanguage = navigator.language.split('-')[0];
  const detectedLanguage = ['en', 'mk', 'fr'].includes(browserLanguage) ? browserLanguage as any : 'en';

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
}