"use client"
import { useEffect, useCallback } from 'react';

/**
 * Performance monitoring hook
 */
export function usePerformanceMonitor(componentName: string): void {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'performance' in window) {
      const startTime = performance.now();
      
      return () => {
        const endTime = performance.now();
        const renderTime = endTime - startTime;
        
        if (renderTime > 16.67) { // More than one frame (60fps)
          console.warn(`⚠️ ${componentName} took ${renderTime.toFixed(2)}ms to render`);
        } else {
          console.log(`✅ ${componentName} rendered in ${renderTime.toFixed(2)}ms`);
        }
      };
    }
    return undefined;
  }, [componentName]);
}

/**
 * Hook to measure API call performance
 */
export function useApiPerformance(): { measureApiCall: <T>(apiCall: () => Promise<T>, endpoint: string) => Promise<T> } {
  const measureApiCall = useCallback(async <T>(apiCall: () => Promise<T>, endpoint: string): Promise<T> => {
    if (typeof window !== 'undefined' && 'performance' in window) {
      const startTime = performance.now();
      
      try {
        const result = await apiCall();
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        console.log(`📡 API ${endpoint} completed in ${duration.toFixed(2)}ms`);
        
        if (duration > 1000) {
          console.warn(`⚠️ Slow API call: ${endpoint} took ${duration.toFixed(2)}ms`);
        }
        
        return result;
      } catch (error) {
        const endTime = performance.now();
        const duration = endTime - startTime;
        console.error(`❌ API ${endpoint} failed after ${duration.toFixed(2)}ms:`, error);
        throw error;
      }
    } else {
      return await apiCall();
    }
  }, []);

  return { measureApiCall };
}

/**
 * Hook to monitor Core Web Vitals
 */
export function useWebVitals(): void {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Import web-vitals dynamically to avoid SSR issues
      import('web-vitals').then((webVitals: any) => {
        if (webVitals.onCLS) webVitals.onCLS(console.log);
        if (webVitals.onINP) webVitals.onINP(console.log);
        if (webVitals.onFCP) webVitals.onFCP(console.log);
        if (webVitals.onLCP) webVitals.onLCP(console.log);
        if (webVitals.onTTFB) webVitals.onTTFB(console.log);
      }).catch(() => {
        // web-vitals not available, skip monitoring
      });
    }
  }, []);
}

/**
 * Memory usage monitor (development only)
 */
export function useMemoryMonitor(): void {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && 
        typeof window !== 'undefined' && 
        'performance' in window && 
        'memory' in (performance as any)) {
      
      const interval = setInterval(() => {
        const memory = (performance as any).memory;
        const used = Math.round(memory.usedJSHeapSize / 1048576); // MB
        const total = Math.round(memory.totalJSHeapSize / 1048576); // MB
        
        console.log(`🧠 Memory: ${used}MB / ${total}MB`);
        
        if (used > 100) { // Warn if using more than 100MB
          console.warn(`⚠️ High memory usage: ${used}MB`);
        }
      }, 30000); // Check every 30 seconds
      
      return () => clearInterval(interval);
    }
    return undefined;
  }, []);
}
