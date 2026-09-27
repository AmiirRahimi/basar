'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, FileText, Shirt, Store, X } from 'lucide-react';
import { activateSubscription, logout, previewSubscriptionDiscount } from '@/actions/auth';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { ShopButton } from '@/components/shop/ShopUi';
import {
  ANNUAL_DISCOUNT,
  SUBSCRIPTION_PLANS,
  annualPrice,
  cycleLabel,
  planCardsGridClass,
  planFromList,
  planPrice,
  type BillingCycle,
  type PlanId,
  type SubscriptionPlan,
} from '@/lib/plans';
import { faNumber, toman } from '@/lib/format';
import { redirectIfUnauthorized } from '@/lib/session-client';
import { Button, FormCard, Input, Modal, cn, toast } from '@/ui';
import { Price, PriceSection } from './Price';
import { SubscribePanelBackdrop } from './SubscribePanelBackdrop';
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

const OPENS = [
  {
    icon: Shirt,
    title: 'هر لباس، با سابقه',
    copy: 'پارچه، خیاط، شست‌وشو و چاپ را روی همان مدل ثبت می‌کنی.',
  },
  {
    icon: FileText,
    title: 'فاکتور و بیجک',
    copy: 'فاکتور عمده را می‌زنی، بیجک را از رویش می‌سازی و چاپ می‌گیری.',
  },
  {
    icon: Store,
    title: 'حجره و برند، جدا',
    copy: 'فروشگاه و برند قاطی نمی‌شوند. شریک و عضو را هم بعداً اضافه می‌کنی.',
  },
];

function firstName(fullName?: string) {
  const name = fullName?.trim().split(/\s+/)[0];
  return name || '';
}

function presentPlans(plans: SubscriptionPlan[]) {
  const highlight = plans.find((plan) => plan.highlight);
  if (!highlight || plans.length !== 3) return plans;
  const others = plans.filter((plan) => plan.id !== highlight.id);
  return [others[0], highlight, others[1]].filter(Boolean);
}

export function SubscribeOffer() {
  const router = useRouter();
  const workspace = useWorkspace();
  const plans = workspace?.planCatalog?.plans?.length ? workspace.planCatalog.plans : SUBSCRIPTION_PLANS;
  const annualDiscount = workspace?.planCatalog?.annualDiscount ?? ANNUAL_DISCOUNT;
  const cards = useMemo(() => presentPlans(plans), [plans]);
  const recommended = plans.find((plan) => plan.highlight) || plans[plans.length - 1];
  const lowestMonthly = Math.min(...plans.map((plan) => plan.monthlyPrice));
  const name = firstName(workspace?.user.fullName);

  const [cycle, setCycle] = useState<BillingCycle>('month');
  const [selectedPlanId, setSelectedPlanId] = useState<PlanId>(recommended?.id || '');
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [discountCode, setDiscountCode] = useState('');
  const [applied, setApplied] = useState<DiscountPreview | null>(null);
  const [pending, start] = useTransition();

  const selectedPlan = selectedPlanId ? planFromList(plans, selectedPlanId) : null;
  const catalogPrice = selectedPlan ? planPrice(selectedPlan, cycle, annualDiscount) : 0;
  const payable = applied?.price ?? catalogPrice;
  const yearSave = recommended
    ? recommended.monthlyPrice * 12 - annualPrice(recommended.monthlyPrice, annualDiscount)
    : 0;

  useEffect(() => {
    if (!recommended || selectedPlanId) return;
    setSelectedPlanId(recommended.id);
  }, [recommended, selectedPlanId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('paid') !== '1') return;
    toast.success('پرداخت انجام شد. پنل باز می‌شود');
    router.replace('/accounting/dashboard', { scroll: false });
  }, [router]);

  function selectPlan(planId: PlanId) {
    setSelectedPlanId(planId);
    setDiscountCode('');
    setApplied(null);
  }

  function openCheckout(planId?: PlanId) {
    const plan = planFromList(plans, planId || selectedPlanId);
    if (!plan) {
      toast.error('اول یکی از طرح‌ها را انتخاب کنید');
      return;
    }
    setSelectedPlanId(plan.id);
    start(async () => {
      const res = await previewSubscriptionDiscount({
        planId: plan.id,
        billingCycle: cycle,
        discountCode: discountCode.trim(),
      });
      if (redirectIfUnauthorized(res)) return;
      if (res.ok && res.data) setApplied(res.data as DiscountPreview);
      else setApplied(null);
      setCheckoutOpen(true);
    });
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
        router.refresh();
      } else {
        toast.error(res.message || 'خرید انجام نشد');
      }
    });
  }

  return (
    <div className="relative min-h-screen">
      <SubscribePanelBackdrop />
      <div data-shop className="relative z-10 min-h-screen pb-28 text-shop-ink" dir="rtl">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-shop-bone/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 lg:px-6">
          <div className="flex items-center gap-2.5">
            <BrandLogo variant="mark" className="h-9 w-9 shrink-0" priority />
            <span className="min-w-0">
              <span className="block text-[15px] font-semibold leading-5">باسار</span>
              <span className="block text-[11px] leading-4 text-shop-ink/55">فعال‌سازی حسابداری</span>
            </span>
          </div>
          <form action={logout}>
            <button type="submit" className="text-sm text-shop-ink/60 transition hover:text-shop-ink">
              خروج
            </button>
          </form>
        </div>
      </header>

      <section data-shop-dark className="relative isolate mx-4 mt-4 max-w-6xl overflow-hidden rounded-[1.75rem] bg-shop-ink text-shop-bone shadow-2xl shadow-black/20 sm:mx-6 lg:mx-auto">
        <div className="shop-grain absolute inset-0 bg-gradient-to-bl from-shop-ink via-shop-mill/90 to-shop-ink" />
        <div className="pointer-events-none absolute -left-20 top-8 h-64 w-64 rounded-full bg-shop-saffron/20 blur-3xl" />
        <div className="relative mx-auto max-w-6xl px-4 py-12 sm:py-16 lg:px-6">
          <p className="text-sm text-shop-saffron">{name ? `سلام ${name}، حسابت آماده‌ست` : 'حسابت آماده‌ست'}</p>
          <h1 className="mt-3 max-w-3xl text-3xl font-semibold leading-[1.35] sm:text-5xl">
            یک طرح انتخاب کن
            <span className="mt-2 block text-shop-saffron">پنل حجره باز می‌شود</span>
          </h1>
          <p className="mt-4 max-w-xl text-base leading-8 text-shop-bone/75">
            لباس، فاکتور، بیجک و فروشگاه پشت همین صفحه است. پرداخت که تمام شود، مستقیم می‌روی داخل پنل و برند و
            حجره‌ات را می‌سازی.
          </p>
          <div className="mt-6">
            <ShopButton href="#plans" className="px-6 py-3 text-base">
              دیدن طرح‌ها
            </ShopButton>
          </div>
          <ul className="mt-10 grid gap-3 sm:grid-cols-3">
            {OPENS.map((item) => (
              <li key={item.title} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
                <item.icon className="h-5 w-5 text-shop-saffron" />
                <p className="mt-3 font-medium">{item.title}</p>
                <p className="mt-1 text-sm leading-7 text-shop-bone/70">{item.copy}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section id="plans" className="scroll-mt-20">
        <div className="mx-auto max-w-6xl px-4 py-12 lg:px-6 lg:py-16">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-xl">
              <p className="text-[11px] tracking-[0.22em] text-shop-saffron">طرح‌ها</p>
              <h2 className="mt-2 text-3xl font-semibold">به اندازه حجره‌ات شروع کن</h2>
              <p className="mt-2 text-sm leading-7 text-shop-ink/65">
                ماهانه از {toman(lowestMonthly)}. سالانه {faNumber(annualDiscount * 100)}٪ کمتر است
                {yearSave > 0 ? ` — روی «${recommended?.name}» ${toman(yearSave)} صرفه‌جویی می‌شود` : ''}. بعداً از داخل
                پنل می‌توانی طرح را عوض کنی.
              </p>
            </div>
            <div className="flex w-fit rounded-full bg-shop-ink/5 p-1">
              <button
                type="button"
                onClick={() => {
                  setCycle('month');
                  setDiscountCode('');
                  setApplied(null);
                }}
                className={cn(
                  'rounded-full px-4 py-2 text-sm',
                  cycle === 'month' ? 'bg-shop-ink font-medium text-shop-bone' : 'text-shop-ink/70',
                )}
              >
                ماهانه
              </button>
              <button
                type="button"
                onClick={() => {
                  setCycle('year');
                  setDiscountCode('');
                  setApplied(null);
                }}
                className={cn(
                  'rounded-full px-4 py-2 text-sm',
                  cycle === 'year' ? 'bg-shop-ink font-medium text-shop-bone' : 'text-shop-ink/70',
                )}
              >
                سالانه
                <span className="mr-1.5 rounded-full bg-shop-saffron px-1.5 py-0.5 text-[11px] font-medium text-shop-ink">
                  {faNumber(annualDiscount * 100)}٪
                </span>
              </button>
            </div>
          </div>

          <div className={cn('mt-8', planCardsGridClass(cards.length))}>
            {cards.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                cycle={cycle}
                annualDiscount={annualDiscount}
                selected={selectedPlanId === plan.id}
                pending={pending}
                onSelect={() => selectPlan(plan.id)}
                onBuy={() => openCheckout(plan.id)}
              />
            ))}
          </div>
          <p className="mt-5 text-center text-xs text-shop-ink/45">کد تخفیف را در مرحله پرداخت وارد می‌کنی.</p>
        </div>
      </section>

      <section className="mx-4 mt-2 max-w-6xl rounded-[1.75rem] border border-white/40 bg-shop-paper/80 backdrop-blur-md sm:mx-6 lg:mx-auto">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-3 lg:px-6">
          {[
            'هر اشتراک ۳۰ روز است. سالانه یعنی دوازده اشتراک پشت سر هم، با تخفیف.',
            'داده‌های حجره فقط مال خودت است. کس دیگری از حسابت خبر ندارد.',
            'اگر حجره بزرگ‌تر شد، همان حساب را به طرح بالاتر می‌بری. از اول شروع نمی‌کنی.',
          ].map((copy, index) => (
            <p key={copy} className="text-sm leading-8 text-shop-ink/75">
              <span className="mb-2 block font-mono text-sm text-shop-saffron">{faNumber(index + 1)}</span>
              {copy}
            </p>
          ))}
        </div>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-shop-ink/95 text-shop-bone backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 lg:px-6">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">
              {selectedPlan ? selectedPlan.name : 'طرحی انتخاب نشده'}
              <span className="text-shop-bone/60"> · {cycleLabel(cycle)}</span>
            </p>
            <p className="text-xs text-shop-saffron">{selectedPlan ? toman(catalogPrice) : 'یک طرح را انتخاب کن'}</p>
          </div>
          <ShopButton disabled={pending || !selectedPlan} onClick={() => openCheckout()} className="shrink-0 px-5 py-2.5">
            ادامه پرداخت
          </ShopButton>
        </div>
      </div>

      <Modal isOpen={checkoutOpen} onClose={() => setCheckoutOpen(false)} size="md" rounded="lg" title="پرداخت و باز شدن پنل">
        <FormCard className="rounded-[inherit] border-0 shadow-none">
          <div className="space-y-4">
            <p className="text-sm text-gray-500">
              {selectedPlan
                ? `${selectedPlan.name} · ${cycleLabel(cycle)} · ${toman(catalogPrice)}`
                : 'طرحی انتخاب نشده'}
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1">
                <Input
                  label="کد تخفیف"
                  value={discountCode}
                  onChange={(event) => setDiscountCode(event.target.value)}
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
                  </>
                ) : (
                  'بعد از پرداخت، منوی حسابداری باز می‌شود.'
                )
              }
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" disabled={pending} onClick={() => setCheckoutOpen(false)}>
                انصراف
              </Button>
              <Button disabled={pending || !selectedPlan} onClick={buy}>
                پرداخت و ورود به پنل
              </Button>
            </div>
          </div>
        </FormCard>
      </Modal>
      </div>
    </div>
  );
}

function PlanCard({
  plan,
  cycle,
  annualDiscount,
  selected,
  pending,
  onSelect,
  onBuy,
}: {
  plan: SubscriptionPlan;
  cycle: BillingCycle;
  annualDiscount: number;
  selected: boolean;
  pending: boolean;
  onSelect: () => void;
  onBuy: () => void;
}) {
  const price = planPrice(plan, cycle, annualDiscount);
  const yearlyFull = plan.monthlyPrice * 12;
  const perMonth = Math.round(annualPrice(plan.monthlyPrice, annualDiscount) / 12);
  const featured = Boolean(plan.highlight);

  return (
    <article
      onClick={onSelect}
      className={cn(
        'flex cursor-pointer flex-col rounded-[1.6rem] border p-5 text-right shadow-sm',
        featured ? 'order-first border-shop-ink bg-shop-ink text-shop-bone md:order-none' : 'border-shop-ink/10 bg-white',
        selected && 'ring-2 ring-shop-saffron',
      )}
    >
      <div className="flex w-full flex-1 flex-col">
        <div className="flex min-h-6 items-start justify-between gap-3">
          {featured ? (
            <span className="rounded-full bg-shop-saffron px-2.5 py-0.5 text-[11px] font-medium text-shop-ink">
              پیشنهاد برای شروع جدی
            </span>
          ) : (
            <span />
          )}
          {selected ? (
            <span className={cn('text-[11px] font-medium', featured ? 'text-shop-saffron' : 'text-teal-800')}>
              انتخاب شده
            </span>
          ) : null}
        </div>
        <h3 className={cn('mt-3 text-xl font-semibold', featured ? 'text-shop-bone' : 'text-shop-ink')}>{plan.name}</h3>
        <p className={cn('mt-2 min-h-14 text-sm leading-6', featured ? 'text-shop-bone/70' : 'text-shop-ink/60')}>
          {plan.blurb}
        </p>
        <p className={cn('mt-4 text-2xl font-semibold tracking-tight', featured ? 'text-shop-bone' : 'text-shop-ink')}>
          {toman(price)}
        </p>
        <p className={cn('text-xs', featured ? 'text-shop-bone/50' : 'text-shop-ink/45')}>
          {cycle === 'year' ? (
            <>
              برای ۱۲ ماه · معادل {toman(perMonth)} در ماه · به‌جای {toman(yearlyFull)}
            </>
          ) : (
            'برای ۳۰ روز'
          )}
        </p>
        <ul className="mt-5 flex-1 space-y-2 text-sm">
          {plan.features.map((feature) => (
            <li key={feature.label} className="flex items-start gap-2">
              {feature.included ? (
                <Check className={cn('mt-0.5 h-4 w-4 shrink-0', featured ? 'text-shop-saffron' : 'text-teal-700')} />
              ) : (
                <X className={cn('mt-0.5 h-4 w-4 shrink-0', featured ? 'text-white/25' : 'text-shop-ink/25')} />
              )}
              <span
                className={
                  feature.included
                    ? featured
                      ? 'text-shop-bone/90'
                      : 'text-shop-ink/80'
                    : featured
                      ? 'text-white/35'
                      : 'text-shop-ink/35'
                }
              >
                {feature.label}
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <ShopButton
          disabled={pending}
          onClick={onBuy}
          variant={featured ? 'saffron' : 'ink'}
          className="mt-5 w-full"
        >
          فعال‌سازی {plan.name}
        </ShopButton>
      </div>
    </article>
  );
}
