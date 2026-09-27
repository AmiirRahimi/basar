'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

const OPEN = ['/accounting/subscribe'];

export function UnsubscribedAccounting({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const allowed = OPEN.includes(pathname) || pathname.startsWith('/accounting/invite/');

  useEffect(() => {
    if (!allowed) router.replace('/accounting/subscribe');
  }, [allowed, router]);

  if (!allowed) return null;
  return children;
}
