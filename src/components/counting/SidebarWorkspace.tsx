'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, useTransition } from 'react';
import { Check, ChevronDown, Loader2, MapPin, Settings2, Store, User } from 'lucide-react';
import { logout } from '@/actions/auth';
import { switchWorkspace } from '@/actions/workspace';
import { STORE_STAFF_ROLES } from '@/lib/constants';
import { cn, Popover, PopoverContent, PopoverTrigger, toast } from '@/ui';
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

type SelectOption = {
  value: string;
  label: string;
  hint?: string;
  color?: string;
  logo?: string;
};

function WorkspaceSelect({
  label,
  value,
  options,
  onChange,
  disabled,
  pending,
  hint,
  leading,
  emptyText,
  footerHref,
  footerLabel,
}: {
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
  pending?: boolean;
  hint?: string;
  leading?: React.ReactNode;
  emptyText?: string;
  footerHref?: string;
  footerLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled || pending || !options.length}
          aria-label={label}
          className={cn(
            'flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-right text-white transition',
            'bg-white/[0.06] hover:bg-white/[0.1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
            'disabled:cursor-default disabled:hover:bg-white/[0.06]',
          )}
        >
          {leading}
          <span className="min-w-0 flex-1">
            <span className="block text-[10px] leading-4 text-white/45">{label}</span>
            <span className="block truncate text-[13px] font-medium leading-5">
              {selected?.label || emptyText || 'انتخاب کنید'}
            </span>
            {hint ? <span className="block truncate text-[10px] leading-4 text-white/40">{hint}</span> : null}
          </span>
          {pending ? (
            <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-white/50" />
          ) : (
            <ChevronDown
              className={cn('h-4 w-4 shrink-0 text-white/45 transition-transform', open && 'rotate-180')}
            />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="bottom"
        sideOffset={6}
        dir="rtl"
        className="z-popover w-[var(--radix-popover-trigger-width)] min-w-[228px] overflow-hidden p-1.5"
      >
        <div className="max-h-64 overflow-y-auto">
          {options.length ? (
            options.map((option) => {
              const active = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-right text-sm transition',
                    active ? 'bg-primary/10 text-primary' : 'text-gray-800 hover:bg-gray-100',
                  )}
                  onClick={() => {
                    setOpen(false);
                    if (option.value !== value) onChange(option.value);
                  }}
                >
                  {option.color || option.logo ? (
                    <BrandMark name={option.label} color={option.color} logo={option.logo} size="sm" />
                  ) : null}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{option.label}</span>
                    {option.hint ? (
                      <span className={cn('block truncate text-[11px]', active ? 'text-primary/70' : 'text-gray-400')}>
                        {option.hint}
                      </span>
                    ) : null}
                  </span>
                  {active ? <Check className="h-4 w-4 shrink-0" /> : null}
                </button>
              );
            })
          ) : (
            <p className="px-2.5 py-3 text-sm text-gray-500">{emptyText || 'موردی نیست'}</p>
          )}
        </div>
        {footerHref && footerLabel ? (
          <Link
            href={footerHref}
            onClick={() => setOpen(false)}
            className="mt-1 flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs text-gray-500 hover:bg-gray-50 hover:text-gray-800"
          >
            <Settings2 className="h-3.5 w-3.5" />
            {footerLabel}
          </Link>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}

export function SidebarWorkspace({ compact = false }: { compact?: boolean }) {
  const workspace = useWorkspace();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [brandId, setBrandId] = useState(workspace?.activeBrandId || '');
  const [storeId, setStoreId] = useState(workspace?.activeStoreId || '');

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
    <section className="relative rounded-2xl bg-white/[0.06] p-2 ring-1 ring-white/10">
      {activeBrand?.color ? (
        <span
          className="absolute inset-y-3 start-0 w-[3px] rounded-full"
          style={{ background: activeBrand.color }}
        />
      ) : null}
      <div className="mb-2 flex items-center justify-between px-1">
        <p className="text-[11px] font-medium text-white/55">در حال کار روی</p>
        {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin text-white/40" /> : null}
      </div>
      <div className="flex flex-col gap-1.5">
        <WorkspaceSelect
          label="برند"
          value={brandId}
          pending={pending}
          options={brands.map((brand) => ({
            value: brand._id,
            label: brand.name,
            hint: `${brand.storeCount} فروشگاه`,
            color: brand.color,
            logo: brand.logo,
          }))}
          onChange={changeBrand}
          leading={<BrandMark name={activeBrand?.name} color={activeBrand?.color} logo={activeBrand?.logo} />}
          emptyText="برندی نیست"
          footerHref={canManage ? '/counting/store' : undefined}
          footerLabel={canManage ? 'مدیریت برندها' : undefined}
        />
        <WorkspaceSelect
          label="فروشگاه"
          value={activeStore?._id || storeId}
          pending={pending}
          options={stores.map((store) => ({
            value: store._id,
            label: store.name || 'فروشگاه',
            hint: store.city ? String(store.city) : undefined,
          }))}
          onChange={(nextStoreId) => apply(brandId, nextStoreId)}
          hint={activeStore?.city ? String(activeStore.city) : roleLabel || undefined}
          leading={
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 text-white">
              <Store className="h-4 w-4" />
            </span>
          }
          emptyText="فروشگاهی نیست"
          footerHref={canManage ? '/counting/store' : undefined}
          footerLabel={canManage ? 'مدیریت فروشگاه‌ها' : undefined}
        />
      </div>
      <p className="mt-2 flex items-start gap-1.5 px-1 text-[10px] leading-4 text-white/40">
        <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
        ثبت فاکتور، چک و لباس برای همین فروشگاه است.
      </p>
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
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-right text-white/85 transition hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/12 text-sm font-medium">
            {/^0\d+$/.test(name.replace(/\s/g, '')) ? <User className="h-4 w-4" /> : initials(name)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13px] font-medium">{name}</span>
            <span className="block truncate text-[10px] text-white/45">{roleLabel}</span>
          </span>
          <ChevronDown className={cn('h-4 w-4 shrink-0 text-white/40 transition-transform', open && 'rotate-180')} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        side="top"
        sideOffset={8}
        dir="rtl"
        className="z-popover w-[var(--radix-popover-trigger-width)] min-w-[200px] p-1.5"
      >
        <Link
          href="/counting/profile"
          onClick={() => setOpen(false)}
          className="flex w-full rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
        >
          پروفایل
        </Link>
        <button
          type="button"
          className="flex w-full rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50"
          onClick={() => {
            setOpen(false);
            start(async () => {
              await logout();
            });
          }}
        >
          خروج
        </button>
      </PopoverContent>
    </Popover>
  );
}
