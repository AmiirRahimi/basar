'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil } from 'lucide-react';
import { saveAdminUser } from '@/actions/admin';
import { IRAN_CITY_OPTIONS } from '@/lib/iran-cities';
import {
  ADMIN_ADD_MONTH_OPTIONS,
  SUBSCRIPTION_PLANS,
  planFromList,
  type PlanId,
} from '@/lib/plans';
import { faDate, faNumber, toman } from '@/lib/format';
import { redirectIfUnauthorized } from '@/lib/session-client';
import { Button, FormCard, Input, Modal, Select, toast } from '@/ui';
import { useWorkspace } from './WorkspaceProvider';

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

function emptyForm(user: EditableAdminUser, planId: PlanId) {
  return {
    fullName: user.fullName || '',
    phonenumber: user.phonenumber || '',
    email: user.email || '',
    city: user.city || '',
    address: user.address || '',
    planId,
    addMonths: '0',
    price: '',
  };
}

export function AdminUserEditor({ user, onClose }: { user: EditableAdminUser | null; onClose: () => void }) {
  const router = useRouter();
  const workspace = useWorkspace();
  const plans = workspace?.planCatalog?.plans?.length ? workspace.planCatalog.plans : SUBSCRIPTION_PLANS;
  const planOptions = plans.map((plan) => ({ value: plan.id, label: plan.name }));
  const [pending, start] = useTransition();
  const [form, setForm] = useState(() =>
    user ? emptyForm(user, planFromList(plans, user.planId).id) : null,
  );

  useEffect(() => {
    setForm(user ? emptyForm(user, planFromList(plans, user.planId).id) : null);
  }, [user]);

  const plan = planFromList(plans, form?.planId);
  const addMonths = Math.max(0, Math.trunc(Number(form?.addMonths || 0)));
  const suggestedPrice = addMonths > 0 ? plan.monthlyPrice * addMonths : 0;

  function set<K extends keyof NonNullable<typeof form>>(key: K, value: string) {
    setForm((current) => (current ? { ...current, [key]: value } : current));
  }

  function save(endSubscription = false) {
    if (!user || !form) return;
    const months = endSubscription ? 0 : Math.trunc(Number(form.addMonths || 0));
    if (!endSubscription && (!Number.isFinite(months) || months < 0)) {
      toast.error('تعداد ماه نامعتبر است');
      return;
    }
    if (!endSubscription && !user.active && months < 1) {
      toast.error('برای فعال‌کردن اشتراک، تعداد ماه را وارد کنید');
      return;
    }
    const priceRaw = String(form.price ?? '').trim();
    const price = priceRaw === '' ? undefined : Number(priceRaw);
    if (price !== undefined && (!Number.isFinite(price) || price < 0)) {
      toast.error('مبلغ نامعتبر است');
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
        addMonths: months,
        endSubscription,
        ...(price !== undefined ? { price } : {}),
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
    <Modal isOpen onClose={onClose} size="lg" rounded="lg" title="ویرایش کاربر و اشتراک">
      <FormCard className="border-0 shadow-none rounded-[inherit]">
        <div className="mb-5 space-y-1">
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
            <p className="sm:col-span-2 text-xs text-gray-500">
              روز مانده قابل ویرایش نیست. می‌توانید ۲، ۳، ۴ یا چند ماه به حساب کاربر اضافه کنید.
            </p>
            <Select
              label="طرح"
              value={form.planId}
              onChange={(v) => set('planId', String(v || 'starter'))}
              options={planOptions}
              labels={selectLabels}
            />
            <Input
              label="مبلغ ثبت‌شده"
              type="number"
              min={0}
              value={form.price}
              onChange={(e) => set('price', e.target.value)}
              hint={
                addMonths > 0
                  ? `پیشنهادی برای ${faNumber(addMonths)} ماه: ${toman(suggestedPrice)}`
                  : `ماهانه از ${toman(plan.monthlyPrice)}`
              }
            />
            <div className="sm:col-span-2 space-y-2">
              <p className="text-xs font-medium text-gray-700">افزودن ماه</p>
              <div className="flex flex-wrap gap-2">
                {ADMIN_ADD_MONTH_OPTIONS.map((months) => (
                  <button
                    key={months}
                    type="button"
                    onClick={() => set('addMonths', String(months))}
                    className={`rounded-xl border px-3 py-1.5 text-sm ${
                      Number(form.addMonths) === months
                        ? 'border-teal-600 bg-teal-50 font-medium text-teal-900'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {faNumber(months)} ماه
                  </button>
                ))}
              </div>
              <Input
                label="چند ماه (دلخواه)"
                type="number"
                min={0}
                value={form.addMonths}
                onChange={(e) => set('addMonths', e.target.value)}
                hint={
                  user.active
                    ? 'صفر یعنی مدت فعلی عوض نشود و فقط طرح یا مبلغ ذخیره شود.'
                    : 'برای کاربر بدون اشتراک حداقل یک ماه لازم است.'
                }
              />
            </div>
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
