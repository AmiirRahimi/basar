import { NextRequest, NextResponse } from 'next/server';
import { ACCESS_COOKIE, REFRESH_COOKIE } from '@/lib/constants';
import { jwtHs256Valid } from '@/lib/jwt-edge';

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
  const accessSecret = process.env.JWT_ACCESS_SECRET || '';
  const refreshSecret = process.env.JWT_REFRESH_SECRET || '';
  const accessOk = access && accessSecret ? await jwtHs256Valid(access, accessSecret) : false;
  const refreshOk = refresh && refreshSecret ? await jwtHs256Valid(refresh, refreshSecret) : false;
  if (!accessOk && !refreshOk) {
    const url = request.nextUrl.clone();
    url.pathname = '/counting/login';
    return withHeaders(NextResponse.redirect(url));
  }
  return withHeaders(NextResponse.next());
}

export const config = {
  matcher: ['/counting/:path*'],
};
