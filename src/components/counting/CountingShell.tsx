'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
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
  Store,
  BadgePercent,
} from 'lucide-react';
import { LeftSidebar, MainWrapper, PageHeader } from '@/ui';
import { canAccessMenu, pathMenuId } from '@/lib/roles';
import { ResultToast } from './ResultToast';
import { SidebarWorkspace } from './SidebarWorkspace';
import { useWorkspace } from './WorkspaceProvider';

const menuSections = [
  { id: 'dashboard', name: 'داشبورد', icon: LayoutDashboard, href: '/counting/dashboard', menuItems: [] },
  { id: 'invoice', name: 'فاکتور', icon: FileText, href: '/counting/invoices', menuItems: [] },
  { id: 'person', name: 'اشخاص', icon: Users, href: '/counting/people', menuItems: [] },
  { id: 'cloth', name: 'البسه', icon: Shirt, href: '/counting/clothes', menuItems: [] },
  { id: 'check', name: 'چک', icon: Landmark, href: '/counting/checks', menuItems: [] },
  { id: 'fabric', name: 'خرید پارچه', icon: Scissors, href: '/counting/fabric', menuItems: [] },
  { id: 'account', name: 'حساب', icon: Wallet, href: '/counting/account', menuItems: [] },
  { id: 'returned', name: 'برگشتی', icon: Undo2, href: '/counting/returned', menuItems: [] },
  { id: 'store', name: 'برند و فروشگاه', icon: Store, href: '/counting/store', menuItems: [] },
  { id: 'subscription', name: 'اشتراک', icon: BadgePercent, href: '/counting/subscription', menuItems: [] },
  {
    id: 'admin',
    name: 'ادمین',
    icon: Shield,
    menuItems: [
      { name: 'کاربران', href: '/counting/admin/users' },
      { name: 'لیست‌های کمکی', href: '/counting/admin/dropdowns' },
      { name: 'تغییرات', href: '/counting/admin/change' },
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
  const router = useRouter();
  const workspace = useWorkspace();
  const role = workspace?.storeRole || 'owner';
  const visibleMenu = menuSections.filter((section) =>
    canAccessMenu(role, section.id, workspace?.isPlatformAdmin),
  );
  const activeGroup = visibleMenu.find((section) => {
    if (section.href && pathname.startsWith(section.href)) return true;
    return section.menuItems?.some((item: { href?: string }) => item.href && pathname.startsWith(item.href));
  })?.id;
  const allowed = canAccessMenu(role, pathMenuId(pathname) || 'dashboard', workspace?.isPlatformAdmin);

  return (
    <main className="flex min-h-screen gap-4 bg-gray-50 p-3 md:p-4" dir="rtl">
      <div className="hidden w-[220px] shrink-0 md:block" aria-hidden />
      <LeftSidebar
        menuSections={visibleMenu}
        t={(s) => s}
        hideSearchBar
        hideDashboardLink
        wide
        dir="rtl"
        pathname={pathname}
        activeGroup={activeGroup}
        LinkComponent={Link}
        onNavigate={(href) => router.push(href)}
        dashboardHref="/counting/dashboard"
        header={<SidebarWorkspace />}
      />
      <div className="flex min-h-[calc(100vh-1.5rem)] min-w-0 flex-1 flex-col">
        <MainWrapper>
          <PageHeader title={title} />
          {description ? <p className="mb-4 text-sm text-muted-foreground">{description}</p> : null}
          <ResultToast message={error} />
          {allowed ? children : <p className="text-sm text-muted-foreground">به این بخش دسترسی ندارید.</p>}
        </MainWrapper>
      </div>
    </main>
  );
}
