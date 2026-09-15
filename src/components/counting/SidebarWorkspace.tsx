'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';
import { ChevronDown, User } from 'lucide-react';
import { logout } from '@/actions/auth';
import { switchWorkspace } from '@/actions/workspace';
import { STORE_STAFF_ROLES } from '@/lib/constants';
import { ProfileMenu, toast } from '@/ui';
import { useWorkspace } from './WorkspaceProvider';

function ContextSelect({
  label,
  value,
  options,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  options: { value: string; label: string; hint?: string }[];
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);
  return (
    <div className="relative w-full">
      <button
        type="button"
        disabled={disabled || options.length < 2}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-1 rounded-xl bg-white/8 px-2.5 py-2 text-right text-white transition hover:bg-white/12 disabled:cursor-default disabled:opacity-80"
      >
        <span className="min-w-0">
          <span className="block text-[9px] text-white/45">{label}</span>
          <span className="block truncate text-[11px] font-medium">{selected?.label || '—'}</span>
        </span>
        {options.length > 1 ? <ChevronDown className="h-3.5 w-3.5 shrink-0 text-white/50" /> : null}
      </button>
      {open ? (
        <div className="absolute inset-x-0 top-full z-50 mt-1 max-h-56 overflow-auto rounded-xl border border-white/10 bg-[#1b2430] py-1 shadow-xl">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              className="flex w-full flex-col px-3 py-2 text-right text-[11px] text-white/80 hover:bg-white/10"
              onClick={() => {
                setOpen(false);
                if (option.value !== value) onChange(option.value);
              }}
            >
              <span>{option.label}</span>
              {option.hint ? <span className="text-[10px] text-white/40">{option.hint}</span> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function SidebarWorkspace() {
  const workspace = useWorkspace();
  const router = useRouter();
  const [, start] = useTransition();
  const brands = workspace?.brands || [];
  const stores = useMemo(
    () => (workspace?.stores || []).filter((store) => store._brandId === workspace?.activeBrandId),
    [workspace],
  );
  const roleLabel =
    workspace?.storeRole === 'owner'
      ? 'صاحب برند'
      : STORE_STAFF_ROLES[workspace?.storeRole as keyof typeof STORE_STAFF_ROLES] || '';

  function changeBrand(brandId: string) {
    const nextStore = (workspace?.stores || []).find((store) => store._brandId === brandId);
    if (!nextStore || !workspace) return;
    start(async () => {
      const res = await switchWorkspace({ brandId, storeId: nextStore._id });
      if (!res.ok) toast.error(res.message || 'تغییر برند انجام نشد');
      router.refresh();
    });
  }

  function changeStore(storeId: string) {
    if (!workspace) return;
    start(async () => {
      const res = await switchWorkspace({ brandId: workspace.activeBrandId, storeId });
      if (!res.ok) toast.error(res.message || 'تغییر فروشگاه انجام نشد');
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <ProfileMenu
        isRtl
        LinkComponent={Link}
        placement="bottom-end"
        showStatusDot={false}
        user={{
          displayName: workspace?.user.fullName || workspace?.user.phonenumber || 'کاربر',
          username: workspace?.user.phonenumber,
        }}
        labels={{
          welcome: roleLabel || 'پنل شمارش',
          signOut: 'خروج',
          profileSetting: 'تنظیمات پروفایل',
          settings: 'پروفایل',
        }}
        menuItems={[
          {
            label: 'تنظیمات پروفایل',
            href: '/counting/profile',
            icon: <User className="h-4 w-4" />,
          },
        ]}
        onLogout={() => {
          start(async () => {
            await logout();
          });
        }}
        avatarClassName="ring-white/30"
        buttonClassName="hover:ring-white/40"
        popoverClassName="text-gray-900"
      />
      <div className="flex w-full flex-col gap-1.5">
        <ContextSelect
          label="برند"
          value={workspace?.activeBrandId || ''}
          options={brands.map((brand) => ({ value: brand._id, label: brand.name }))}
          onChange={changeBrand}
        />
        <ContextSelect
          label="فروشگاه"
          value={workspace?.activeStoreId || ''}
          options={stores.map((store) => ({
            value: store._id,
            label: store.name || 'فروشگاه',
            hint: store.city ? String(store.city) : undefined,
          }))}
          onChange={changeStore}
        />
      </div>
    </div>
  );
}
