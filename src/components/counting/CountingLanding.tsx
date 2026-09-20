import Link from 'next/link';
import type { ComponentType, ReactNode } from 'react';
import {
  ArrowLeft,
  Check,
  FileText,
  Handshake,
  Landmark,
  LayoutDashboard,
  Link2,
  Scissors,
  Settings,
  Shield,
  Shirt,
  Sparkles,
  Undo2,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { BRAND } from '@/lib/brand';
import { faNumber, toman } from '@/lib/format';
import { ANNUAL_DISCOUNT, SUBSCRIPTION_PLANS } from '@/lib/plans';
import { ShopButton } from '@/components/shop/ShopUi';
import { cn } from '@/ui';

type FeatureCard = {
  id: string;
  title: string;
  icon: ComponentType<{ className?: string }>;
  points: string[];
  span?: 'wide' | 'tall' | 'hero';
  tone?: 'ink' | 'saffron' | 'paper';
};

const FEATURES: FeatureCard[] = [
  {
    id: 'dashboard',
    title: 'داشبورد',
    icon: LayoutDashboard,
    span: 'hero',
    tone: 'ink',
    points: [
      'فروش هفته، ماه و سال در یک نگاه',
      'نمودار فروش ماهانه و مقایسه دوره‌ها',
      'سررسید چک، چک برگشتی، مانده نسیه و سهم شرکا',
    ],
  },
  {
    id: 'invoice',
    title: 'فاکتور',
    icon: FileText,
    span: 'wide',
    tone: 'saffron',
    points: ['صدور فاکتور عمده با بسته کامل یا ناقص', 'چاپ فاکتور برای حجره و مشتری', 'اتصال مستقیم به موجودی البسه'],
  },
  {
    id: 'cloth',
    title: 'البسه',
    icon: Shirt,
    span: 'tall',
    points: ['کد، رنگ، سایز، نوع و مدل', 'موجودی حجره به‌روز', 'تصاویر و جزئیات هر لباس'],
  },
  {
    id: 'person',
    title: 'اشخاص',
    icon: Users,
    points: ['مشتری و طرف‌حساب', 'شماره تماس برای پیامک', 'پیوند با فاکتور و حساب'],
  },
  {
    id: 'share',
    title: 'لینک محصول',
    icon: Link2,
    span: 'wide',
    tone: 'paper',
    points: ['ساخت لینک عمومی /s/… برای مشتری', 'ارسال لینک با پیامک (بسته به پلن)', 'انتخاب چند لباس در یک لینک'],
  },
  {
    id: 'images',
    title: 'تصویر محصول',
    icon: Sparkles,
    points: ['ویرایش تصویر با توکن', 'سبک‌های آماده برای ویترین', 'خرید بسته توکن از داخل پنل'],
  },
  {
    id: 'check',
    title: 'چک',
    icon: Landmark,
    points: ['جهت و وضعیت چک', 'سررسید ماه جاری', 'پیگیری چک‌های برگشتی'],
  },
  {
    id: 'account',
    title: 'حساب',
    icon: Wallet,
    points: ['مانده نسیه هر مشتری', 'ثبت پرداخت‌ها', 'دفتر حساب شفاف برای حجره'],
  },
  {
    id: 'fabric',
    title: 'خرید پارچه',
    icon: Scissors,
    points: ['ثبت خرید پارچه جدا از البسه', 'پیگیری هزینه مواد', 'سابقه خرید برای حسابداری'],
  },
  {
    id: 'returned',
    title: 'برگشتی',
    icon: Undo2,
    points: ['ثبت مرجوعی کالا', 'توضیح دلیل برگشت', 'هماهنگی با موجودی و حساب'],
  },
  {
    id: 'workspace',
    title: 'فضای کار',
    icon: Settings,
    points: ['چند برند و چند فروشگاه', 'نقش کارکنان روی هر فروشگاه', 'تنظیمات پروفایل و اشتراک'],
  },
  {
    id: 'admin',
    title: 'ادمین',
    icon: Shield,
    span: 'wide',
    tone: 'ink',
    points: [
      'کاربران و تمدید اشتراک',
      'انتشار البسه در تلگرام و دعوت مشتری',
      'لیست‌های کمکی: رنگ، سایز، نوع و مدل',
    ],
  },
];

const DAY_STEPS = [
  {
    step: '۱',
    title: 'ثبت البسه',
    copy: 'کد، رنگ، سایز و موجودی حجره را وارد کنید تا ویترین آماده باشد.',
    icon: Shirt,
  },
  {
    step: '۲',
    title: 'صدور فاکتور',
    copy: 'بسته کامل یا ناقص را برای مشتری عمده ثبت و در صورت نیاز چاپ کنید.',
    icon: FileText,
  },
  {
    step: '۳',
    title: 'پیگیری چک و نسیه',
    copy: 'سررسید چک‌ها و مانده دفتر را از داشبورد و حساب ببینید.',
    icon: Landmark,
  },
  {
    step: '۴',
    title: 'لینک برای مشتری',
    copy: 'لینک محصول بسازید و با پیامک برای مشتری عمده بفرستید.',
    icon: Link2,
  },
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
  const isDark = feature.tone === 'ink';
  const isSaffron = feature.tone === 'saffron';

  return (
    <article
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-[1.75rem] border p-5 shadow-[0_18px_40px_-24px_rgb(16_28_48_/_0.45)] transition duration-300 hover:-translate-y-1 sm:p-6',
        feature.span === 'hero' && 'md:col-span-2 md:row-span-2',
        feature.span === 'wide' && 'md:col-span-2',
        feature.span === 'tall' && 'md:row-span-2',
        isDark && 'border-white/10 bg-shop-ink text-shop-bone',
        isSaffron && 'border-shop-saffron/40 bg-shop-saffron text-shop-ink',
        !isDark && !isSaffron && 'border-shop-ink/10 bg-shop-paper text-shop-ink',
      )}
    >
      <div
        className={cn(
          'mb-4 flex h-11 w-11 items-center justify-center rounded-2xl',
          isDark && 'bg-white/10 text-shop-saffron',
          isSaffron && 'bg-shop-ink/10 text-shop-ink',
          !isDark && !isSaffron && 'bg-shop-ink/5 text-shop-ink',
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <h3
        className={cn(
          'text-xl font-semibold tracking-tight',
          feature.span === 'hero' && 'sm:text-2xl',
        )}
      >
        {feature.title}
      </h3>
      <ul
        className={cn(
          'mt-3 space-y-2 text-sm leading-7',
          isDark && 'text-shop-bone/75',
          isSaffron && 'text-shop-ink/80',
          !isDark && !isSaffron && 'text-shop-ink/65',
          feature.span === 'hero' && 'sm:mt-4 sm:text-base',
        )}
      >
        {feature.points.map((point) => (
          <li key={point} className="flex gap-2">
            <span
              className={cn(
                'mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full',
                isDark && 'bg-shop-saffron',
                isSaffron && 'bg-shop-ink/70',
                !isDark && !isSaffron && 'bg-shop-saffron',
              )}
            />
            <span>{point}</span>
          </li>
        ))}
      </ul>
      {feature.span === 'hero' ? (
        <div className="pointer-events-none absolute -left-8 bottom-0 h-40 w-40 rounded-full bg-shop-saffron/15 blur-3xl" />
      ) : null}
    </article>
  );
}

export function CountingLanding({ signedIn }: { signedIn: boolean }) {
  const primaryHref = signedIn ? '/counting/dashboard' : '/counting/login';
  const primaryLabel = signedIn ? 'ورود به پنل' : 'ورود';

  return (
    <div data-shop className="min-h-screen bg-shop-bone text-shop-ink" dir="rtl">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-sidebar-gradient/95 text-shop-bone backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 lg:px-6">
          <Link href="/counting" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-sm font-bold text-shop-ink shadow-sm">
              ب
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[15px] font-semibold leading-5">باسار</span>
              <span className="block truncate text-[10px] text-white/45">پنل شمارش · {BRAND.name}</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-5 md:flex">
            <NavLink href="#day">یک روز کاری</NavLink>
            <NavLink href="#features">امکانات</NavLink>
            <NavLink href="#plans">طرح‌ها</NavLink>
          </nav>
          <div className="flex items-center gap-2">
            <ShopButton
              href="/"
              variant="ghost"
              className="hidden px-3 py-2 text-shop-bone/70 hover:bg-white/10 hover:text-shop-bone sm:inline-flex"
            >
              فروشگاه
            </ShopButton>
            <ShopButton href={primaryHref} className="px-4 py-2 text-sm">
              {primaryLabel}
            </ShopButton>
          </div>
        </div>
      </header>

      <section className="relative isolate overflow-hidden bg-shop-ink text-shop-bone">
        <div className="shop-grain absolute inset-0 bg-gradient-to-bl from-shop-ink via-shop-mill/90 to-shop-ink" />
        <div className="pointer-events-none absolute -left-24 top-16 h-72 w-72 rounded-full bg-shop-saffron/20 blur-3xl" />
        <div className="pointer-events-none absolute -right-16 bottom-0 h-80 w-80 rounded-full bg-teal-500/10 blur-3xl" />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:py-20 lg:grid-cols-[1.15fr_0.85fr] lg:items-end lg:px-6 lg:py-28">
          <div>
            <p className="text-[11px] tracking-[0.28em] text-shop-saffron">BASAR · COUNTING</p>
            <h1 className="mt-4 max-w-3xl text-[2.2rem] font-semibold leading-[1.2] sm:text-5xl md:text-6xl">
              حجره را از یک میز اداره کنید
              <span className="mt-2 block text-shop-saffron">فاکتور، چک، البسه و لینک مشتری</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-8 text-shop-bone/75 sm:text-lg">
              پنل شمارش باسار برای تیم {BRAND.name} ساخته شده؛ از موجودی بازار آهنگران تا نسیه دفتر و اشتراک‌گذاری
              محصول با مشتری عمده، همه در یک جا.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ShopButton href={primaryHref} className="px-6 py-3 text-base">
                {primaryLabel}
              </ShopButton>
              <ShopButton
                href="#features"
                variant="outline"
                className="border-white/20 bg-transparent px-6 py-3 text-base text-shop-bone hover:bg-white/5"
              >
                دیدن امکانات
              </ShopButton>
            </div>
            <div className="mt-10 flex flex-wrap gap-3 text-xs text-shop-bone/55">
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">RTL · فارسی</span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">چند برند و فروشگاه</span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">لینک و پیامک محصول</span>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            {[
              { label: 'فروش امروز', value: 'داشبورد زنده', hint: 'هفته · ماه · سال' },
              { label: 'چک در جریان', value: 'سررسید ماه', hint: 'برگشتی جداگانه' },
              { label: 'ویترین دیجیتال', value: 'لینک /s/…', hint: 'پیامک به مشتری' },
              { label: 'فضای کار', value: 'برند + فروشگاه', hint: 'نقش کارکنان' },
            ].map((card) => (
              <div
                key={card.label}
                className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-sm"
              >
                <p className="text-[11px] tracking-wide text-shop-saffron">{card.label}</p>
                <p className="mt-2 text-lg font-semibold text-shop-bone">{card.value}</p>
                <p className="mt-1 text-xs text-shop-bone/50">{card.hint}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="day" className="scroll-mt-24 border-b border-shop-ink/10 bg-shop-paper">
        <div className="mx-auto max-w-7xl px-4 py-14 lg:px-6 lg:py-20">
          <div className="mb-10 max-w-2xl">
            <p className="text-[11px] tracking-[0.28em] text-shop-saffron">یک روز در حجره</p>
            <h2 className="mt-2 text-3xl font-semibold text-shop-ink sm:text-4xl">چهار قدم تا بستن روز</h2>
            <p className="mt-3 text-shop-ink/65 leading-8">
              پنل شمارش مسیر واقعی کار عمده‌فروشی را دنبال می‌کند؛ نه یک لیست انتزاعی از منوها.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {DAY_STEPS.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.step}
                  className="relative overflow-hidden rounded-[1.6rem] border border-shop-ink/10 bg-shop-bone p-5 shadow-sm"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-shop-ink text-shop-saffron">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="font-mono text-3xl font-semibold text-shop-ink/10">{item.step}</span>
                  </div>
                  <h3 className="text-lg font-semibold text-shop-ink">{item.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-shop-ink/65">{item.copy}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section id="features" className="scroll-mt-24">
        <div className="mx-auto max-w-7xl px-4 py-14 lg:px-6 lg:py-20">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
            <div className="max-w-2xl">
              <p className="text-[11px] tracking-[0.28em] text-shop-saffron">محصولات پنل</p>
              <h2 className="mt-2 text-3xl font-semibold text-shop-ink sm:text-4xl">همه امکانات، کارت به کارت</h2>
              <p className="mt-3 text-shop-ink/65 leading-8">
                هر کارت همان بخشی است که در منوی شمارش می‌بینید — با جزئیات واقعی کار حجره، نه شعار عمومی.
              </p>
            </div>
            <p className="rounded-full border border-shop-ink/10 bg-shop-paper px-4 py-2 text-xs text-shop-ink/55">
              {faNumber(FEATURES.length)} ماژول محصول
            </p>
          </div>

          <div className="grid auto-rows-[minmax(11rem,auto)] gap-4 md:grid-cols-2 xl:grid-cols-4">
            {FEATURES.map((feature) => (
              <FeatureArticle key={feature.id} feature={feature} />
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-shop-ink/10 bg-sidebar-gradient text-shop-bone">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 lg:grid-cols-3 lg:px-6 lg:py-16">
          {[
            {
              icon: Handshake,
              title: 'شریک درآمد',
              copy: 'در طرح شرکا و برندها، سهم شرکا روی داشبورد دیده می‌شود تا تقسیم فروش شفاف بماند.',
            },
            {
              icon: Link2,
              title: 'لینک و پیامک',
              copy: 'لینک محصول برای مشتری عمده؛ در پلن‌های بالاتر ارسال پیامک و اطلاع محصول جدید هم هست.',
            },
            {
              icon: Shield,
              title: 'ادمین و تلگرام',
              copy: 'کاربران، اشتراک، لیست‌های کمکی و انتشار البسه در کانال تلگرام از پنل ادمین.',
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="rounded-2xl border border-white/10 bg-white/[0.06] p-5">
                <Icon className="h-5 w-5 text-shop-saffron" />
                <h3 className="mt-3 text-lg font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm leading-7 text-white/65">{item.copy}</p>
              </div>
            );
          })}
        </div>
      </section>

      <section id="plans" className="scroll-mt-24 bg-shop-paper">
        <div className="mx-auto max-w-7xl px-4 py-14 lg:px-6 lg:py-20">
          <div className="mb-10 max-w-2xl">
            <p className="text-[11px] tracking-[0.28em] text-shop-saffron">اشتراک</p>
            <h2 className="mt-2 text-3xl font-semibold text-shop-ink sm:text-4xl">چهار طرح برای رشد حجره</h2>
            <p className="mt-3 text-shop-ink/65 leading-8">
              طرح پایه برند، فروشگاه و شریک درآمد دارد. ویترین اختصاصی (لینک محصول و پرداخت مشتری، مثل فروشگاه خودتان)
              طرح جدا و گران‌تری است. قیمت‌ها ماهانه نمایش داده شده‌اند. اشتراک سالانه {faNumber(ANNUAL_DISCOUNT * 100)}٪
              تخفیف دارد.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {SUBSCRIPTION_PLANS.map((plan) => (
              <article
                key={plan.id}
                className={cn(
                  'flex flex-col rounded-[1.6rem] border bg-shop-bone p-5 shadow-sm',
                  plan.highlight
                    ? 'border-shop-saffron ring-1 ring-shop-saffron'
                    : 'border-shop-ink/10',
                )}
              >
                {plan.highlight ? (
                  <span className="mb-3 w-fit rounded-full bg-shop-saffron/20 px-2.5 py-0.5 text-[11px] font-medium text-shop-ink">
                    پیشنهادی
                  </span>
                ) : (
                  <span className="mb-3 w-fit rounded-full bg-shop-ink/5 px-2.5 py-0.5 text-[11px] font-medium text-shop-ink/55">
                    {plan.name}
                  </span>
                )}
                <h3 className="text-xl font-semibold text-shop-ink">{plan.name}</h3>
                <p className="mt-2 min-h-14 text-sm leading-6 text-shop-ink/60">{plan.blurb}</p>
                <p className="mt-4 text-2xl font-semibold tracking-tight text-shop-ink">
                  {toman(plan.monthlyPrice)}
                </p>
                <p className="text-xs text-shop-ink/45">برای هر ماه</p>
                <ul className="mt-5 flex-1 space-y-2.5 text-sm">
                  {plan.features.map((feature) => (
                    <li key={feature.label} className="flex items-start gap-2">
                      {feature.included ? (
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" />
                      ) : (
                        <X className="mt-0.5 h-4 w-4 shrink-0 text-shop-ink/25" />
                      )}
                      <span className={feature.included ? 'text-shop-ink/80' : 'text-shop-ink/35'}>
                        {feature.label}
                      </span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>

          <p className="mt-6 text-center text-sm text-shop-ink/50">
            برای فعال‌سازی طرح‌ها وارد پنل شوید و از بخش اشتراک در تنظیمات اقدام کنید.
          </p>
        </div>
      </section>

      <section className="relative overflow-hidden bg-shop-ink text-shop-bone">
        <div className="shop-grain absolute inset-0 opacity-80" />
        <div className="relative mx-auto flex max-w-7xl flex-col items-start gap-6 px-4 py-16 sm:items-center sm:text-center lg:px-6 lg:py-24">
          <p className="text-[11px] tracking-[0.28em] text-shop-saffron">آماده شروع</p>
          <h2 className="max-w-3xl text-3xl font-semibold sm:text-4xl md:text-5xl">
            امروز را با داشبورد بشمارید، نه دفتر پراکنده
          </h2>
          <p className="max-w-xl text-shop-bone/70 leading-8">
            وارد پنل شمارش شوید، برند و فروشگاه را انتخاب کنید و از فاکتور تا لینک مشتری را یک‌جا جلو ببرید.
          </p>
          <div className="flex flex-wrap gap-3 sm:justify-center">
            <ShopButton href={primaryHref} className="px-6 py-3 text-base">
              {primaryLabel}
              <ArrowLeft className="h-4 w-4" />
            </ShopButton>
            <ShopButton
              href="/"
              variant="outline"
              className="border-white/20 bg-transparent px-6 py-3 text-base text-shop-bone hover:bg-white/5"
            >
              بازگشت به فروشگاه
            </ShopButton>
          </div>
        </div>
      </section>

      <footer className="border-t border-shop-ink/10 bg-shop-paper">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm text-shop-ink/55 lg:px-6">
          <p>
            باسار · پنل شمارش برای {BRAND.name}
          </p>
          <div className="flex flex-wrap gap-4">
            <Link href="/counting/login" className="hover:text-shop-ink">
              ورود
            </Link>
            <Link href="/" className="hover:text-shop-ink">
              فروشگاه جین پوش
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
