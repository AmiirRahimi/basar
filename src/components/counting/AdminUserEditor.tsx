'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil } from 'lucide-react';
import { saveAdminUser } from '@/actions/admin';
import { IRAN_CITY_OPTIONS } from '@/lib/iran-cities';
import { SUBSCRIPTION_PLANS, cycleDays, cycleLabel, planById, planPrice, type BillingCycle, type PlanId } from '@/lib/plans';
import { faDate, faNumber, toman } from '@/lib/format';
import { redirectIfUnauthorized } from '@/lib/session-client';
import { Button, FormCard, Input, Modal, Select, toast } from '@/ui';

const selectLabels = {
  search: 'جستجو',
  remove: 'حذف انتخاب',
  noOptionsFound: 'موردی یافت نشد',
};

export type EditableAdminUser = {
  _id: string;
  fullName?: string;
  phonenumber: string;
  email?: string;
  city?: string;
  address?: string;
  active?: boolean;
  remainingDays?: number;
  planName?: string;
  planId?: string;
  billingCycle?: string;
  endDate?: string;
};

const PLAN_OPTIONS = SUBSCRIPTION_PLANS.map((plan) => ({ value: plan.id, label: plan.name }));
const CYCLE_OPTIONS = [
  { value: 'month', label: 'ماهانه' },
  { value: 'year', label: 'سالانه' },
];

function asCycle(value?: string): BillingCycle {
  return value === 'year' ? 'year' : 'month';
}

function asPlanId(value?: string): PlanId {
  return planById(value).id;
}

function emptyForm(user: EditableAdminUser) {
  return {
    fullName: user.fullName || '',
    phonenumber: user.phonenumber || '',
    email: user.email || '',
    city: user.city || '',
    address: user.address || '',
    planId: asPlanId(user.planId),
    billingCycle: asCycle(user.billingCycle),
    remainingDays: String(user.remainingDays || 0),
    price: '0',
  };
}

export function AdminUserEditor({ user, onClose }: { user: EditableAdminUser | null; onClose: () => void }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [form, setForm] = useState(() => (user ? emptyForm(user) : null));

  useEffect(() => {
    setForm(user ? emptyForm(user) : null);
  }, [user]);

  const plan = planById(form?.planId);
  const cycle = asCycle(form?.billingCycle);
  const catalogPrice = planPrice(plan, cycle);

  function set<K extends keyof NonNullable<typeof form>>(key: K, value: string) {
    setForm((current) => (current ? { ...current, [key]: value } : current));
  }

  function save(endSubscription = false) {
    if (!user || !form) return;
    const remainingRaw = String(form.remainingDays ?? '').trim();
    if (!endSubscription && remainingRaw === '') {
      toast.error('روز مانده را وارد کنید');
      return;
    }
    const remainingDays = endSubscription ? 0 : Number(remainingRaw);
    if (!Number.isFinite(remainingDays) || remainingDays < 0) {
      toast.error('روز مانده نامعتبر است');
      return;
    }
    start(async () => {
      const res = await saveAdminUser(user._id, {
        fullName: form.fullName,
        phonenumber: form.phonenumber,
        email: form.email,
        city: form.city,
        address: form.address,
        planId: form.planId,
        billingCycle: form.billingCycle,
        remainingDays,
        price: Number(form.price || 0),
      });
      if (redirectIfUnauthorized(res)) return;
      if (res.ok) {
        toast.success(res.message || 'ذخیره شد');
        onClose();
        router.refresh();
      } else {
        toast.error(res.message || 'ذخیره نشد');
      }
    });
  }

  if (!user || !form) return null;

  return (
    <Modal isOpen onClose={onClose} size="lg" rounded="lg">
      <FormCard>
        <div className="mb-5 space-y-1">
          <h3 className="text-lg font-semibold text-gray-900">ویرایش کاربر و اشتراک</h3>
          <p className="text-sm text-gray-500">
            {user.active
              ? `${user.planName || plan.name} · ${faNumber(user.remainingDays || 0)} روز مانده${user.endDate ? ` · تا ${faDate(user.endDate)}` : ''}`
              : 'الان اشتراک فعال ندارد'}
          </p>
        </div>
        <div className="grid gap-5">
          <section className="grid gap-3 sm:grid-cols-2">
            <p className="sm:col-span-2 text-sm font-medium text-gray-800">مشخصات</p>
            <Input label="نام کامل" value={form.fullName} onChange={(e) => set('fullName', e.target.value)} />
            <Input label="موبایل" dir="ltr" value={form.phonenumber} onChange={(e) => set('phonenumber', e.target.value)} />
            <Input label="ایمیل" dir="ltr" value={form.email} onChange={(e) => set('email', e.target.value)} />
            <Select
              label="شهر"
              value={form.city}
              onChange={(v) => set('city', String(v || ''))}
              options={IRAN_CITY_OPTIONS}
              searchable
              clearable
              labels={selectLabels}
            />
            <div className="sm:col-span-2">
              <Input label="آدرس" value={form.address} onChange={(e) => set('address', e.target.value)} />
            </div>
          </section>

          <section className="grid gap-3 sm:grid-cols-2">
            <p className="sm:col-span-2 text-sm font-medium text-gray-800">اشتراک</p>
            {!user.active ? (
              <p className="sm:col-span-2 text-xs text-gray-500">
                برای فعال‌کردن اشتراک، طرح را انتخاب کنید و روز مانده را بیشتر از صفر بگذارید.
              </p>
            ) : null}
            <Select
              label="طرح"
              value={form.planId}
              onChange={(v) => set('planId', String(v || 'starter'))}
              options={PLAN_OPTIONS}
              labels={selectLabels}
            />
            <Select
              label="دوره"
              value={form.billingCycle}
              onChange={(v) => set('billingCycle', String(v || 'month'))}
              options={CYCLE_OPTIONS}
              labels={selectLabels}
            />
            <Input
              label="روز مانده"
              type="number"
              min={0}
              value={form.remainingDays}
              onChange={(e) => set('remainingDays', e.target.value)}
              hint={`صفر یعنی اشتراک تمام شود. دوره ${cycleLabel(cycle)} معمولاً ${faNumber(cycleDays(cycle))} روز است.`}
            />
            <Input
              label="مبلغ ثبت‌شده"
              type="number"
              min={0}
              value={form.price}
              onChange={(e) => set('price', e.target.value)}
              hint={`قیمت طرح ${toman(catalogPrice)} — برای اعطای ادمین می‌تواند صفر باشد.`}
            />
          </section>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button variant="danger" disabled={pending || !user.active} onClick={() => save(true)}>
              پایان اشتراک
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" disabled={pending} onClick={onClose}>
                انصراف
              </Button>
              <Button disabled={pending} onClick={() => save(false)}>
                ذخیره
              </Button>
            </div>
          </div>
        </div>
      </FormCard>
    </Modal>
  );
}

export function AdminUserEditTrigger({ user }: { user: EditableAdminUser }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm hover:border-gray-300"
      >
        <Pencil className="size-4" />
        ویرایش
      </button>
      <AdminUserEditor user={open ? user : null} onClose={() => setOpen(false)} />
    </>
  );
}
