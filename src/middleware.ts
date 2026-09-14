import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith('/counting')) return NextResponse.next();
  if (pathname.startsWith('/counting/login')) return NextResponse.next();
  const token = request.cookies.get('basar_access')?.value;
  if (!token) {
    const url = request.nextUrl.clone();
    url.pathname = '/counting/login';
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/counting/:path*'],
};
