import { useEffect, useRef } from 'react';

interface SwipeGestureOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  minSwipeDistance?: number;
  maxSwipeTime?: number;
  preventDefaultTouchMove?: boolean;
}

interface TouchPoint {
  x: number;
  y: number;
  time: number;
}

export const useSwipeGesture = (options: SwipeGestureOptions) => {
  const {
    onSwipeLeft,
    onSwipeRight,
    minSwipeDistance = 50,
    maxSwipeTime = 300,
    preventDefaultTouchMove = false,
  } = options;

  const touchStart = useRef<TouchPoint | null>(null);
  const touchEnd = useRef<TouchPoint | null>(null);

  const handleTouchStart = (e: TouchEvent) => {
    const touch = e.touches[0];
    touchStart.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };
    touchEnd.current = null;
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (preventDefaultTouchMove) {
      // Only prevent default if we're likely doing a horizontal swipe
      const touch = e.touches[0];
      if (touchStart.current) {
        const deltaX = Math.abs(touch.clientX - touchStart.current.x);
        const deltaY = Math.abs(touch.clientY - touchStart.current.y);
        
        // If horizontal movement is greater than vertical, prevent default
        if (deltaX > deltaY && deltaX > 10) {
          e.preventDefault();
        }
      }
    }
  };

  const handleTouchEnd = (e: TouchEvent) => {
    if (!touchStart.current) return;

    const touch = e.changedTouches[0];
    touchEnd.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };

    const deltaX = touchEnd.current.x - touchStart.current.x;
    const deltaY = touchEnd.current.y - touchStart.current.y;
    const deltaTime = touchEnd.current.time - touchStart.current.time;

    // Check if this is a valid swipe gesture
    const isValidSwipe =
      Math.abs(deltaX) > minSwipeDistance &&
      Math.abs(deltaX) > Math.abs(deltaY) && // More horizontal than vertical
      deltaTime < maxSwipeTime;

    if (isValidSwipe) {
      if (deltaX > 0 && onSwipeRight) {
        onSwipeRight();
      } else if (deltaX < 0 && onSwipeLeft) {
        onSwipeLeft();
      }
    }

    // Reset
    touchStart.current = null;
    touchEnd.current = null;
  };

  useEffect(() => {
    const element = document.body;

    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [onSwipeLeft, onSwipeRight, minSwipeDistance, maxSwipeTime, preventDefaultTouchMove]);

  return {
    // Return any additional utilities if needed
  };
};