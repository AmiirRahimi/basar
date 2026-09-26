'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Check, X } from 'lucide-react';
import { activateSubscription, previewSubscriptionDiscount } from '@/actions/auth';
import {
  ANNUAL_DISCOUNT,
  SUBSCRIPTION_PLANS,
  cycleLabel,
  planCardsGridClass,
  planFromList,
  planPrice,
  type BillingCycle,
  type PlanId,
} from '@/lib/plans';
import { faDate, faNumber, toman } from '@/lib/format';
import { GATEWAY_FEE_PERCENT } from '@/lib/storefront';
import { redirectIfUnauthorized } from '@/lib/session-client';
import type { Workspace } from '@/lib/types';
import { Button, FormCard, Input, Modal, toast } from '@/ui';
import { Price, PriceSection } from './Price';
import { useWorkspace } from './WorkspaceProvider';

type DiscountPreview = {
  price: number;
  originalPrice: number;
  catalogPrice?: number;
  afterDiscount?: number;
  code: string;
  percent: number;
  remainingPeriods?: number;
  remainingPeriodUnits?: number;
  remainingCredit?: number;
  currentPlanName?: string;
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
  const workspace = useWorkspace();
  const plans = workspace?.planCatalog?.plans?.length ? workspace.planCatalog.plans : SUBSCRIPTION_PLANS;
  const annualDiscount = workspace?.planCatalog?.annualDiscount ?? ANNUAL_DISCOUNT;
  const lowestMonthly = Math.min(...plans.map((plan) => plan.monthlyPrice));
  const remainingPeriods = Number(
    subscription?.remainingPeriods ?? subscription?.remainingDays ?? 0,
  );
  const active = Boolean(subscription?.active ?? remainingPeriods > 0);
  const selectedPlan = selectedPlanId ? planFromList(plans, selectedPlanId) : null;
  const catalogPrice = selectedPlan ? planPrice(selectedPlan, cycle, annualDiscount) : 0;
  const payable = applied?.price ?? catalogPrice;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('paid') !== '1') return;
    toast.success('پرداخت انجام شد و اشتراک فعال شد');
    router.replace('/accounting/profile?tab=subscription', { scroll: false });
  }, [router]);

  useEffect(() => {
    if (!selectedPlanId) {
      setApplied(null);
      return;
    }
    start(async () => {
      const res = await previewSubscriptionDiscount({
        planId: selectedPlanId,
        billingCycle: cycle,
        discountCode: discountCode.trim(),
      });
      if (redirectIfUnauthorized(res)) return;
      if (!res.ok || !res.data) {
        setApplied(null);
        return;
      }
      setApplied(res.data as DiscountPreview);
    });
  }, [selectedPlanId, cycle]);

  const history = useMemo(() => purchases || [], [purchases]);

  function selectPlan(planId: PlanId) {
    setSelectedPlanId(planId);
    setDiscountCode('');
  }

  function openCheckout() {
    if (!selectedPlan) {
      toast.error('اول یکی از طرح‌ها را انتخاب کنید');
      return;
    }
    start(async () => {
      const res = await previewSubscriptionDiscount({
        planId: selectedPlan.id,
        billingCycle: cycle,
        discountCode: discountCode.trim(),
      });
      if (redirectIfUnauthorized(res)) return;
      if (res.ok && res.data) setApplied(res.data as DiscountPreview);
      setCheckoutOpen(true);
    });
  }

  function closeCheckout() {
    setCheckoutOpen(false);
  }

  function applyDiscount() {
    if (!selectedPlan) return;
    const code = discountCode.trim();
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
      if (!code) toast.success('کد تخفیف برداشته شد');
      else toast.success(data.percent ? `${faNumber(data.percent)}٪ تخفیف اعمال شد` : 'کد ثبت شد');
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
        const data = res.data as { redirectUrl?: string } | null;
        if (data?.redirectUrl) {
          window.location.href = data.redirectUrl;
          return;
        }
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
                {faNumber(remainingPeriods)} اشتراک باقی‌مانده
                <span className="text-gray-400"> (هر اشتراک ۳۰ روز)</span>
                {subscription?.endsAt || subscription?.endDate
                  ? ` · تا ${faDate(subscription.endsAt || subscription.endDate)}`
                  : ''}
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
                    {faNumber(row.periodsPurchased || (row.billingCycle === 'year' ? 12 : 1))} اشتراک
                    {row.startDate ? ` · از ${faDate(row.startDate)}` : ''}
                    {row.endsAt || row.endDate ? ` تا ${faDate(row.endsAt || row.endDate)}` : ''}
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
        <p className="font-medium">ویترین اختصاصی</p>
        <p className="mt-1 text-teal-900/80">
          ساخت لینک محصول، سبد خرید مشتری و پرداخت از درگاه باسار فقط در طرح ویترین است — مثل این که فروشگاه خودتان را
          داشته باشید. از صفحه{' '}
          <Link href="/accounting/shares" className="underline">
            لینک محصول
          </Link>{' '}
          لینک بسازید؛ {faNumber(GATEWAY_FEE_PERCENT)}٪ هر پرداخت سهم پلتفرم است و باقی به شما می‌رسد.
        </p>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">{active ? 'تمدید یا ارتقا' : 'خرید اشتراک'}</h3>
            <p className="text-xs text-gray-500">
              ماهانه از {toman(lowestMonthly)}. سالانه {faNumber(annualDiscount * 100)}٪ تخفیف دارد. یک طرح را
              انتخاب کنید و بعد ادامه دهید.
            </p>
          </div>
          <div className="flex rounded-xl bg-gray-100 p-1">
            <button
              type="button"
              onClick={() => {
                setCycle('month');
                setDiscountCode('');
              }}
              className={`rounded-lg px-3 py-1.5 text-sm ${cycle === 'month' ? 'bg-white font-medium shadow-sm' : 'text-gray-600'}`}
            >
              ماهانه
            </button>
            <button
              type="button"
              onClick={() => {
                setCycle('year');
                setDiscountCode('');
              }}
              className={`rounded-lg px-3 py-1.5 text-sm ${cycle === 'year' ? 'bg-white font-medium shadow-sm' : 'text-gray-600'}`}
            >
              سالانه
            </button>
          </div>
        </div>
        <div className={planCardsGridClass(plans.length)}>
          {plans.map((plan) => {
            const price = planPrice(plan, cycle, annualDiscount);
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
                        {faNumber(12)} اشتراک ۳۰‌روزه · به‌جای <Price value={yearlyFull} /> — {faNumber(annualDiscount * 100)}٪ تخفیف
                      </>
                    ) : (
                      '۱ اشتراک · ۳۰ روز'
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

      <Modal isOpen={checkoutOpen} onClose={closeCheckout} size="md" rounded="lg" title="پرداخت اشتراک">
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
                  }}
                />
              </div>
              <Button variant="outline" disabled={pending} onClick={applyDiscount}>
                اعمال تخفیف
              </Button>
            </div>
            {applied?.remainingCredit ? (
              <p className="rounded-xl bg-teal-50 px-3 py-2 text-sm text-teal-950">
                {faNumber(applied.remainingPeriods || 0)} اشتراک از طرح فعلی
                {applied.currentPlanName ? ` «${applied.currentPlanName}»` : ''} مانده است؛ ارزش آن{' '}
                {toman(applied.remainingCredit)} از مبلغ طرح جدید کم می‌شود.
              </p>
            ) : null}
            <PriceSection
              label="مبلغ قابل پرداخت"
              value={payable}
              description={
                applied ? (
                  <>
                    قیمت طرح: <Price value={applied.catalogPrice ?? applied.originalPrice} />
                    {applied.percent ? (
                      <>
                        {' '}
                        · بعد از {faNumber(applied.percent)}٪ تخفیف:{' '}
                        <Price value={applied.afterDiscount ?? applied.originalPrice} />
                      </>
                    ) : null}
                    {applied.remainingCredit ? (
                      <>
                        {' '}
                        · کسر مانده: <Price value={applied.remainingCredit} />
                      </>
                    ) : null}
                  </>
                ) : undefined
              }
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" disabled={pending} onClick={closeCheckout}>
                انصراف
              </Button>
              <Button disabled={pending || !selectedPlan} onClick={buy}>
                {active ? 'پرداخت و تغییر طرح' : 'پرداخت و فعال‌سازی'}
              </Button>
            </div>
          </div>
        </FormCard>
      </Modal>
    </div>
  );
}
