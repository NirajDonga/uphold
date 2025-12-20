import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default withAuth(
  function middleware(req: NextRequest & { nextauth: { token: any } }) {
    const { pathname } = req.nextUrl;
    const { token } = req.nextauth;

    console.log(`[MW] ${pathname} | Auth: ${!!token} | Complete: ${token?.isProfileComplete}`);

    // Handle complete-profile page
    if (pathname === '/complete-profile') {
      if (token?.isProfileComplete) {
        return NextResponse.redirect(new URL('/dashboard', req.url));
      }
      return NextResponse.next();
    }
    
    // Handle authenticated users on login page
    if (token && pathname === '/login') {
      if (!token.isProfileComplete) {
        return NextResponse.redirect(new URL('/complete-profile', req.url));
      }
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    // Only redirect incomplete profiles for protected routes
    if (token && !token.isProfileComplete && 
        (pathname.startsWith('/dashboard') || pathname.startsWith('/funds'))) {
      return NextResponse.redirect(new URL('/complete-profile', req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => {
        // Always return true - let client-side handle auth
        return true;
      },
    },
  }
);

export const config = {
  matcher: [
    '/login',
    '/complete-profile'
  ]
};
