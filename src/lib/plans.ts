export type BillingCycle = 'month' | 'year';
export type PlanId = string;

export type SubscriptionPlan = {
  id: PlanId;
  name: string;
  blurb: string;
  monthlyPrice: number;
  maxBrands: number;
  maxStores: number;
  allowPartners: boolean;
  allowMembers: boolean;
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
export const MAX_SUBSCRIPTION_PLANS = 8;

/** Old `shops` plan is now the same as `partners`. */
export function resolvePlanId(id?: string | null): string | undefined {
  if (!id) return undefined;
  if (id === 'shops') return 'partners';
  return String(id);
}

export function slugPlanId(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32);
}

export function nextPlanId(existing: { id: string }[]) {
  const used = new Set(existing.map((plan) => plan.id));
  let index = existing.length + 1;
  let id = `plan-${index}`;
  while (used.has(id)) {
    index += 1;
    id = `plan-${index}`;
  }
  return id;
}

export function planCardsGridClass(count: number) {
  if (count <= 1) return 'grid max-w-md gap-4';
  if (count === 2) return 'grid gap-4 sm:grid-cols-2';
  if (count === 3) return 'grid gap-4 md:grid-cols-3';
  return 'grid gap-4 sm:grid-cols-2 xl:grid-cols-4';
}

const CORE_FEATURES = {
  invoice: { label: 'فاکتور، چک، البسه و پارچه', included: true as const },
  members: { label: 'افزودن عضو به فروشگاه', included: true as const },
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
    blurb: 'یک برند، یک حجره. کار روز: البسه، فاکتور، پارچه و چک — بدون عضو و بدون شریک.',
    monthlyPrice: MONTHLY_BASE_TOMAN,
    maxBrands: 1,
    maxStores: 1,
    allowPartners: false,
    allowMembers: false,
    allowClothImages: false,
    allowProductShare: false,
    allowShareSms: false,
    notifyCustomersOnNewProduct: false,
    features: [
      { label: 'یک برند', included: true },
      { label: 'یک فروشگاه', included: true },
      CORE_FEATURES.invoice,
      { ...CORE_FEATURES.members, included: false },
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
    blurb: 'دو فروشگاه روی یک برند، افزودن عضو با دسترسی، و ثبت شریک و سهم سود.',
    monthlyPrice: 2_500_000,
    maxBrands: 1,
    maxStores: 2,
    allowPartners: true,
    allowMembers: true,
    allowClothImages: false,
    allowProductShare: false,
    allowShareSms: false,
    notifyCustomersOnNewProduct: false,
    features: [
      { label: 'یک برند', included: true },
      { label: 'تا ۲ فروشگاه', included: true },
      CORE_FEATURES.invoice,
      CORE_FEATURES.members,
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
    blurb: 'برند و فروشگاه نامحدود، عضو و شریک، عکس لباس، لینک مشتری و پرداخت.',
    monthlyPrice: HIGHEST_PLAN_TOMAN,
    maxBrands: 99,
    maxStores: 99,
    allowPartners: true,
    allowMembers: true,
    allowClothImages: true,
    allowProductShare: true,
    allowShareSms: true,
    notifyCustomersOnNewProduct: true,
    highlight: true,
    features: [
      { label: 'برند نامحدود', included: true },
      { label: 'فروشگاه نامحدود', included: true },
      CORE_FEATURES.invoice,
      CORE_FEATURES.members,
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

export function isHighestPlan(id?: string | null, plans: SubscriptionPlan[] = SUBSCRIPTION_PLANS) {
  const plan = planFromList(plans, id);
  return Boolean(plan.allowProductShare && plan.allowClothImages) || (plan.maxStores >= 99 && plan.maxBrands >= 99);
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
  const source =
    Array.isArray(stored?.plans) && stored.plans.length ? stored.plans : SUBSCRIPTION_PLANS;
  const used = new Set<string>();
  const plans: SubscriptionPlan[] = [];
  for (const rawPlan of source) {
    if (String(rawPlan.id || '') === 'shops') continue;
    const resolved = resolvePlanId(String(rawPlan.id || ''));
    const base = SUBSCRIPTION_PLANS.find((plan) => plan.id === resolved) || blankPlan(nextPlanId(plans));
    const plan = sanitizePlan(rawPlan, base, used);
    if (!plan) continue;
    plans.push(plan);
    if (plans.length >= MAX_SUBSCRIPTION_PLANS) break;
  }
  if (!plans.length) {
    return {
      annualDiscount,
      plans: SUBSCRIPTION_PLANS.map((plan) => ({ ...plan, features: plan.features.map((row) => ({ ...row })) })),
    };
  }
  return { annualDiscount, plans };
}

function blankPlan(id: string): SubscriptionPlan {
  const starter = SUBSCRIPTION_PLANS[0];
  return {
    ...starter,
    id,
    name: 'طرح جدید',
    blurb: '',
    monthlyPrice: MONTHLY_BASE_TOMAN,
    maxBrands: 1,
    maxStores: 1,
    allowPartners: false,
    allowMembers: false,
    allowClothImages: false,
    allowProductShare: false,
    allowShareSms: false,
    notifyCustomersOnNewProduct: false,
    highlight: false,
    features: starter.features.map((row) => ({ ...row })),
  };
}

function sanitizePlan(
  patch: Partial<SubscriptionPlan> & { id?: string },
  base: SubscriptionPlan,
  used: Set<string>,
): SubscriptionPlan | null {
  let id = slugPlanId(String(resolvePlanId(patch.id) || base.id || ''));
  if (!id) id = nextPlanId([...used].map((value) => ({ id: value })));
  if (used.has(id)) id = nextPlanId([...used].map((value) => ({ id: value })));
  used.add(id);
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
    id,
    name,
    blurb,
    monthlyPrice,
    maxBrands: Math.min(99, Math.max(1, Math.round(Number(patch.maxBrands ?? base.maxBrands) || 1))),
    maxStores,
    allowPartners: Boolean(patch.allowPartners ?? base.allowPartners),
    allowMembers: Boolean(patch.allowMembers ?? base.allowMembers),
    allowClothImages: Boolean(patch.allowClothImages ?? base.allowClothImages),
    allowProductShare: Boolean(patch.allowProductShare ?? base.allowProductShare),
    allowShareSms: Boolean(patch.allowShareSms ?? base.allowShareSms),
    notifyCustomersOnNewProduct: Boolean(patch.notifyCustomersOnNewProduct ?? base.notifyCustomersOnNewProduct),
    highlight: Boolean(patch.highlight ?? base.highlight),
    features,
  };
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
    allowMembers: Boolean(plan.allowMembers),
    allowClothImages: Boolean(plan.allowClothImages),
    allowProductShare: Boolean(plan.allowProductShare),
    allowShareSms: Boolean(plan.allowShareSms),
    notifyCustomersOnNewProduct: Boolean(plan.notifyCustomersOnNewProduct),
  };
}
