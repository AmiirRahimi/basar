export type BillingCycle = 'month' | 'year';
export type PlanId = 'starter' | 'shops' | 'partners' | 'brands';

export type SubscriptionPlan = {
  id: PlanId;
  name: string;
  blurb: string;
  monthlyPrice: number;
  maxBrands: number;
  maxStores: number;
  allowPartners: boolean;
  allowProductShare: boolean;
  allowShareSms: boolean;
  notifyCustomersOnNewProduct: boolean;
  features: { label: string; included: boolean }[];
  highlight?: boolean;
};

export const MONTHLY_BASE_TOMAN = 500_000;
export const ANNUAL_DISCOUNT = 0.2;
export const ADMIN_ADD_MONTH_OPTIONS = [2, 3, 4, 6, 12] as const;

const CORE_FEATURES = {
  invoice: { label: 'فاکتور، چک و البسه', included: true as const },
  partners: { label: 'شریک درآمد', included: true as const },
  vitrin: { label: 'ویترین اختصاصی: لینک محصول، سبد و پرداخت مشتری (مثل فروشگاه خودتان)', included: false as const },
  smsLink: { label: 'ارسال لینک با پیامک', included: false as const },
  smsNew: { label: 'پیامک محصول جدید به مشتری‌ها', included: false as const },
};

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'starter',
    name: 'پایه',
    blurb: 'یک برند، یک حجره. برای شروع کار و ثبت شریک.',
    monthlyPrice: MONTHLY_BASE_TOMAN,
    maxBrands: 1,
    maxStores: 1,
    allowPartners: true,
    allowProductShare: false,
    allowShareSms: false,
    notifyCustomersOnNewProduct: false,
    features: [
      { label: 'یک برند', included: true },
      { label: 'یک فروشگاه', included: true },
      CORE_FEATURES.partners,
      CORE_FEATURES.invoice,
      CORE_FEATURES.vitrin,
      CORE_FEATURES.smsLink,
      CORE_FEATURES.smsNew,
    ],
  },
  {
    id: 'shops',
    name: 'فروشگاه‌ها',
    blurb: 'چند حجره روی یک برند. لباس را بین شعبه‌ها پخش کن.',
    monthlyPrice: 650_000,
    maxBrands: 1,
    maxStores: 5,
    allowPartners: true,
    allowProductShare: false,
    allowShareSms: false,
    notifyCustomersOnNewProduct: false,
    features: [
      { label: 'یک برند', included: true },
      { label: 'تا ۵ فروشگاه', included: true },
      CORE_FEATURES.partners,
      CORE_FEATURES.invoice,
      CORE_FEATURES.vitrin,
      CORE_FEATURES.smsLink,
      CORE_FEATURES.smsNew,
    ],
  },
  {
    id: 'partners',
    name: 'شرکا',
    blurb: 'همان چند حجره، با فضای بیشتر برای کار روز.',
    monthlyPrice: 850_000,
    maxBrands: 1,
    maxStores: 5,
    allowPartners: true,
    allowProductShare: false,
    allowShareSms: false,
    notifyCustomersOnNewProduct: false,
    features: [
      { label: 'یک برند', included: true },
      { label: 'تا ۵ فروشگاه', included: true },
      CORE_FEATURES.partners,
      CORE_FEATURES.invoice,
      CORE_FEATURES.vitrin,
      CORE_FEATURES.smsLink,
      CORE_FEATURES.smsNew,
    ],
  },
  {
    id: 'brands',
    name: 'ویترین',
    blurb: 'مثل فروشگاه خودتان: لینک بسازید، مشتری سبد کند و از درگاه باسار بپردازد. چند برند و فروشگاه نامحدود.',
    monthlyPrice: 3_500_000,
    maxBrands: 99,
    maxStores: 99,
    allowPartners: true,
    allowProductShare: true,
    allowShareSms: true,
    notifyCustomersOnNewProduct: true,
    highlight: true,
    features: [
      { label: 'برند نامحدود', included: true },
      { label: 'فروشگاه نامحدود', included: true },
      CORE_FEATURES.partners,
      CORE_FEATURES.invoice,
      { ...CORE_FEATURES.vitrin, included: true },
      { ...CORE_FEATURES.smsLink, included: true },
      { ...CORE_FEATURES.smsNew, included: true },
    ],
  },
];

export function planById(id?: string | null) {
  return SUBSCRIPTION_PLANS.find((plan) => plan.id === id) || SUBSCRIPTION_PLANS[0];
}

export function annualPrice(monthlyPrice: number) {
  return Math.round(monthlyPrice * 12 * (1 - ANNUAL_DISCOUNT));
}

export function planPrice(plan: SubscriptionPlan, cycle: BillingCycle) {
  return cycle === 'year' ? annualPrice(plan.monthlyPrice) : plan.monthlyPrice;
}

export function cycleDays(cycle: BillingCycle) {
  return cycle === 'year' ? 365 : 30;
}

export function addCalendarMonths(from: Date, months: number) {
  const next = new Date(from.getTime());
  const day = next.getDate();
  next.setMonth(next.getMonth() + months);
  if (next.getDate() < day) next.setDate(0);
  return next;
}

export function cycleLabel(cycle?: string | null) {
  return cycle === 'year' ? 'سالانه' : 'ماهانه';
}

export function limitLabel(value: number) {
  return value >= 99 ? 'نامحدود' : String(value);
}

export function planFromLegacy(type?: number, planId?: string) {
  if (planId && SUBSCRIPTION_PLANS.some((plan) => plan.id === planId)) return planById(planId);
  return SUBSCRIPTION_PLANS[0];
}

export function cycleFromLegacy(type?: number, cycle?: string): BillingCycle {
  if (cycle === 'year' || cycle === 'month') return cycle;
  return type === 3 ? 'year' : 'month';
}

export function planFeatureFlags(plan: SubscriptionPlan) {
  return {
    allowProductShare: Boolean(plan.allowProductShare),
    allowShareSms: Boolean(plan.allowShareSms),
    notifyCustomersOnNewProduct: Boolean(plan.notifyCustomersOnNewProduct),
  };
}
