"use client";

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

/**
 * Hook to track the user's navigation history and remember the last page visited
 * This helps in redirecting users back to where they were after login/refresh
 */
export function usePageTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  useEffect(() => {
    // Don't track certain pages
    const nonTrackablePages = [
      '/login', 
      '/register', 
      '/complete-profile', 
      '/reset-password'
    ];
    
    // Check if current page should be tracked
    if (nonTrackablePages.includes(pathname)) {
      return;
    }
    
    // Save the current location to localStorage
    const query = searchParams?.toString();
    const fullPath = query ? `${pathname}?${query}` : pathname;
    
    // Only track pages that are not API or special routes
    if (pathname && !pathname.startsWith('/api') && !pathname.startsWith('/_next')) {
      localStorage.setItem('lastVisitedPage', fullPath);
    }
  }, [pathname, searchParams]);
  
  /**
   * Returns the last visited page from localStorage
   */
  const getLastVisitedPage = (): string => {
    if (typeof window === 'undefined') return '/dashboard';
    return localStorage.getItem('lastVisitedPage') || '/dashboard';
  };
  
  return { getLastVisitedPage };
}
