import { useEffect, useRef, useCallback, useState } from 'react';

export interface AccessibilityPreferences {
  reduceMotion: boolean;
  highContrast: boolean;
  largeText: boolean;
  screenReaderMode: boolean;
  keyboardNavigation: boolean;
}

export const useEnhancedAccessibility = () => {
  const [preferences, setPreferences] = useState<AccessibilityPreferences>({
    reduceMotion: false,
    highContrast: false,
    largeText: false,
    screenReaderMode: false,
    keyboardNavigation: true,
  });

  const announcementRef = useRef<HTMLDivElement>(null);
  const keyboardHelpRef = useRef<HTMLDivElement>(null);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);

  // Detect user preferences
  useEffect(() => {
    const detectPreferences = () => {
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const highContrast = window.matchMedia('(prefers-contrast: high)').matches;
      const largeText = window.matchMedia('(prefers-reduced-data: reduce)').matches;
      
      setPreferences(prev => ({
        ...prev,
        reduceMotion,
        highContrast,
        largeText,
      }));
    };

    detectPreferences();

    // Listen for changes
    const mediaQueries = [
      window.matchMedia('(prefers-reduced-motion: reduce)'),
      window.matchMedia('(prefers-contrast: high)'),
      window.matchMedia('(prefers-reduced-data: reduce)'),
    ];

    const handleChange = () => detectPreferences();
    mediaQueries.forEach(mq => mq.addEventListener('change', handleChange));

    return () => {
      mediaQueries.forEach(mq => mq.removeEventListener('change', handleChange));
    };
  }, []);

  // Screen reader announcements
  const announce = useCallback((
    message: string, 
    priority: 'polite' | 'assertive' = 'polite',
    delay: number = 100
  ) => {
    if (!announcementRef.current) return;

    // Clear previous announcement
    announcementRef.current.textContent = '';
    announcementRef.current.setAttribute('aria-live', priority);

    // Add new announcement with a delay to ensure screen readers pick it up
    setTimeout(() => {
      if (announcementRef.current) {
        announcementRef.current.textContent = message;
      }
    }, delay);

    // Clear announcement after appropriate time
    const clearDelay = priority === 'assertive' ? 8000 : 5000;
    setTimeout(() => {
      if (announcementRef.current && announcementRef.current.textContent === message) {
        announcementRef.current.textContent = '';
      }
    }, clearDelay);
  }, []);

  // Progress announcements
  const announceProgress = useCallback((
    current: number,
    total: number,
    operation: string,
    includePercentage: boolean = true
  ) => {
    const percentage = Math.round((current / total) * 100);
    let message = `${operation}: ${current} of ${total} items`;
    
    if (includePercentage) {
      message += ` (${percentage}% complete)`;
    }

    // Only announce every 25% or when complete
    if (percentage % 25 === 0 || percentage === 100 || current === 1) {
      announce(message, percentage === 100 ? 'assertive' : 'polite');
    }
  }, [announce]);

  // Status announcements
  const announceStatus = useCallback((
    status: string,
    details?: string,
    priority: 'polite' | 'assertive' = 'polite'
  ) => {
    const message = details ? `${status}: ${details}` : status;
    announce(message, priority);
  }, [announce]);

  // Error announcements
  const announceError = useCallback((error: string, context?: string) => {
    const message = context ? `Error in ${context}: ${error}` : `Error: ${error}`;
    announce(message, 'assertive');
  }, [announce]);

  // Keyboard shortcuts
  const keyboardShortcuts = {
    'Space': 'Capture photo (in camera mode)',
    'Enter': 'Confirm action / Capture photo',
    'Escape': 'Cancel / Close modal',
    'Tab': 'Navigate between elements',
    'Shift+Tab': 'Navigate backwards',
    'Arrow Keys': 'Navigate lists',
    'Delete': 'Remove selected item',
    'Ctrl+A': 'Select all files',
    'Ctrl+U': 'Upload files',
    'F': 'Toggle flash (in camera mode)',
    'G': 'Toggle grid (in camera mode)',
    'C': 'Switch camera (in camera mode)',
    '?': 'Show/hide keyboard help',
  };

  // Keyboard help toggle
  const toggleKeyboardHelp = useCallback(() => {
    setShowKeyboardHelp(prev => {
      const newState = !prev;
      announce(newState ? 'Keyboard shortcuts shown' : 'Keyboard shortcuts hidden', 'polite');
      return newState;
    });
  }, [announce]);

  // Global keyboard handler
  const handleGlobalKeyboard = useCallback((e: KeyboardEvent) => {
    // Show keyboard help with ?
    if (e.key === '?' && !e.ctrlKey && !e.altKey && !e.shiftKey) {
      e.preventDefault();
      toggleKeyboardHelp();
      return;
    }

    // Skip if user is typing in an input
    const activeElement = document.activeElement;
    if (activeElement && (
      activeElement.tagName === 'INPUT' ||
      activeElement.tagName === 'TEXTAREA' ||
      activeElement.contentEditable === 'true'
    )) {
      return;
    }

    // Handle other global shortcuts
    if (e.key === 'Escape') {
      // Let components handle escape, but announce it
      announce('Escape key pressed', 'polite');
    }
  }, [toggleKeyboardHelp, announce]);

  useEffect(() => {
    document.addEventListener('keydown', handleGlobalKeyboard);
    return () => document.removeEventListener('keydown', handleGlobalKeyboard);
  }, [handleGlobalKeyboard]);

  // Focus management
  const focusElement = useCallback((selector: string, announce: boolean = true) => {
    const element = document.querySelector(selector) as HTMLElement;
    if (element) {
      element.focus();
      if (announce) {
        const label = element.getAttribute('aria-label') || 
                     element.getAttribute('title') || 
                     element.textContent || 
                     'Element';
        announceStatus(`Focused on ${label}`);
      }
    }
  }, [announceStatus]);

  // Skip links
  const skipToContent = useCallback(() => {
    focusElement('[data-skip-target="content"]', true);
  }, [focusElement]);

  const skipToNavigation = useCallback(() => {
    focusElement('[data-skip-target="navigation"]', true);
  }, [focusElement]);

  // High contrast detection and toggle
  const toggleHighContrast = useCallback(() => {
    setPreferences(prev => {
      const newHighContrast = !prev.highContrast;
      document.documentElement.classList.toggle('high-contrast', newHighContrast);
      announce(`High contrast ${newHighContrast ? 'enabled' : 'disabled'}`, 'polite');
      return { ...prev, highContrast: newHighContrast };
    });
  }, [announce]);

  // Large text toggle
  const toggleLargeText = useCallback(() => {
    setPreferences(prev => {
      const newLargeText = !prev.largeText;
      document.documentElement.classList.toggle('large-text', newLargeText);
      announce(`Large text ${newLargeText ? 'enabled' : 'disabled'}`, 'polite');
      return { ...prev, largeText: newLargeText };
    });
  }, [announce]);

  // Motion preference toggle
  const toggleReduceMotion = useCallback(() => {
    setPreferences(prev => {
      const newReduceMotion = !prev.reduceMotion;
      document.documentElement.classList.toggle('reduce-motion', newReduceMotion);
      announce(`Reduced motion ${newReduceMotion ? 'enabled' : 'disabled'}`, 'polite');
      return { ...prev, reduceMotion: newReduceMotion };
    });
  }, [announce]);

  // Create announcement region component
  const AnnouncementRegion = () => (
    <div
      ref={announcementRef}
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
      role="status"
      aria-label="Status announcements"
    />
  );

  // Create keyboard help component
  const KeyboardHelp = () => (
    showKeyboardHelp && (
      <div
        ref={keyboardHelpRef}
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        role="dialog"
        aria-modal="true"
        aria-labelledby="keyboard-help-title"
      >
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 id="keyboard-help-title" className="text-xl font-bold text-gray-900 dark:text-white">
              ⌨️ Keyboard Shortcuts
            </h2>
            <button
              onClick={toggleKeyboardHelp}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              aria-label="Close keyboard help"
            >
              ✕
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(keyboardShortcuts).map(([key, description]) => (
              <div key={key} className="flex items-start space-x-3">
                <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm font-mono rounded border border-gray-300 dark:border-gray-600 flex-shrink-0">
                  {key}
                </kbd>
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {description}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Press <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">?</kbd> anytime to show/hide this help.
            </p>
          </div>
        </div>
      </div>
    )
  );

  return {
    // State
    preferences,
    showKeyboardHelp,
    
    // Announcements
    announce,
    announceProgress,
    announceStatus,
    announceError,
    
    // Keyboard
    keyboardShortcuts,
    toggleKeyboardHelp,
    
    // Focus management
    focusElement,
    skipToContent,
    skipToNavigation,
    
    // Preferences
    toggleHighContrast,
    toggleLargeText,
    toggleReduceMotion,
    
    // Components
    AnnouncementRegion,
    KeyboardHelp,
  };
};

export default useEnhancedAccessibility;