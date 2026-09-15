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
  UserCircle,
  BadgePercent,
} from 'lucide-react';
import { LeftSidebar, MainWrapper, PageHeader, Button } from '@/ui';
import { logout } from '@/actions/auth';
import { ResultToast } from './ResultToast';

const menuSections = [
  { id: 'dashboard', name: 'داشبورد', icon: LayoutDashboard, href: '/counting/dashboard', menuItems: [] },
  { id: 'invoice', name: 'فاکتور', icon: FileText, href: '/counting/invoices', menuItems: [] },
  { id: 'person', name: 'اشخاص', icon: Users, href: '/counting/people', menuItems: [] },
  { id: 'cloth', name: 'البسه', icon: Shirt, href: '/counting/clothes', menuItems: [] },
  { id: 'check', name: 'چک', icon: Landmark, href: '/counting/checks', menuItems: [] },
  { id: 'fabric', name: 'خرید پارچه', icon: Scissors, href: '/counting/fabric', menuItems: [] },
  { id: 'account', name: 'حساب', icon: Wallet, href: '/counting/account', menuItems: [] },
  { id: 'returned', name: 'برگشتی', icon: Undo2, href: '/counting/returned', menuItems: [] },
  { id: 'store', name: 'فروشگاه', icon: Store, href: '/counting/store', menuItems: [] },
  { id: 'profile', name: 'پروفایل', icon: UserCircle, href: '/counting/profile', menuItems: [] },
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
  /** Reported as a toast rather than as body text, so it never replaces the table. */
  error?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <main className="flex min-h-screen gap-4 bg-gray-50 p-3 md:p-4" dir="rtl">
      <div className="hidden w-[120px] shrink-0 md:block" aria-hidden />
      <LeftSidebar
        menuSections={menuSections}
        t={(s) => s}
        hideSearchBar
        dir="rtl"
        pathname={pathname}
        LinkComponent={Link}
        onNavigate={(href) => router.push(href)}
        dashboardHref="/counting/dashboard"
      />
      <div className="flex min-h-[calc(100vh-1.5rem)] min-w-0 flex-1 flex-col gap-4">
        <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3">
          <Link href="/" className="text-sm text-primary">
            وب‌سایت عمده
          </Link>
          <form action={logout}>
            <Button type="submit" variant="outline" size="sm">
              خروج
            </Button>
          </form>
        </div>
        <MainWrapper>
          <PageHeader title={title} />
          {description ? <p className="mb-4 text-sm text-muted-foreground">{description}</p> : null}
          <ResultToast message={error} />
          {children}
        </MainWrapper>
      </div>
    </main>
  );
}
