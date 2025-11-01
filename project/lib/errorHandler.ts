// Production-safe error handling
export class ErrorHandler {
  static logError(error: any, context?: string) {
    // Only log in development
    if (__DEV__) {
      console.error(`[${context || 'Error'}]:`, error);
    }
    
    // In production, you could send to crash analytics
    // Example: Crashlytics.recordError(error);
  }

  static getUserFriendlyMessage(error: any): string {
    // Network errors
    if (error.message?.includes('fetch failed') || 
        error.message?.includes('Network request failed') ||
        error.code === 'NETWORK_ERROR') {
      return 'Please check your internet connection and try again.';
    }

    // Server errors
    if (error.message?.includes('500') || 
        error.message?.includes('503') ||
        error.message?.includes('database')) {
      return 'Server is temporarily busy. Please try again in a moment.';
    }

    // Timeout errors
    if (error.message?.includes('timeout') || 
        error.message?.includes('408')) {
      return 'Request timed out. Please try again.';
    }

    // Authentication errors
    if (error.message?.includes('401') || 
        error.message?.includes('unauthorized')) {
      return 'Please log in again to continue.';
    }

    // Generic fallback
    return 'Something went wrong. Please try again.';
  }

  static handleApiError(error: any, context?: string): never {
    this.logError(error, context);
    throw new Error(this.getUserFriendlyMessage(error));
  }
}

// Global error boundary for unhandled errors
export const setupGlobalErrorHandler = () => {
  // Handle unhandled promise rejections
  if (typeof window !== 'undefined') {
    window.addEventListener('unhandledrejection', (event) => {
      ErrorHandler.logError(event.reason, 'Unhandled Promise Rejection');
      event.preventDefault(); // Prevent default browser behavior
    });
  }
};
