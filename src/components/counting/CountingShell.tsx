'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MainWrapper, PageHeader } from '@/ui';
import { canAccessMenu, pathMenuId } from '@/lib/roles';
import { ResultToast } from './ResultToast';
import { useWorkspace } from './WorkspaceProvider';
import { PageActionProvider } from './PageAction';

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
  const [headerAction, setHeaderAction] = useState<ReactNode>(null);
  const role = workspace?.storeRole || 'owner';
  const allowed = canAccessMenu(role, pathMenuId(pathname) || 'dashboard', workspace?.isPlatformAdmin);
  const activeBrand = workspace?.brands.find((brand) => brand._id === workspace.activeBrandId);
  const activeStore = workspace?.stores.find((store) => store._id === workspace.activeStoreId);
  const contextLabel = [activeBrand?.name, activeStore?.name].filter(Boolean).join(' · ');

  return (
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
  );
}
