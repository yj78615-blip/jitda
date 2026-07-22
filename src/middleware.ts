import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const REFRESH_COOKIE = '__Host-jitda_refresh';

const PROTECTED_ROUTES = ['/studio', '/settings'];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Rewrite /@handle → /profile?handle=handle (query param, no dynamic route)
  const atMatch = pathname.match(/^\/@(.+)/);
  if (atMatch && atMatch[1]) {
    const handle = atMatch[1];
    const url = new URL(`/profile`, req.url);
    url.searchParams.set('handle', handle);
    return NextResponse.rewrite(url);
  }

  const isProtected = PROTECTED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + '/')
  );

  if (isProtected) {
    const refreshToken = req.cookies.get(REFRESH_COOKIE)?.value;
    if (!refreshToken) {
      const loginUrl = new URL('/auth', req.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/studio/:path*', '/settings/:path*', '/((?!api|_next|favicon).*)'],
};
