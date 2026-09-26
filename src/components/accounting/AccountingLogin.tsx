'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button, Input, SignInShell, toast } from '@/ui';
import { loginWithOtp, sendOtp } from '@/actions/auth';
import { OTP_TTL_MS } from '@/lib/constants';
import { faNumber } from '@/lib/format';

function toEnDigits(value: string) {
  return value.replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/\s/g, '');
}

function formatRemaining(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes <= 0) return `${faNumber(seconds)} ثانیه`;
  if (seconds <= 0) return `${faNumber(minutes)} دقیقه`;
  return `${faNumber(minutes)} دقیقه و ${faNumber(seconds)} ثانیه`;
}

export function AccountingLogin() {
  const router = useRouter();
  const search = useSearchParams();
  const inviteToken = search.get('invite') || '';
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phonenumber, setPhonenumber] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [requireAdminPassword, setRequireAdminPassword] = useState(false);
  const [otpSentAt, setOtpSentAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [pending, start] = useTransition();

  useEffect(() => {
    if (step !== 'otp' || otpSentAt == null) return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [step, otpSentAt]);

  function resetToPhone() {
    setStep('phone');
    setCode('');
    setPassword('');
    setRequireAdminPassword(false);
    setOtpSentAt(null);
  }

  async function requestOtp(phone: string) {
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
  }

  const secondsLeft =
    step === 'otp' && otpSentAt != null
      ? Math.max(0, Math.ceil((otpSentAt + OTP_TTL_MS - now) / 1000))
      : 0;
  const canResend = step === 'otp' && otpSentAt != null && secondsLeft <= 0;

  return (
    <SignInShell
      logoSrc="/brand/logo-mark.png"
      logoAlt="باسار"
      logoHref="/accounting"
      brandName="باسار"
      brandTagline="نرم‌افزار حسابداری تحت وب مخصوص عمده‌فروشی"
      welcomeBadge="ورود کارکنان"
      title="ورود به باسار"
      subtitle={
        step === 'otp'
          ? 'کد ارسال‌شده را وارد کنید'
          : 'شماره موبایل را وارد کنید تا کد یک‌بارمصرف ارسال شود'
      }
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const phone = toEnDigits(phonenumber);
            if (step === 'phone') {
              await requestOtp(phone);
              return;
            }
            if (requireAdminPassword && !password.trim()) {
              return;
            }
            const res = await loginWithOtp({
              phonenumber: phone,
              code: toEnDigits(code),
              password: password.trim() ? password : undefined,
            });
            if (res.ok) {
              router.push(inviteToken ? `/accounting/invite/${inviteToken}` : '/accounting/dashboard');
              return;
            }
            if (res.message === 'رمز ادمین لازم است') {
              setRequireAdminPassword(true);
              return;
            }
            toast.error(res.message || 'ورود ناموفق');
          });
        }}
      >
        <div className="space-y-1">
          <Input
            label="شماره موبایل"
            value={phonenumber}
            onChange={(e) => setPhonenumber(toEnDigits(e.target.value))}
            disabled={step === 'otp'}
            dir="ltr"
          />
          {step === 'otp' ? (
            <div className="text-start">
              <Button
                type="button"
                variant="link"
                size="sm"
                className="h-auto px-0"
                disabled={pending}
                onClick={resetToPhone}
              >
                تغییر شماره
              </Button>
            </div>
          ) : null}
        </div>
        {step === 'otp' ? (
          <>
            <Input
              label="کد تایید"
              value={code}
              onChange={(e) => setCode(toEnDigits(e.target.value))}
              dir="ltr"
            />
            {requireAdminPassword ? (
              <Input
                label="رمز ادمین"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            ) : null}
            {canResend ? (
              <Button
                type="button"
                variant="link"
                size="sm"
                className="h-auto px-0"
                disabled={pending}
                onClick={() => start(async () => requestOtp(toEnDigits(phonenumber)))}
              >
                ارسال مجدد کد
              </Button>
            ) : (
              <p className="text-start text-sm text-gray-500">
                ارسال مجدد تا {formatRemaining(secondsLeft)}
              </p>
            )}
          </>
        ) : null}
        <Button type="submit" fullWidth disabled={pending}>
          {step === 'phone' ? 'ادامه' : 'ورود'}
        </Button>
      </form>
    </SignInShell>
  );
}
