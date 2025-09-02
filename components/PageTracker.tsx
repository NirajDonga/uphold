"use client";

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import Cookies from 'js-cookie';

/**
 * Component that tracks the user's page visits and stores the current page in cookies
 * This helps with redirection after login or page refresh
 */
export default function PageTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  useEffect(() => {
    // Pages that shouldn't be tracked for revisiting
    const nonTrackablePages = [
      '/login', 
      '/register', 
      '/complete-profile', 
      '/reset-password',
      '/api'
    ];
    
    // Don't track certain pages
    if (nonTrackablePages.some(page => pathname?.startsWith(page))) {
      return;
    }
    
    // Create the full path with query parameters
    const query = searchParams?.toString();
    const fullPath = query ? `${pathname}?${query}` : pathname;
    
    // Save to both localStorage and cookies (cookies for server-side access in middleware)
    if (pathname && !pathname.startsWith('/_next')) {
      localStorage.setItem('lastVisitedPage', fullPath);
      
      // Set cookie that expires in 7 days
      Cookies.set('lastVisitedPage', fullPath, { expires: 7, path: '/' });
      
      // Also store the timestamp of the visit to measure performance
      localStorage.setItem('lastPageLoadTime', Date.now().toString());
    }
  }, [pathname, searchParams]);
  
  // This is a non-visual component
  return null;
}
