'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, MapPin, Phone, Plus, Store, Trash2 } from 'lucide-react';
import {
  createBrand,
  createStore,
  deleteBrand,
  deleteStore,
  updateBrand,
  updateStore,
} from '@/actions/workspace';
import { BRAND_COLORS } from '@/lib/constants';
import { IRAN_CITY_OPTIONS } from '@/lib/iran-cities';
import { asStringList, emptyWarehouse, storePhones, type StoreWarehouse } from '@/lib/store-contacts';
import type { WorkspaceBrand, WorkspaceStore } from '@/lib/types';
import { Button, EmptyState, IconButton, Input, Modal, Select, toast } from '@/ui';
import { redirectIfUnauthorized } from '@/lib/session-client';
import { useWorkspace } from './WorkspaceProvider';
import { useWritable } from './useWritable';
import { PlanCapacityBanner } from './PlanLocked';

const selectLabels = {
  search: 'جستجو',
  remove: 'حذف انتخاب',
  noOptionsFound: 'موردی یافت نشد',
};

type StoreFormState = {
  name: string;
  address: string;
  city: string;
  phones: string[];
  landlines: string[];
  warehouses: StoreWarehouse[];
};

function emptyStoreForm(): StoreFormState {
  return { name: '', address: '', city: '', phones: [''], landlines: [''], warehouses: [] };
}

function formFromStore(store?: WorkspaceStore | null): StoreFormState {
  const phones = storePhones(store);
  const landlines = asStringList(store?.landlines);
  return {
    name: store?.name || '',
    address: store?.address || '',
    city: String(store?.city || ''),
    phones: phones.length ? phones : [''],
    landlines: landlines.length ? landlines : [''],
    warehouses: (store?.warehouses || []).map((row) => emptyWarehouse(row)),
  };
}

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

function StringListField({
  label,
  values,
  onChange,
  placeholder,
}: {
  label: string;
  values: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}) {
  const rows = values.length ? values : [''];
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-gray-800">{label}</p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          icon={<Plus className="h-4 w-4" />}
          onClick={() => onChange([...rows, ''])}
        >
          افزودن
        </Button>
      </div>
      {rows.map((value, index) => (
        <div key={`${label}-${index}`} className="flex min-w-0 items-center gap-2">
          <div className="min-w-0 flex-1">
            <Input
              value={value}
              placeholder={placeholder}
              onChange={(event) => {
                const next = [...rows];
                next[index] = event.target.value;
                onChange(next);
              }}
            />
          </div>
          {rows.length > 1 ? (
            <IconButton
              type="button"
              variant="ghost"
              size="sm"
              aria-label="حذف"
              onClick={() => onChange(rows.filter((_, itemIndex) => itemIndex !== index))}
            >
              <Trash2 className="h-4 w-4" />
            </IconButton>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function StoreFields({
  form,
  onChange,
}: {
  form: StoreFormState;
  onChange: (next: StoreFormState) => void;
}) {
  function patch(partial: Partial<StoreFormState>) {
    onChange({ ...form, ...partial });
  }

  function patchWarehouse(index: number, partial: Partial<StoreWarehouse>) {
    patch({
      warehouses: form.warehouses.map((row, itemIndex) => (itemIndex === index ? { ...row, ...partial } : row)),
    });
  }

  return (
    <div className="grid gap-4">
      <Input label="نام فروشگاه" value={form.name} onChange={(event) => patch({ name: event.target.value })} />
      <Select
        label="شهر"
        value={form.city}
        onChange={(value) => patch({ city: String(value || '') })}
        options={IRAN_CITY_OPTIONS}
        searchable
        labels={selectLabels}
      />
      <Input label="آدرس" value={form.address} onChange={(event) => patch({ address: event.target.value })} />
      <StringListField
        label="شماره موبایل"
        values={form.phones}
        onChange={(phones) => patch({ phones })}
        placeholder="0912..."
      />
      <StringListField
        label="تلفن ثابت"
        values={form.landlines}
        onChange={(landlines) => patch({ landlines })}
        placeholder="021..."
      />
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="flex items-center gap-2 text-sm font-medium text-gray-900">
            <Building2 className="h-4 w-4" />
            انبارها
          </p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            icon={<Plus className="h-4 w-4" />}
            onClick={() => patch({ warehouses: [...form.warehouses, emptyWarehouse()] })}
          >
            انبار
          </Button>
        </div>
        {form.warehouses.length ? (
          form.warehouses.map((warehouse, index) => (
            <div key={warehouse._id} className="space-y-3 rounded-xl border border-gray-200 p-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-gray-800">انبار {index + 1}</p>
                <IconButton
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label="حذف انبار"
                  onClick={() => patch({ warehouses: form.warehouses.filter((_, itemIndex) => itemIndex !== index) })}
                >
                  <Trash2 className="h-4 w-4" />
                </IconButton>
              </div>
              <Input
                label="نام انبار"
                value={warehouse.name}
                onChange={(event) => patchWarehouse(index, { name: event.target.value })}
              />
              <Select
                label="شهر"
                value={String(warehouse.city || '')}
                onChange={(value) => patchWarehouse(index, { city: String(value || '') })}
                options={IRAN_CITY_OPTIONS}
                searchable
                labels={selectLabels}
              />
              <Input
                label="آدرس"
                value={warehouse.address || ''}
                onChange={(event) => patchWarehouse(index, { address: event.target.value })}
              />
              <StringListField
                label="شماره موبایل انبار"
                values={warehouse.phonenumbers?.length ? warehouse.phonenumbers : ['']}
                onChange={(phonenumbers) => patchWarehouse(index, { phonenumbers })}
                placeholder="0912..."
              />
              <StringListField
                label="تلفن ثابت انبار"
                values={warehouse.landlines?.length ? warehouse.landlines : ['']}
                onChange={(landlines) => patchWarehouse(index, { landlines })}
                placeholder="021..."
              />
            </div>
          ))
        ) : (
          <p className="text-xs text-gray-500">هنوز انباری ثبت نشده. با دکمه «انبار» اضافه کنید.</p>
        )}
      </div>
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
  const maxBrands = workspace?.isPlatformAdmin ? 99 : Number(workspace?.subscription?.maxBrands || 0);
  const maxStores = workspace?.isPlatformAdmin ? 99 : Number(workspace?.subscription?.maxStores || 0);
  const canAddBrand = Boolean(writable && isOwner && brands.length < maxBrands);
  const canAddStore = Boolean(writable && isOwner && stores.length < maxStores);
  const [brandId, setBrandId] = useState(workspace?.activeBrandId || brands[0]?._id || '');
  const [storeId, setStoreId] = useState(workspace?.activeStoreId || '');
  const [brandModal, setBrandModal] = useState<'create' | 'edit' | null>(null);
  const [storeModal, setStoreModal] = useState(false);
  const [brandForm, setBrandForm] = useState({ name: '', description: '', color: BRAND_COLORS[0], logo: '' });
  const [storeForm, setStoreForm] = useState<StoreFormState>(emptyStoreForm);

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

  function openStoreModal() {
    if (!canAddStore) {
      toast.error('طرح فعلی فروشگاه بیشتری نمی‌دهد. طرح را ارتقا دهید.');
      return;
    }
    setStoreForm(emptyStoreForm());
    setStoreModal(true);
  }

  function run(action: () => Promise<{ ok: boolean; message?: string; status?: number }>, success?: string) {
    start(async () => {
      const res = await action();
      if (redirectIfUnauthorized(res)) return;
      if (res.ok) {
        toast.success(success || res.message || 'انجام شد');
        setBrandModal(null);
        setStoreModal(false);
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
    if (!mine) return <EmptyState message="فروشگاهی انتخاب نشده" />;
    const canManage = writable && workspace.storeRole === 'admin';
    return (
      <StorePanel
        store={mine}
        brand={brands.find((brand) => brand._id === mine._brandId)}
        pending={pending}
        canEdit={canManage}
        onSave={(payload) => run(() => updateStore(mine._id, payload), 'فروشگاه ذخیره شد')}
      />
    );
  }

  return (
    <>
      <div className="mb-4">
        <PlanCapacityBanner />
      </div>
      <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="h-fit rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
          <div className="mb-2 flex items-center justify-between px-1">
            <p className="text-xs font-medium text-gray-500">برندها</p>
            {canAddBrand ? (
              <IconButton
                type="button"
                variant="ghost"
                size="sm"
                aria-label="برند جدید"
                onClick={() => {
                  setBrandForm({
                    name: '',
                    description: '',
                    color: BRAND_COLORS[brands.length % BRAND_COLORS.length],
                    logo: '',
                  });
                  setBrandModal('create');
                }}
              >
                <Plus className="h-4 w-4" />
              </IconButton>
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
                    {canAddStore ? (
                    <Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={openStoreModal}>
                      فروشگاه
                    </Button>
                    ) : null}
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
              <div className="flex items-center justify-between gap-2 border-b border-gray-100 px-4 py-3">
                <p className="text-sm font-semibold text-gray-900">فروشگاه‌ها</p>
                {canAddStore ? (
                  <Button size="sm" variant="outline" icon={<Plus className="h-4 w-4" />} onClick={openStoreModal}>
                    فروشگاه
                  </Button>
                ) : null}
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
                              {(store.warehouses || []).length
                                ? ` · ${(store.warehouses || []).length} انبار`
                                : ''}
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="p-6">
                  <EmptyState icon={<Store className="h-6 w-6" />} message="این برند هنوز فروشگاهی ندارد." />
                  {canAddStore ? (
                    <div className="mt-3 flex justify-center">
                      <Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={openStoreModal}>
                        فروشگاه
                      </Button>
                    </div>
                  ) : null}
                </div>
              )}
            </section>

            {selectedStore ? (
              <StorePanel
                key={selectedStore._id}
                store={selectedStore}
                brand={selectedBrand}
                pending={pending}
                canEdit={writable}
                onSave={(payload) => run(() => updateStore(selectedStore._id, payload), 'فروشگاه ذخیره شد')}
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

      <Modal
        isOpen={Boolean(brandModal)}
        onClose={() => setBrandModal(null)}
        title={brandModal === 'edit' ? 'ویرایش برند' : 'برند جدید'}
      >
        <div className="p-5" dir="rtl">
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

      <Modal isOpen={storeModal} onClose={() => setStoreModal(false)} size="xl" title="فروشگاه جدید">
        <div className="p-5" dir="rtl">
          <StoreFields form={storeForm} onChange={setStoreForm} />
          <div className="mt-4">
            <Button
              disabled={pending}
              onClick={() => run(() => createStore({ ...storeForm, _brandId: selectedBrand?._id }), 'فروشگاه اضافه شد')}
            >
              ذخیره
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
  canEdit,
  pending,
  onSave,
  onDelete,
}: {
  store?: WorkspaceStore;
  brand?: WorkspaceBrand;
  canEdit?: boolean;
  pending: boolean;
  onSave?: (payload: Record<string, unknown>) => void;
  onDelete?: () => void;
}) {
  const [form, setForm] = useState<StoreFormState>(() => formFromStore(store));

  useEffect(() => {
    setForm(formFromStore(store));
  }, [store]);

  if (!store) return <EmptyState message="فروشگاهی انتخاب نشده" />;

  const phones = storePhones(store);
  const landlines = asStringList(store.landlines);

  return (
    <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-4 py-3 sm:px-5">
        <div>
          <p className="text-xs text-gray-500">{brand?.name}</p>
          <h3 className="text-base font-semibold text-gray-900">{store.name}</h3>
        </div>
        {onDelete ? (
          <Button size="sm" variant="danger" disabled={pending} onClick={onDelete} icon={<Trash2 className="h-4 w-4" />}>
            حذف
          </Button>
        ) : null}
      </div>
      <div className="p-4 sm:p-5">
        <p className="mb-3 text-sm font-medium text-gray-900">مشخصات فروشگاه</p>
        {canEdit ? (
          <div className="grid gap-4">
            <StoreFields form={form} onChange={setForm} />
            <Button disabled={pending} onClick={() => onSave?.(form)}>
              ذخیره
            </Button>
          </div>
        ) : (
          <div className="space-y-3 text-sm text-gray-600">
            <p className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-gray-400" />
              {store.city || '—'} {store.address ? `· ${store.address}` : ''}
            </p>
            <p className="flex items-start gap-2">
              <Phone className="h-4 w-4 shrink-0 text-gray-400" />
              <span>{phones.length ? phones.join('، ') : '—'}</span>
            </p>
            {landlines.length ? <p>ثابت: {landlines.join('، ')}</p> : null}
            {(store.warehouses || []).map((warehouse) => (
              <div key={warehouse._id} className="rounded-xl bg-gray-50 px-3 py-2">
                <p className="font-medium text-gray-800">{warehouse.name}</p>
                <p className="text-xs text-gray-500">
                  {[warehouse.city, warehouse.address].filter(Boolean).join(' · ') || 'آدرس ثبت نشده'}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
