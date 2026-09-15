'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2,
  MapPin,
  Phone,
  Plus,
  Store,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react';
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

function BrandMark({ brand, size = 'md' }: { brand: Pick<WorkspaceBrand, 'name' | 'logo' | 'color'>; size?: 'sm' | 'md' }) {
  const dim = size === 'sm' ? 'h-10 w-10 text-base' : 'h-14 w-14 text-xl';
  if (brand.logo) {
    return (
      <img src={brand.logo} alt="" className={`rounded-2xl object-cover ${dim}`} />
    );
  }
  return (
    <div
      className={`flex items-center justify-center rounded-2xl font-semibold text-white shadow-inner ${dim}`}
      style={{ background: brand.color || BRAND_COLORS[0] }}
    >
      {initials(brand.name)}
    </div>
  );
}

function MemberStack({ members }: { members: WorkspaceMember[] }) {
  if (!members.length) {
    return <span className="text-xs text-muted-foreground">هنوز تیمی ندارد</span>;
  }
  return (
    <div className="flex items-center">
      {members.slice(0, 4).map((member, index) => (
        <span
          key={member._id}
          className="-mr-2 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white text-[11px] font-medium text-white first:mr-0"
          style={{ background: BRAND_COLORS[index % BRAND_COLORS.length], zIndex: 4 - index }}
          title={member.fullName || member.phonenumber}
        >
          {initials(member.fullName || member.phonenumber)}
        </span>
      ))}
      {members.length > 4 ? (
        <span className="mr-1 text-xs text-muted-foreground">+{members.length - 4}</span>
      ) : null}
    </div>
  );
}

export function BrandStoreWorkspace() {
  const workspace = useWorkspace();
  const router = useRouter();
  const [pending, start] = useTransition();
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
        canInvite
        pending={pending}
        invite={invite}
        setInvite={setInvite}
        onInvite={() =>
          run(() => inviteStoreMember({ ...invite, _storeId: mine?._id }), 'دعوت ثبت شد')
        }
        onRole={(id, role) => run(() => updateStoreMember(id, { role }))}
        onRemove={(id) => run(() => removeStoreMember(id), 'حذف شد')}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">عمده‌فروشی چندبرند — فروشگاه‌ها موجودی لباس را به‌صورت مشترک می‌فروشند.</p>
        </div>
        <Button
          onClick={() => {
            setBrandForm({ name: '', description: '', color: BRAND_COLORS[brands.length % BRAND_COLORS.length], logo: '' });
            setBrandModal('create');
          }}
        >
          <Plus className="ml-1 h-4 w-4" />
          برند جدید
        </Button>
      </div>

      {brands.length ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
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
                className={`rounded-3xl border p-4 text-right transition ${
                  active ? 'border-transparent text-white shadow-lg' : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
                style={active ? { background: brand.color || BRAND_COLORS[0] } : undefined}
              >
                <div className="flex items-start gap-3">
                  <BrandMark brand={brand} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-lg font-semibold">{brand.name}</p>
                    <p className={`mt-1 text-xs ${active ? 'text-white/80' : 'text-muted-foreground'}`}>
                      {brand.storeCount} فروشگاه · {brand.memberCount} همکار
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <EmptyState icon={<Building2 className="h-7 w-7" />} message="هنوز برندی نساخته‌اید. اولین برند عمده را بسازید." />
      )}

      {selectedBrand ? (
        <section className="rounded-3xl border border-gray-200 bg-white p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <BrandMark brand={selectedBrand} size="sm" />
              <div>
                <h2 className="text-lg font-semibold">{selectedBrand.name}</h2>
                <p className="text-xs text-muted-foreground">{selectedBrand.description || 'فروشگاه‌های این برند لباس را به‌صورت عمده می‌فروشند.'}</p>
              </div>
            </div>
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
                variant="outline"
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
                  حذف برند
                </Button>
              ) : null}
            </div>
          </div>

          {brandStores.length ? (
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.9fr)]">
              <div className="grid gap-3 sm:grid-cols-2">
                {brandStores.map((store) => {
                  const active = selectedStore?._id === store._id;
                  return (
                    <button
                      key={store._id}
                      type="button"
                      onClick={() => setStoreId(store._id)}
                      className={`rounded-2xl border p-4 text-right transition ${
                        active ? 'border-primary bg-primary/5 shadow-sm' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="mb-3 flex items-start justify-between gap-2">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gray-900 text-white">
                          <Store className="h-5 w-5" />
                        </div>
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800">عمده</span>
                      </div>
                      <p className="font-semibold">{store.name}</p>
                      <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        {store.city || 'شهر ثبت نشده'}
                      </p>
                      <div className="mt-3">
                        <MemberStack members={store.members} />
                      </div>
                    </button>
                  );
                })}
              </div>
              <StorePanel
                key={selectedStore?._id}
                store={selectedStore}
                brand={selectedBrand}
                canInvite
                canEdit
                pending={pending}
                invite={invite}
                setInvite={setInvite}
                onInvite={() =>
                  run(() => inviteStoreMember({ ...invite, _storeId: selectedStore?._id }), 'دعوت ثبت شد')
                }
                onSave={(payload) =>
                  selectedStore ? run(() => updateStore(selectedStore._id, payload), 'فروشگاه ذخیره شد') : undefined
                }
                onRole={(id, role) => run(() => updateStoreMember(id, { role }))}
                onRemove={(id) => run(() => removeStoreMember(id), 'حذف شد')}
                onDelete={
                  brandStores.length > 1 && selectedStore
                    ? () => run(() => deleteStore(selectedStore._id), 'فروشگاه حذف شد')
                    : undefined
                }
              />
            </div>
          ) : (
            <EmptyState icon={<Store className="h-7 w-7" />} message="این برند هنوز فروشگاهی ندارد." />
          )}
        </section>
      ) : null}

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
              onClick={() =>
                run(() => createStore({ ...storeForm, _brandId: selectedBrand?._id }), 'فروشگاه اضافه شد')
              }
            >
              افزودن فروشگاه
            </Button>
          </div>
        </div>
      </Modal>
    </div>
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
    <aside className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
      <div className="mb-4 flex items-start justify-between gap-2">
        <div>
          <p className="text-xs text-muted-foreground">{brand?.name}</p>
          <h3 className="text-lg font-semibold">{store.name}</h3>
        </div>
        {onDelete ? (
          <Button size="sm" variant="danger" disabled={pending} onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
      {canEdit ? (
        <div className="mb-4 grid gap-2">
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
        <div className="mb-4 space-y-1 text-sm text-muted-foreground">
          <p className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            {store.city || '—'} {store.address ? `· ${store.address}` : ''}
          </p>
          <p className="flex items-center gap-1">
            <Phone className="h-3.5 w-3.5" />
            {store.phonenumbers || '—'}
          </p>
        </div>
      )}

      <div className="mb-3 flex items-center gap-2 text-sm font-medium">
        <Users className="h-4 w-4" />
        تیم فروشگاه
      </div>
      <div className="space-y-2">
        {store.members.length ? (
          store.members.map((member) => (
            <div key={member._id} className="flex items-center justify-between rounded-xl bg-white px-3 py-2">
              <div>
                <p className="text-sm font-medium">{member.fullName || member.phonenumber}</p>
                <p className="text-[11px] text-muted-foreground">
                  {member.phonenumber}
                  {member.status === 'pending' ? ' · در انتظار ورود' : ''}
                </p>
              </div>
              <div className="flex items-center gap-2">
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
            </div>
          ))
        ) : (
          <p className="text-xs text-muted-foreground">مدیر یا فروشنده‌ای دعوت نشده است.</p>
        )}
      </div>

      {canInvite ? (
        <div className="mt-4 space-y-2 rounded-xl border border-dashed border-gray-300 p-3">
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
    </aside>
  );
}
