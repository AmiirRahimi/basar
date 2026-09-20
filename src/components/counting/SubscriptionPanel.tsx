'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Check, X } from 'lucide-react';
import { activateSubscription, previewSubscriptionDiscount } from '@/actions/auth';
import {
  ANNUAL_DISCOUNT,
  MONTHLY_BASE_TOMAN,
  SUBSCRIPTION_PLANS,
  cycleLabel,
  planById,
  planPrice,
  type BillingCycle,
  type PlanId,
} from '@/lib/plans';
import { faDate, faNumber, toman } from '@/lib/format';
import { redirectIfUnauthorized } from '@/lib/session-client';
import type { Workspace } from '@/lib/types';
import { Button, FormCard, Input, Modal, toast } from '@/ui';
import { Price, PriceSection } from './Price';

type DiscountPreview = {
  price: number;
  originalPrice: number;
  code: string;
  percent: number;
};

export function SubscriptionPanel({
  subscription,
  purchases = [],
}: {
  subscription?: Workspace['subscription'] & { active?: boolean };
  purchases?: Workspace['purchases'];
}) {
  const router = useRouter();
  const [cycle, setCycle] = useState<BillingCycle>('month');
  const [selectedPlanId, setSelectedPlanId] = useState<PlanId | ''>('');
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [discountCode, setDiscountCode] = useState('');
  const [applied, setApplied] = useState<DiscountPreview | null>(null);
  const [pending, start] = useTransition();
  const remainingDays = Number(subscription?.remainingDays || 0);
  const active = Boolean(subscription?.active ?? remainingDays > 0);
  const selectedPlan = selectedPlanId ? planById(selectedPlanId) : null;
  const catalogPrice = selectedPlan ? planPrice(selectedPlan, cycle) : 0;
  const payable = applied?.price ?? catalogPrice;

  const history = useMemo(() => purchases || [], [purchases]);

  function selectPlan(planId: PlanId) {
    setSelectedPlanId(planId);
    setApplied(null);
  }

  function openCheckout() {
    if (!selectedPlan) {
      toast.error('اول یکی از طرح‌ها را انتخاب کنید');
      return;
    }
    setDiscountCode(applied?.code || '');
    setCheckoutOpen(true);
  }

  function closeCheckout() {
    setCheckoutOpen(false);
  }

  function applyDiscount() {
    if (!selectedPlan) return;
    const code = discountCode.trim();
    if (!code) {
      setApplied(null);
      toast.success('کد تخفیف برداشته شد');
      return;
    }
    start(async () => {
      const res = await previewSubscriptionDiscount({
        planId: selectedPlan.id,
        billingCycle: cycle,
        discountCode: code,
      });
      if (redirectIfUnauthorized(res)) return;
      if (!res.ok || !res.data) {
        setApplied(null);
        toast.error(res.message || 'کد تخفیف معتبر نیست');
        return;
      }
      const data = res.data as DiscountPreview;
      setApplied(data);
      toast.success(data.percent ? `${faNumber(data.percent)}٪ تخفیف اعمال شد` : 'کد ثبت شد');
    });
  }

  function buy() {
    if (!selectedPlan) return;
    start(async () => {
      const res = await activateSubscription({
        planId: selectedPlan.id,
        billingCycle: cycle,
        discountCode: discountCode.trim(),
      });
      if (redirectIfUnauthorized(res)) return;
      if (res.ok) {
        toast.success(res.message || 'اشتراک فعال شد');
        setCheckoutOpen(false);
        setDiscountCode('');
        setApplied(null);
        router.refresh();
      } else {
        toast.error(res.message || 'خرید انجام نشد');
      }
    });
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        {active ? (
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs text-gray-500">اشتراک فعال</p>
              <p className="mt-1 text-xl font-semibold text-gray-900">
                {subscription?.planName} · {cycleLabel(subscription?.billingCycle)}
              </p>
              <p className="mt-1 text-sm text-gray-600">
                {faNumber(remainingDays)} روز باقی مانده
                {subscription?.endDate ? ` · تا ${faDate(subscription.endDate)}` : ''}
              </p>
            </div>
            <p className="text-sm text-teal-800">می‌توانید قبل از پایان، طرح را تمدید یا ارتقا دهید.</p>
          </div>
        ) : (
          <div>
            <p className="text-lg font-semibold text-gray-900">اشتراکی ندارید یا به پایان رسیده</p>
            <p className="mt-1 text-sm text-gray-600">
              برای ثبت فاکتور، لباس و فروشگاه باید یکی از طرح‌ها را بخرید. الان فقط مشاهده جدول‌ها ممکن است.
            </p>
          </div>
        )}
      </section>

      {history.length ? (
        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-4 py-3">
            <h3 className="text-sm font-semibold text-gray-900">خریدهای قبلی</h3>
          </div>
          <ul className="divide-y divide-gray-100">
            {history.map((row) => (
              <li key={row._id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                <div>
                  <p className="font-medium text-gray-900">
                    {row.planName} · {cycleLabel(row.billingCycle)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {faDate(row.startDate)} تا {faDate(row.endDate)}
                  </p>
                </div>
                <div className="text-left">
                  <p className="font-medium">{toman(row.price)}</p>
                  <p className={`text-xs ${row.active ? 'text-teal-700' : 'text-gray-400'}`}>
                    {row.active ? 'فعال' : 'تمام‌شده'}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="rounded-2xl border border-teal-200 bg-teal-50/60 p-4 text-sm text-teal-950">
        <p className="font-medium">لینک محصول و پیامک مشتری</p>
        <p className="mt-1 text-teal-900/80">
          از صفحه{' '}
          <Link href="/counting/shares" className="underline">
            لینک محصول
          </Link>{' '}
          برای انتخاب لباس‌ها، ساخت لینک و ارسال به شماره موبایل استفاده کنید. در طرح شرکا و برندها، با انتشار محصول جدید
          لینک همان محصول برای مشتری‌های عمده پیامک می‌شود.
        </p>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">{active ? 'تمدید یا ارتقا' : 'خرید اشتراک'}</h3>
            <p className="text-xs text-gray-500">
              ماهانه از {toman(MONTHLY_BASE_TOMAN)}. سالانه {faNumber(ANNUAL_DISCOUNT * 100)}٪ تخفیف دارد. یک طرح را
              انتخاب کنید و بعد ادامه دهید.
            </p>
          </div>
          <div className="flex rounded-xl bg-gray-100 p-1">
            <button
              type="button"
              onClick={() => {
                setCycle('month');
                setApplied(null);
              }}
              className={`rounded-lg px-3 py-1.5 text-sm ${cycle === 'month' ? 'bg-white font-medium shadow-sm' : 'text-gray-600'}`}
            >
              ماهانه
            </button>
            <button
              type="button"
              onClick={() => {
                setCycle('year');
                setApplied(null);
              }}
              className={`rounded-lg px-3 py-1.5 text-sm ${cycle === 'year' ? 'bg-white font-medium shadow-sm' : 'text-gray-600'}`}
            >
              سالانه
            </button>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {SUBSCRIPTION_PLANS.map((plan) => {
            const price = planPrice(plan, cycle);
            const yearlyFull = plan.monthlyPrice * 12;
            const selected = selectedPlanId === plan.id;
            return (
              <button
                key={plan.id}
                type="button"
                onClick={() => selectPlan(plan.id)}
                aria-pressed={selected}
                className={`flex flex-col rounded-2xl border bg-white p-4 text-right shadow-sm transition ${
                  selected
                    ? 'border-teal-600 bg-teal-50/70 ring-2 ring-teal-600'
                    : plan.highlight
                      ? 'border-teal-200 hover:border-teal-400'
                      : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  {plan.highlight ? (
                    <span className="w-fit rounded-full bg-teal-50 px-2 py-0.5 text-[11px] font-medium text-teal-800">
                      پیشنهادی
                    </span>
                  ) : null}
                  {selected ? (
                    <span className="w-fit rounded-full bg-teal-600 px-2 py-0.5 text-[11px] font-medium text-white">
                      انتخاب شده
                    </span>
                  ) : null}
                </div>
                <h4 className="text-base font-semibold text-gray-900">{plan.name}</h4>
                <p className="mt-1 min-h-10 text-xs text-gray-500">{plan.blurb}</p>
                <PriceSection
                  className="mt-3"
                  label={cycle === 'year' ? 'قیمت سالانه' : 'قیمت ماهانه'}
                  value={price}
                  description={
                    cycle === 'year' ? (
                      <>
                        به‌جای <Price value={yearlyFull} /> — {faNumber(ANNUAL_DISCOUNT * 100)}٪ تخفیف
                      </>
                    ) : (
                      'برای هر ماه'
                    )
                  }
                />
                <ul className="mt-4 flex-1 space-y-2 text-sm">
                  {plan.features.map((feature) => (
                    <li key={feature.label} className="flex items-start gap-2">
                      {feature.included ? (
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" />
                      ) : (
                        <X className="mt-0.5 h-4 w-4 shrink-0 text-gray-300" />
                      )}
                      <span className={feature.included ? 'text-gray-800' : 'text-gray-400'}>{feature.label}</span>
                    </li>
                  ))}
                </ul>
              </button>
            );
          })}
        </div>
        <div className="flex justify-end">
          <Button disabled={pending} onClick={openCheckout}>
            {active ? 'ادامه تمدید' : 'ادامه خرید'}
          </Button>
        </div>
      </section>

      <Modal isOpen={checkoutOpen} onClose={closeCheckout} size="md" rounded="lg" title="کد تخفیف">
        <FormCard className="border-0 shadow-none rounded-[inherit]">
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-500">
                {selectedPlan
                  ? `${selectedPlan.name} · ${cycleLabel(cycle)} · ${toman(catalogPrice)}`
                  : 'طرحی انتخاب نشده'}
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1">
                <Input
                  label="کد تخفیف"
                  value={discountCode}
                  onChange={(e) => {
                    setDiscountCode(e.target.value);
                    setApplied(null);
                  }}
                />
              </div>
              <Button variant="outline" disabled={pending} onClick={applyDiscount}>
                اعمال تخفیف
              </Button>
            </div>
            {applied?.percent ? (
              <PriceSection
                label="مبلغ قابل پرداخت"
                value={applied.price}
                description={
                  <>
                    {faNumber(applied.percent)}٪ تخفیف با کد {applied.code}: از <Price value={applied.originalPrice} /> به{' '}
                    <Price value={applied.price} />
                  </>
                }
              />
            ) : (
              <PriceSection label="مبلغ قابل پرداخت" value={payable} />
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" disabled={pending} onClick={closeCheckout}>
                انصراف
              </Button>
              <Button disabled={pending || !selectedPlan} onClick={buy}>
                {active ? 'تأیید تمدید' : 'تأیید خرید'}
              </Button>
            </div>
          </div>
        </FormCard>
      </Modal>
    </div>
  );
}
