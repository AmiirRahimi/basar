'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { BadgePercent, Building2, Handshake, UserRound, UsersRound } from 'lucide-react';
import { updateProfile } from '@/actions/auth';
import { IRAN_CITY_OPTIONS } from '@/lib/iran-cities';
import { STORE_STAFF_ROLES } from '@/lib/constants';
import { redirectIfUnauthorized } from '@/lib/session-client';
import { Button, Input, Select, Tabs, toast } from '@/ui';
import { BrandStoreWorkspace } from './BrandStoreWorkspace';
import { PageActionOutlet, usePageMeta } from './PageAction';
import { PartnersPanel } from './PartnersPanel';
import { SubscriptionPanel } from './SubscriptionPanel';
import { TeamInviteInbox } from './TeamInviteInbox';
import { TeamsPanel } from './TeamsPanel';
import { useWorkspace } from './WorkspaceProvider';

const selectLabels = {
  search: 'جستجو',
  remove: 'حذف انتخاب',
  noOptionsFound: 'موردی یافت نشد',
};

const TABS = [
  { id: 'account', label: 'حساب کاربری', description: 'نام، شهر و حساب بانکی برای واریز سهم فروش', icon: UserRound },
  { id: 'workspace', label: 'برند و فروشگاه', description: 'برندها و فروشگاه‌هایی که با آن‌ها کار می‌کنید', icon: Building2 },
  { id: 'teams', label: 'اعضا', description: 'کسانی که به برند یا فروشگاه شما دسترسی دارند', icon: UsersRound },
  { id: 'partners', label: 'شرکای درآمد', description: 'سهم درآمد شرکا از فروش', icon: Handshake },
  { id: 'subscription', label: 'اشتراک', description: 'طرح فعلی، تمدید و خرید اشتراک', icon: BadgePercent },
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
    sheba?: string;
    bankName?: string;
    cardNumber?: string;
  };
  initialTab?: string;
}) {
  const router = useRouter();
  const workspace = useWorkspace();
  const [tab, setTab] = useState<TabId>(isTab(initialTab) ? initialTab : 'account');
  const canManageWorkspace =
    workspace?.storeRole === 'owner' ||
    workspace?.storeRole === 'admin' ||
    Boolean(workspace?.isSuperuser || workspace?.isPlatformAdmin) ||
    Boolean(workspace?.permissions?.includes('workspace.write'));
  const canManageBrand =
    workspace?.storeRole === 'owner' || Boolean(workspace?.isSuperuser || workspace?.isPlatformAdmin);
  const ownsBrand = Boolean(
    workspace?.brands.some((brand) => brand._userId === workspace.user._id) ||
      workspace?.isSuperuser ||
      workspace?.isPlatformAdmin,
  );

  const visibleTabs = TABS.filter((item) => {
    if (item.id === 'teams') return ownsBrand;
    if (item.id === 'partners') return canManageWorkspace || Boolean(workspace?.permissions?.includes('partners.view'));
    if (item.id === 'subscription') return workspace?.storeRole === 'owner' || Boolean(workspace?.isSuperuser || workspace?.isPlatformAdmin);
    return true;
  });
  const activeTab = visibleTabs.some((item) => item.id === tab) ? tab : 'account';
  const activeMeta = visibleTabs.find((item) => item.id === activeTab) || visibleTabs[0];

  usePageMeta({ hasTabs: true });

  const selectedBrand = workspace?.brands.find((brand) => brand._id === workspace.activeBrandId);
  const selectedStore = workspace?.stores.find((store) => store._id === workspace.activeStoreId);

  function changeTab(next: TabId) {
    setTab(next);
    router.replace(`/accounting/profile?tab=${next}`, { scroll: false });
  }

  return (
    <div className="space-y-5">
      <TeamInviteInbox />
      <Tabs
        value={activeTab}
        onChange={(next) => {
          if (isTab(next)) changeTab(next);
        }}
        tabs={visibleTabs.map((item) => ({
          value: item.id,
          label: item.label,
          icon: <item.icon className="h-4 w-4" />,
        }))}
      />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-gray-900">{activeMeta?.label}</h3>
          {activeMeta?.description ? (
            <p className="mt-1 text-sm text-muted-foreground">{activeMeta.description}</p>
          ) : null}
        </div>
        <PageActionOutlet />
      </div>
      <div>
        {activeTab === 'account' ? <AccountSection user={user} /> : null}
        {activeTab === 'workspace' ? <BrandStoreWorkspace /> : null}
        {activeTab === 'teams' && ownsBrand ? <TeamsPanel /> : null}
        {activeTab === 'partners' &&
        (canManageWorkspace || Boolean(workspace?.permissions?.includes('partners.view'))) ? (
          <PartnersPanel
            brands={workspace?.brands || []}
            stores={workspace?.stores || []}
            selectedBrand={selectedBrand}
            selectedStore={selectedStore}
            partners={workspace?.partners || []}
            canManageBrand={canManageBrand}
            canManageStore={canManageWorkspace || Boolean(workspace?.permissions?.includes('partners.write'))}
          />
        ) : null}
        {activeTab === 'subscription' ? (
          <SubscriptionPanel subscription={workspace?.subscription} purchases={workspace?.purchases} />
        ) : null}
      </div>
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
    sheba?: string;
    bankName?: string;
    cardNumber?: string;
  };
}) {
  const workspace = useWorkspace();
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [address, setAddress] = useState(user?.address || '');
  const [city, setCity] = useState(String(user?.city || ''));
  const [bankName, setBankName] = useState(user?.bankName || '');
  const [sheba, setSheba] = useState(user?.sheba || '');
  const [cardNumber, setCardNumber] = useState(user?.cardNumber || '');
  const [pending, start] = useTransition();
  const phone = String(user?.phonenumber || user?.phoneNumber || workspace?.user.phonenumber || '');
  const roleLabel = useMemo(() => {
    if (workspace?.isSuperuser || workspace?.isPlatformAdmin) return 'سوپریوزر';
    if (workspace?.storeRole === 'owner') return 'ادمین';
    if (workspace?.accessSource === 'team') return 'عضو';
    return STORE_STAFF_ROLES[workspace?.storeRole as keyof typeof STORE_STAFF_ROLES] || 'کاربر';
  }, [workspace?.storeRole, workspace?.isSuperuser, workspace?.isPlatformAdmin, workspace?.accessSource]);

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
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="نام کامل" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          <Input label="موبایل" value={phone} disabled />
          <Select
            label="شهر"
            value={city}
            onChange={(v) => setCity(String(v || ''))}
            options={IRAN_CITY_OPTIONS}
            placeholder="انتخاب شهر"
            searchable
            labels={selectLabels}
          />
          <Input label="آدرس" value={address} onChange={(e) => setAddress(e.target.value)} />
          <Input label="نام بانک" value={bankName} onChange={(e) => setBankName(e.target.value)} />
          <Input
            label="شبا"
            dir="ltr"
            value={sheba}
            onChange={(e) => setSheba(e.target.value)}
            placeholder="IRxxxxxxxxxxxxxxxxxxxxxxxx"
          />
          <Input
            label="شماره کارت (اختیاری)"
            dir="ltr"
            value={cardNumber}
            onChange={(e) => setCardNumber(e.target.value)}
          />
        </div>
        <p className="mt-2 text-xs text-gray-500">
          شبا برای واریز سهم فروش از لینک محصول لازم است. پرداخت مشتری به حساب درگاه باسار می‌رود و ادمین بر اساس شبا به
          شما واریز می‌کند.
        </p>
        <div className="mt-4">
          <Button
            disabled={pending}
            onClick={() =>
              start(async () => {
                const res = await updateProfile({ fullName, address, city, bankName, sheba, cardNumber });
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
