'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { Menu } from 'lucide-react';
import { canAccessMenu } from '@/lib/roles';
import { ChatWidget } from '@/components/chat/ChatWidget';
import { countingMenuSections } from './counting-menu';
import { CountingSidebar } from './CountingSidebar';
import { SidebarWorkspace } from './SidebarWorkspace';
import { useWorkspace } from './WorkspaceProvider';

const EASE = 'duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]';

function isBareRoute(pathname: string) {
  if (pathname === '/counting' || pathname.startsWith('/counting/login')) return true;
  return pathname.includes('/print') || pathname.endsWith('/bijak');
}

export function CountingFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (isBareRoute(pathname)) return children;
  return <CountingChrome>{children}</CountingChrome>;
}

function CountingChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const workspace = useWorkspace();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarPinned, setSidebarPinned] = useState(false);
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const sidebarExpanded = sidebarPinned || sidebarHovered || mobileOpen;
  const role = workspace?.storeRole || 'owner';
  const visibleMenu = countingMenuSections.filter((section) =>
    canAccessMenu(role, section.id, workspace?.isPlatformAdmin, workspace?.permissions),
  );

  useEffect(() => {
    try {
      setSidebarPinned(localStorage.getItem('basar.sidebarPinned') === '1');
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  function setPinned(next: boolean) {
    setSidebarPinned(next);
    setSidebarHovered(next);
    try {
      localStorage.setItem('basar.sidebarPinned', next ? '1' : '0');
    } catch {
      // ignore
    }
  }

  return (
    <main className="relative min-h-screen max-w-[100vw] overflow-x-hidden bg-zinc-100 p-3 md:p-5" dir="rtl">
      <CountingSidebar
        pathname={pathname}
        menuSections={visibleMenu}
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
          <button type="button" className="min-w-0 flex-1 text-right" onClick={() => setMobileOpen(true)}>
            <SidebarWorkspace compact />
          </button>
        </div>
        {children}
      </div>
      {workspace && !workspace.isPlatformAdmin ? <ChatWidget variant="counting" /> : null}
    </main>
  );
}
