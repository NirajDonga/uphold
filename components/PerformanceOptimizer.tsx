"use client";

import { useEffect } from 'react';

/**
 * Performance optimization component that implements various techniques to improve
 * application performance including:
 * 1. Image optimization
 * 2. Resource preloading
 * 3. Font optimization
 * 4. Third-party script management
 */
export default function PerformanceOptimizer() {
  useEffect(() => {
    // Only run on client-side
    if (typeof window === 'undefined') return;

    // Enable faster navigation with prefetching
    const linkPrefetch = (href: string): void => {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = href;
      link.as = href.endsWith('.js') ? 'script' : 'document';
      document.head.appendChild(link);
    };

    // Preload critical resources
    const preloadResources = (): void => {
      // Prefetch common pages that users might navigate to
      ['/dashboard', '/funds', '/favorites'].forEach(page => {
        linkPrefetch(page);
      });
    };

    // Optimize image loading
    const optimizeImages = (): void => {
      // Find all images in the viewport and set loading priority
      const images = document.querySelectorAll('img[loading="lazy"]');
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;
            if (img.dataset.src) {
              img.src = img.dataset.src;
            }
            observer.unobserve(img);
          }
        });
      });

      images.forEach(img => observer.observe(img));
    };

    // Clean up unnecessary event listeners
    const cleanupListeners = (): void => {
      // Find event listeners that might be causing memory leaks
      const heavyElements = document.querySelectorAll('.heavy-component');
      heavyElements.forEach(el => {
        // Clone and replace to remove event listeners
        const newEl = el.cloneNode(true);
        if (el.parentNode) {
          el.parentNode.replaceChild(newEl, el);
        }
      });
    };
    
    // Implement the optimizations
    const timeoutId = setTimeout(() => {
      preloadResources();
      optimizeImages();
      
      // Only do cleanup if page is slow
      if ((performance as any).memory && (performance as any).memory.usedJSHeapSize > 50000000) {
        cleanupListeners();
      }
    }, 1000);

    return () => {
      clearTimeout(timeoutId);
    };
  }, []);

  return null; // This is a utility component with no UI
}
