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

export const MONTHLY_BASE_TOMAN = 250_000;
export const ANNUAL_DISCOUNT = 0.2;

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'starter',
    name: 'پایه',
    blurb: 'یک برند و یک فروشگاه؛ ساخت لینک محصول برای اشتراک‌گذاری',
    monthlyPrice: MONTHLY_BASE_TOMAN,
    maxBrands: 1,
    maxStores: 1,
    allowPartners: false,
    allowProductShare: true,
    allowShareSms: false,
    notifyCustomersOnNewProduct: false,
    features: [
      { label: 'یک برند', included: true },
      { label: 'یک فروشگاه', included: true },
      { label: 'فاکتور، چک و البسه', included: true },
      { label: 'ساخت لینک محصول', included: true },
      { label: 'ارسال لینک با پیامک', included: false },
      { label: 'پیامک محصول جدید به مشتری‌ها', included: false },
      { label: 'فروشگاه‌های بیشتر', included: false },
      { label: 'برندهای بیشتر', included: false },
      { label: 'شریک درآمد', included: false },
    ],
  },
  {
    id: 'shops',
    name: 'فروشگاه‌ها',
    blurb: 'چند شعبه و ارسال لینک محصولات با پیامک به شماره مشتری',
    monthlyPrice: 390_000,
    maxBrands: 1,
    maxStores: 5,
    allowPartners: false,
    allowProductShare: true,
    allowShareSms: true,
    notifyCustomersOnNewProduct: false,
    features: [
      { label: 'یک برند', included: true },
      { label: 'تا ۵ فروشگاه', included: true },
      { label: 'فاکتور، چک و البسه', included: true },
      { label: 'ساخت لینک محصول', included: true },
      { label: 'ارسال لینک با پیامک', included: true },
      { label: 'پیامک محصول جدید به مشتری‌ها', included: false },
      { label: 'فروشگاه‌های بیشتر', included: true },
      { label: 'برندهای بیشتر', included: false },
      { label: 'شریک درآمد', included: false },
    ],
  },
  {
    id: 'partners',
    name: 'شرکا',
    blurb: 'شریک درآمد + پیامک خودکار وقتی محصول جدید منتشر می‌شود',
    monthlyPrice: 550_000,
    maxBrands: 1,
    maxStores: 5,
    allowPartners: true,
    allowProductShare: true,
    allowShareSms: true,
    notifyCustomersOnNewProduct: true,
    highlight: true,
    features: [
      { label: 'یک برند', included: true },
      { label: 'تا ۵ فروشگاه', included: true },
      { label: 'فاکتور، چک و البسه', included: true },
      { label: 'ساخت لینک محصول', included: true },
      { label: 'ارسال لینک با پیامک', included: true },
      { label: 'پیامک محصول جدید به مشتری‌ها', included: true },
      { label: 'فروشگاه‌های بیشتر', included: true },
      { label: 'برندهای بیشتر', included: false },
      { label: 'شریک درآمد', included: true },
    ],
  },
  {
    id: 'brands',
    name: 'برندها',
    blurb: 'چند برند، فروشگاه نامحدود، لینک و پیامک مشتری',
    monthlyPrice: 850_000,
    maxBrands: 99,
    maxStores: 99,
    allowPartners: true,
    allowProductShare: true,
    allowShareSms: true,
    notifyCustomersOnNewProduct: true,
    features: [
      { label: 'برند نامحدود', included: true },
      { label: 'فروشگاه نامحدود', included: true },
      { label: 'فاکتور، چک و البسه', included: true },
      { label: 'ساخت لینک محصول', included: true },
      { label: 'ارسال لینک با پیامک', included: true },
      { label: 'پیامک محصول جدید به مشتری‌ها', included: true },
      { label: 'فروشگاه‌های بیشتر', included: true },
      { label: 'برندهای بیشتر', included: true },
      { label: 'شریک درآمد', included: true },
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
