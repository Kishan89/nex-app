import { useState, useEffect, useCallback, useRef } from 'react';

export function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]); 
    return debouncedValue;
}

/**
 * Hook to debounce callback functions
 * Prevents multiple rapid calls to the same function
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
    callback: T,
    delay: number = 300
): T {
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const callbackRef = useRef<T>(callback);

    // Update callback ref when callback changes
    useEffect(() => {
        callbackRef.current = callback;
    }, [callback]);

    return useCallback(
        ((...args: any[]) => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
            timeoutRef.current = setTimeout(() => {
                callbackRef.current(...args);
            }, delay);
        }) as T,
        [delay]
    );
}

/**
 * Hook to throttle callback functions
 * Ensures function is called at most once per specified interval
 */
export function useThrottledCallback<T extends (...args: any[]) => any>(
    callback: T,
    delay: number = 300
): T {
    const lastRun = useRef(Date.now());
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const callbackRef = useRef<T>(callback);

    // Update callback ref when callback changes
    useEffect(() => {
        callbackRef.current = callback;
    }, [callback]);

    return useCallback(
        ((...args: any[]) => {
            const now = Date.now();
            const timeSinceLastRun = now - lastRun.current;

            if (timeSinceLastRun >= delay) {
                // Enough time has passed, execute immediately
                lastRun.current = now;
                callbackRef.current(...args);
            } else {
                // Not enough time, schedule for later
                if (timeoutRef.current) {
                    clearTimeout(timeoutRef.current);
                }
                timeoutRef.current = setTimeout(() => {
                    lastRun.current = Date.now();
                    callbackRef.current(...args);
                }, delay - timeSinceLastRun);
            }
        }) as T,
        [delay]
    );
}