// Performance monitoring utilities
import { useEffect, useRef } from 'react';

interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, any>;
}

class PerformanceMonitor {
  private metrics = new Map<string, PerformanceMetric>();
  private observers: ((metric: PerformanceMetric) => void)[] = [];

  /**
   * Start timing a performance metric
   */
  startTiming(name: string, metadata?: Record<string, any>): void {
    const metric: PerformanceMetric = {
      name,
      startTime: performance.now(),
      metadata
    };
    this.metrics.set(name, metric);
  }

  /**
   * End timing a performance metric
   */
  endTiming(name: string): PerformanceMetric | null {
    const metric = this.metrics.get(name);
    if (!metric) {
      console.warn(`Performance metric "${name}" not found`);
      return null;
    }

    const endTime = performance.now();
    const duration = endTime - metric.startTime;

    const completedMetric: PerformanceMetric = {
      ...metric,
      endTime,
      duration
    };

    this.metrics.set(name, completedMetric);
    this.notifyObservers(completedMetric);

    if (__DEV__) {
      console.log(`⏱️ ${name}: ${duration.toFixed(2)}ms`);
    }

    return completedMetric;
  }

  /**
   * Measure function execution time
   */
  measure<T>(name: string, fn: () => T, metadata?: Record<string, any>): T {
    this.startTiming(name, metadata);
    try {
      const result = fn();
      this.endTiming(name);
      return result;
    } catch (error) {
      this.endTiming(name);
      throw error;
    }
  }

  /**
   * Measure async function execution time
   */
  async measureAsync<T>(
    name: string, 
    fn: () => Promise<T>, 
    metadata?: Record<string, any>
  ): Promise<T> {
    this.startTiming(name, metadata);
    try {
      const result = await fn();
      this.endTiming(name);
      return result;
    } catch (error) {
      this.endTiming(name);
      throw error;
    }
  }

  /**
   * Get performance metrics
   */
  getMetrics(): PerformanceMetric[] {
    return Array.from(this.metrics.values());
  }

  /**
   * Get metric by name
   */
  getMetric(name: string): PerformanceMetric | undefined {
    return this.metrics.get(name);
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.metrics.clear();
  }

  /**
   * Get average duration for a metric name pattern
   */
  getAverageDuration(pattern: string): number {
    const matchingMetrics = this.getMetrics().filter(metric => 
      metric.name.includes(pattern) && metric.duration
    );

    if (matchingMetrics.length === 0) return 0;

    const totalDuration = matchingMetrics.reduce(
      (sum, metric) => sum + (metric.duration || 0), 
      0
    );

    return totalDuration / matchingMetrics.length;
  }

  /**
   * Subscribe to performance metrics
   */
  subscribe(observer: (metric: PerformanceMetric) => void): () => void {
    this.observers.push(observer);
    return () => {
      const index = this.observers.indexOf(observer);
      if (index > -1) {
        this.observers.splice(index, 1);
      }
    };
  }

  /**
   * Notify observers
   */
  private notifyObservers(metric: PerformanceMetric): void {
    this.observers.forEach(observer => observer(metric));
  }

  /**
   * Get performance summary
   */
  getSummary(): {
    totalMetrics: number;
    averageDuration: number;
    slowestMetric: PerformanceMetric | null;
    fastestMetric: PerformanceMetric | null;
  } {
    const metrics = this.getMetrics().filter(m => m.duration);
    
    if (metrics.length === 0) {
      return {
        totalMetrics: 0,
        averageDuration: 0,
        slowestMetric: null,
        fastestMetric: null
      };
    }

    const durations = metrics.map(m => m.duration!);
    const averageDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
    
    const slowestMetric = metrics.reduce((prev, current) => 
      (prev.duration! > current.duration!) ? prev : current
    );
    
    const fastestMetric = metrics.reduce((prev, current) => 
      (prev.duration! < current.duration!) ? prev : current
    );

    return {
      totalMetrics: metrics.length,
      averageDuration,
      slowestMetric,
      fastestMetric
    };
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();

// React hooks for performance monitoring
export const usePerformanceTiming = (name: string, deps: any[] = []) => {
  const startTime = useRef<number>();

  useEffect(() => {
    startTime.current = performance.now();
    
    return () => {
      if (startTime.current) {
        const duration = performance.now() - startTime.current;
        performanceMonitor.startTiming(name);
        performanceMonitor.endTiming(name);
      }
    };
  }, deps);
};

export const usePerformanceMeasure = (name: string, fn: () => void, deps: any[] = []) => {
  useEffect(() => {
    performanceMonitor.measure(name, fn);
  }, deps);
};

// Component render time tracking
export const useRenderTime = (componentName: string) => {
  const renderStart = useRef<number>();

  useEffect(() => {
    renderStart.current = performance.now();
    
    return () => {
      if (renderStart.current) {
        const renderTime = performance.now() - renderStart.current;
        performanceMonitor.startTiming(`${componentName}_render`);
        performanceMonitor.endTiming(`${componentName}_render`);
      }
    };
  });
};

// API call performance tracking
export const trackApiCall = async <T>(
  apiName: string,
  apiCall: () => Promise<T>
): Promise<T> => {
  return performanceMonitor.measureAsync(apiName, apiCall);
};

// Navigation performance tracking
export const trackNavigation = (screenName: string) => {
  performanceMonitor.startTiming(`navigation_${screenName}`);
  
  return () => {
    performanceMonitor.endTiming(`navigation_${screenName}`);
  };
};

export default performanceMonitor;
