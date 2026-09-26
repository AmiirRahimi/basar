'use client';

import { loginShopWithOtp } from '@/actions/shop-account';
import { sendOtp } from '@/actions/auth';
import { OTP_TTL_MS } from '@/lib/constants';
import { shopReturnPath } from '@/lib/shop-account';
import { faNumber } from '@/lib/format';
import { Input, toast } from '@/ui';
import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ShopButton } from './ShopUi';

function toEnDigits(value: string) {
  return value.replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit))).replace(/\s/g, '');
}

function formatRemaining(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes <= 0) return `${faNumber(seconds)} ثانیه`;
  if (seconds <= 0) return `${faNumber(minutes)} دقیقه`;
  return `${faNumber(minutes)} دقیقه و ${faNumber(seconds)} ثانیه`;
}

export function ShopLogin({ next = '' }: { next?: string }) {
  const router = useRouter();
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phonenumber, setPhonenumber] = useState('');
  const [code, setCode] = useState('');
  const [otpSentAt, setOtpSentAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [pending, start] = useTransition();
  const returnPath = shopReturnPath(next);

  useEffect(() => {
    if (step !== 'otp' || otpSentAt == null) return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [step, otpSentAt]);

  const secondsLeft =
    step === 'otp' && otpSentAt != null ? Math.max(0, Math.ceil((otpSentAt + OTP_TTL_MS - now) / 1000)) : 0;
  const canResend = step === 'otp' && otpSentAt != null && secondsLeft <= 0;

  function requestOtp(phone: string) {
    start(async () => {
      if (!/^09\d{9}$/.test(phone)) {
        toast.error('شماره باید با ۰۹ شروع شود');
        return;
      }
      const otp = await sendOtp(phone);
      if (!otp.ok) {
        toast.error(otp.message || 'ارسال ناموفق');
        return;
      }
      toast.success(otp.message || 'کد ارسال شد', { duration: 15000 });
      const sentAt = Date.now();
      setPhonenumber(phone);
      setCode('');
      setOtpSentAt(sentAt);
      setNow(sentAt);
      setStep('otp');
    });
  }

  return (
    <section className="mx-auto grid max-w-6xl gap-8 px-4 py-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:items-stretch lg:px-6 lg:py-16" dir="rtl">
      <div className="relative overflow-hidden rounded-[2rem] bg-shop-ink px-6 py-10 text-shop-bone sm:px-10 sm:py-14">
        <div className="absolute -left-16 top-10 h-40 w-40 rounded-full bg-shop-saffron/20 blur-3xl" />
        <p className="text-[11px] tracking-[0.28em] text-shop-saffron">جین پوش</p>
        <h1 className="mt-3 max-w-md text-4xl font-semibold leading-tight sm:text-5xl">ورود با همان شماره موبایل</h1>
        <p className="mt-4 max-w-md text-sm leading-7 text-shop-bone/70">
          اگر در شمارش حساب دارید، همان حساب اینجاست. اگر نه، با همین شماره ساخته می‌شود. بعد از ورود، نام و آدرس تحویل را در
          حساب کامل می‌کنید.
        </p>
        <ol className="mt-8 grid gap-3 text-sm text-shop-bone/80">
          <li className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">۱. شماره موبایل</li>
          <li className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">۲. کد یک‌بارمصرف</li>
          <li className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">۳. تکمیل آدرس، کد پستی و تلفن ثابت</li>
        </ol>
      </div>

      <form
        className="flex flex-col justify-center rounded-[2rem] border border-shop-ink/10 bg-shop-paper p-6 shadow-sm sm:p-8"
        onSubmit={(event) => {
          event.preventDefault();
          const phone = toEnDigits(phonenumber);
          if (step === 'phone') {
            requestOtp(phone);
            return;
          }
          start(async () => {
            const res = await loginShopWithOtp(phone, toEnDigits(code));
            if (!res.ok) {
              toast.error(res.message || 'ورود ناموفق');
              return;
            }
            toast.success(res.message || 'ورود موفق');
            const data = (res.data || {}) as { complete?: boolean };
            router.push(data.complete ? returnPath || '/' : '/account');
            router.refresh();
          });
        }}
      >
        <p className="text-[11px] tracking-[0.22em] text-shop-ink/45">{step === 'otp' ? 'تایید شماره' : 'ورود یا ساخت حساب'}</p>
        <h2 className="mt-2 text-2xl font-semibold text-shop-ink">
          {step === 'otp' ? 'کد را وارد کنید' : 'شماره موبایل'}
        </h2>
        <p className="mt-2 text-sm leading-7 text-shop-ink/60">
          {step === 'otp'
            ? `کد برای ${phonenumber} فرستاده شد.`
            : 'فقط شماره لازم است. اگر حساب باشد وارد می‌شوید و اگر نباشد ساخته می‌شود.'}
        </p>

        {step === 'phone' ? (
          <div className="mt-6">
            <Input
              label="موبایل"
              dir="ltr"
              inputMode="tel"
              autoComplete="tel"
              placeholder="09xxxxxxxxx"
              value={phonenumber}
              onChange={(event) => setPhonenumber(toEnDigits(event.target.value).slice(0, 11))}
              required
            />
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            <Input
              label="کد یک‌بارمصرف"
              dir="ltr"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="------"
              className="text-center tracking-[0.4em]"
              value={code}
              onChange={(event) => setCode(toEnDigits(event.target.value).replace(/\D/g, '').slice(0, 6))}
              required
            />
            <div className="flex items-center justify-between gap-3 text-xs text-shop-ink/55">
              <button type="button" className="underline-offset-4 hover:underline" onClick={() => setStep('phone')}>
                تغییر شماره
              </button>
              {canResend ? (
                <button type="button" className="text-shop-ink hover:text-shop-saffron" onClick={() => requestOtp(phonenumber)} disabled={pending}>
                  ارسال دوباره
                </button>
              ) : (
                <span>ارسال دوباره تا {formatRemaining(secondsLeft)}</span>
              )}
            </div>
          </div>
        )}

        <ShopButton type="submit" disabled={pending} className="mt-6 w-full py-3">
          {pending ? 'لطفاً صبر کنید...' : step === 'phone' ? 'ادامه' : 'ورود'}
        </ShopButton>
      </form>
    </section>
  );
}
