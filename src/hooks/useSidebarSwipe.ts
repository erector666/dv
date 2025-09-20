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
    
    console.log(`🔍 Touch Start - X: ${startX}, Edge: ${isFromEdge}, CanSwipe: ${canSwipe}, IsOpen: ${isOpen}`);
    
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

    console.log(`🔍 Touch End - DeltaX: ${deltaX}, DeltaY: ${deltaY}, Time: ${deltaTime}ms, Valid: ${isValidSwipe}, EdgeSwipe: ${isEdgeSwipe.current}`);

    if (isValidSwipe) {
      // Swipe right to open (from left edge)
      if (deltaX > 0 && isEdgeSwipe.current && !isOpen && onSwipeOpen) {
        console.log('✅ Opening sidebar via swipe');
        onSwipeOpen();
      }
      // Swipe left to close (when sidebar is open)
      else if (deltaX < 0 && isOpen && onSwipeClose) {
        console.log('✅ Closing sidebar via swipe');
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
    console.log(`🔍 Swipe Effect - IsMobile: ${isMobile}, WindowWidth: ${window.innerWidth}`);
    if (!isMobile) return;

    const element = document.body;

    const handleTouchStartWrapper = (e: TouchEvent) => {
      console.log('🔍 Touch start event fired');
      handleTouchStart(e);
    };

    const handleTouchMoveWrapper = (e: TouchEvent) => {
      handleTouchMove(e);
    };

    const handleTouchEndWrapper = (e: TouchEvent) => {
      console.log('🔍 Touch end event fired');
      handleTouchEnd(e);
    };

    element.addEventListener('touchstart', handleTouchStartWrapper, { passive: true });
    element.addEventListener('touchmove', handleTouchMoveWrapper, { passive: false });
    element.addEventListener('touchend', handleTouchEndWrapper, { passive: true });

    console.log('🔍 Touch event listeners added to body');

    return () => {
      element.removeEventListener('touchstart', handleTouchStartWrapper);
      element.removeEventListener('touchmove', handleTouchMoveWrapper);
      element.removeEventListener('touchend', handleTouchEndWrapper);
      console.log('🔍 Touch event listeners removed from body');
    };
  }, [onSwipeOpen, onSwipeClose, isOpen, edgeThreshold, minSwipeDistance, maxSwipeTime]);

  return {
    // Return any additional utilities if needed
  };
};