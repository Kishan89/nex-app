// Central optimization manager
import { useEffect } from 'react';
import ImageOptimizer from './imageOptimizer';
import MemoryManager from './memoryManager';
import { apiCache } from './apiCache';
import { preloadComponents } from './bundleOptimizer';
import performanceMonitor from './performanceMonitor';

class OptimizationManager {
  private static initialized = false;

  /**
   * Initialize all optimizations
   */
  static async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Start performance monitoring
      performanceMonitor.startTiming('app_initialization');

      // Preload critical components
      await preloadComponents();

      // Initialize image optimization
      ImageOptimizer.clearCache(); // Clear any old cache

      // Initialize API cache
      await apiCache.clearAll(); // Clear any old cache

      // Mark as initialized
      this.initialized = true;

      performanceMonitor.endTiming('app_initialization');
      
      console.log('✅ OptimizationManager initialized successfully');
    } catch (error) {
      console.error('❌ OptimizationManager initialization failed:', error);
    }
  }

  /**
   * Cleanup optimizations
   */
  static cleanup(): void {
    try {
      // Clear all caches
      ImageOptimizer.clearCache();
      MemoryManager.clearAll();
      apiCache.clearAll();

      // Clear performance metrics
      performanceMonitor.clearMetrics();

      console.log('✅ OptimizationManager cleanup completed');
    } catch (error) {
      console.error('❌ OptimizationManager cleanup failed:', error);
    }
  }

  /**
   * Get optimization status
   */
  static getStatus(): {
    initialized: boolean;
    imageCache: { size: number; limit: number };
    memoryStats: { timers: number; intervals: number; listeners: number };
    apiCacheStats: { memorySize: number; memoryLimit: number };
    performanceSummary: any;
  } {
    return {
      initialized: this.initialized,
      imageCache: ImageOptimizer.getCacheStats(),
      memoryStats: MemoryManager.getStats(),
      apiCacheStats: apiCache.getStats(),
      performanceSummary: performanceMonitor.getSummary()
    };
  }

  /**
   * Optimize for low memory
   */
  static optimizeForLowMemory(): void {
    try {
      // Clear image cache
      ImageOptimizer.clearCache();

      // Clear API cache
      apiCache.clearAll();

      // Clear performance metrics
      performanceMonitor.clearMetrics();

      console.log('✅ Optimized for low memory');
    } catch (error) {
      console.error('❌ Low memory optimization failed:', error);
    }
  }

  /**
   * Get performance recommendations
   */
  static getRecommendations(): string[] {
    const recommendations: string[] = [];
    const status = this.getStatus();

    // Check image cache
    if (status.imageCache.size > status.imageCache.limit * 0.8) {
      recommendations.push('Consider clearing image cache - high memory usage');
    }

    // Check memory usage
    if (status.memoryStats.timers > 10) {
      recommendations.push('High number of active timers - check for memory leaks');
    }

    if (status.memoryStats.intervals > 5) {
      recommendations.push('High number of active intervals - check for memory leaks');
    }

    // Check API cache
    if (status.apiCacheStats.memorySize > status.apiCacheStats.memoryLimit * 0.8) {
      recommendations.push('API cache is nearly full - consider clearing');
    }

    // Check performance
    const summary = status.performanceSummary;
    if (summary.averageDuration > 1000) {
      recommendations.push('Average operation time is high - consider optimization');
    }

    return recommendations;
  }
}

// React hook for optimization management
export const useOptimizationManager = () => {
  useEffect(() => {
    // Initialize on mount
    OptimizationManager.initialize();

    // Cleanup on unmount
    return () => {
      OptimizationManager.cleanup();
    };
  }, []);

  return {
    getStatus: OptimizationManager.getStatus,
    optimizeForLowMemory: OptimizationManager.optimizeForLowMemory,
    getRecommendations: OptimizationManager.getRecommendations
  };
};

export default OptimizationManager;
