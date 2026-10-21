import { NextRequest, NextResponse } from 'next/server';
import { verifySessionJWT, AUTH_COOKIE_NAME } from '@/lib/jwt-edge';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Whitelist public endpoints that do not require authentication
  const isPublicAuthRoute = 
    pathname === '/admin/login' ||
    pathname === '/api/admin/auth/login' ||
    pathname === '/api/admin/auth/forgot-password' ||
    pathname === '/api/admin/auth/reset-password' ||
    pathname === '/api/admin/chairs/ack' ||
    pathname === '/api/admin/chairs/firmware/status';

  // 2. Extract and verify session token from cookies
  const token = req.cookies.get(AUTH_COOKIE_NAME)?.value;
  const session = token ? await verifySessionJWT(token) : null;
  const isAuthenticated = !!session;

  // 3. Handle unauthenticated requests to protected admin routes
  if (!isAuthenticated && !isPublicAuthRoute) {
    if (pathname.startsWith('/api/admin')) {
      const response = NextResponse.json(
        { success: false, error: 'Unauthorized. Please sign in to continue.' },
        { status: 401 }
      );
      response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      return response;
    }
    if (pathname === '/admin' || pathname.startsWith('/admin/')) {
      const loginUrl = new URL('/admin/login', req.url);
      loginUrl.searchParams.set('from', pathname);
      const response = NextResponse.redirect(loginUrl);
      response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      return response;
    }
  }

  // 4. Handle authenticated users attempting to access login page
  if (isAuthenticated && pathname === '/admin/login') {
    const response = NextResponse.redirect(new URL('/admin/dashboard', req.url));
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    return response;
  }

  // 5. RBAC Protection: Restrict User Management (/admin/users) to SUPER_ADMIN only
  if (isAuthenticated && session?.role !== 'SUPER_ADMIN' && pathname.startsWith('/admin/users')) {
    const response = NextResponse.redirect(new URL('/admin/dashboard', req.url));
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    return response;
  }

  const response = NextResponse.next();
  if (pathname === '/admin' || pathname.startsWith('/admin/') || pathname.startsWith('/api/admin/')) {
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  }
  return response;
}

export const config = {
  matcher: ['/admin', '/admin/:path*', '/api/admin/:path*'],
};
