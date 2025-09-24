import React, { useState, useRef, useCallback, useEffect } from 'react';
import { clsx } from 'clsx';

// Touch gesture detection
export interface TouchGesture {
  type: 'tap' | 'longPress' | 'swipeLeft' | 'swipeRight' | 'swipeUp' | 'swipeDown' | 'pinch';
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  duration: number;
  distance: number;
  scale?: number;
}

export interface UseTouchGesturesProps {
  onTap?: (gesture: TouchGesture) => void;
  onLongPress?: (gesture: TouchGesture) => void;
  onSwipeLeft?: (gesture: TouchGesture) => void;
  onSwipeRight?: (gesture: TouchGesture) => void;
  onSwipeUp?: (gesture: TouchGesture) => void;
  onSwipeDown?: (gesture: TouchGesture) => void;
  onPinch?: (gesture: TouchGesture) => void;
  longPressDelay?: number;
  swipeThreshold?: number;
}

export const useTouchGestures = ({
  onTap,
  onLongPress,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  onPinch,
  longPressDelay = 500,
  swipeThreshold = 50,
}: UseTouchGesturesProps) => {
  const touchStartRef = useRef<{ x: number; y: number; time: number; touches: number } | null>(null);
  const longPressTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isLongPressing, setIsLongPressing] = useState(false);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    const now = Date.now();
    
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: now,
      touches: e.touches.length,
    };

    // Set up long press detection
    if (onLongPress && e.touches.length === 1) {
      longPressTimeoutRef.current = setTimeout(() => {
        setIsLongPressing(true);
        const gesture: TouchGesture = {
          type: 'longPress',
          startX: touch.clientX,
          startY: touch.clientY,
          endX: touch.clientX,
          endY: touch.clientY,
          duration: longPressDelay,
          distance: 0,
        };
        onLongPress(gesture);
      }, longPressDelay);
    }
  }, [onLongPress, longPressDelay]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    // Cancel long press if finger moves too much
    if (longPressTimeoutRef.current && touchStartRef.current) {
      const touch = e.touches[0];
      const deltaX = Math.abs(touch.clientX - touchStartRef.current.x);
      const deltaY = Math.abs(touch.clientY - touchStartRef.current.y);
      
      if (deltaX > 10 || deltaY > 10) {
        clearTimeout(longPressTimeoutRef.current);
        longPressTimeoutRef.current = null;
        setIsLongPressing(false);
      }
    }
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return;

    const touch = e.changedTouches[0];
    const endTime = Date.now();
    const duration = endTime - touchStartRef.current.time;
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    // Clear long press timeout
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }

    // Don't process other gestures if long press was triggered
    if (isLongPressing) {
      setIsLongPressing(false);
      return;
    }

    const gesture: TouchGesture = {
      type: 'tap',
      startX: touchStartRef.current.x,
      startY: touchStartRef.current.y,
      endX: touch.clientX,
      endY: touch.clientY,
      duration,
      distance,
    };

    // Detect swipe gestures
    if (distance > swipeThreshold && duration < 300) {
      const absDeltaX = Math.abs(deltaX);
      const absDeltaY = Math.abs(deltaY);

      if (absDeltaX > absDeltaY) {
        // Horizontal swipe
        if (deltaX > 0) {
          gesture.type = 'swipeRight';
          onSwipeRight?.(gesture);
        } else {
          gesture.type = 'swipeLeft';
          onSwipeLeft?.(gesture);
        }
      } else {
        // Vertical swipe
        if (deltaY > 0) {
          gesture.type = 'swipeDown';
          onSwipeDown?.(gesture);
        } else {
          gesture.type = 'swipeUp';
          onSwipeUp?.(gesture);
        }
      }
    } else if (distance < 10 && duration < 300) {
      // Tap gesture
      onTap?.(gesture);
    }

    touchStartRef.current = null;
  }, [onTap, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, swipeThreshold, isLongPressing]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (longPressTimeoutRef.current) {
        clearTimeout(longPressTimeoutRef.current);
      }
    };
  }, []);

  return {
    touchHandlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
    },
    isLongPressing,
  };
};

// Swipeable card component
export interface SwipeableCardProps {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  leftAction?: {
    icon: React.ReactNode;
    label: string;
    color: string;
    action: () => void;
  };
  rightAction?: {
    icon: React.ReactNode;
    label: string;
    color: string;
    action: () => void;
  };
  className?: string;
  disabled?: boolean;
}

export const SwipeableCard: React.FC<SwipeableCardProps> = ({
  children,
  onSwipeLeft,
  onSwipeRight,
  leftAction,
  rightAction,
  className,
  disabled = false,
}) => {
  const [translateX, setTranslateX] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showAction, setShowAction] = useState<'left' | 'right' | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const { touchHandlers } = useTouchGestures({
    onSwipeLeft: () => {
      if (disabled) return;
      setIsAnimating(true);
      setTranslateX(-100);
      setShowAction('left');
      setTimeout(() => {
        onSwipeLeft?.();
        leftAction?.action();
        resetCard();
      }, 200);
    },
    onSwipeRight: () => {
      if (disabled) return;
      setIsAnimating(true);
      setTranslateX(100);
      setShowAction('right');
      setTimeout(() => {
        onSwipeRight?.();
        rightAction?.action();
        resetCard();
      }, 200);
    },
    swipeThreshold: 80,
  });

  const resetCard = () => {
    setTranslateX(0);
    setShowAction(null);
    setTimeout(() => setIsAnimating(false), 300);
  };

  return (
    <div className={clsx('relative overflow-hidden', className)}>
      {/* Left action background */}
      {leftAction && (
        <div
          className={clsx(
            'absolute inset-y-0 left-0 flex items-center justify-start pl-6',
            'transition-opacity duration-200',
            leftAction.color,
            showAction === 'left' ? 'opacity-100' : 'opacity-0'
          )}
          style={{ width: '100%' }}
        >
          <div className="flex items-center space-x-2 text-white">
            {leftAction.icon}
            <span className="font-medium">{leftAction.label}</span>
          </div>
        </div>
      )}

      {/* Right action background */}
      {rightAction && (
        <div
          className={clsx(
            'absolute inset-y-0 right-0 flex items-center justify-end pr-6',
            'transition-opacity duration-200',
            rightAction.color,
            showAction === 'right' ? 'opacity-100' : 'opacity-0'
          )}
          style={{ width: '100%' }}
        >
          <div className="flex items-center space-x-2 text-white">
            <span className="font-medium">{rightAction.label}</span>
            {rightAction.icon}
          </div>
        </div>
      )}

      {/* Main card content */}
      <div
        ref={cardRef}
        className={clsx(
          'relative z-10 bg-white dark:bg-gray-800',
          'transition-transform duration-200',
          isAnimating && 'ease-out',
          !disabled && 'touch-pan-y'
        )}
        style={{
          transform: `translateX(${translateX}%)`,
        }}
        {...(!disabled ? touchHandlers : {})}
      >
        {children}
      </div>
    </div>
  );
};

// Pull to refresh component
export interface PullToRefreshProps {
  children: React.ReactNode;
  onRefresh: () => Promise<void>;
  refreshThreshold?: number;
  className?: string;
  disabled?: boolean;
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({
  children,
  onRefresh,
  refreshThreshold = 80,
  className,
  disabled = false,
}) => {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [canRefresh, setCanRefresh] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef<number>(0);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled || isRefreshing) return;
    
    const container = containerRef.current;
    if (!container || container.scrollTop > 0) return;
    
    startY.current = e.touches[0].clientY;
  }, [disabled, isRefreshing]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (disabled || isRefreshing || startY.current === 0) return;
    
    const container = containerRef.current;
    if (!container || container.scrollTop > 0) return;
    
    const currentY = e.touches[0].clientY;
    const deltaY = currentY - startY.current;
    
    if (deltaY > 0) {
      e.preventDefault();
      const distance = Math.min(deltaY * 0.5, refreshThreshold * 1.5);
      setPullDistance(distance);
      setCanRefresh(distance >= refreshThreshold);
    }
  }, [disabled, isRefreshing, refreshThreshold]);

  const handleTouchEnd = useCallback(async () => {
    if (disabled || isRefreshing) return;
    
    if (canRefresh) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } catch (error) {
        console.error('Refresh failed:', error);
      } finally {
        setIsRefreshing(false);
      }
    }
    
    setPullDistance(0);
    setCanRefresh(false);
    startY.current = 0;
  }, [disabled, isRefreshing, canRefresh, onRefresh]);

  const refreshProgress = Math.min(pullDistance / refreshThreshold, 1);

  return (
    <div
      ref={containerRef}
      className={clsx('relative overflow-auto', className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull to refresh indicator */}
      <div
        className={clsx(
          'absolute top-0 left-0 right-0 flex items-center justify-center',
          'bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700',
          'transition-all duration-200 ease-out z-20'
        )}
        style={{
          height: `${Math.max(pullDistance, isRefreshing ? refreshThreshold : 0)}px`,
          transform: `translateY(${pullDistance > 0 || isRefreshing ? 0 : -100}%)`,
        }}
      >
        <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
          {isRefreshing ? (
            <>
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <span className="text-sm font-medium">Refreshing...</span>
            </>
          ) : (
            <>
              <svg
                className={clsx(
                  'h-5 w-5 transition-transform duration-200',
                  canRefresh && 'rotate-180'
                )}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 14l-7 7m0 0l-7-7m7 7V3"
                />
              </svg>
              <span className="text-sm font-medium">
                {canRefresh ? 'Release to refresh' : 'Pull to refresh'}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div
        style={{
          transform: `translateY(${pullDistance}px)`,
          transition: pullDistance === 0 ? 'transform 0.2s ease-out' : 'none',
        }}
      >
        {children}
      </div>
    </div>
  );
};

// Floating Action Button with expandable menu
export interface FABMenuItem {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  color?: string;
}

export interface ExpandableFABProps {
  mainIcon: React.ReactNode;
  mainLabel: string;
  items: FABMenuItem[];
  className?: string;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
}

export const ExpandableFAB: React.FC<ExpandableFABProps> = ({
  mainIcon,
  mainLabel,
  items,
  className,
  position = 'bottom-right',
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const positionClasses = {
    'bottom-right': 'bottom-6 right-6',
    'bottom-left': 'bottom-6 left-6',
    'top-right': 'top-6 right-6',
    'top-left': 'top-6 left-6',
  };

  const menuDirection = position.includes('bottom') ? 'up' : 'down';
  const menuAlign = position.includes('right') ? 'right' : 'left';

  return (
    <>
      {/* Backdrop */}
      {isExpanded && (
        <div
          className="fixed inset-0 bg-black bg-opacity-20 z-40"
          onClick={() => setIsExpanded(false)}
        />
      )}

      <div className={clsx('fixed z-50', positionClasses[position], className)}>
        {/* Menu items */}
        <div
          className={clsx(
            'absolute mb-4 space-y-3',
            menuDirection === 'up' ? 'bottom-full' : 'top-full',
            menuAlign === 'right' ? 'right-0' : 'left-0',
            'transition-all duration-300 ease-out',
            isExpanded ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
          )}
        >
          {items.map((item, index) => (
            <div
              key={index}
              className={clsx(
                'flex items-center space-x-3',
                menuAlign === 'left' ? 'flex-row' : 'flex-row-reverse space-x-reverse'
              )}
              style={{
                transitionDelay: isExpanded ? `${index * 50}ms` : '0ms',
              }}
            >
              <div className="bg-white dark:bg-gray-800 px-3 py-2 rounded-lg shadow-lg text-sm font-medium text-gray-900 dark:text-white">
                {item.label}
              </div>
              <button
                onClick={() => {
                  item.onClick();
                  setIsExpanded(false);
                }}
                className={clsx(
                  'w-12 h-12 rounded-full shadow-lg flex items-center justify-center',
                  'transition-all duration-200 hover:scale-105 active:scale-95',
                  item.color || 'bg-blue-600 hover:bg-blue-700 text-white'
                )}
              >
                {item.icon}
              </button>
            </div>
          ))}
        </div>

        {/* Main FAB */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={clsx(
            'w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg',
            'flex items-center justify-center transition-all duration-300',
            'hover:scale-105 active:scale-95',
            isExpanded && 'rotate-45'
          )}
          aria-label={mainLabel}
          aria-expanded={isExpanded}
        >
          {mainIcon}
        </button>
      </div>
    </>
  );
};