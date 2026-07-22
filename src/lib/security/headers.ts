// 보안 명세 §2 — 모든 응답에 세팅.
// next.config.ts 의 headers() 에서 사용.

function buildCSP(): string {
  const isDev = process.env.NODE_ENV !== 'production';
  // ponytail: 'unsafe-inline' — Next.js 15 App Router가 RSC hydration을 inline <script>로 심음.
  // 업그레이드 경로: middleware에서 nonce 생성 → next/script에 자동 주입 → CSP에 nonce-{hash}.
  const scriptSrc = isDev
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com"
    : "script-src 'self' 'unsafe-inline' https://js.stripe.com";
  const connectSrc = isDev
    ? "connect-src 'self' https://api.stripe.com ws: wss:"
    : "connect-src 'self' https://api.stripe.com";
  return [
    "default-src 'self'",
    "img-src 'self' https://cdn.jitda.com data: blob:",
    scriptSrc,
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self' data:",
    connectSrc,
    "frame-src https://js.stripe.com https://hooks.stripe.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    'upgrade-insecure-requests',
  ].join('; ');
}

export function buildSecurityHeaders() {
  const isProd = process.env.NODE_ENV === 'production';
  return [
    // HTTPS 강제 (프로덕션에서만 — dev 서버는 http)
    ...(isProd
      ? [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' }]
      : []),
    { key: 'Content-Security-Policy', value: buildCSP() },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(self)' },
    { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
    { key: 'Cross-Origin-Resource-Policy', value: 'same-site' },
    { key: 'X-Frame-Options', value: 'DENY' },
  ];
}
