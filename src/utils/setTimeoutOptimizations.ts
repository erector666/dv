/**
 * Optimized setTimeout utilities to reduce performance violations
 */

/**
 * Optimized setTimeout that uses requestAnimationFrame when possible
 * Falls back to setTimeout for longer delays
 */
export const optimizedSetTimeout = (callback: () => void, delay: number): number => {
  if (delay <= 16) {
    // Use requestAnimationFrame for short delays (1 frame)
    return requestAnimationFrame(callback);
  } else if (delay <= 100) {
    // Use requestAnimationFrame with multiple frames for medium delays
    let frames = Math.ceil(delay / 16);
    const execute = () => {
      frames--;
      if (frames <= 0) {
        callback();
      } else {
        requestAnimationFrame(execute);
      }
    };
    return requestAnimationFrame(execute);
  } else {
    // Use regular setTimeout for longer delays
    return setTimeout(callback, delay) as unknown as number;
  }
};

/**
 * Optimized setInterval that uses requestAnimationFrame when possible
 */
export const optimizedSetInterval = (callback: () => void, interval: number): number => {
  if (interval <= 16) {
    // Use requestAnimationFrame for 60fps updates
    let animationId: number;
    const execute = () => {
      callback();
      animationId = requestAnimationFrame(execute);
    };
    animationId = requestAnimationFrame(execute);
    return animationId;
  } else {
    // Use regular setInterval for longer intervals
    return setInterval(callback, interval) as unknown as number;
  }
};

/**
 * Clear optimized timeout/interval
 */
export const optimizedClearTimeout = (id: number): void => {
  if (id < 1000000) {
    // Likely a requestAnimationFrame ID
    cancelAnimationFrame(id);
  } else {
    // Likely a setTimeout ID
    clearTimeout(id);
  }
};

/**
 * Clear optimized interval
 */
export const optimizedClearInterval = (id: number): void => {
  if (id < 1000000) {
    // Likely a requestAnimationFrame ID
    cancelAnimationFrame(id);
  } else {
    // Likely a setInterval ID
    clearInterval(id);
  }
};

/**
 * Debounce with optimized setTimeout
 */
export const optimizedDebounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: number;
  return (...args: Parameters<T>) => {
    optimizedClearTimeout(timeout);
    timeout = optimizedSetTimeout(() => func(...args), wait);
  };
};

/**
 * Throttle with optimized setTimeout
 */
export const optimizedThrottle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      optimizedSetTimeout(() => (inThrottle = false), limit);
    }
  };
};

/**
 * Performance-aware delay that doesn't block the main thread
 */
export const optimizedDelay = (ms: number): Promise<void> => {
  if (ms <= 0) return Promise.resolve();
  
  if (ms <= 16) {
    // Use requestAnimationFrame for short delays
    return new Promise(resolve => {
      requestAnimationFrame(() => resolve());
    });
  } else if (ms <= 100) {
    // Use multiple requestAnimationFrame calls
    return new Promise(resolve => {
      let frames = Math.ceil(ms / 16);
      const execute = () => {
        frames--;
        if (frames <= 0) {
          resolve();
        } else {
          requestAnimationFrame(execute);
        }
      };
      requestAnimationFrame(execute);
    });
  } else {
    // Use setTimeout for longer delays
    return new Promise(resolve => {
      setTimeout(resolve, ms);
    });
  }
};

export default {
  setTimeout: optimizedSetTimeout,
  setInterval: optimizedSetInterval,
  clearTimeout: optimizedClearTimeout,
  clearInterval: optimizedClearInterval,
  debounce: optimizedDebounce,
  throttle: optimizedThrottle,
  delay: optimizedDelay,
};
