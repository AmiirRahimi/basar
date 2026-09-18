'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FileText,
  Users,
  Shirt,
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
    setMobileOpen(false);
  }, [pathname]);

  return (
    <main className="flex min-h-screen gap-4 bg-gray-50 p-3 md:p-4" dir="rtl">
      <div className="hidden w-[264px] shrink-0 md:block" aria-hidden />
      <CountingSidebar
        pathname={pathname}
        menuSections={visibleMenu}
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />
      <div className="flex min-h-[calc(100vh-1.5rem)] min-w-0 flex-1 flex-col gap-3">
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
        <MainWrapper>
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
