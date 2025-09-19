import { useState, useCallback, useRef } from 'react';

interface ContextMenuState {
  isOpen: boolean;
  position: { x: number; y: number };
  data?: any;
}

export const useContextMenu = () => {
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    isOpen: false,
    position: { x: 0, y: 0 },
  });

  const contextMenuRef = useRef<HTMLDivElement>(null);

  const openContextMenu = useCallback((
    event: React.MouseEvent | React.TouchEvent,
    data?: any
  ) => {
    event.preventDefault();
    event.stopPropagation();

    let x: number, y: number;

    if ('touches' in event) {
      // Touch event
      x = event.touches[0].clientX;
      y = event.touches[0].clientY;
    } else {
      // Mouse event
      x = event.clientX;
      y = event.clientY;
    }

    setContextMenu({
      isOpen: true,
      position: { x, y },
      data,
    });
  }, []);

  const closeContextMenu = useCallback(() => {
    setContextMenu({
      isOpen: false,
      position: { x: 0, y: 0 },
    });
  }, []);

  const handleContextMenu = useCallback((
    event: React.MouseEvent | React.TouchEvent,
    data?: any
  ) => {
    openContextMenu(event, data);
  }, [openContextMenu]);

  const handleLongPress = useCallback((
    event: React.TouchEvent,
    data?: any
  ) => {
    // For mobile long press, we'll use a timeout
    const timer = setTimeout(() => {
      openContextMenu(event, data);
    }, 500); // 500ms long press

    const handleTouchEnd = () => {
      clearTimeout(timer);
      document.removeEventListener('touchend', handleTouchEnd);
    };

    document.addEventListener('touchend', handleTouchEnd);
  }, [openContextMenu]);

  return {
    contextMenu,
    openContextMenu,
    closeContextMenu,
    handleContextMenu,
    handleLongPress,
    contextMenuRef,
  };
};