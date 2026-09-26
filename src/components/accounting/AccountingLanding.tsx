import Link from 'next/link';
import type { ComponentType, ReactNode } from 'react';
import {
  ArrowLeft,
  Building2,
  Check,
  FileText,
  Handshake,
  Layers,
  Link2,
  MessageSquare,
  ScrollText,
  Shield,
  Shirt,
  Sparkles,
  Store,
  X,
} from 'lucide-react';
import { JsonLd } from '@/components/seo/JsonLd';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { BRAND } from '@/lib/brand';
import { faNumber, toman } from '@/lib/format';
import { accountingSoftwareLd } from '@/lib/json-ld';
import { ANNUAL_DISCOUNT, SUBSCRIPTION_PLANS, planCardsGridClass } from '@/lib/plans';
import { ShopButton } from '@/components/shop/ShopUi';
import { cn } from '@/ui';

type FeatureCard = {
  id: string;
  title: string;
  copy: string;
  icon: ComponentType<{ className?: string }>;
  tone: 'ink' | 'saffron' | 'paper' | 'wash';
  className: string;
};

const FEATURES: FeatureCard[] = [
  {
    id: 'cloth',
    title: 'هر لباس، کامل',
    copy: 'برای هر مدل پارچه، خیاط، شست‌وشو و چاپ رو جدا ثبت کن. بعداً می‌فهمی این شلوار از کجا اومده و به کی بدهکاری.',
    icon: Shirt,
    tone: 'ink',
    className:
      'md:col-span-4 md:row-span-2 rounded-[2.6rem] rounded-bl-2xl md:min-h-[22rem]',
  },
  {
    id: 'invoice',
    title: 'فاکتور و چاپ',
    copy: 'فاکتور عمده رو همون لحظه بزن و چاپ بگیر. مشتری معطل نشه، تو هم یادداشت نکن.',
    icon: FileText,
    tone: 'saffron',
    className: 'md:col-span-2 rounded-[1.4rem] rounded-tr-[3.2rem] md:-rotate-1',
  },
  {
    id: 'bijak',
    title: 'بیجک',
    copy: 'بیجک رو از روی همون فاکتور بساز و چاپ کن. بار که می‌ره، کاغذش هم آماده‌ست.',
    icon: ScrollText,
    tone: 'paper',
    className: 'md:col-span-2 rounded-[2.2rem] rounded-bl-[3rem] md:rotate-1',
  },
  {
    id: 'photos',
    title: 'عکس با هوش مصنوعی',
    copy: 'عکس لباس رو بذار؛ پس‌زمینه رو بردار یا هر جور که می‌خوای ادیت کن. ویترین تمیز می‌مونه.',
    icon: Sparkles,
    tone: 'wash',
    className: 'md:col-span-3 rounded-[2.8rem] rounded-tl-xl',
  },
  {
    id: 'share',
    title: 'لینک اختصاصی',
    copy: 'برای مشتری یک لینک بساز، مثل ویترین خودت. مدل‌ها رو می‌بینه، انتخاب می‌کنه، می‌خره.',
    icon: Link2,
    tone: 'ink',
    className: 'md:col-span-3 rounded-3xl rounded-br-[3.4rem] md:-rotate-[0.6deg]',
  },
  {
    id: 'stores',
    title: 'چند فروشگاه',
    copy: 'چند حجره داشته باش. لباس رو بینشون شریک کن یا فقط مال یک جا نگه دار.',
    icon: Building2,
    tone: 'paper',
    className: 'md:col-span-2 rounded-[1.75rem] rounded-tl-[2.8rem]',
  },
  {
    id: 'brands',
    title: 'چند برند',
    copy: 'هر برند یک فروشگاه یا چند تا. کارها قاطی نمی‌شه.',
    icon: Layers,
    tone: 'saffron',
    className: 'md:col-span-2 rounded-[2.4rem] md:rotate-1',
  },
  {
    id: 'partners',
    title: 'شریک و سود',
    copy: 'شریک رو روی برند یا فروشگاه بذار. سهم هر کس جدا دیده می‌شه.',
    icon: Handshake,
    tone: 'wash',
    className: 'md:col-span-2 rounded-2xl rounded-br-[2.8rem]',
  },
  {
    id: 'privacy',
    title: 'فقط خودت می‌بینی',
    copy: 'داده‌ها مال خودته. کس دیگه‌ای از حجره تو خبر نداره.',
    icon: Shield,
    tone: 'ink',
    className: 'md:col-span-2 rounded-[2.1rem] rounded-tr-[3rem] md:-rotate-1',
  },
  {
    id: 'sms',
    title: 'پیامک محصول جدید',
    copy: 'مدل تازه که اومد، برای مشتری‌ها خودش پیامک می‌ره. تو دنبال شماره نگرد.',
    icon: MessageSquare,
    tone: 'paper',
    className: 'md:col-span-2 rounded-[1.9rem] rounded-bl-[2.6rem]',
  },
  {
    id: 'shop',
    title: 'فروش در فروشگاه آنلاین',
    copy: 'لباس رو روی فروشگاه بذار و مستقیم بفروش. از حجره تا خرید آنلاین، یک مسیر.',
    icon: Store,
    tone: 'saffron',
    className: 'md:col-span-2 rounded-[2.5rem] rounded-tl-[1rem] md:rotate-[0.8deg]',
  },
];

const BENEFITS = [
  'دفتر و چک و موجودی توی یک جا جمع می‌شه؛ شب که می‌بندی، گیج نیستی.',
  'مشتری عمده لینک می‌گیره، خودش می‌بینه و سفارش می‌ده. تو فقط آماده کن.',
  'هر لباس هزینه‌اش مشخصه: پارچه، خیاط، شست، چاپ. سود رو حدس نمی‌زنی.',
];

function NavLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} className="text-sm text-shop-bone/70 transition hover:text-shop-saffron">
      {children}
    </a>
  );
}

function FeatureArticle({ feature }: { feature: FeatureCard }) {
  const Icon = feature.icon;
  const tone = {
    ink: {
      card: 'border-white/10 bg-shop-ink text-shop-bone',
      icon: 'bg-white/10 text-shop-saffron',
      copy: 'text-shop-bone/80',
      title: 'text-shop-bone',
    },
    saffron: {
      card: 'border-shop-saffron/35 bg-shop-saffron text-shop-ink',
      icon: 'bg-shop-ink/10 text-shop-ink',
      copy: 'text-shop-ink/80',
      title: 'text-shop-ink',
    },
    paper: {
      card: 'border-shop-ink/10 bg-shop-paper text-shop-ink',
      icon: 'bg-shop-ink/5 text-shop-ink',
      copy: 'text-shop-ink/70',
      title: 'text-shop-ink',
    },
    wash: {
      card: 'border-teal-800/10 bg-teal-50 text-teal-950',
      icon: 'bg-teal-900/10 text-teal-900',
      copy: 'text-teal-950/75',
      title: 'text-teal-950',
    },
  }[feature.tone];

  return (
    <article
      {...(feature.tone === 'ink' ? { 'data-shop-dark': true } : {})}
      className={cn(
        'col-span-2 flex flex-col justify-between overflow-hidden border p-5 shadow-[0_16px_36px_-28px_rgb(16_28_48_/_0.55)] transition duration-300 hover:z-10 hover:rotate-0 sm:p-6',
        tone.card,
        feature.className,
      )}
    >
      <div>
        <span className={cn('mb-4 flex h-11 w-11 items-center justify-center rounded-2xl', tone.icon)}>
          <Icon className="h-5 w-5" />
        </span>
        <h3 className={cn('text-xl font-semibold tracking-tight sm:text-[1.35rem]', tone.title)}>{feature.title}</h3>
      </div>
      <p className={cn('mt-3 text-sm leading-7 sm:text-[15px]', tone.copy)}>{feature.copy}</p>
    </article>
  );
}

export function AccountingLanding({
  signedIn,
  catalog,
}: {
  signedIn: boolean;
  catalog?: { annualDiscount: number; plans: typeof SUBSCRIPTION_PLANS };
}) {
  const primaryHref = signedIn ? '/accounting/dashboard' : '/accounting/login';
  const primaryLabel = signedIn ? 'ورود به پنل' : 'ورود';
  const annualDiscount = catalog?.annualDiscount ?? ANNUAL_DISCOUNT;
  const plans = catalog?.plans?.length ? catalog.plans : SUBSCRIPTION_PLANS;

  return (
    <div data-shop className="min-h-screen bg-shop-bone text-shop-ink" dir="rtl">
      <JsonLd data={accountingSoftwareLd()} />
      <header data-shop-dark className="sticky top-0 z-40 border-b border-white/10 bg-shop-ink/95 text-shop-bone backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 lg:px-6">
          <Link href="/accounting" className="flex items-center gap-2.5">
            <BrandLogo variant="mark" className="h-9 w-9 shrink-0" />
            <span className="min-w-0">
              <span className="block truncate text-[15px] font-semibold leading-5">باسار</span>
              <span className="block max-w-[11rem] text-[10px] leading-4 text-shop-bone/70">
                نرم‌افزار حسابداری تحت وب مخصوص عمده‌فروشی
              </span>
            </span>
          </Link>
          <nav className="hidden items-center gap-5 md:flex">
            <NavLink href="#features">امکانات</NavLink>
            <NavLink href="#plans">طرح‌ها</NavLink>
          </nav>
          <div className="flex items-center gap-2">
            <ShopButton
              href="/"
              variant="ghostDark"
              className="hidden px-3 py-2 sm:inline-flex"
            >
              فروشگاه
            </ShopButton>
            <ShopButton href={primaryHref} className="px-4 py-2 text-sm">
              {primaryLabel}
            </ShopButton>
          </div>
        </div>
      </header>

      <section data-shop-dark className="relative isolate overflow-hidden bg-shop-ink text-shop-bone">
        <div className="shop-grain absolute inset-0 bg-gradient-to-bl from-shop-ink via-shop-mill/90 to-shop-ink" />
        <div className="pointer-events-none absolute -left-24 top-16 h-72 w-72 rounded-full bg-shop-saffron/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-16 bottom-0 h-80 w-80 rounded-full bg-teal-500/10 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:py-20 lg:px-6 lg:py-28">
          <p className="text-[11px] leading-6 text-shop-saffron sm:text-sm">
            نرم‌افزار حسابداری تحت وب مخصوص عمده‌فروشی
          </p>
          <h1 className="mt-4 max-w-3xl text-[2.15rem] font-semibold leading-[1.25] text-shop-bone sm:text-5xl md:text-[3.4rem]">
            حجره لباس رو از روی دفتر پاره اداره نکن
            <span className="mt-2 block text-shop-saffron">از پارچه تا فروش، همه‌ش اینجاست</span>
          </h1>
          <p className="mt-5 max-w-xl text-base leading-8 text-shop-bone/75 sm:text-lg">
            باسار حسابداری وبه، فقط برای عمده‌فروشی لباس — شلوار، پیراهن، تیشرت و هر مدلی که می‌فروشی. موجودی،
            فاکتور، شریک و مشتری یک‌جا می‌مونه تا سر ماه حساب‌ها قاطی نشه.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ShopButton href={primaryHref} className="px-6 py-3 text-base">
              {primaryLabel}
            </ShopButton>
            <ShopButton
              href="#features"
              variant="outlineDark"
              className="px-6 py-3 text-base"
            >
              ببین چی داخلش هست
            </ShopButton>
          </div>
        </div>
      </section>

      <section id="features" className="scroll-mt-24">
        <div className="mx-auto max-w-7xl px-4 py-14 lg:px-6 lg:py-20">
          <div className="mb-8 max-w-2xl">
            <p className="text-[11px] tracking-[0.22em] text-shop-saffron">امکانات</p>
            <h2 className="mt-2 text-3xl font-semibold text-shop-ink sm:text-4xl">کار روز حجره، روی چند کارت کنار هم</h2>
            <p className="mt-3 leading-8 text-shop-ink/65">
            حسابداری عمومی نیست؛ مخصوص عمده‌فروشی پوشاکه. برای کسی که لباس می‌خره، می‌دوزه، می‌شوره و عمده می‌فروشه.
            </p>
          </div>

          <div className="grid grid-cols-2 items-stretch gap-3 md:grid-cols-6 md:gap-3">
            {FEATURES.map((feature) => (
              <FeatureArticle key={feature.id} feature={feature} />
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-shop-ink/10 bg-shop-paper">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-12 md:grid-cols-3 lg:px-6 lg:py-16">
          {BENEFITS.map((copy, index) => (
            <p key={copy} className="text-base leading-8 text-shop-ink/80">
              <span className="mb-2 block font-mono text-sm text-shop-saffron">{faNumber(index + 1)}</span>
              {copy}
            </p>
          ))}
        </div>
      </section>

      <section id="plans" className="scroll-mt-24 bg-shop-paper">
        <div className="mx-auto max-w-7xl px-4 py-14 lg:px-6 lg:py-20">
          <div className="mb-10 max-w-2xl">
            <p className="text-[11px] tracking-[0.22em] text-shop-saffron">اشتراک</p>
            <h2 className="mt-2 text-3xl font-semibold text-shop-ink sm:text-4xl">هر حجره به اندازه خودش شروع می‌کنه</h2>
            <p className="mt-3 leading-8 text-shop-ink/65">
              از یک فروشگاه ساده تا چند برند و ویترین لینک‌دار. قیمت‌ها ماهانه‌ان؛ سالانه {faNumber(annualDiscount * 100)}٪
              کمتر می‌دی.
            </p>
          </div>

          <div className={planCardsGridClass(plans.length)}>
            {plans.map((plan) => (
              <article
                key={plan.id}
                className={cn(
                  'flex flex-col rounded-[1.6rem] border bg-shop-bone p-5 shadow-sm',
                  plan.highlight ? 'border-shop-saffron ring-1 ring-shop-saffron' : 'border-shop-ink/10',
                )}
              >
                {plan.highlight ? (
                  <span className="mb-3 w-fit rounded-full bg-shop-saffron/20 px-2.5 py-0.5 text-[11px] font-medium text-shop-ink">
                    مناسب ویترین
                  </span>
                ) : (
                  <span className="mb-3 w-fit rounded-full bg-shop-ink/5 px-2.5 py-0.5 text-[11px] font-medium text-shop-ink/55">
                    {plan.name}
                  </span>
                )}
                <h3 className="text-xl font-semibold text-shop-ink">{plan.name}</h3>
                <p className="mt-2 min-h-14 text-sm leading-6 text-shop-ink/60">{plan.blurb}</p>
                <p className="mt-4 text-2xl font-semibold tracking-tight text-shop-ink">{toman(plan.monthlyPrice)}</p>
                <p className="text-xs text-shop-ink/45">برای هر ماه</p>
                <ul className="mt-5 flex-1 space-y-2.5 text-sm">
                  {plan.features.map((feature) => (
                    <li key={feature.label} className="flex items-start gap-2">
                      {feature.included ? (
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" />
                      ) : (
                        <X className="mt-0.5 h-4 w-4 shrink-0 text-shop-ink/25" />
                      )}
                      <span className={feature.included ? 'text-shop-ink/80' : 'text-shop-ink/35'}>{feature.label}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>

          <p className="mt-6 text-center text-sm text-shop-ink/50">طرح رو بعد از ورود، از تنظیمات پنل فعال می‌کنی.</p>
        </div>
      </section>

      <section data-shop-dark className="relative overflow-hidden bg-shop-ink text-shop-bone">
        <div className="shop-grain absolute inset-0 opacity-80" />
        <div className="relative mx-auto flex max-w-7xl flex-col items-start gap-6 px-4 py-16 sm:items-center sm:text-center lg:px-6 lg:py-24">
          <p className="text-[11px] tracking-[0.22em] text-shop-saffron">شروع</p>
          <h2 className="max-w-3xl text-3xl font-semibold text-shop-bone sm:text-4xl md:text-5xl">یک هفته باهاش کار کن؛ دفتر رو کنار می‌ذاری</h2>
          <p className="max-w-xl leading-8 text-shop-bone/70">
            وارد شو، برند و فروشگاه رو بساز، لباس‌ها رو بذار. حسابداری عمده‌فروشی‌ات روی وب می‌مونه؛ دفتر رو کنار می‌ذاری.
          </p>
          <div className="flex flex-wrap gap-3 sm:justify-center">
            <ShopButton href={primaryHref} className="px-6 py-3 text-base">
              {primaryLabel}
              <ArrowLeft className="h-4 w-4" />
            </ShopButton>
            <ShopButton
              href="/"
              variant="outlineDark"
              className="px-6 py-3 text-base"
            >
              فروشگاه باسار
            </ShopButton>
          </div>
        </div>
      </section>

      <footer className="border-t border-shop-ink/10 bg-shop-paper">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm text-shop-ink/55 lg:px-6">
          <p>باسار · نرم‌افزار حسابداری تحت وب مخصوص عمده‌فروشی</p>
          <div className="flex flex-wrap gap-4">
            <Link href="/accounting/login" className="hover:text-shop-ink">
              ورود
            </Link>
            <Link href="/" className="hover:text-shop-ink">
              فروشگاه {BRAND.name}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
