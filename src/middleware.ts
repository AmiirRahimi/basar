import { NextRequest, NextResponse } from 'next/server';
import { ACCESS_COOKIE, REFRESH_COOKIE } from '@/lib/constants';
import { jwtHs256Payload } from '@/lib/jwt-edge';

function edgeSecret(name: 'JWT_ACCESS_SECRET' | 'JWT_REFRESH_SECRET') {
  const value = (process.env[name] || '').trim();
  if (value) return value;
  if (process.env.NODE_ENV === 'development') {
    return name === 'JWT_ACCESS_SECRET' ? 'dev-access-secret' : 'dev-refresh-secret';
  }
  return '';
}

const SECURITY_HEADERS: Record<string, string> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

function withHeaders(response: NextResponse) {
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublicCounting =
    pathname === '/counting' ||
    pathname === '/counting/' ||
    pathname.startsWith('/counting/login');
  if (!pathname.startsWith('/counting') || isPublicCounting) {
    return withHeaders(NextResponse.next());
  }
  const access = request.cookies.get(ACCESS_COOKIE)?.value || '';
  const refresh = request.cookies.get(REFRESH_COOKIE)?.value || '';
  const accessSecret = edgeSecret('JWT_ACCESS_SECRET');
  const refreshSecret = edgeSecret('JWT_REFRESH_SECRET');
  const accessSession = access && accessSecret ? await jwtHs256Payload(access, accessSecret) : null;
  const refreshSession = refresh && refreshSecret ? await jwtHs256Payload(refresh, refreshSecret) : null;
  if (!accessSession && !refreshSession) {
    const url = request.nextUrl.clone();
    url.pathname = '/counting/login';
    return withHeaders(NextResponse.redirect(url));
  }
  if (pathname.startsWith('/counting/admin')) {
    const admin = (process.env.ADMIN_PHONENUMBER || '').trim();
    const phone = accessSession?.phonenumber || refreshSession?.phonenumber || '';
    if (!admin || phone !== admin) {
      const url = request.nextUrl.clone();
      url.pathname = '/counting/dashboard';
      return withHeaders(NextResponse.redirect(url));
    }
  }
  return withHeaders(NextResponse.next());
}

export const config = {
  matcher: ['/counting/:path*'],
};
