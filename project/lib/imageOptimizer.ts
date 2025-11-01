// Image optimization service for better performance
import { Image } from 'react-native';
import * as FileSystem from 'expo-file-system';

interface ImageOptimizationOptions {
  quality?: number;
  maxWidth?: number;
  maxHeight?: number;
  format?: 'jpeg' | 'png' | 'webp';
}

class ImageOptimizer {
  private static cache = new Map<string, string>();
  private static readonly CACHE_SIZE_LIMIT = 100; // Max cached images

  /**
   * Optimize image for better performance
   */
  static async optimizeImage(
    uri: string, 
    options: ImageOptimizationOptions = {}
  ): Promise<string> {
    const {
      quality = 0.8,
      maxWidth = 800,
      maxHeight = 600,
      format = 'jpeg'
    } = options;

    // Check cache first
    const cacheKey = `${uri}_${quality}_${maxWidth}_${maxHeight}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    try {
      // For now, return original URI (can be enhanced with actual compression)
      // In production, you can use libraries like react-native-image-resizer
      const optimizedUri = uri;
      
      // Cache the result
      this.cacheOptimizedImage(cacheKey, optimizedUri);
      
      return optimizedUri;
    } catch (error) {
      console.error('Image optimization failed:', error);
      return uri; // Fallback to original
    }
  }

  /**
   * Preload images for better UX
   */
  static async preloadImages(uris: string[]): Promise<void> {
    const preloadPromises = uris.map(uri => 
      Image.prefetch(uri).catch(() => {
        // Silent fail for preloading
      })
    );
    
    await Promise.all(preloadPromises);
  }

  /**
   * Get image dimensions without loading full image
   */
  static async getImageDimensions(uri: string): Promise<{width: number, height: number} | null> {
    return new Promise((resolve) => {
      Image.getSize(
        uri,
        (width, height) => resolve({ width, height }),
        () => resolve(null)
      );
    });
  }

  /**
   * Clear cache when memory is low
   */
  static clearCache(): void {
    this.cache.clear();
  }

  /**
   * Cache optimized image with size limit
   */
  private static cacheOptimizedImage(key: string, uri: string): void {
    if (this.cache.size >= this.CACHE_SIZE_LIMIT) {
      // Remove oldest entry
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, uri);
  }

  /**
   * Get cache stats
   */
  static getCacheStats(): { size: number; limit: number } {
    return {
      size: this.cache.size,
      limit: this.CACHE_SIZE_LIMIT
    };
  }
}

export default ImageOptimizer;
