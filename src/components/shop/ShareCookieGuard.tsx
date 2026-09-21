'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { forgetShareToken } from '@/actions/shop';

function keepShareCookie(pathname: string) {
  return (
    pathname.startsWith('/s/') ||
    pathname.startsWith('/checkout') ||
    pathname.startsWith('/cart') ||
    pathname.startsWith('/order') ||
    pathname.startsWith('/pay')
  );
}

export function ShareCookieGuard() {
  const pathname = usePathname();
  useEffect(() => {
    if (!keepShareCookie(pathname || '')) void forgetShareToken();
  }, [pathname]);
  return null;
}
