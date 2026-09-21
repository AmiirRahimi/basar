'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Handshake, Pencil, Trash2 } from 'lucide-react';
import { createPartner, deletePartner, updatePartner } from '@/actions/workspace';
import { partnerAppliesToStore, partnerScopeLabel, partnersForStore, sharePercentTotal } from '@/lib/partners';
import { faNumber } from '@/lib/format';
import { redirectIfUnauthorized } from '@/lib/session-client';
import type { Partner, WorkspaceBrand, WorkspaceStore } from '@/lib/types';
import { Button, Input, Modal, MultiSelect, toast } from '@/ui';
import { AddPlusButton } from './PageAction';
import { useWorkspace } from './WorkspaceProvider';
import { useWritable } from './useWritable';
import { PlanCapacityBanner, PlanLocked } from './PlanLocked';

const selectLabels = {
  search: 'جستجو',
  remove: 'حذف انتخاب',
  removeAll: 'حذف همه',
  noOptionsFound: 'موردی یافت نشد',
};

const emptyForm = {
  name: '',
  phonenumber: '',
  sharePercent: '0',
  _brandIds: [] as string[],
  _storeIds: [] as string[],
};

export function PartnersPanel({
  brands,
  stores,
  selectedBrand,
  selectedStore,
  partners,
  canManageBrand,
  canManageStore,
}: {
  brands: WorkspaceBrand[];
  stores: WorkspaceStore[];
  selectedBrand?: WorkspaceBrand;
  selectedStore?: WorkspaceStore;
  partners: Partner[];
  canManageBrand?: boolean;
  canManageStore?: boolean;
}) {
  const router = useRouter();
  const workspace = useWorkspace();
  const [pending, start] = useTransition();
  const writable = useWritable();
  const [modal, setModal] = useState<'create' | Partner | null>(null);
  const [form, setForm] = useState(emptyForm);
  const allowPartners = Boolean(workspace?.isPlatformAdmin || workspace?.subscription?.allowPartners);
  const canManage = Boolean((canManageBrand || canManageStore) && writable && allowPartners);
  const showPlanLock = Boolean(writable && !allowPartners);

  const storePartners = useMemo(
    () =>
      selectedStore
        ? partnersForStore(partners, selectedStore._id, selectedStore._brandId || selectedBrand?._id)
        : partners,
    [partners, selectedStore, selectedBrand?._id],
  );
  const usedPercent = Math.min(100, sharePercentTotal(storePartners));
  const ownerPercent = Math.max(0, 100 - usedPercent);

  const brandOptions = (canManageBrand ? brands : brands.filter((brand) => brand._id === selectedBrand?._id)).map(
    (brand) => ({ value: brand._id, label: brand.name }),
  );
  const storeOptions = useMemo(() => {
    const allowedStores = canManageBrand ? stores : stores.filter((store) => store._id === selectedStore?._id);
    const selectedBrands = new Set(form._brandIds);
    return allowedStores
      .filter((store) => selectedBrands.has(store._brandId))
      .map((store) => {
        const brand = brands.find((row) => row._id === store._brandId);
        return { value: store._id, label: [brand?.name, store.name].filter(Boolean).join(' / ') };
      });
  }, [brands, stores, form._brandIds, canManageBrand, selectedStore?._id]);

  function setBrandIds(next: string[]) {
    const allowed = new Set(next);
    setForm((s) => ({
      ...s,
      _brandIds: next,
      _storeIds: s._storeIds.filter((id) => {
        const store = stores.find((row) => row._id === id);
        return store ? allowed.has(store._brandId) : false;
      }),
    }));
  }

  function openCreate() {
    const brandId = selectedBrand?._id || '';
    setForm({
      ...emptyForm,
      _brandIds: brandId ? [brandId] : [],
      _storeIds: canManageBrand ? [] : selectedStore?._id ? [selectedStore._id] : [],
    });
    setModal('create');
  }

  function openEdit(row: Partner) {
    const storeIds = row._storeIds || [];
    const brandIds = row.allStores
      ? brands.map((brand) => brand._id)
      : row._brandIds?.length
        ? row._brandIds
        : stores.filter((store) => storeIds.includes(store._id)).map((store) => store._brandId);
    setForm({
      name: row.name,
      phonenumber: row.phonenumber || '',
      sharePercent: String(row.sharePercent || 0),
      _brandIds: [...new Set(brandIds.filter(Boolean))],
      _storeIds: storeIds,
    });
    setModal(row);
  }

  function canEdit(row: Partner) {
    if (!writable) return false;
    if (canManageBrand) return true;
    if (!canManageStore || !selectedStore) return false;
    if (row.allStores || (row._brandIds || []).length) return false;
    const ids = row._storeIds || [];
    return ids.length === 1 && ids[0] === selectedStore._id;
  }

  function run(action: () => Promise<{ ok: boolean; message?: string; status?: number }>, success?: string) {
    start(async () => {
      const res = await action();
      if (redirectIfUnauthorized(res)) return;
      if (res.ok) {
        toast.success(success || res.message || 'انجام شد');
        setModal(null);
        router.refresh();
      } else {
        toast.error(res.message || 'انجام نشد');
      }
    });
  }

  function payloadFromForm() {
    const allStores = Boolean(canManageBrand && form._brandIds.length === brands.length && brands.length && !form._storeIds.length);
    return {
      name: form.name,
      phonenumber: form.phonenumber,
      sharePercent: Number(form.sharePercent || 0),
      allStores,
      _brandIds: form._brandIds,
      _storeIds: form._storeIds,
    };
  }

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Handshake className="h-5 w-5 text-teal-700" />
            شرکای درآمد
          </h2>
          <p className="mt-1 max-w-2xl text-xs text-muted-foreground">
            اول برندها را انتخاب کنید؛ بعد فروشگاه‌های همان برندها. اگر فروشگاهی انتخاب نشود، سهم روی همه فروشگاه‌های
            برندهای انتخاب‌شده اعمال می‌شود.
          </p>
        </div>
        {canManage ? <AddPlusButton label="ثبت شریک" onClick={openCreate} /> : null}
      </div>

      <div className="mb-4">
        <PlanCapacityBanner />
      </div>

      {showPlanLock ? (
        <PlanLocked
          title="شریک درآمد"
          what="شریک را روی برند یا فروشگاه می‌گذاری و سهم سود هر نفر جدا دیده می‌شود. در طرح پایه این کار نیست؛ فاکتور، البسه و پارچه همان‌جا می‌ماند."
          planHint="شرکا یا ویترین"
        />
      ) : (
        <>
      {selectedStore ? (
        <p className="mb-4 rounded-2xl bg-teal-50 px-4 py-3 text-sm text-teal-900">
          در «{selectedStore.name}» {faNumber(usedPercent)}٪ سهم شرکاست و {faNumber(ownerPercent)}٪ برای صاحب فروشگاه
          می‌ماند.
        </p>
      ) : null}

      {partners.length ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {partners.map((row) => {
            const applies = selectedStore
              ? partnerAppliesToStore(row, selectedStore._id, selectedStore._brandId || selectedBrand?._id)
              : true;
            return (
              <div
                key={row._id}
                className={`rounded-2xl border p-4 ${applies ? 'border-gray-200 bg-gray-50' : 'border-dashed border-gray-200 bg-white text-muted-foreground'}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-gray-900">{row.name}</p>
                    <p className="mt-1 text-xs">
                      {partnerScopeLabel(row, brands, stores)}
                      {row.phonenumber ? ` · ${row.phonenumber}` : ''}
                    </p>
                  </div>
                  <span className="rounded-full bg-white px-2 py-0.5 text-sm font-medium text-teal-800">
                    {faNumber(row.sharePercent)}٪
                  </span>
                </div>
                {canEdit(row) ? (
                  <div className="mt-3 flex gap-2">
                    <Button size="sm" variant="outline" disabled={pending} onClick={() => openEdit(row)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      disabled={pending}
                      onClick={() => run(() => deletePartner(row._id), 'شریک حذف شد')}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">هنوز شریکی ثبت نشده است.</p>
      )}
        </>
      )}

      <Modal isOpen={Boolean(modal)} onClose={() => setModal(null)} title={modal === 'create' ? 'شریک جدید' : 'ویرایش شریک'}>
        <div className="p-5" dir="rtl">
          <div className="grid gap-3">
            <Input label="نام شریک" value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} />
            <Input
              label="موبایل (اختیاری)"
              value={form.phonenumber}
              onChange={(e) => setForm((s) => ({ ...s, phonenumber: e.target.value }))}
            />
            <Input
              label="درصد سهم از فروش بدون شریک لباس"
              type="number"
              value={form.sharePercent}
              onChange={(e) => setForm((s) => ({ ...s, sharePercent: e.target.value }))}
            />
            <MultiSelect
              label="برندها"
              value={form._brandIds}
              onChange={(v) => setBrandIds(v.map(String))}
              options={brandOptions}
              searchable
              labels={selectLabels}
            />
            <MultiSelect
              label="فروشگاه‌ها"
              value={form._storeIds}
              onChange={(v) => setForm((s) => ({ ...s, _storeIds: v.map(String) }))}
              options={storeOptions}
              searchable
              disabled={!form._brandIds.length}
              labels={selectLabels}
            />
            <p className="text-xs text-muted-foreground">
              فروشگاه‌ها فقط از برندهای انتخاب‌شده نشان داده می‌شوند. اگر فروشگاهی نگذارید، سهم روی همه فروشگاه‌های آن
              برندهاست.
            </p>
            <Button
              disabled={pending}
              onClick={() =>
                run(
                  () =>
                    modal === 'create' || !modal
                      ? createPartner(payloadFromForm())
                      : updatePartner(modal._id, payloadFromForm()),
                  modal === 'create' ? 'شریک اضافه شد' : 'شریک ویرایش شد',
                )
              }
            >
              ذخیره
            </Button>
          </div>
        </div>
      </Modal>
    </section>
  );
}
