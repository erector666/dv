import { useEffect, useRef, useCallback } from 'react';

interface SwipeGestureOptions {
  onSwipeRight?: () => void;
  onSwipeLeft?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  edgeThreshold?: number;
  minSwipeDistance?: number;
  maxSwipeTime?: number;
  edgeOnly?: boolean;
  isEnabled?: boolean;
  preventDefaultOnSwipe?: boolean;
}

interface TouchPoint {
  x: number;
  y: number;
  time: number;
}

interface SwipeResult {
  direction: 'left' | 'right' | 'up' | 'down' | null;
  distance: number;
  duration: number;
  isEdgeSwipe: boolean;
}

export const useSwipeGestures = (options: SwipeGestureOptions) => {
  const {
    onSwipeRight,
    onSwipeLeft,
    onSwipeUp,
    onSwipeDown,
    edgeThreshold = 20,
    minSwipeDistance = 60,
    maxSwipeTime = 800,
    edgeOnly = false,
    isEnabled = true,
    preventDefaultOnSwipe = true
  } = options;

  const touchStart = useRef<TouchPoint | null>(null);
  const isEdgeSwipe = useRef<boolean>(false);
  const isSwiping = useRef<boolean>(false);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!isEnabled) return;

    const touch = e.touches[0];
    const startX = touch.clientX;
    const startY = touch.clientY;
    
    // Check if touch started from edge (for edge-only swipes)
    const isFromLeftEdge = startX <= edgeThreshold;
    const isFromRightEdge = startX >= window.innerWidth - edgeThreshold;
    const isFromTopEdge = startY <= edgeThreshold;
    const isFromBottomEdge = startY >= window.innerHeight - edgeThreshold;
    
    const isFromEdge = isFromLeftEdge || isFromRightEdge || isFromTopEdge || isFromBottomEdge;
    
    if (edgeOnly && !isFromEdge) return;
    
    touchStart.current = {
      x: startX,
      y: startY,
      time: Date.now(),
    };
    
    isEdgeSwipe.current = isFromEdge;
    isSwiping.current = false;
  }, [isEnabled, edgeThreshold, edgeOnly]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isEnabled || !touchStart.current) return;

    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStart.current.x;
    const deltaY = touch.clientY - touchStart.current.y;
    
    // Determine if this is likely a swipe gesture
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);
    const isHorizontalSwipe = absDeltaX > absDeltaY && absDeltaX > 10;
    const isVerticalSwipe = absDeltaY > absDeltaX && absDeltaY > 10;
    
    if (isHorizontalSwipe || isVerticalSwipe) {
      isSwiping.current = true;
      
      // Prevent default scrolling if this looks like a swipe
      if (preventDefaultOnSwipe) {
        e.preventDefault();
      }
    }
  }, [isEnabled, preventDefaultOnSwipe]);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (!isEnabled || !touchStart.current) return;

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStart.current.x;
    const deltaY = touch.clientY - touchStart.current.y;
    const deltaTime = Date.now() - touchStart.current.time;

    // Calculate swipe metrics
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
    // Determine swipe direction and validity
    const isValidSwipe = 
      distance >= minSwipeDistance && 
      deltaTime <= maxSwipeTime;
    
    const isHorizontalSwipe = absDeltaX > absDeltaY * 1.5; // Prefer horizontal
    const isVerticalSwipe = absDeltaY > absDeltaX * 1.5; // Prefer vertical
    
    if (isValidSwipe) {
      const swipeResult: SwipeResult = {
        direction: null,
        distance,
        duration: deltaTime,
        isEdgeSwipe: isEdgeSwipe.current
      };
      
      if (isHorizontalSwipe) {
        if (deltaX > 0) {
          swipeResult.direction = 'right';
          onSwipeRight?.();
        } else {
          swipeResult.direction = 'left';
          onSwipeLeft?.();
        }
      } else if (isVerticalSwipe) {
        if (deltaY > 0) {
          swipeResult.direction = 'down';
          onSwipeDown?.();
        } else {
          swipeResult.direction = 'up';
          onSwipeUp?.();
        }
      }
    }

    // Reset
    touchStart.current = null;
    isEdgeSwipe.current = false;
    isSwiping.current = false;
  }, [isEnabled, minSwipeDistance, maxSwipeTime, onSwipeRight, onSwipeLeft, onSwipeUp, onSwipeDown]);

  useEffect(() => {
    if (!isEnabled) return;

    // Only enable on touch devices
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (!isTouchDevice) return;

    const element = document.body;

    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, isEnabled]);

  return {
    isSwiping: isSwiping.current
  };
};