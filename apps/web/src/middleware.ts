import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const protectedRoutes = ['/create', '/settings', '/analytics', '/saved', '/chat', '/notifications'];
const adminRoutes = ['/admin'];
const authRoutes = ['/login', '/signup', '/forgot-password', '/reset-password'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('accessToken')?.value;

  const isProtected = protectedRoutes.some(route => pathname.startsWith(route));
  const isAdmin = adminRoutes.some(route => pathname.startsWith(route));
  const isAuth = authRoutes.some(route => pathname.startsWith(route));

  // Profile route requires authentication but redirects client-side
  if (pathname === '/profile' && !token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if ((isProtected || isAdmin) && !token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuth && token) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*|$).*)',
  ],
};
