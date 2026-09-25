'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Send, Trash2 } from 'lucide-react';
import { usePageAddButton } from './PageAction';
import { addTeamPerson, removeTeamMember, sendTeamInviteLink, updateTeamMember } from '@/actions/teams';
import { OWNER_PERMISSIONS, PERMISSION_GROUPS, PERMISSION_PRESETS } from '@/lib/permissions';
import { redirectIfUnauthorized } from '@/lib/session-client';
import type { TeamMember } from '@/lib/types';
import { Button, ButtonGroup, Checkbox, DatePicker, HintPopover, IconButton, Input, Modal, toast } from '@/ui';
import { useWorkspace } from './WorkspaceProvider';

const emptyForm = () => ({
  fullName: '',
  phonenumber: '',
  address: '',
  birthdate: '',
  postalCode: '',
  permissions: [...OWNER_PERMISSIONS],
});

export function TeamsPanel() {
  const workspace = useWorkspace();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [modalOpen, setModalOpen] = useState(false);
  const people = workspace?.teamPeople || [];
  const ownedBrandIds = new Set(
    (workspace?.brands || []).filter((brand) => brand._userId === workspace?.user._id).map((brand) => brand._id),
  );
  const brands = (workspace?.brands || []).filter((brand) => ownedBrandIds.has(brand._id) || workspace?.isSuperuser);
  const stores = (workspace?.stores || []).filter(
    (store) => ownedBrandIds.has(store._brandId) || workspace?.isSuperuser,
  );
  const [brandIds, setBrandIds] = useState<string[]>([]);
  const [storeIds, setStoreIds] = useState<string[]>([]);
  const [form, setForm] = useState(emptyForm());

  usePageAddButton({
    label: 'افزودن عضو',
    enabled: Boolean(brands.length),
    onClick: openAdd,
  });

  function openAdd() {
    setForm(emptyForm());
    setBrandIds(workspace?.activeBrandId ? [workspace.activeBrandId] : []);
    setStoreIds(workspace?.activeStoreId ? [workspace.activeStoreId] : []);
    setModalOpen(true);
  }

  function run(action: () => Promise<{ ok: boolean; message?: string }>, success?: string, closeModal = false) {
    start(async () => {
      const res = await action();
      if (redirectIfUnauthorized(res)) return;
      if (res.ok) {
        toast.success(success || res.message || 'انجام شد');
        if (closeModal) {
          setModalOpen(false);
          setForm(emptyForm());
        }
        router.refresh();
      } else {
        toast.error(res.message || 'انجام نشد');
      }
    });
  }

  function toggle(list: string[], id: string) {
    return list.includes(id) ? list.filter((item) => item !== id) : [...list, id];
  }

  if (!brands.length) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-600 shadow-sm">
        ابتدا یک برند بسازید؛ بعد می‌توانید عضو به فروشگاه اضافه کنید.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="divide-y divide-gray-100">
          {people.length ? (
            people.map((person) => (
              <PersonRow
                key={person._id}
                person={person}
                brands={brands}
                stores={stores}
                pending={pending}
                onSave={(payload) => run(() => updateTeamMember(person._id, payload), 'ذخیره شد')}
                onInvite={() => run(() => sendTeamInviteLink(person._id))}
                onRemove={() => run(() => removeTeamMember(person._id), 'حذف شد')}
              />
            ))
          ) : (
            <p className="px-4 py-6 text-sm text-gray-500">هنوز عضوی اضافه نشده است. با دکمه + عضو را به فروشگاه اضافه کنید.</p>
          )}
        </div>
      </section>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} size="xl" rounded="lg" title="افزودن عضو به فروشگاه">
        <div className="space-y-5 p-5" dir="rtl">
          <div className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-3">
            <p className="text-sm font-medium text-amber-950">عضو به کدام فروشگاه یا برند اضافه شود؟</p>
            <p className="mt-1 text-xs leading-5 text-amber-900/80">
              هر موردی که تیک بزنید، این عضو به همان‌جا اضافه می‌شود. اگر برندی را انتخاب کنید به همه فروشگاه‌های آن برند
              دسترسی دارد؛ اگر فقط فروشگاه را تیک بزنید، فقط همان فروشگاه را می‌بیند.
            </p>
          </div>
          <ScopePicker
            brands={brands}
            stores={stores}
            brandIds={brandIds}
            storeIds={storeIds}
            onBrand={(id) => setBrandIds((current) => toggle(current, id))}
            onStore={(id) => setStoreIds((current) => toggle(current, id))}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="نام"
              required
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            />
            <Input
              label="موبایل"
              required
              dir="ltr"
              value={form.phonenumber}
              onChange={(e) => setForm({ ...form, phonenumber: e.target.value })}
            />
            <Input
              label="آدرس"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
            <DatePicker
              label="تاریخ تولد"
              value={form.birthdate || null}
              valueCalendar="persian"
              placeholderText="انتخاب تاریخ تولد"
              onChange={(value) => setForm({ ...form, birthdate: value || '' })}
            />
            <Input
              label="کد پستی"
              dir="ltr"
              value={form.postalCode}
              onChange={(e) => setForm({ ...form, postalCode: e.target.value })}
            />
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-gray-900">دسترسی‌های این عضو</p>
            <PermissionMatrix
              value={form.permissions}
              onChange={(permissions) => setForm({ ...form, permissions })}
            />
          </div>
          <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              انصراف
            </Button>
            <Button
              disabled={pending}
              icon={<Plus className="h-4 w-4" />}
              onClick={() =>
                run(
                  () =>
                    addTeamPerson({
                      ...form,
                      _brandIds: brandIds,
                      _storeIds: storeIds,
                    }),
                  'عضو اضافه شد',
                  true,
                )
              }
            >
              افزودن عضو
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function PersonRow({
  person,
  brands,
  stores,
  pending,
  onSave,
  onInvite,
  onRemove,
}: {
  person: TeamMember;
  brands: { _id: string; name?: string }[];
  stores: { _id: string; name?: string }[];
  pending: boolean;
  onSave: (payload: Record<string, unknown>) => void;
  onInvite: () => void;
  onRemove: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState(person.fullName || '');
  const [address, setAddress] = useState(person.address || '');
  const [birthdate, setBirthdate] = useState(person.birthdate || '');
  const [postalCode, setPostalCode] = useState(person.postalCode || '');
  const [permissions, setPermissions] = useState(person.permissions);
  const scope = [
    ...brands.filter((brand) => person._brandIds.includes(brand._id)).map((brand) => brand.name || 'برند'),
    ...stores.filter((store) => person._storeIds.includes(store._id)).map((store) => store.name || 'فروشگاه'),
  ].join(' · ');
  const status =
    person.status === 'accepted' ? 'پذیرفته' : person.status === 'declined' ? 'رد کرده' : 'در انتظار پاسخ';

  return (
    <div className="px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <button type="button" className="min-w-0 text-right" onClick={() => setOpen((value) => !value)}>
          <p className="text-sm font-medium text-gray-900">{person.fullName || person.phonenumber}</p>
          <p className="text-[11px] text-gray-500" dir="ltr">
            {person.phonenumber}
          </p>
          <p className="mt-1 text-[11px] text-gray-500">
            عضو {scope || 'بدون فروشگاه'} · {status}
          </p>
        </button>
        <ButtonGroup attached dir="rtl" className="flex-nowrap whitespace-nowrap">
          <span className="inline-flex">
            <HintPopover content="ارسال لینک دعوت">
              <span className="inline-flex">
                <IconButton
                  type="button"
                  size="sm"
                  variant="outline"
                  aria-label="ارسال لینک دعوت"
                  disabled={pending}
                  className="group-action h-8 w-8 shrink-0 border-gray-200/80 text-gray-600 hover:border-teal-500/50 hover:bg-teal-50 hover:text-teal-700"
                  onClick={onInvite}
                >
                  <Send className="size-3.5" />
                </IconButton>
              </span>
            </HintPopover>
          </span>
          <span className="inline-flex">
            <HintPopover content="حذف عضو">
              <span className="inline-flex">
                <IconButton
                  type="button"
                  size="sm"
                  variant="outline"
                  aria-label="حذف عضو"
                  disabled={pending}
                  className="group-action h-8 w-8 shrink-0 border-gray-200/80 text-gray-600 hover:border-red-500/50 hover:bg-red-50 hover:text-red-600"
                  onClick={onRemove}
                >
                  <Trash2 className="size-3.5" />
                </IconButton>
              </span>
            </HintPopover>
          </span>
        </ButtonGroup>
      </div>
      {person.inviteLink ? (
        <p className="mt-2 break-all text-[11px] text-gray-500" dir="ltr">
          {person.inviteLink}
        </p>
      ) : null}
      {open ? (
        <div className="mt-3 space-y-3 rounded-xl bg-gray-50 p-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="نام" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            <Input label="آدرس" value={address} onChange={(e) => setAddress(e.target.value)} />
            <DatePicker
              label="تاریخ تولد"
              value={birthdate || null}
              valueCalendar="persian"
              placeholderText="انتخاب تاریخ تولد"
              onChange={(value) => setBirthdate(value || '')}
            />
            <Input label="کد پستی" dir="ltr" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} />
          </div>
          <PermissionMatrix value={permissions} onChange={setPermissions} />
          <Button
            size="sm"
            disabled={pending}
            onClick={() => onSave({ fullName, address, birthdate, postalCode, permissions })}
          >
            ذخیره
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function ScopePicker({
  brands,
  stores,
  brandIds,
  storeIds,
  onBrand,
  onStore,
}: {
  brands: { _id: string; name?: string }[];
  stores: { _id: string; name?: string; _brandId: string }[];
  brandIds: string[];
  storeIds: string[];
  onBrand: (id: string) => void;
  onStore: (id: string) => void;
}) {
  return (
    <div className="space-y-3">
      {brands.map((brand) => {
        const brandStores = stores.filter((store) => store._brandId === brand._id);
        return (
          <div key={brand._id} className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-3">
            <Checkbox
              checked={brandIds.includes(brand._id)}
              onChange={() => onBrand(brand._id)}
              label={`کل برند «${brand.name || 'برند'}»`}
            />
            {brandStores.length ? (
              <div className="mt-2 ms-6 space-y-2 border-s border-gray-200 ps-3">
                <p className="text-[11px] text-gray-500">یا فقط این فروشگاه‌ها</p>
                {brandStores.map((store) => (
                  <Checkbox
                    key={store._id}
                    checked={storeIds.includes(store._id)}
                    onChange={() => onStore(store._id)}
                    label={store.name || 'فروشگاه'}
                  />
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function PermissionMatrix({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const selected = useMemo(() => new Set(value), [value]);

  function toggle(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange([...next]);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {PERMISSION_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => onChange([...preset.permissions])}
            className={`rounded-full px-2.5 py-1 text-xs ${
              preset.permissions.length === value.length && preset.permissions.every((id) => selected.has(id))
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {preset.label}
          </button>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {PERMISSION_GROUPS.map((group) => (
          <div key={group.id} className="rounded-xl bg-gray-50 px-3 py-2">
            <p className="mb-2 text-xs font-semibold text-gray-700">{group.label}</p>
            <div className="space-y-2">
              {group.items.map((item) => (
                <Checkbox
                  key={item.id}
                  checked={selected.has(item.id)}
                  onChange={() => toggle(item.id)}
                  label={item.label}
                  className="[&>label>span]:text-xs [&>label>span]:font-normal cursor-pointer"
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
