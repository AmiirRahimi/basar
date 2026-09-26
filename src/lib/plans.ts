export type BillingCycle = 'month' | 'year';
export type PlanId = 'starter' | 'partners' | 'brands';

export type SubscriptionPlan = {
  id: PlanId;
  name: string;
  blurb: string;
  monthlyPrice: number;
  maxBrands: number;
  maxStores: number;
  allowPartners: boolean;
  allowClothImages: boolean;
  allowProductShare: boolean;
  allowShareSms: boolean;
  notifyCustomersOnNewProduct: boolean;
  features: { label: string; included: boolean }[];
  highlight?: boolean;
};

export const MONTHLY_BASE_TOMAN = 1_000_000;
export const HIGHEST_PLAN_TOMAN = 4_000_000;
export const ANNUAL_DISCOUNT = 0.2;
export const ADMIN_ADD_MONTH_OPTIONS = [2, 3, 4, 6, 12] as const;

/** Old «shops` plan is now the same as `partners`. */
export function resolvePlanId(id?: string | null): PlanId | undefined {
  if (!id) return undefined;
  if (id === 'shops') return 'partners';
  if (id === 'starter' || id === 'partners' || id === 'brands') return id;
  return undefined;
}

const CORE_FEATURES = {
  invoice: { label: 'فاکتور، چک، البسه و پارچه', included: true as const },
  partners: { label: 'شریک درآمد', included: true as const },
  images: { label: 'تصویر محصول', included: false as const },
  vitrin: { label: 'ویترین اختصاصی: لینک محصول، سبد و پرداخت مشتری (مثل فروشگاه خودت)', included: false as const },
  smsLink: { label: 'ارسال لینک با پیامک', included: false as const },
  smsNew: { label: 'پیامک محصول جدید به مشتری‌ها', included: false as const },
};

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'starter',
    name: 'پایه',
    blurb: 'یک برند، یک حجره. کار روز: البسه، فاکتور، پارچه و چک — بدون شریک و بدون عکس.',
    monthlyPrice: MONTHLY_BASE_TOMAN,
    maxBrands: 1,
    maxStores: 1,
    allowPartners: false,
    allowClothImages: false,
    allowProductShare: false,
    allowShareSms: false,
    notifyCustomersOnNewProduct: false,
    features: [
      { label: 'یک برند', included: true },
      { label: 'یک فروشگاه', included: true },
      CORE_FEATURES.invoice,
      { ...CORE_FEATURES.partners, included: false },
      CORE_FEATURES.images,
      CORE_FEATURES.vitrin,
      CORE_FEATURES.smsLink,
      CORE_FEATURES.smsNew,
    ],
  },
  {
    id: 'partners',
    name: 'فروشگاه و شرکا',
    blurb: 'دو فروشگاه روی یک برند، با ثبت شریک و سهم سود.',
    monthlyPrice: 2_500_000,
    maxBrands: 1,
    maxStores: 2,
    allowPartners: true,
    allowClothImages: false,
    allowProductShare: false,
    allowShareSms: false,
    notifyCustomersOnNewProduct: false,
    features: [
      { label: 'یک برند', included: true },
      { label: 'تا ۲ فروشگاه', included: true },
      CORE_FEATURES.invoice,
      CORE_FEATURES.partners,
      CORE_FEATURES.images,
      CORE_FEATURES.vitrin,
      CORE_FEATURES.smsLink,
      CORE_FEATURES.smsNew,
    ],
  },
  {
    id: 'brands',
    name: 'ویترین',
    blurb: 'برند و فروشگاه نامحدود، عکس لباس، لینک مشتری و پرداخت. قیمت این طرح با بقیه فرق دارد.',
    monthlyPrice: HIGHEST_PLAN_TOMAN,
    maxBrands: 99,
    maxStores: 99,
    allowPartners: true,
    allowClothImages: true,
    allowProductShare: true,
    allowShareSms: true,
    notifyCustomersOnNewProduct: true,
    highlight: true,
    features: [
      { label: 'برند نامحدود', included: true },
      { label: 'فروشگاه نامحدود', included: true },
      CORE_FEATURES.invoice,
      CORE_FEATURES.partners,
      { ...CORE_FEATURES.images, included: true },
      { ...CORE_FEATURES.vitrin, included: true },
      { ...CORE_FEATURES.smsLink, included: true },
      { ...CORE_FEATURES.smsNew, included: true },
    ],
  },
];

export function planById(id?: string | null) {
  return SUBSCRIPTION_PLANS.find((plan) => plan.id === resolvePlanId(id)) || SUBSCRIPTION_PLANS[0];
}

export function isHighestPlan(id?: string | null) {
  return planById(id).id === 'brands';
}

export function annualPrice(monthlyPrice: number, discount = ANNUAL_DISCOUNT) {
  return Math.round(monthlyPrice * 12 * (1 - discount));
}

export function planPrice(plan: SubscriptionPlan, cycle: BillingCycle, discount = ANNUAL_DISCOUNT) {
  return cycle === 'year' ? annualPrice(plan.monthlyPrice, discount) : plan.monthlyPrice;
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

export function mergePlanCatalog(stored?: {
  annualDiscount?: number;
  plans?: Array<Partial<SubscriptionPlan> & { id?: string }>;
} | null) {
  const raw = Number(stored?.annualDiscount);
  const asRate = raw >= 1 && raw <= 90 ? raw / 100 : raw;
  const annualDiscount =
    Number.isFinite(asRate) && asRate >= 0 && asRate < 1 ? asRate : ANNUAL_DISCOUNT;
  const byId = new Map<string, Partial<SubscriptionPlan> & { id?: string }>();
  for (const plan of stored?.plans || []) {
    if (!plan.id || plan.id === 'shops') continue;
    byId.set(String(plan.id), plan);
  }
  const plans = SUBSCRIPTION_PLANS.map((base) => {
    const patch = byId.get(base.id);
    if (!patch) return { ...base, features: base.features.map((row) => ({ ...row })) };
    const features =
      Array.isArray(patch.features) && patch.features.length
        ? patch.features
            .map((row) => ({
              label: String(row?.label || '').trim().slice(0, 80),
              included: Boolean(row?.included),
            }))
            .filter((row) => row.label)
            .slice(0, 16)
        : base.features.map((row) => ({ ...row }));
    const storedName = String(patch.name || '').trim();
    const storedBlurb = String(patch.blurb || '').trim();
    const name =
      base.id === 'partners' && (storedName === 'شرکا' || storedName === 'فروشگاه‌ها')
        ? base.name
        : storedName.slice(0, 40) || base.name;
    const blurb =
      base.id === 'partners' && storedBlurb.startsWith('همون چند حجره')
        ? base.blurb
        : storedBlurb.slice(0, 220) || base.blurb;
    let monthlyPrice = Math.max(0, Math.round(Number(patch.monthlyPrice ?? base.monthlyPrice) || 0));
    if (base.id === 'brands' && monthlyPrice === 5_000_000) monthlyPrice = base.monthlyPrice;
    let maxStores = Math.min(99, Math.max(1, Math.round(Number(patch.maxStores ?? base.maxStores) || 1)));
    if (base.id === 'partners' && maxStores === 5) maxStores = base.maxStores;
    return {
      ...base,
      name,
      blurb,
      monthlyPrice,
      maxBrands: Math.min(99, Math.max(1, Math.round(Number(patch.maxBrands ?? base.maxBrands) || 1))),
      maxStores,
      allowPartners: Boolean(patch.allowPartners ?? base.allowPartners),
      allowClothImages: Boolean(patch.allowClothImages ?? base.allowClothImages),
      allowProductShare: Boolean(patch.allowProductShare ?? base.allowProductShare),
      allowShareSms: Boolean(patch.allowShareSms ?? base.allowShareSms),
      notifyCustomersOnNewProduct: Boolean(patch.notifyCustomersOnNewProduct ?? base.notifyCustomersOnNewProduct),
      highlight: Boolean(patch.highlight ?? base.highlight),
      features,
    };
  });
  return { annualDiscount, plans };
}

export function planFromList(plans: SubscriptionPlan[], id?: string | null) {
  const resolved = resolvePlanId(id);
  return plans.find((plan) => plan.id === resolved) || plans[0] || SUBSCRIPTION_PLANS[0];
}

export function planFromLegacy(type?: number, planId?: string, plans: SubscriptionPlan[] = SUBSCRIPTION_PLANS) {
  const resolved = resolvePlanId(planId);
  if (resolved && plans.some((plan) => plan.id === resolved)) return planFromList(plans, resolved);
  return plans[0] || SUBSCRIPTION_PLANS[0];
}

export function cycleFromLegacy(type?: number, cycle?: string): BillingCycle {
  if (cycle === 'year' || cycle === 'month') return cycle;
  return type === 3 ? 'year' : 'month';
}

export function planFeatureFlags(plan: SubscriptionPlan) {
  return {
    allowPartners: Boolean(plan.allowPartners),
    allowClothImages: Boolean(plan.allowClothImages),
    allowProductShare: Boolean(plan.allowProductShare),
    allowShareSms: Boolean(plan.allowShareSms),
    notifyCustomersOnNewProduct: Boolean(plan.notifyCustomersOnNewProduct),
  };
}
