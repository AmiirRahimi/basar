'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';
import { CountingSidebar } from '@/components/counting/CountingSidebar';
import { adminMenuGroups, adminMenuSections } from './admin-menu';

const EASE = 'duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]';

export function AdminFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarPinned, setSidebarPinned] = useState(false);
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const sidebarExpanded = sidebarPinned || sidebarHovered || mobileOpen;

  useEffect(() => {
    try {
      setSidebarPinned(localStorage.getItem('basar.adminSidebarPinned') === '1');
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  if (pathname.includes('/print') || pathname.endsWith('/bijak')) return children;

  function setPinned(next: boolean) {
    setSidebarPinned(next);
    setSidebarHovered(next);
    try {
      localStorage.setItem('basar.adminSidebarPinned', next ? '1' : '0');
    } catch {
      // ignore
    }
  }

  return (
    <main className="relative min-h-screen max-w-[100vw] overflow-x-hidden bg-zinc-100 p-3 md:p-5" dir="rtl">
      <CountingSidebar
        pathname={pathname}
        menuSections={adminMenuSections}
        groups={adminMenuGroups}
        hideWorkspace
        caption="پنل ادمین"
        navLabel="منوی ادمین"
        mobileOpen={mobileOpen}
        expanded={sidebarExpanded}
        pinned={sidebarPinned}
        onExpandedChange={setSidebarHovered}
        onPinnedChange={setPinned}
        onClose={() => setMobileOpen(false)}
      />
      <div
        className={`relative z-10 flex min-h-[calc(100vh-1.5rem)] min-w-0 flex-col gap-3 transition-[margin] ${EASE} md:min-h-[calc(100vh-2.5rem)] ${
          sidebarExpanded ? 'md:ms-[17.75rem]' : 'md:ms-[6.25rem]'
        }`}
      >
        <div className="flex items-center gap-2 rounded-2xl bg-sidebar-gradient px-3 py-2 text-white md:hidden">
          <button
            type="button"
            aria-label="باز کردن منو"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-4 w-4" />
          </button>
          <p className="min-w-0 flex-1 truncate text-sm font-medium">پنل ادمین</p>
        </div>
        {children}
      </div>
    </main>
  );
}
