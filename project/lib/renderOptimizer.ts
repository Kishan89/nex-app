// Render optimization utilities
import { memo, useMemo, useCallback, useRef, useEffect } from 'react';

// Memoization helpers
export const createMemoizedComponent = <P extends object>(
  Component: React.ComponentType<P>,
  areEqual?: (prevProps: P, nextProps: P) => boolean
) => {
  return memo(Component, areEqual);
};

// Stable callback hook
export const useStableCallback = <T extends (...args: any[]) => any>(
  callback: T
): T => {
  const callbackRef = useRef(callback);
  
  useEffect(() => {
    callbackRef.current = callback;
  });
  
  return useCallback((...args: any[]) => {
    return callbackRef.current(...args);
  }, []) as T;
};

// Debounced callback
export const useDebouncedCallback = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T => {
  const timeoutRef = useRef<NodeJS.Timeout>();
  
  return useCallback((...args: any[]) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      callback(...args);
    }, delay);
  }, [callback, delay]) as T;
};

// Throttled callback
export const useThrottledCallback = <T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T => {
  const lastCallRef = useRef(0);
  
  return useCallback((...args: any[]) => {
    const now = Date.now();
    
    if (now - lastCallRef.current >= delay) {
      lastCallRef.current = now;
      callback(...args);
    }
  }, [callback, delay]) as T;
};

// Expensive calculation memoization
export const useExpensiveCalculation = <T>(
  calculation: () => T,
  deps: React.DependencyList
): T => {
  return useMemo(calculation, deps);
};

// Props comparison helpers
export const shallowEqual = <T extends object>(a: T, b: T): boolean => {
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  
  if (keysA.length !== keysB.length) {
    return false;
  }
  
  for (let key of keysA) {
    if (a[key as keyof T] !== b[key as keyof T]) {
      return false;
    }
  }
  
  return true;
};

// Deep comparison for objects
export const deepEqual = <T>(a: T, b: T): boolean => {
  if (a === b) return true;
  
  if (a == null || b == null) return false;
  
  if (typeof a !== typeof b) return false;
  
  if (typeof a !== 'object') return a === b;
  
  const keysA = Object.keys(a as object);
  const keysB = Object.keys(b as object);
  
  if (keysA.length !== keysB.length) return false;
  
  for (let key of keysA) {
    if (!keysB.includes(key)) return false;
    if (!deepEqual((a as any)[key], (b as any)[key])) return false;
  }
  
  return true;
};

// Render count tracker (for debugging)
export const useRenderCount = (componentName: string) => {
  const renderCount = useRef(0);
  
  useEffect(() => {
    renderCount.current += 1;
    if (__DEV__) {
      console.log(`${componentName} rendered ${renderCount.current} times`);
    }
  });
  
  return renderCount.current;
};

// Performance monitoring
export const usePerformanceMonitor = (componentName: string) => {
  const startTime = useRef<number>();
  
  useEffect(() => {
    startTime.current = performance.now();
    
    return () => {
      if (startTime.current && __DEV__) {
        const renderTime = performance.now() - startTime.current;
        console.log(`${componentName} render time: ${renderTime.toFixed(2)}ms`);
      }
    };
  });
};

// Conditional rendering optimization
export const ConditionalRender = memo<{
  condition: boolean;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}>(({ condition, children, fallback = null }) => {
  return condition ? <>{children}</> : <>{fallback}</>;
});

// List optimization
export const OptimizedList = memo<{
  data: any[];
  renderItem: (item: any, index: number) => React.ReactNode;
  keyExtractor: (item: any, index: number) => string;
}>(({ data, renderItem, keyExtractor }) => {
  const memoizedItems = useMemo(() => {
    return data.map((item, index) => ({
      key: keyExtractor(item, index),
      element: renderItem(item, index)
    }));
  }, [data, renderItem, keyExtractor]);
  
  return (
    <>
      {memoizedItems.map(({ key, element }) => (
        <React.Fragment key={key}>
          {element}
        </React.Fragment>
      ))}
    </>
  );
});
