import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const { token } = req.nextauth;

    // If user is not authenticated and trying to access protected routes
    if (!token && (pathname.startsWith('/dashboard') || pathname.startsWith('/funds'))) {
      return NextResponse.redirect(new URL('/login', req.url));
    }

    // If user is authenticated and trying to access login page, redirect to dashboard
    if (token && pathname === '/login') {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        // For protected routes, require authentication
        if (req.nextUrl.pathname.startsWith('/dashboard') || req.nextUrl.pathname.startsWith('/funds')) {
          return !!token;
        }
        // For other routes, allow access
        return true;
      },
    },
  }
);

export const config = {
  matcher: ['/dashboard/:path*', '/funds/:path*', '/login']
};
