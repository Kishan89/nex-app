// Memory management utilities to prevent leaks
import { useEffect, useRef, useCallback } from 'react';

// React Native compatible timer types
type Timer = ReturnType<typeof setTimeout>;
type Interval = ReturnType<typeof setInterval>;

class MemoryManager {
  private static timers = new Set<Timer>();
  private static intervals = new Set<Interval>();
  private static listeners = new Map<string, () => void>();

  /**
   * Safe setTimeout that auto-cleans up
   */
  static setTimeout(callback: () => void, delay: number): Timer {
    const timer = setTimeout(() => {
      this.timers.delete(timer);
      callback();
    }, delay);
    this.timers.add(timer);
    return timer;
  }

  /**
   * Safe setInterval that can be cleaned up
   */
  static setInterval(callback: () => void, delay: number): Interval {
    const interval = setInterval(callback, delay);
    this.intervals.add(interval);
    return interval;
  }

  /**
   * Clear specific timer
   */
  static clearTimer(timer: Timer): void {
    clearTimeout(timer);
    this.timers.delete(timer);
  }

  /**
   * Clear specific interval
   */
  static clearInterval(interval: Interval): void {
    clearInterval(interval);
    this.intervals.delete(interval);
  }

  /**
   * Clear all timers and intervals
   */
  static clearAll(): void {
    this.timers.forEach(timer => clearTimeout(timer));
    this.intervals.forEach(interval => clearInterval(interval));
    this.timers.clear();
    this.intervals.clear();
  }

  /**
   * Add event listener with cleanup
   */
  static addListener(key: string, cleanup: () => void): void {
    this.listeners.set(key, cleanup);
  }

  /**
   * Remove specific listener
   */
  static removeListener(key: string): void {
    const cleanup = this.listeners.get(key);
    if (cleanup) {
      cleanup();
      this.listeners.delete(key);
    }
  }

  /**
   * Clean up all listeners
   */
  static cleanupAll(): void {
    this.listeners.forEach(cleanup => cleanup());
    this.listeners.clear();
  }

  /**
   * Get memory stats
   */
  static getStats(): {
    timers: number;
    intervals: number;
    listeners: number;
  } {
    return {
      timers: this.timers.size,
      intervals: this.intervals.size,
      listeners: this.listeners.size
    };
  }
}

// React hooks for memory management
export const useMemorySafeTimeout = (callback: () => void, delay: number) => {
  const timerRef = useRef<Timer | null>(null);

  useEffect(() => {
    timerRef.current = MemoryManager.setTimeout(callback, delay);
    
    return () => {
      if (timerRef.current) {
        MemoryManager.clearTimer(timerRef.current);
      }
    };
  }, [callback, delay]);
};

export const useMemorySafeInterval = (callback: () => void, delay: number) => {
  const intervalRef = useRef<Interval | null>(null);

  useEffect(() => {
    intervalRef.current = MemoryManager.setInterval(callback, delay);
    
    return () => {
      if (intervalRef.current) {
        MemoryManager.clearInterval(intervalRef.current);
      }
    };
  }, [callback, delay]);
};

export const useMemorySafeCallback = <T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList
): T => {
  return useCallback(callback, deps);
};

export default MemoryManager;
