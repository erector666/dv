import { useEffect, useRef } from 'react';

interface SidebarSwipeOptions {
  onSwipeOpen?: () => void;
  onSwipeClose?: () => void;
  edgeThreshold?: number; // Distance from edge to trigger swipe
  minSwipeDistance?: number;
  maxSwipeTime?: number;
  isOpen?: boolean;
}

interface TouchPoint {
  x: number;
  y: number;
  time: number;
}

export const useSidebarSwipe = (options: SidebarSwipeOptions) => {
  const {
    onSwipeOpen,
    onSwipeClose,
    edgeThreshold = 20, // 20px from left edge
    minSwipeDistance = 80,
    maxSwipeTime = 400,
    isOpen = false,
  } = options;

  const touchStart = useRef<TouchPoint | null>(null);
  const isEdgeSwipe = useRef<boolean>(false);

  const handleTouchStart = (e: TouchEvent) => {
    const touch = e.touches[0];
    const startX = touch.clientX;
    
    // Check if touch started from the left edge (for opening) or anywhere (for closing if open)
    const isFromEdge = startX <= edgeThreshold;
    const canSwipe = isFromEdge || isOpen;
    
    
    if (canSwipe) {
      touchStart.current = {
        x: startX,
        y: touch.clientY,
        time: Date.now(),
      };
      isEdgeSwipe.current = isFromEdge;
    }
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!touchStart.current) return;

    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStart.current.x;
    const deltaY = Math.abs(touch.clientY - touchStart.current.y);
    
    // If this looks like a horizontal swipe, prevent default scrolling
    if (Math.abs(deltaX) > deltaY && Math.abs(deltaX) > 10) {
      e.preventDefault();
    }
  };

  const handleTouchEnd = (e: TouchEvent) => {
    if (!touchStart.current) return;

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStart.current.x;
    const deltaY = touch.clientY - touchStart.current.y;
    const deltaTime = Date.now() - touchStart.current.time;

    // Check if this is a valid swipe gesture
    const isValidSwipe =
      Math.abs(deltaX) > minSwipeDistance &&
      Math.abs(deltaX) > Math.abs(deltaY) * 2 && // Much more horizontal than vertical
      deltaTime < maxSwipeTime;


    if (isValidSwipe) {
      // Swipe right to open (from left edge)
      if (deltaX > 0 && isEdgeSwipe.current && !isOpen && onSwipeOpen) {
        onSwipeOpen();
      }
      // Swipe left to close (when sidebar is open)
      else if (deltaX < 0 && isOpen && onSwipeClose) {
        onSwipeClose();
      }
    }

    // Reset
    touchStart.current = null;
    isEdgeSwipe.current = false;
  };

  useEffect(() => {
    // Only enable swipe on mobile devices
    const isMobile = window.innerWidth < 768;
    if (!isMobile) return;

    const element = document.body;

    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [onSwipeOpen, onSwipeClose, isOpen, edgeThreshold, minSwipeDistance, maxSwipeTime]);

  return {
    // Return any additional utilities if needed
  };
};