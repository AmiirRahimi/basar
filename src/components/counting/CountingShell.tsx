'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { MainWrapper, PageHeader } from '@/ui';
import { adminPermissionForPath, firstAdminHref, hasAdminPermission } from '@/lib/admin-permissions';
import { canAccessMenu, pathMenuId } from '@/lib/roles';
import { countingMenuSections } from './counting-menu';
import { ResultToast } from './ResultToast';
import { useWorkspace } from './WorkspaceProvider';
import { PageActionProvider, PageMetaProvider } from './PageAction';

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
  const [headerAction, setHeaderAction] = useState<ReactNode>(null);
  const [pageTitle, setPageTitle] = useState<string | null>(null);
  const [pageDescription, setPageDescription] = useState<string | null>(null);
  const [hasTabs, setHasTabs] = useState(false);
  const pageMeta = useMemo(
    () => ({ setTitle: setPageTitle, setDescription: setPageDescription, setHasTabs }),
    [],
  );
  const role = workspace?.storeRole || 'owner';
  const menuId = pathMenuId(pathname) || 'dashboard';
  const adminNeed = pathname.startsWith('/admin') ? adminPermissionForPath(pathname) : '';
  const allowed = pathname.startsWith('/admin')
    ? Boolean(adminNeed && hasAdminPermission(workspace?.adminPermissions, adminNeed))
    : canAccessMenu(role, menuId, workspace?.isPlatformAdmin, workspace?.permissions);
  const activeBrand = workspace?.brands.find((brand) => brand._id === workspace.activeBrandId);
  const activeStore = workspace?.stores.find((store) => store._id === workspace.activeStoreId);
  const contextLabel = [activeBrand?.name, activeStore?.name].filter(Boolean).join(' · ');

  useEffect(() => {
    if (!workspace || allowed) return;
    const fallback = pathname.startsWith('/admin')
      ? firstAdminHref(workspace.adminPermissions) || '/counting/dashboard'
      : countingMenuSections.find((section) =>
          canAccessMenu(role, section.id, workspace.isPlatformAdmin, workspace.permissions),
        )?.href || '/counting/profile';
    if (fallback !== pathname) router.replace(fallback);
  }, [allowed, pathname, role, router, workspace]);

  return (
    <MainWrapper className="min-h-0 flex-1 rounded-[22px] bg-content-gradient shadow-lg">
      <PageHeader title={pageTitle || title} subtitle={contextLabel || undefined} divider={!hasTabs}>
        {hasTabs ? null : headerAction}
      </PageHeader>
      {!hasTabs && (pageDescription ?? description) ? (
        <p className="mb-4 text-sm text-muted-foreground">{pageDescription ?? description}</p>
      ) : null}
      {workspace && !workspace.isPlatformAdmin && workspace.subscriptionActive === false ? (
        <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          اشتراک تمام شده است. جدول‌ها را می‌بینید اما ثبت، ویرایش و حذف ممکن نیست.{' '}
          {workspace.storeRole === 'owner' ? (
            <Link href="/counting/profile?tab=subscription" className="font-medium underline">
              خرید اشتراک
            </Link>
          ) : (
            <span>از ادمین بخواهید اشتراک را تمدید کند.</span>
          )}
        </div>
      ) : null}
      <ResultToast message={error} />
      <PageMetaProvider api={pageMeta}>
        <PageActionProvider onAction={setHeaderAction} action={headerAction}>
          {allowed ? children : null}
        </PageActionProvider>
      </PageMetaProvider>
    </MainWrapper>
  );
}
