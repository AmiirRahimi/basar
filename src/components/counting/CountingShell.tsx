'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FileText,
  Users,
  Shirt,
  Link2,
  Sparkles,
  Landmark,
  Scissors,
  Wallet,
  Undo2,
  Shield,
  Settings,
  Menu,
} from 'lucide-react';
import Link from 'next/link';
import { MainWrapper, PageHeader } from '@/ui';
import { canAccessMenu, pathMenuId } from '@/lib/roles';
import { ResultToast } from './ResultToast';
import { CountingSidebar } from './CountingSidebar';
import { SidebarWorkspace } from './SidebarWorkspace';
import { useWorkspace } from './WorkspaceProvider';
import { PageActionProvider } from './PageAction';

const menuSections = [
  { id: 'dashboard', name: 'داشبورد', icon: LayoutDashboard, href: '/counting/dashboard', menuItems: [] },
  { id: 'invoice', name: 'فاکتور', icon: FileText, href: '/counting/invoices', menuItems: [] },
  { id: 'person', name: 'اشخاص', icon: Users, href: '/counting/people', menuItems: [] },
  { id: 'cloth', name: 'البسه', icon: Shirt, href: '/counting/clothes', menuItems: [] },
  { id: 'share', name: 'لینک محصول', icon: Link2, href: '/counting/shares', menuItems: [] },
  { id: 'images', name: 'تصویر محصول', icon: Sparkles, href: '/counting/images', menuItems: [] },
  { id: 'check', name: 'چک', icon: Landmark, href: '/counting/checks', menuItems: [] },
  { id: 'fabric', name: 'خرید پارچه', icon: Scissors, href: '/counting/fabric', menuItems: [] },
  { id: 'account', name: 'حساب', icon: Wallet, href: '/counting/account', menuItems: [] },
  { id: 'returned', name: 'برگشتی', icon: Undo2, href: '/counting/returned', menuItems: [] },
  { id: 'profile', name: 'تنظیمات', icon: Settings, href: '/counting/profile', menuItems: [] },
  {
    id: 'admin',
    name: 'ادمین',
    icon: Shield,
    menuItems: [
      { name: 'کاربران و اشتراک', href: '/counting/admin/users' },
      { name: 'سفارش‌های ویترین', href: '/counting/admin/storefront' },
      { name: 'تلگرام', href: '/counting/admin/telegram' },
      { name: 'لیست‌های کمکی', href: '/counting/admin/dropdowns' },
    ],
  },
];

export function CountingShell({
  children,
  title,
  description,
  error,
}: {
  children: React.ReactNode;
  title: string;
  description?: string;
  error?: string;
}) {
  const pathname = usePathname();
  const workspace = useWorkspace();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarPinned, setSidebarPinned] = useState(false);
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const sidebarExpanded = sidebarPinned || sidebarHovered || mobileOpen;
  const [headerAction, setHeaderAction] = useState<ReactNode>(null);
  const role = workspace?.storeRole || 'owner';
  const visibleMenu = menuSections.filter((section) =>
    canAccessMenu(role, section.id, workspace?.isPlatformAdmin),
  );
  const allowed = canAccessMenu(role, pathMenuId(pathname) || 'dashboard', workspace?.isPlatformAdmin);
  const activeBrand = workspace?.brands.find((brand) => brand._id === workspace.activeBrandId);
  const activeStore = workspace?.stores.find((store) => store._id === workspace.activeStoreId);
  const contextLabel = [activeBrand?.name, activeStore?.name].filter(Boolean).join(' · ');

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
        className={`relative z-10 flex min-h-[calc(100vh-1.5rem)] min-w-0 flex-col gap-3 transition-[margin] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] md:min-h-[calc(100vh-2.5rem)] ${
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
        <MainWrapper className="min-h-0 flex-1 rounded-[22px] bg-content-gradient shadow-lg">
          <PageHeader title={title} subtitle={contextLabel || undefined}>
            {headerAction}
          </PageHeader>
          {description ? <p className="mb-4 text-sm text-muted-foreground">{description}</p> : null}
          {workspace && !workspace.isPlatformAdmin && workspace.subscriptionActive === false ? (
            <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
              اشتراک تمام شده است. جدول‌ها را می‌بینید اما ثبت، ویرایش و حذف ممکن نیست.{' '}
              {workspace.storeRole === 'owner' ? (
                <Link href="/counting/profile?tab=subscription" className="font-medium underline">
                  خرید اشتراک
                </Link>
              ) : (
                <span>از صاحب برند بخواهید اشتراک را تمدید کند.</span>
              )}
            </div>
          ) : null}
          <ResultToast message={error} />
          <PageActionProvider onAction={setHeaderAction}>
            {allowed ? children : <p className="text-sm text-muted-foreground">به این بخش دسترسی ندارید.</p>}
          </PageActionProvider>
        </MainWrapper>
      </div>
    </main>
  );
}
