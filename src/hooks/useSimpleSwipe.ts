import { useEffect } from 'react';

interface SimpleSwipeOptions {
  onSwipeRight?: () => void;
  onSwipeLeft?: () => void;
}

export const useSimpleSwipe = (options: SimpleSwipeOptions) => {
  const { onSwipeRight, onSwipeLeft } = options;

  useEffect(() => {
    let startX = 0;
    let startY = 0;
    let startTime = 0;

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;
      startTime = Date.now();
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const touch = e.changedTouches[0];
      const endX = touch.clientX;
      const endY = touch.clientY;
      const endTime = Date.now();

      const deltaX = endX - startX;
      const deltaY = endY - startY;
      const deltaTime = endTime - startTime;


      // Check if it's a horizontal swipe
      const isHorizontal = Math.abs(deltaX) > Math.abs(deltaY);
      const isQuick = deltaTime < 1000; // 1 second max
      const isLongEnough = Math.abs(deltaX) > 50; // 50px minimum

      if (isHorizontal && isQuick && isLongEnough) {
        if (deltaX > 0) {
          onSwipeRight?.();
        } else {
          onSwipeLeft?.();
        }
      }
    };

    // Add to document instead of body
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [onSwipeRight, onSwipeLeft]);
};