import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const REFRESH_COOKIE = '__Host-jitda_refresh';
const PROTECTED_ROUTES = ['/studio', '/settings'];
const ALLOW_HTTP_HOSTS = new Set(['localhost:3000', '127.0.0.1:3000']);

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1) 프로덕션에서 http → https 강제 (다른 로직 전에)
  const host = req.headers.get('host') ?? '';
  const proto = req.headers.get('x-forwarded-proto') ?? req.nextUrl.protocol.replace(':', '');
  if (
    process.env.NODE_ENV === 'production' &&
    proto === 'http' &&
    !ALLOW_HTTP_HOSTS.has(host)
  ) {
    const https = new URL(req.nextUrl.toString());
    https.protocol = 'https:';
    return NextResponse.redirect(https, 301);
  }

  // 2) /@handle → /profile?handle=handle
  const atMatch = pathname.match(/^\/@(.+)/);
  if (atMatch && atMatch[1]) {
    const url = new URL('/profile', req.url);
    url.searchParams.set('handle', atMatch[1]);
    return NextResponse.rewrite(url);
  }

  // 3) 로그인 필요 경로 가드
  const isProtected = PROTECTED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + '/')
  );
  if (isProtected && !req.cookies.get(REFRESH_COOKIE)?.value) {
    const loginUrl = new URL('/auth', req.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 4) 요청 ID (감사 로그·에러 추적)
  const requestId = req.headers.get('x-request-id') ?? crypto.randomUUID();
  const res = NextResponse.next();
  res.headers.set('x-request-id', requestId);
  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
