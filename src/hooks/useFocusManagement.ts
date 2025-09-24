import { useEffect, useRef, useCallback } from 'react';

interface FocusManagementOptions {
  isOpen: boolean;
  onClose: () => void;
  trapFocus?: boolean;
  restoreFocus?: boolean;
  autoFocus?: boolean;
}

export const useFocusManagement = (options: FocusManagementOptions) => {
  const {
    isOpen,
    onClose,
    trapFocus = true,
    restoreFocus = true,
    autoFocus = true
  } = options;

  const containerRef = useRef<HTMLElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const firstFocusableRef = useRef<HTMLElement | null>(null);
  const lastFocusableRef = useRef<HTMLElement | null>(null);

  // Get all focusable elements within the container
  const getFocusableElements = useCallback((container: HTMLElement) => {
    const focusableSelectors = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]'
    ];

    const focusableElements = container.querySelectorAll(
      focusableSelectors.join(', ')
    ) as NodeListOf<HTMLElement>;

    return Array.from(focusableElements).filter(
      element => element.offsetWidth > 0 && element.offsetHeight > 0
    );
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!isOpen || !containerRef.current || !trapFocus) return;

    const focusableElements = getFocusableElements(containerRef.current);
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        onClose();
        break;
      
      case 'Tab':
        if (focusableElements.length === 0) {
          event.preventDefault();
          return;
        }

        if (event.shiftKey) {
          // Shift + Tab (backwards)
          if (document.activeElement === firstElement) {
            event.preventDefault();
            lastElement?.focus();
          }
        } else {
          // Tab (forwards)
          if (document.activeElement === lastElement) {
            event.preventDefault();
            firstElement?.focus();
          }
        }
        break;
      
      case 'ArrowDown':
      case 'ArrowUp':
        // Navigate through focusable elements with arrow keys
        event.preventDefault();
        const currentIndex = focusableElements.findIndex(
          element => element === document.activeElement
        );
        
        if (currentIndex === -1) {
          firstElement?.focus();
          return;
        }

        let nextIndex;
        if (event.key === 'ArrowDown') {
          nextIndex = (currentIndex + 1) % focusableElements.length;
        } else {
          nextIndex = currentIndex === 0 
            ? focusableElements.length - 1 
            : currentIndex - 1;
        }
        
        focusableElements[nextIndex]?.focus();
        break;
    }
  }, [isOpen, onClose, trapFocus, getFocusableElements]);

  // Set up focus management when component mounts/opens
  useEffect(() => {
    if (!isOpen) return;

    // Store the previously focused element
    if (restoreFocus) {
      previousFocusRef.current = document.activeElement as HTMLElement;
    }

    // Auto-focus the first focusable element
    if (autoFocus && containerRef.current) {
      const focusableElements = getFocusableElements(containerRef.current);
      const firstElement = focusableElements[0];
      
      if (firstElement) {
        // Small delay to ensure the element is rendered
        setTimeout(() => {
          firstElement.focus();
        }, 10);
      }
    }

    // Add keyboard event listener
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      
      // Restore focus to the previously focused element
      if (restoreFocus && previousFocusRef.current) {
        previousFocusRef.current.focus();
      }
    };
  }, [isOpen, autoFocus, restoreFocus, handleKeyDown, getFocusableElements]);

  // Update focusable element refs when container changes
  useEffect(() => {
    if (!isOpen || !containerRef.current) return;

    const focusableElements = getFocusableElements(containerRef.current);
    firstFocusableRef.current = focusableElements[0] || null;
    lastFocusableRef.current = focusableElements[focusableElements.length - 1] || null;
  }, [isOpen, getFocusableElements]);

  return {
    containerRef,
    firstFocusableRef,
    lastFocusableRef
  };
};