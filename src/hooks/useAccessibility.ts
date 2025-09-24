import React, { useEffect, useRef, useCallback } from 'react';

/**
 * Hook for managing focus traps in modals and dialogs
 */
export const useFocusTrap = (isActive: boolean) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isActive) return;

    const container = containerRef.current;
    if (!container) return;

    // Store the previously focused element
    previousActiveElement.current = document.activeElement as HTMLElement;

    // Get all focusable elements
    const focusableElements = container.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled]), [contenteditable="true"]'
    ) as NodeListOf<HTMLElement>;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // Focus the first element
    if (firstElement) {
      firstElement.focus();
    }

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Let parent components handle escape
        e.stopPropagation();
      }
    };

    document.addEventListener('keydown', handleTabKey);
    document.addEventListener('keydown', handleEscapeKey);

    return () => {
      document.removeEventListener('keydown', handleTabKey);
      document.removeEventListener('keydown', handleEscapeKey);
      
      // Restore focus to previously active element
      if (previousActiveElement.current) {
        previousActiveElement.current.focus();
      }
    };
  }, [isActive]);

  return containerRef;
};

/**
 * Hook for managing announcements to screen readers
 */
export const useAnnouncement = () => {
  const announcementRef = useRef<HTMLDivElement>(null);

  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (!announcementRef.current) return;

    // Clear previous announcement
    announcementRef.current.textContent = '';
    announcementRef.current.setAttribute('aria-live', priority);

    // Add new announcement with a slight delay to ensure screen readers pick it up
    setTimeout(() => {
      if (announcementRef.current) {
        announcementRef.current.textContent = message;
      }
    }, 100);

    // Clear announcement after 5 seconds
    setTimeout(() => {
      if (announcementRef.current) {
        announcementRef.current.textContent = '';
      }
    }, 5000);
  }, []);

  const AnnouncementRegion = React.createElement('div', {
    ref: announcementRef,
    'aria-live': 'polite',
    'aria-atomic': 'true',
    className: 'sr-only',
    role: 'status'
  });

  return { announce, AnnouncementRegion };
};

/**
 * Hook for keyboard navigation in lists
 */
export const useKeyboardNavigation = (
  items: any[],
  onSelect?: (item: any, index: number) => void,
  onEscape?: () => void
) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeIndexRef = useRef<number>(-1);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!containerRef.current) return;

    const focusableItems = containerRef.current.querySelectorAll(
      '[data-keyboard-nav]'
    ) as NodeListOf<HTMLElement>;

    if (focusableItems.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        activeIndexRef.current = Math.min(activeIndexRef.current + 1, focusableItems.length - 1);
        focusableItems[activeIndexRef.current]?.focus();
        break;

      case 'ArrowUp':
        e.preventDefault();
        activeIndexRef.current = Math.max(activeIndexRef.current - 1, 0);
        focusableItems[activeIndexRef.current]?.focus();
        break;

      case 'Home':
        e.preventDefault();
        activeIndexRef.current = 0;
        focusableItems[0]?.focus();
        break;

      case 'End':
        e.preventDefault();
        activeIndexRef.current = focusableItems.length - 1;
        focusableItems[focusableItems.length - 1]?.focus();
        break;

      case 'Enter':
      case ' ':
        e.preventDefault();
        if (activeIndexRef.current >= 0 && onSelect) {
          onSelect(items[activeIndexRef.current], activeIndexRef.current);
        }
        break;

      case 'Escape':
        e.preventDefault();
        onEscape?.();
        break;
    }
  }, [items, onSelect, onEscape]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return containerRef;
};

/**
 * Hook for managing reduced motion preferences
 */
export const useReducedMotion = () => {
  const prefersReducedMotion = useRef(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    prefersReducedMotion.current = mediaQuery.matches;

    const handleChange = (e: MediaQueryListEvent) => {
      prefersReducedMotion.current = e.matches;
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersReducedMotion.current;
};

/**
 * Hook for high contrast mode detection
 */
export const useHighContrast = () => {
  const prefersHighContrast = useRef(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-contrast: high)');
    prefersHighContrast.current = mediaQuery.matches;

    const handleChange = (e: MediaQueryListEvent) => {
      prefersHighContrast.current = e.matches;
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersHighContrast.current;
};

/**
 * Hook for generating unique IDs for accessibility
 */
export const useId = (prefix: string = 'id') => {
  const id = useRef<string>();
  
  if (!id.current) {
    id.current = `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  return id.current;
};