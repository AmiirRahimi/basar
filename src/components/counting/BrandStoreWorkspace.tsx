'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, MapPin, Phone, Plus, Store, Trash2, UserPlus, Users } from 'lucide-react';
import {
  createBrand,
  createStore,
  deleteBrand,
  deleteStore,
  inviteStoreMember,
  removeStoreMember,
  updateBrand,
  updateStore,
  updateStoreMember,
} from '@/actions/workspace';
import { BRAND_COLORS, STORE_STAFF_ROLES, type StoreStaffRole } from '@/lib/constants';
import { IRAN_CITY_OPTIONS } from '@/lib/iran-cities';
import type { WorkspaceBrand, WorkspaceMember, WorkspaceStore } from '@/lib/types';
import { Button, EmptyState, Input, Modal, Select, toast } from '@/ui';
import { redirectIfUnauthorized } from '@/lib/session-client';
import { useWorkspace } from './WorkspaceProvider';
import { useWritable } from './useWritable';

const selectLabels = {
  search: 'جستجو',
  remove: 'حذف انتخاب',
  noOptionsFound: 'موردی یافت نشد',
};

const roleOptions = Object.entries(STORE_STAFF_ROLES).map(([value, label]) => ({ value, label }));

function initials(name?: string) {
  const text = (name || '').trim();
  return text ? text.slice(0, 1) : 'ب';
}

function BrandMark({
  brand,
  size = 'sm',
}: {
  brand: Pick<WorkspaceBrand, 'name' | 'logo' | 'color'>;
  size?: 'sm' | 'md';
}) {
  const dim = size === 'sm' ? 'h-9 w-9 text-sm' : 'h-11 w-11 text-base';
  if (brand.logo) {
    return <img src={brand.logo} alt="" className={`rounded-xl object-cover ${dim}`} />;
  }
  return (
    <div
      className={`flex items-center justify-center rounded-xl font-semibold text-white ${dim}`}
      style={{ background: brand.color || BRAND_COLORS[0] }}
    >
      {initials(brand.name)}
    </div>
  );
}

function MemberStack({ members }: { members: WorkspaceMember[] }) {
  if (!members.length) {
    return <span className="text-xs text-gray-400">بدون تیم</span>;
  }
  return (
    <div className="flex items-center">
      {members.slice(0, 4).map((member, index) => (
        <span
          key={member._id}
          className="-mr-2 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white text-[10px] font-medium text-white first:mr-0"
          style={{ background: BRAND_COLORS[index % BRAND_COLORS.length], zIndex: 4 - index }}
          title={member.fullName || member.phonenumber}
        >
          {initials(member.fullName || member.phonenumber)}
        </span>
      ))}
      {members.length > 4 ? <span className="mr-1 text-xs text-gray-400">+{members.length - 4}</span> : null}
    </div>
  );
}

export function BrandStoreWorkspace() {
  const workspace = useWorkspace();
  const router = useRouter();
  const [pending, start] = useTransition();
  const writable = useWritable();
  const isOwner = workspace?.storeRole === 'owner' || Boolean(workspace?.isPlatformAdmin);
  const brands = workspace?.brands || [];
  const stores = workspace?.stores || [];
  const [brandId, setBrandId] = useState(workspace?.activeBrandId || brands[0]?._id || '');
  const [storeId, setStoreId] = useState(workspace?.activeStoreId || '');
  const [brandModal, setBrandModal] = useState<'create' | 'edit' | null>(null);
  const [storeModal, setStoreModal] = useState(false);
  const [brandForm, setBrandForm] = useState({ name: '', description: '', color: BRAND_COLORS[0], logo: '' });
  const [storeForm, setStoreForm] = useState({ name: '', address: '', phonenumbers: '', city: '' });
  const [invite, setInvite] = useState({ phonenumber: '', fullName: '', role: 'seller' as StoreStaffRole });

  useEffect(() => {
    if (workspace?.activeBrandId) setBrandId(workspace.activeBrandId);
    if (workspace?.activeStoreId) setStoreId(workspace.activeStoreId);
  }, [workspace?.activeBrandId, workspace?.activeStoreId]);

  const selectedBrand = brands.find((brand) => brand._id === brandId) || brands[0];
  const brandStores = useMemo(
    () => stores.filter((store) => store._brandId === (selectedBrand?._id || '')),
    [stores, selectedBrand],
  );
  const selectedStore = brandStores.find((store) => store._id === storeId) || brandStores[0];

  function run(action: () => Promise<{ ok: boolean; message?: string; status?: number }>, success?: string) {
    start(async () => {
      const res = await action();
      if (redirectIfUnauthorized(res)) return;
      if (res.ok) {
        toast.success(success || res.message || 'انجام شد');
        setBrandModal(null);
        setStoreModal(false);
        setInvite({ phonenumber: '', fullName: '', role: 'seller' });
        router.refresh();
      } else {
        toast.error(res.message || 'انجام نشد');
      }
    });
  }

  if (!workspace) {
    return <EmptyState message="برای مدیریت برند و فروشگاه وارد شوید" />;
  }

  if (!isOwner) {
    const mine = stores.find((store) => store._id === workspace.activeStoreId) || stores[0];
    return (
      <StorePanel
        store={mine}
        brand={brands.find((brand) => brand._id === mine?._brandId)}
        canInvite={writable && workspace.storeRole === 'admin'}
        canEdit={writable && workspace.storeRole === 'admin'}
        pending={pending}
        invite={invite}
        setInvite={setInvite}
        onInvite={() => run(() => inviteStoreMember({ ...invite, _storeId: mine?._id }), 'دعوت ثبت شد')}
        onRole={(id, role) => run(() => updateStoreMember(id, { role }))}
        onRemove={(id) => run(() => removeStoreMember(id), 'حذف شد')}
      />
    );
  }

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="h-fit rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
        <div className="mb-2 flex items-center justify-between px-1">
          <p className="text-xs font-medium text-gray-500">برندها</p>
          {writable ? (
            <button
              type="button"
              className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900"
              onClick={() => {
                setBrandForm({
                  name: '',
                  description: '',
                  color: BRAND_COLORS[brands.length % BRAND_COLORS.length],
                  logo: '',
                });
                setBrandModal('create');
              }}
              aria-label="برند جدید"
            >
              <Plus className="h-4 w-4" />
            </button>
          ) : null}
        </div>
        {brands.length ? (
          <div className="space-y-1">
            {brands.map((brand) => {
              const active = selectedBrand?._id === brand._id;
              return (
                <button
                  key={brand._id}
                  type="button"
                  onClick={() => {
                    setBrandId(brand._id);
                    const first = stores.find((store) => store._brandId === brand._id);
                    setStoreId(first?._id || '');
                  }}
                  className={`flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-right transition ${
                    active ? 'bg-gray-900 text-white' : 'text-gray-800 hover:bg-gray-50'
                  }`}
                >
                  <BrandMark brand={brand} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{brand.name}</span>
                    <span className={`block text-[11px] ${active ? 'text-white/70' : 'text-gray-400'}`}>
                      {brand.storeCount} فروشگاه
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <EmptyState icon={<Building2 className="h-6 w-6" />} message="برندی نیست" />
        )}
      </aside>

      {selectedBrand ? (
        <div className="space-y-4">
          <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <BrandMark brand={selectedBrand} size="md" />
                <div>
                  <h2 className="text-base font-semibold text-gray-900">{selectedBrand.name}</h2>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {selectedBrand.description || 'فروشگاه‌های این برند را از اینجا مدیریت کنید.'}
                  </p>
                </div>
              </div>
              {writable ? (
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setBrandForm({
                        name: selectedBrand.name,
                        description: selectedBrand.description || '',
                        color: selectedBrand.color || BRAND_COLORS[0],
                        logo: selectedBrand.logo || '',
                      });
                      setBrandModal('edit');
                    }}
                  >
                    ویرایش برند
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      setStoreForm({ name: '', address: '', phonenumbers: '', city: '' });
                      setStoreModal(true);
                    }}
                  >
                    <Plus className="ml-1 h-4 w-4" />
                    فروشگاه
                  </Button>
                  {brands.length > 1 ? (
                    <Button
                      variant="danger"
                      size="sm"
                      disabled={pending}
                      onClick={() => run(() => deleteBrand(selectedBrand._id), 'برند حذف شد')}
                    >
                      حذف
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 px-4 py-3">
              <p className="text-sm font-semibold text-gray-900">فروشگاه‌ها</p>
            </div>
            {brandStores.length ? (
              <ul className="divide-y divide-gray-100">
                {brandStores.map((store) => {
                  const active = selectedStore?._id === store._id;
                  return (
                    <li key={store._id}>
                      <button
                        type="button"
                        onClick={() => setStoreId(store._id)}
                        className={`flex w-full items-center gap-3 px-4 py-3 text-right transition ${
                          active ? 'bg-teal-50' : 'hover:bg-gray-50'
                        }`}
                      >
                        <span
                          className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                            active ? 'bg-teal-700 text-white' : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          <Store className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-gray-900">{store.name}</span>
                          <span className="mt-0.5 flex items-center gap-1 text-xs text-gray-500">
                            <MapPin className="h-3 w-3" />
                            {store.city || 'شهر ثبت نشده'}
                          </span>
                        </span>
                        <MemberStack members={store.members} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="p-6">
                <EmptyState icon={<Store className="h-6 w-6" />} message="این برند هنوز فروشگاهی ندارد." />
              </div>
            )}
          </section>

          {selectedStore ? (
            <StorePanel
              key={selectedStore._id}
              store={selectedStore}
              brand={selectedBrand}
              canInvite={writable}
              canEdit={writable}
              pending={pending}
              invite={invite}
              setInvite={setInvite}
              onInvite={() =>
                run(() => inviteStoreMember({ ...invite, _storeId: selectedStore._id }), 'دعوت ثبت شد')
              }
              onSave={(payload) => run(() => updateStore(selectedStore._id, payload), 'فروشگاه ذخیره شد')}
              onRole={(id, role) => run(() => updateStoreMember(id, { role }))}
              onRemove={(id) => run(() => removeStoreMember(id), 'حذف شد')}
              onDelete={
                writable && brandStores.length > 1
                  ? () => run(() => deleteStore(selectedStore._id), 'فروشگاه حذف شد')
                  : undefined
              }
            />
          ) : null}
        </div>
      ) : (
        <EmptyState icon={<Building2 className="h-7 w-7" />} message="هنوز برندی نساخته‌اید." />
      )}
      </div>

      <Modal isOpen={Boolean(brandModal)} onClose={() => setBrandModal(null)}>
        <div className="p-5" dir="rtl">
          <h3 className="mb-4 text-lg font-semibold">{brandModal === 'edit' ? 'ویرایش برند' : 'برند جدید'}</h3>
          <div className="grid gap-3">
            <Input label="نام برند" value={brandForm.name} onChange={(e) => setBrandForm((s) => ({ ...s, name: e.target.value }))} />
            <Input
              label="توضیح کوتاه"
              value={brandForm.description}
              onChange={(e) => setBrandForm((s) => ({ ...s, description: e.target.value }))}
            />
            <div>
              <p className="mb-2 text-sm">رنگ برند</p>
              <div className="flex flex-wrap gap-2">
                {BRAND_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setBrandForm((s) => ({ ...s, color }))}
                    className={`h-8 w-8 rounded-full border-2 ${brandForm.color === color ? 'border-gray-900' : 'border-transparent'}`}
                    style={{ background: color }}
                  />
                ))}
              </div>
            </div>
            <Button
              disabled={pending}
              onClick={() =>
                run(
                  () =>
                    brandModal === 'edit' && selectedBrand
                      ? updateBrand(selectedBrand._id, brandForm)
                      : createBrand(brandForm),
                  brandModal === 'edit' ? 'برند ویرایش شد' : 'برند ساخته شد',
                )
              }
            >
              ذخیره
            </Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={storeModal} onClose={() => setStoreModal(false)}>
        <div className="p-5" dir="rtl">
          <h3 className="mb-4 text-lg font-semibold">فروشگاه جدید</h3>
          <div className="grid gap-3">
            <Input label="نام فروشگاه" value={storeForm.name} onChange={(e) => setStoreForm((s) => ({ ...s, name: e.target.value }))} />
            <Select
              label="شهر"
              value={storeForm.city}
              onChange={(v) => setStoreForm((s) => ({ ...s, city: String(v || '') }))}
              options={IRAN_CITY_OPTIONS}
              searchable
              labels={selectLabels}
            />
            <Input label="آدرس" value={storeForm.address} onChange={(e) => setStoreForm((s) => ({ ...s, address: e.target.value }))} />
            <Input
              label="تلفن"
              value={storeForm.phonenumbers}
              onChange={(e) => setStoreForm((s) => ({ ...s, phonenumbers: e.target.value }))}
            />
            <Button
              disabled={pending}
              onClick={() => run(() => createStore({ ...storeForm, _brandId: selectedBrand?._id }), 'فروشگاه اضافه شد')}
            >
              افزودن فروشگاه
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

function StorePanel({
  store,
  brand,
  canInvite,
  canEdit,
  pending,
  invite,
  setInvite,
  onInvite,
  onSave,
  onRole,
  onRemove,
  onDelete,
}: {
  store?: WorkspaceStore;
  brand?: WorkspaceBrand;
  canInvite?: boolean;
  canEdit?: boolean;
  pending: boolean;
  invite: { phonenumber: string; fullName: string; role: StoreStaffRole };
  setInvite: (next: { phonenumber: string; fullName: string; role: StoreStaffRole }) => void;
  onInvite: () => void;
  onSave?: (payload: Record<string, string>) => void;
  onRole: (id: string, role: StoreStaffRole) => void;
  onRemove: (id: string) => void;
  onDelete?: () => void;
}) {
  const [name, setName] = useState(store?.name || '');
  const [address, setAddress] = useState(store?.address || '');
  const [phonenumbers, setPhonenumbers] = useState(store?.phonenumbers || '');
  const [city, setCity] = useState(String(store?.city || ''));

  useEffect(() => {
    setName(store?.name || '');
    setAddress(store?.address || '');
    setPhonenumbers(store?.phonenumbers || '');
    setCity(String(store?.city || ''));
  }, [store?._id, store?.name, store?.address, store?.phonenumbers, store?.city]);

  if (!store) return <EmptyState message="فروشگاهی انتخاب نشده" />;

  return (
    <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-4 py-3 sm:px-5">
        <div>
          <p className="text-xs text-gray-500">{brand?.name}</p>
          <h3 className="text-base font-semibold text-gray-900">{store.name}</h3>
        </div>
        {onDelete ? (
          <Button size="sm" variant="danger" disabled={pending} onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
      <div className="grid gap-6 p-4 sm:p-5 lg:grid-cols-2">
        <div>
          <p className="mb-3 text-sm font-medium text-gray-900">مشخصات فروشگاه</p>
          {canEdit ? (
            <div className="grid gap-3">
              <Input label="نام" value={name} onChange={(e) => setName(e.target.value)} />
              <Select
                label="شهر"
                value={city}
                onChange={(v) => setCity(String(v || ''))}
                options={IRAN_CITY_OPTIONS}
                searchable
                labels={selectLabels}
              />
              <Input label="آدرس" value={address} onChange={(e) => setAddress(e.target.value)} />
              <Input label="تلفن" value={phonenumbers} onChange={(e) => setPhonenumbers(e.target.value)} />
              <Button
                size="sm"
                variant="outline"
                disabled={pending}
                onClick={() => onSave?.({ name, address, phonenumbers, city })}
              >
                ذخیره مشخصات
              </Button>
            </div>
          ) : (
            <div className="space-y-2 text-sm text-gray-600">
              <p className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-gray-400" />
                {store.city || '—'} {store.address ? `· ${store.address}` : ''}
              </p>
              <p className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-gray-400" />
                {store.phonenumbers || '—'}
              </p>
            </div>
          )}
        </div>
        <div>
          <p className="mb-3 flex items-center gap-2 text-sm font-medium text-gray-900">
            <Users className="h-4 w-4" />
            تیم فروشگاه
          </p>
          <div className="space-y-2">
            {store.members.length ? (
              store.members.map((member) => (
                <div key={member._id} className="flex items-center justify-between gap-2 rounded-xl bg-gray-50 px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{member.fullName || member.phonenumber}</p>
                    <p className="text-[11px] text-gray-500">
                      {member.phonenumber}
                      {member.status === 'pending' ? ' · در انتظار ورود' : ''}
                    </p>
                  </div>
                  {canEdit ? (
                    <div className="flex shrink-0 items-center gap-2">
                      <Select
                        value={member.role}
                        onChange={(v) => onRole(member._id, String(v) as StoreStaffRole)}
                        options={roleOptions}
                        labels={selectLabels}
                      />
                      <Button size="sm" variant="danger" disabled={pending} onClick={() => onRemove(member._id)}>
                        حذف
                      </Button>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-500">
                      {STORE_STAFF_ROLES[member.role] || member.role}
                    </span>
                  )}
                </div>
              ))
            ) : (
              <p className="text-xs text-gray-500">مدیر یا فروشنده‌ای دعوت نشده است.</p>
            )}
          </div>
          {canInvite ? (
            <div className="mt-4 space-y-2 rounded-xl border border-dashed border-gray-200 p-3">
              <p className="flex items-center gap-1 text-sm font-medium">
                <UserPlus className="h-4 w-4" />
                دعوت با شماره موبایل
              </p>
              <Input
                label="نام"
                value={invite.fullName}
                onChange={(e) => setInvite({ ...invite, fullName: e.target.value })}
              />
              <Input
                label="موبایل"
                value={invite.phonenumber}
                onChange={(e) => setInvite({ ...invite, phonenumber: e.target.value })}
              />
              <Select
                label="نقش"
                value={invite.role}
                onChange={(v) => setInvite({ ...invite, role: String(v) as StoreStaffRole })}
                options={roleOptions}
                labels={selectLabels}
              />
              <Button size="sm" disabled={pending} onClick={onInvite}>
                ارسال دعوت
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
