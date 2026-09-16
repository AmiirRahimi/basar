'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { BadgePercent, Building2, Handshake, UserRound } from 'lucide-react';
import { updateProfile } from '@/actions/auth';
import { IRAN_CITY_OPTIONS } from '@/lib/iran-cities';
import { STORE_STAFF_ROLES } from '@/lib/constants';
import { faNumber } from '@/lib/format';
import { redirectIfUnauthorized } from '@/lib/session-client';
import { Button, Input, Select, toast } from '@/ui';
import { BrandStoreWorkspace } from './BrandStoreWorkspace';
import { PartnersPanel } from './PartnersPanel';
import { SubscriptionForm } from './SubscriptionForm';
import { useWorkspace } from './WorkspaceProvider';

const selectLabels = {
  search: 'جستجو',
  remove: 'حذف انتخاب',
  noOptionsFound: 'موردی یافت نشد',
};

const TABS = [
  { id: 'account', label: 'حساب کاربری', icon: UserRound },
  { id: 'workspace', label: 'برند و فروشگاه', icon: Building2 },
  { id: 'partners', label: 'شرکای درآمد', icon: Handshake },
  { id: 'subscription', label: 'اشتراک', icon: BadgePercent },
] as const;

type TabId = (typeof TABS)[number]['id'];

function isTab(value: string | undefined): value is TabId {
  return TABS.some((tab) => tab.id === value);
}

export function ProfileSettings({
  user,
  initialTab = 'account',
}: {
  user: {
    fullName?: string;
    address?: string;
    city?: string;
    phonenumber?: string;
    phoneNumber?: string;
    remainingDaysOfSubscription?: number;
  };
  initialTab?: string;
}) {
  const router = useRouter();
  const workspace = useWorkspace();
  const [tab, setTab] = useState<TabId>(isTab(initialTab) ? initialTab : 'account');
  const canManageWorkspace =
    workspace?.storeRole === 'owner' || workspace?.storeRole === 'admin' || Boolean(workspace?.isPlatformAdmin);
  const canManageBrand = workspace?.storeRole === 'owner' || Boolean(workspace?.isPlatformAdmin);

  const visibleTabs = TABS.filter((item) => {
    if (item.id === 'partners') return canManageWorkspace;
    if (item.id === 'subscription') return workspace?.storeRole === 'owner' || Boolean(workspace?.isPlatformAdmin);
    return true;
  });
  const activeTab = visibleTabs.some((item) => item.id === tab) ? tab : 'account';

  const selectedBrand = workspace?.brands.find((brand) => brand._id === workspace.activeBrandId);
  const selectedStore = workspace?.stores.find((store) => store._id === workspace.activeStoreId);

  function changeTab(next: TabId) {
    setTab(next);
    router.replace(`/counting/profile?tab=${next}`, { scroll: false });
  }

  return (
    <div className="space-y-5">
      <nav className="flex gap-1 overflow-x-auto rounded-2xl border border-gray-200 bg-white p-1 shadow-sm">
        {visibleTabs.map((item) => {
          const Icon = item.icon;
              const active = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => changeTab(item.id)}
              className={`flex min-w-0 flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                active ? 'bg-gray-900 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {activeTab === 'account' ? <AccountSection user={user} /> : null}
      {activeTab === 'workspace' ? <BrandStoreWorkspace /> : null}
      {activeTab === 'partners' && canManageWorkspace ? (
        <PartnersPanel
          brands={workspace?.brands || []}
          stores={workspace?.stores || []}
          selectedBrand={selectedBrand}
          selectedStore={selectedStore}
          partners={workspace?.partners || []}
          canManageBrand={canManageBrand}
          canManageStore={canManageWorkspace}
        />
      ) : null}
      {activeTab === 'subscription' ? (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,280px)_minmax(0,1fr)]">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <p className="text-xs text-gray-500">روز باقیمانده</p>
            <p className="mt-1 text-3xl font-semibold text-gray-900">
              {faNumber(user.remainingDaysOfSubscription)}
            </p>
          </div>
          <SubscriptionForm />
        </div>
      ) : null}
    </div>
  );
}

function AccountSection({
  user,
}: {
  user: {
    fullName?: string;
    address?: string;
    city?: string;
    phonenumber?: string;
    phoneNumber?: string;
  };
}) {
  const workspace = useWorkspace();
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [address, setAddress] = useState(user?.address || '');
  const [city, setCity] = useState(String(user?.city || ''));
  const [pending, start] = useTransition();
  const phone = String(user?.phonenumber || user?.phoneNumber || workspace?.user.phonenumber || '');
  const roleLabel = useMemo(() => {
    if (workspace?.storeRole === 'owner') return 'صاحب برند';
    return STORE_STAFF_ROLES[workspace?.storeRole as keyof typeof STORE_STAFF_ROLES] || 'کاربر';
  }, [workspace?.storeRole]);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,260px)_minmax(0,1fr)]">
      <aside className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col items-center text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-teal-700 text-xl font-semibold text-white">
            {(fullName || phone).trim().slice(0, 1) || 'ب'}
          </span>
          <p className="mt-3 text-base font-semibold text-gray-900">{fullName || 'بدون نام'}</p>
          <p className="mt-1 text-sm text-gray-500" dir="ltr">
            {phone || '—'}
          </p>
          <span className="mt-3 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">{roleLabel}</span>
        </div>
      </aside>
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <h3 className="mb-4 text-base font-semibold text-gray-900">اطلاعات حساب</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="نام کامل" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          <Input label="موبایل" value={phone} disabled />
          <Select
            label="شهر"
            value={city}
            onChange={(v) => setCity(String(v || ''))}
            options={IRAN_CITY_OPTIONS}
            searchable
            labels={selectLabels}
          />
          <Input label="آدرس" value={address} onChange={(e) => setAddress(e.target.value)} />
        </div>
        <div className="mt-4">
          <Button
            disabled={pending}
            onClick={() =>
              start(async () => {
                const res = await updateProfile({ fullName, address, city });
                if (redirectIfUnauthorized(res)) return;
                if (res.ok) toast.success(res.message || 'ذخیره شد');
                else toast.error(res.message || 'ذخیره نشد');
              })
            }
          >
            ذخیره حساب
          </Button>
        </div>
      </section>
    </div>
  );
}
