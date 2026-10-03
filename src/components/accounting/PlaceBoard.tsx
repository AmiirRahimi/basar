'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Handshake, UsersRound, Warehouse } from 'lucide-react';
import { updateStore } from '@/actions/workspace';
import { emptyWarehouse } from '@/lib/store-contacts';
import { redirectIfUnauthorized } from '@/lib/session-client';
import { Button, Input, Select, Tabs, toast } from '@/ui';
import { BrandStoreWorkspace } from './BrandStoreWorkspace';
import { PageActionOutlet, usePageMeta } from './PageAction';
import { PlanLocked } from './PlanLocked';
import { PartnersPanel } from './PartnersPanel';
import { TeamInviteInbox } from './TeamInviteInbox';
import { TeamsPanel } from './TeamsPanel';
import { useWorkspace } from './WorkspaceProvider';

const selectLabels = { search: 'جستجو', remove: 'حذف انتخاب', noOptionsFound: 'موردی یافت نشد' };

const TABS = [
  { id: 'workspace', label: 'برند و فروشگاه' },
  { id: 'teams', label: 'اعضا' },
  { id: 'partners', label: 'شرکای درآمد' },
  { id: 'warehouses', label: 'انبار' },
] as const;

type TabId = (typeof TABS)[number]['id'];

export function PlaceBoard({ initialTab = 'workspace' }: { initialTab?: string }) {
  const router = useRouter();
  const workspace = useWorkspace();
  const [tab, setTab] = useState<TabId>(TABS.some((item) => item.id === initialTab) ? (initialTab as TabId) : 'workspace');
  const ownsBrand = Boolean(
    workspace?.brands.some((brand) => brand._userId === workspace.user._id) ||
      workspace?.isSuperuser ||
      workspace?.isPlatformAdmin,
  );
  const canManage =
    workspace?.storeRole === 'owner' ||
    workspace?.storeRole === 'admin' ||
    Boolean(workspace?.isSuperuser || workspace?.isPlatformAdmin) ||
    Boolean(workspace?.permissions?.includes('workspace.write'));
  const visible = TABS.filter((item) => {
    if (item.id === 'teams') return ownsBrand;
    if (item.id === 'partners') return canManage || Boolean(workspace?.permissions?.includes('partners.view'));
    return true;
  });
  const active = visible.some((item) => item.id === tab) ? tab : visible[0]?.id || 'workspace';
  usePageMeta({ hasTabs: true });
  const selectedBrand = workspace?.brands.find((brand) => brand._id === workspace.activeBrandId);
  const selectedStore = workspace?.stores.find((store) => store._id === workspace.activeStoreId);

  return (
    <div className="space-y-5">
      <TeamInviteInbox />
      <Tabs
        value={active}
        onChange={(next) => {
          if (!TABS.some((item) => item.id === next)) return;
          setTab(next as TabId);
          router.replace(`/accounting/workspace?tab=${next}`, { scroll: false });
        }}
        tabs={visible.map((item) => ({
          value: item.id,
          label: item.label,
          icon:
            item.id === 'workspace' ? (
              <Building2 className="h-4 w-4" />
            ) : item.id === 'teams' ? (
              <UsersRound className="h-4 w-4" />
            ) : item.id === 'partners' ? (
              <Handshake className="h-4 w-4" />
            ) : (
              <Warehouse className="h-4 w-4" />
            ),
        }))}
      />
      <div className="flex justify-end">
        <PageActionOutlet />
      </div>
      {active === 'workspace' ? <BrandStoreWorkspace /> : null}
      {active === 'teams' && ownsBrand ? <TeamsPanel /> : null}
      {active === 'partners' ? (
        <PartnersPanel
          brands={workspace?.brands || []}
          stores={workspace?.stores || []}
          selectedBrand={selectedBrand}
          selectedStore={selectedStore}
          partners={workspace?.partners || []}
          canManageBrand={workspace?.storeRole === 'owner' || Boolean(workspace?.isSuperuser || workspace?.isPlatformAdmin)}
          canManageStore={canManage || Boolean(workspace?.permissions?.includes('partners.write'))}
        />
      ) : null}
      {active === 'warehouses' ? <WarehouseBoard /> : null}
    </div>
  );
}

function WarehouseBoard() {
  const workspace = useWorkspace();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [brandId, setBrandId] = useState(workspace?.activeBrandId || '');
  const [storeId, setStoreId] = useState('');
  const [name, setName] = useState('');
  const allowWarehouses = Boolean(workspace?.isPlatformAdmin || workspace?.subscription?.allowWarehouses);
  const stores = useMemo(
    () => (workspace?.stores || []).filter((store) => !brandId || store._brandId === brandId),
    [workspace?.stores, brandId],
  );
  const rows = useMemo(() => {
    return (workspace?.stores || []).flatMap((store) =>
      (store.warehouses || []).map((warehouse) => ({
        ...warehouse,
        storeId: store._id,
        storeName: store.name || 'فروشگاه',
        brandName: workspace?.brands.find((brand) => brand._id === store._brandId)?.name || '',
      })),
    );
  }, [workspace]);

  function save() {
    if (!allowWarehouses) {
      toast.error('ساخت انبار از طرح فروشگاه و شرکا به بعد است. طرح را ارتقا دهید.');
      return;
    }
    const store = stores.find((row) => row._id === storeId) || stores.find((row) => row.isMain) || stores[0];
    if (!store) {
      toast.error('برای این برند فروشگاهی نیست');
      return;
    }
    if (!name.trim()) {
      toast.error('نام انبار را بنویسید');
      return;
    }
    const warehouses = [...(store.warehouses || []), emptyWarehouse({ name: name.trim() })];
    start(async () => {
      const res = await updateStore(store._id, { warehouses });
      if (redirectIfUnauthorized(res)) return;
      if (!res.ok) {
        toast.error(res.message || 'انبار ثبت نشد');
        return;
      }
      toast.success(storeId ? 'انبار به فروشگاه وصل شد' : 'انبار به برند وصل شد');
      setName('');
      router.refresh();
    });
  }

  if (!allowWarehouses) {
    return (
      <PlanLocked
        title="انبار"
        what="انبار را برای برند یا فروشگاه می‌سازید و خروج لباس از انبار را ثبت می‌کنید. در طرح پایه این کار نیست."
        planHint="فروشگاه و شرکا یا ویترین"
      />
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        انبار را بسازید و به یک برند وصل کنید. اگر فروشگاه را هم انتخاب کنید، فقط مال همان فروشگاه است. اگر خالی بماند، به فروشگاه اصلی برند می‌رود. لباس می‌تواند بدون فروشگاه بماند.
      </p>
      <div className="grid gap-3 rounded-2xl border border-gray-200 bg-white p-4 md:grid-cols-4">
        <Select
          label="برند"
          value={brandId}
          options={(workspace?.brands || []).map((brand) => ({ value: brand._id, label: brand.name || 'برند' }))}
          onChange={(value) => {
            setBrandId(String(value || ''));
            setStoreId('');
          }}
          labels={selectLabels}
        />
        <Select
          label="فروشگاه (اختیاری)"
          value={storeId}
          options={[{ value: '', label: 'فقط برند' }, ...stores.map((store) => ({ value: store._id, label: store.name || 'فروشگاه' }))]}
          onChange={(value) => setStoreId(String(value || ''))}
          labels={selectLabels}
        />
        <Input label="نام انبار" value={name} onChange={(event) => setName(event.target.value)} />
        <div className="flex items-end">
          <Button type="button" loading={pending} onClick={save}>
            افزودن انبار
          </Button>
        </div>
      </div>
      <ul className="grid gap-3 md:grid-cols-2">
        {rows.map((row) => (
          <li key={`${row.storeId}-${row._id}`} className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm">
            <p className="font-medium text-gray-900">{row.name}</p>
            <p className="mt-1 text-gray-500">
              {row.brandName || 'برند'} - {row.storeName}
            </p>
          </li>
        ))}
      </ul>
      {!rows.length ? <p className="text-sm text-gray-500">هنوز انباری ثبت نشده است.</p> : null}
    </div>
  );
}
