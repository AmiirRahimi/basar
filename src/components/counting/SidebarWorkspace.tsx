'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, useTransition } from 'react';
import { Check, Loader2, Settings2, Store, User } from 'lucide-react';
import { logout } from '@/actions/auth';
import { switchWorkspace } from '@/actions/workspace';
import { STORE_STAFF_ROLES } from '@/lib/constants';
import { cn, toast } from '@/ui';
import { SidebarCollapseItem, SidebarCollapsible } from './SidebarCollapsible';
import { useWorkspace } from './WorkspaceProvider';

const LAST_STORE_KEY = 'basar.activeStoreByBrand';

function readLastStore(brandId: string) {
  if (typeof window === 'undefined') return '';
  try {
    const map = JSON.parse(localStorage.getItem(LAST_STORE_KEY) || '{}') as Record<string, string>;
    return map[brandId] || '';
  } catch {
    return '';
  }
}

function writeLastStore(brandId: string, storeId: string) {
  try {
    const map = JSON.parse(localStorage.getItem(LAST_STORE_KEY) || '{}') as Record<string, string>;
    map[brandId] = storeId;
    localStorage.setItem(LAST_STORE_KEY, JSON.stringify(map));
  } catch {
    // ignore quota / private mode
  }
}

function initials(name?: string) {
  const text = (name || '').trim();
  return text ? text.slice(0, 1) : 'ب';
}

function BrandMark({
  name,
  color,
  logo,
  size = 'md',
}: {
  name?: string;
  color?: string;
  logo?: string;
  size?: 'sm' | 'md';
}) {
  const dim = size === 'sm' ? 'h-7 w-7 text-[11px]' : 'h-9 w-9 text-sm';
  if (logo) {
    return <img src={logo} alt="" className={cn('shrink-0 rounded-lg object-cover', dim)} />;
  }
  return (
    <span
      className={cn('flex shrink-0 items-center justify-center rounded-lg font-semibold text-white', dim)}
      style={{ background: color || '#0f766e' }}
    >
      {initials(name)}
    </span>
  );
}

export function SidebarWorkspace({ compact = false }: { compact?: boolean }) {
  const workspace = useWorkspace();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [brandId, setBrandId] = useState(workspace?.activeBrandId || '');
  const [storeId, setStoreId] = useState(workspace?.activeStoreId || '');
  const [openPanel, setOpenPanel] = useState<'brand' | 'store' | ''>('');

  useEffect(() => {
    setBrandId(workspace?.activeBrandId || '');
    setStoreId(workspace?.activeStoreId || '');
  }, [workspace?.activeBrandId, workspace?.activeStoreId]);

  const brands = workspace?.brands || [];
  const stores = useMemo(
    () => (workspace?.stores || []).filter((store) => store._brandId === brandId),
    [workspace?.stores, brandId],
  );
  const activeBrand = brands.find((brand) => brand._id === brandId);
  const activeStore = stores.find((store) => store._id === storeId) || stores[0];
  const canManage =
    workspace?.storeRole === 'owner' || workspace?.storeRole === 'admin' || Boolean(workspace?.isPlatformAdmin);
  const roleLabel =
    workspace?.storeRole === 'owner'
      ? 'صاحب برند'
      : STORE_STAFF_ROLES[workspace?.storeRole as keyof typeof STORE_STAFF_ROLES] || '';

  function apply(nextBrandId: string, nextStoreId: string) {
    if (!nextStoreId || (nextBrandId === brandId && nextStoreId === storeId)) return;
    const previous = { brandId, storeId };
    setBrandId(nextBrandId);
    setStoreId(nextStoreId);
    start(async () => {
      const res = await switchWorkspace({ brandId: nextBrandId, storeId: nextStoreId });
      if (!res.ok) {
        setBrandId(previous.brandId);
        setStoreId(previous.storeId);
        toast.error(res.message || 'تغییر فروشگاه انجام نشد');
        return;
      }
      writeLastStore(nextBrandId, nextStoreId);
      toast.success(res.message || 'فروشگاه فعال شد');
      router.refresh();
    });
  }

  function changeBrand(nextBrandId: string) {
    const brandStores = (workspace?.stores || []).filter((store) => store._brandId === nextBrandId);
    const remembered = readLastStore(nextBrandId);
    const nextStore = brandStores.find((store) => store._id === remembered) || brandStores[0];
    if (!nextStore) {
      toast.error('این برند فروشگاهی ندارد');
      return;
    }
    apply(nextBrandId, nextStore._id);
  }

  if (compact) {
    return (
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-white">{activeStore?.name || 'فروشگاه'}</p>
        <p className="truncate text-[11px] text-white/50">{activeBrand?.name || 'برند'}</p>
      </div>
    );
  }

  return (
    <section className="overflow-hidden rounded-2xl bg-black/15 ring-1 ring-white/10">
      <div className="flex items-center gap-2 px-2 pt-2">
        <BrandMark name={activeBrand?.name} color={activeBrand?.color} logo={activeBrand?.logo} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="text-[10px] leading-4 text-white/40">فضای کار فعال</p>
          <p className="truncate text-[12px] font-medium leading-4 text-white/80">
            {[activeBrand?.name, activeStore?.name].filter(Boolean).join(' · ') || 'انتخاب نشده'}
          </p>
        </div>
        {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin text-white/40" /> : null}
      </div>
      <div className="mt-1 flex flex-col px-1 pb-1">
        <SidebarCollapsible
          label="برند"
          subtitle={activeBrand?.name || 'برندی نیست'}
          open={openPanel === 'brand'}
          onOpenChange={(next) => setOpenPanel(next ? 'brand' : '')}
          disabled={!brands.length || pending}
          leading={<BrandMark name={activeBrand?.name} color={activeBrand?.color} logo={activeBrand?.logo} size="sm" />}
        >
          <div className="max-h-40 overflow-y-auto rounded-xl bg-black/20 p-1">
            {brands.map((brand) => (
              <SidebarCollapseItem
                key={brand._id}
                active={brand._id === brandId}
                label={brand.name}
                hint={`${brand.storeCount} فروشگاه`}
                leading={<BrandMark name={brand.name} color={brand.color} logo={brand.logo} size="sm" />}
                trailing={brand._id === brandId ? <Check className="h-3.5 w-3.5" /> : null}
                onClick={() => {
                  setOpenPanel('');
                  if (brand._id !== brandId) changeBrand(brand._id);
                }}
              />
            ))}
            {canManage ? (
              <Link
                href="/counting/profile?tab=workspace"
                className="mt-0.5 flex items-center gap-2 rounded-lg px-2 py-1.5 text-[11px] text-white/50 transition hover:bg-white/10 hover:text-white"
              >
                <Settings2 className="h-3.5 w-3.5" />
                مدیریت برندها
              </Link>
            ) : null}
          </div>
        </SidebarCollapsible>
        <SidebarCollapsible
          label="فروشگاه"
          subtitle={activeStore?.name || 'فروشگاهی نیست'}
          open={openPanel === 'store'}
          onOpenChange={(next) => setOpenPanel(next ? 'store' : '')}
          disabled={!stores.length || pending}
          leading={
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/10 text-white">
              <Store className="h-3.5 w-3.5" />
            </span>
          }
        >
          <div className="max-h-40 overflow-y-auto rounded-xl bg-black/20 p-1">
            {stores.map((store) => (
              <SidebarCollapseItem
                key={store._id}
                active={store._id === (activeStore?._id || storeId)}
                label={store.name || 'فروشگاه'}
                hint={store.city ? String(store.city) : roleLabel || undefined}
                trailing={store._id === (activeStore?._id || storeId) ? <Check className="h-3.5 w-3.5" /> : null}
                onClick={() => {
                  setOpenPanel('');
                  apply(brandId, store._id);
                }}
              />
            ))}
            {canManage ? (
              <Link
                href="/counting/profile?tab=workspace"
                className="mt-0.5 flex items-center gap-2 rounded-lg px-2 py-1.5 text-[11px] text-white/50 transition hover:bg-white/10 hover:text-white"
              >
                <Settings2 className="h-3.5 w-3.5" />
                مدیریت فروشگاه‌ها
              </Link>
            ) : null}
          </div>
        </SidebarCollapsible>
      </div>
    </section>
  );
}

export function SidebarUser() {
  const workspace = useWorkspace();
  const [, start] = useTransition();
  const [open, setOpen] = useState(false);
  const roleLabel =
    workspace?.storeRole === 'owner'
      ? 'صاحب برند'
      : STORE_STAFF_ROLES[workspace?.storeRole as keyof typeof STORE_STAFF_ROLES] || 'کاربر';
  const name = workspace?.user.fullName || workspace?.user.phonenumber || 'کاربر';

  return (
    <div className="rounded-2xl bg-white/[0.07] ring-1 ring-white/10">
      <SidebarCollapsible
        label={roleLabel}
        subtitle={name}
        open={open}
        onOpenChange={setOpen}
        expand="up"
        leading={
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/12 text-sm font-medium">
            {/^0\d+$/.test(name.replace(/\s/g, '')) ? <User className="h-4 w-4" /> : initials(name)}
          </span>
        }
      >
        <div className="rounded-xl bg-black/20 p-1">
          <Link
            href="/counting/profile"
            onClick={() => setOpen(false)}
            className="flex w-full rounded-lg px-2.5 py-1.5 text-sm text-white/80 transition hover:bg-white/10 hover:text-white"
          >
            تنظیمات
          </Link>
          <button
            type="button"
            className="flex w-full rounded-lg px-2.5 py-1.5 text-sm text-red-200 transition hover:bg-red-500/15 hover:text-red-100"
            onClick={() => {
              setOpen(false);
              start(async () => {
                await logout();
              });
            }}
          >
            خروج
          </button>
        </div>
      </SidebarCollapsible>
    </div>
  );
}
