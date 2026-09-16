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
  features: { label: string; included: boolean }[];
  highlight?: boolean;
};

export const MONTHLY_BASE_TOMAN = 100_000;
export const ANNUAL_DISCOUNT = 0.2;

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'starter',
    name: 'پایه',
    blurb: 'یک برند و یک فروشگاه برای شروع کار',
    monthlyPrice: MONTHLY_BASE_TOMAN,
    maxBrands: 1,
    maxStores: 1,
    allowPartners: false,
    features: [
      { label: 'یک برند', included: true },
      { label: 'یک فروشگاه', included: true },
      { label: 'فاکتور، چک و البسه', included: true },
      { label: 'فروشگاه‌های بیشتر', included: false },
      { label: 'برندهای بیشتر', included: false },
      { label: 'شریک درآمد', included: false },
    ],
  },
  {
    id: 'shops',
    name: 'فروشگاه‌ها',
    blurb: 'چند شعبه برای یک برند',
    monthlyPrice: 180_000,
    maxBrands: 1,
    maxStores: 5,
    allowPartners: false,
    features: [
      { label: 'یک برند', included: true },
      { label: 'تا ۵ فروشگاه', included: true },
      { label: 'فاکتور، چک و البسه', included: true },
      { label: 'فروشگاه‌های بیشتر', included: true },
      { label: 'برندهای بیشتر', included: false },
      { label: 'شریک درآمد', included: false },
    ],
  },
  {
    id: 'partners',
    name: 'شرکا',
    blurb: 'تقسیم درآمد با شریک در فروشگاه‌ها',
    monthlyPrice: 250_000,
    maxBrands: 1,
    maxStores: 5,
    allowPartners: true,
    highlight: true,
    features: [
      { label: 'یک برند', included: true },
      { label: 'تا ۵ فروشگاه', included: true },
      { label: 'فاکتور، چک و البسه', included: true },
      { label: 'فروشگاه‌های بیشتر', included: true },
      { label: 'برندهای بیشتر', included: false },
      { label: 'شریک درآمد', included: true },
    ],
  },
  {
    id: 'brands',
    name: 'برندها',
    blurb: 'چند برند، فروشگاه نامحدود و شریک',
    monthlyPrice: 400_000,
    maxBrands: 99,
    maxStores: 99,
    allowPartners: true,
    features: [
      { label: 'برند نامحدود', included: true },
      { label: 'فروشگاه نامحدود', included: true },
      { label: 'فاکتور، چک و البسه', included: true },
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
