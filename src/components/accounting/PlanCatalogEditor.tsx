'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2 } from 'lucide-react';
import { resetPlanCatalog, savePlanCatalog } from '@/actions/admin';
import {
  MAX_SUBSCRIPTION_PLANS,
  nextPlanId,
  SUBSCRIPTION_PLANS,
  type SubscriptionPlan,
} from '@/lib/plans';
import { faNumber, toman } from '@/lib/format';
import { redirectIfUnauthorized } from '@/lib/session-client';
import { Button, Checkbox, FormCard, Input, Switch, toast } from '@/ui';

type Catalog = {
  annualDiscount: number;
  plans: SubscriptionPlan[];
};

const FLAGS: { key: keyof SubscriptionPlan; label: string }[] = [
  { key: 'allowPartners', label: 'شریک درآمد' },
  { key: 'allowClothImages', label: 'تصویر محصول' },
  { key: 'allowProductShare', label: 'ویترین و لینک محصول' },
  { key: 'allowShareSms', label: 'ارسال لینک با پیامک' },
  { key: 'notifyCustomersOnNewProduct', label: 'پیامک محصول جدید' },
  { key: 'highlight', label: 'طرح پیشنهادی' },
];

function cloneCatalog(catalog: Catalog): Catalog {
  return {
    annualDiscount: catalog.annualDiscount,
    plans: catalog.plans.map((plan) => ({
      ...plan,
      features: plan.features.map((row) => ({ ...row })),
    })),
  };
}

export function PlanCatalogEditor({ initial }: { initial: Catalog }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [form, setForm] = useState(() => cloneCatalog(initial));
  const discountPercent = Math.round(form.annualDiscount * 1000) / 10;

  const preview = useMemo(
    () => form.plans.map((plan) => ({ id: plan.id, name: plan.name, monthlyPrice: plan.monthlyPrice })),
    [form.plans],
  );

  function setDiscountPercent(value: string) {
    const n = Number(value);
    setForm((current) => ({
      ...current,
      annualDiscount: Number.isFinite(n) ? Math.min(90, Math.max(0, n)) / 100 : current.annualDiscount,
    }));
  }

  function patchPlan(id: string, patch: Partial<SubscriptionPlan>) {
    setForm((current) => ({
      ...current,
      plans: current.plans.map((plan) => (plan.id === id ? { ...plan, ...patch } : plan)),
    }));
  }

  function patchFeature(planId: string, index: number, patch: { label?: string; included?: boolean }) {
    setForm((current) => ({
      ...current,
      plans: current.plans.map((plan) => {
        if (plan.id !== planId) return plan;
        const features = plan.features.map((row, i) => (i === index ? { ...row, ...patch } : row));
        return { ...plan, features };
      }),
    }));
  }

  function addFeature(planId: string) {
    setForm((current) => ({
      ...current,
      plans: current.plans.map((plan) =>
        plan.id === planId && plan.features.length < 16
          ? { ...plan, features: [...plan.features, { label: '', included: true }] }
          : plan,
      ),
    }));
  }

  function removeFeature(planId: string, index: number) {
    setForm((current) => ({
      ...current,
      plans: current.plans.map((plan) =>
        plan.id === planId ? { ...plan, features: plan.features.filter((_, i) => i !== index) } : plan,
      ),
    }));
  }

  function addPlan() {
    setForm((current) => {
      if (current.plans.length >= MAX_SUBSCRIPTION_PLANS) return current;
      const starter = SUBSCRIPTION_PLANS[0];
      const id = nextPlanId(current.plans);
      return {
        ...current,
        plans: [
          ...current.plans,
          {
            ...starter,
            id,
            name: 'طرح جدید',
            blurb: '',
            monthlyPrice: starter.monthlyPrice,
            maxBrands: 1,
            maxStores: 1,
            allowPartners: false,
            allowClothImages: false,
            allowProductShare: false,
            allowShareSms: false,
            notifyCustomersOnNewProduct: false,
            highlight: false,
            features: starter.features.map((row) => ({ ...row })),
          },
        ],
      };
    });
  }

  function removePlan(id: string) {
    setForm((current) => {
      if (current.plans.length <= 1) return current;
      return { ...current, plans: current.plans.filter((plan) => plan.id !== id) };
    });
  }

  function save() {
    start(async () => {
      const res = await savePlanCatalog({
        annualDiscount: form.annualDiscount,
        plans: form.plans,
      });
      if (redirectIfUnauthorized(res)) return;
      if (res.ok && res.data) {
        setForm(cloneCatalog(res.data as Catalog));
        toast.success(res.message || 'ذخیره شد');
        router.refresh();
      } else {
        toast.error(res.message || 'ذخیره نشد');
      }
    });
  }

  function restore() {
    start(async () => {
      const res = await resetPlanCatalog();
      if (redirectIfUnauthorized(res)) return;
      if (res.ok && res.data) {
        setForm(cloneCatalog(res.data as Catalog));
        toast.success(res.message || 'برگشت به پیش‌فرض');
        router.refresh();
      } else {
        toast.error(res.message || 'برنگشت');
      }
    });
  }

  return (
    <div className="space-y-5">
      <FormCard>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-xl space-y-1">
            <p className="text-sm font-medium text-gray-900">تخفیف سالانه</p>
            <p className="text-xs text-gray-500">
              تعداد کارت‌های اشتراک همان تعداد طرح‌هایی است که اینجا می‌سازید. شناسه طرح‌های قبلی را عوض نکنید.
            </p>
          </div>
          <div className="w-40">
          <Input
            label="درصد تخفیف سالانه"
            type="number"
            min={0}
            max={90}
            dir="ltr"
            value={String(discountPercent)}
            onChange={(e) => setDiscountPercent(e.target.value)}
            hint={`الان ${faNumber(discountPercent)}٪`}
          />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-xs text-gray-500">
          {preview.map((plan) => (
            <span key={plan.id} className="rounded-full bg-gray-100 px-2.5 py-1">
              {plan.name} · {toman(plan.monthlyPrice)}
            </span>
          ))}
        </div>
      </FormCard>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-gray-800">طرح‌ها ({form.plans.length})</p>
        <Button
          variant="outline"
          size="sm"
          disabled={form.plans.length >= MAX_SUBSCRIPTION_PLANS}
          onClick={addPlan}
          icon={<Plus className="h-4 w-4" />}
        >
          طرح
        </Button>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {form.plans.map((plan) => {
          const base = SUBSCRIPTION_PLANS.find((row) => row.id === plan.id);
          return (
            <FormCard key={plan.id}>
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-gray-400">{plan.id}</p>
                  <p className="text-base font-semibold text-gray-900">{plan.name || base?.name}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    label="پیشنهادی"
                    checked={Boolean(plan.highlight)}
                    onChange={(checked) => patchPlan(plan.id, { highlight: checked })}
                  />
                  {form.plans.length > 1 ? (
                    <button
                      type="button"
                      className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-red-600"
                      onClick={() => removePlan(plan.id)}
                      aria-label="حذف طرح"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  label="نام طرح"
                  value={plan.name}
                  onChange={(e) => patchPlan(plan.id, { name: e.target.value })}
                />
                <Input
                  label="قیمت ماهانه (تومان)"
                  type="number"
                  min={0}
                  dir="ltr"
                  value={String(plan.monthlyPrice)}
                  onChange={(e) => patchPlan(plan.id, { monthlyPrice: Number(e.target.value) || 0 })}
                  hint={toman(plan.monthlyPrice)}
                />
                <div className="sm:col-span-2">
                  <Input
                    label="توضیح کوتاه"
                    value={plan.blurb}
                    onChange={(e) => patchPlan(plan.id, { blurb: e.target.value })}
                  />
                </div>
                <Input
                  label="سقف برند"
                  type="number"
                  min={1}
                  max={99}
                  dir="ltr"
                  value={String(plan.maxBrands)}
                  onChange={(e) => patchPlan(plan.id, { maxBrands: Number(e.target.value) || 1 })}
                  hint="۹۹ یعنی نامحدود"
                />
                <Input
                  label="سقف فروشگاه"
                  type="number"
                  min={1}
                  max={99}
                  dir="ltr"
                  value={String(plan.maxStores)}
                  onChange={(e) => patchPlan(plan.id, { maxStores: Number(e.target.value) || 1 })}
                  hint="۹۹ یعنی نامحدود"
                />
              </div>
              <div className="mt-4 grid gap-2">
                {FLAGS.filter((row) => row.key !== 'highlight').map((row) => (
                  <Checkbox
                    key={row.key}
                    checked={Boolean(plan[row.key])}
                    onChange={(e) => patchPlan(plan.id, { [row.key]: e.target.checked } as Partial<SubscriptionPlan>)}
                    label={row.label}
                  />
                ))}
              </div>
              <div className="mt-5 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-800">فهرست امکانات</p>
                  <Button variant="outline" size="sm" disabled={plan.features.length >= 16} onClick={() => addFeature(plan.id)}>
                    <Plus className="h-4 w-4" />
                    مورد
                  </Button>
                </div>
                {plan.features.map((feature, index) => (
                  <div key={`${plan.id}-${index}`} className="flex items-center gap-2">
                    <Checkbox
                      checked={feature.included}
                      onChange={(e) => patchFeature(plan.id, index, { included: e.target.checked })}
                      label="دارد"
                    />
                    <div className="min-w-0 flex-1">
                      <Input
                        value={feature.label}
                        onChange={(e) => patchFeature(plan.id, index, { label: e.target.value })}
                      />
                    </div>
                    <button
                      type="button"
                      className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-red-600"
                      onClick={() => removeFeature(plan.id, index)}
                      aria-label="حذف مورد"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </FormCard>
          );
        })}
      </div>

      <div className="flex flex-wrap justify-between gap-2">
        <Button variant="outline" disabled={pending} onClick={restore}>
          بازگشت به پیش‌فرض
        </Button>
        <Button disabled={pending} onClick={save}>
          ذخیره طرح‌ها
        </Button>
      </div>
    </div>
  );
}
