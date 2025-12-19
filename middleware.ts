import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default withAuth(
  function middleware(req: NextRequest & { nextauth: { token: any } }) {
    const { pathname } = req.nextUrl;
    const { token } = req.nextauth;

    if (pathname === '/complete-profile') {
      if (token && token.isProfileComplete) {
        if (token.username) {
          return NextResponse.redirect(new URL(`/${token.username}`, req.url));
        } else {
          return NextResponse.redirect(new URL('/dashboard', req.url));
        }
      }
      return NextResponse.next();
    }
    
    if (token && pathname === '/login') {
      if (!token.isProfileComplete) {
        return NextResponse.redirect(new URL('/complete-profile', req.url));
      }
      
      // Try to get the last visited page from the request cookies
      const lastPageCookie = req.cookies.get('lastVisitedPage');
      const lastPage = lastPageCookie ? lastPageCookie.value : '/dashboard';
      
      // Redirect to last visited page if available, otherwise dashboard
      return NextResponse.redirect(new URL(lastPage, req.url));
    }

    if (!token && (pathname.startsWith('/dashboard') || pathname.startsWith('/funds'))) {
      return NextResponse.redirect(new URL('/login', req.url));
    }

    if (token && !token.isProfileComplete && 
        (pathname.startsWith('/dashboard') || 
         pathname.startsWith('/funds') || 
         (token.username && pathname === `/${token.username}`))) {
      return NextResponse.redirect(new URL('/complete-profile', req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const path = req.nextUrl.pathname;

        // Explicitly allow the landing page
        if (path === '/') {
          return true;
        }

        // Require authentication for protected routes
        if (path.startsWith('/dashboard') || 
            path.startsWith('/funds') ||
            // Dynamic username path, but not public paths
            (path.startsWith('/') && path.split('/').length === 2 && !path.startsWith('/api') && 
             !path.startsWith('/login') && !path.startsWith('/register') && 
             !path.startsWith('/complete-profile'))) {
          return !!token;
        }
        return true;
      },
    },
  }
);

export const config = {
  matcher: [
    '/dashboard/:path*', 
    '/funds/:path*', 
    '/login',
    '/:username', 
    '/((?!api|_next/static|_next/image|favicon.ico|complete-profile).)*'
  ]
};
