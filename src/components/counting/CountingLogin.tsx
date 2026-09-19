'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button, Input, SignInShell, toast } from '@/ui';
import { loginWithOtp, sendOtp } from '@/actions/auth';

function toEnDigits(value: string) {
  return value.replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/\s/g, '');
}

export function CountingLogin() {
  const router = useRouter();
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phonenumber, setPhonenumber] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [requireAdminPassword, setRequireAdminPassword] = useState(false);
  const [pending, start] = useTransition();

  return (
    <SignInShell
      brandName="بازار"
      brandTagline="شمارش و عمده‌فروشی پوشاک"
      welcomeBadge="ورود کارکنان"
      title="ورود به شمارش بازار"
      subtitle="شماره موبایل را وارد کنید تا کد یک‌بارمصرف ارسال شود"
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const phone = toEnDigits(phonenumber);
            if (step === 'phone') {
              if (!/^09\d{9}$/.test(phone)) {
                toast.error('شماره باید با ۰۹ شروع شود');
                return;
              }
              setPhonenumber(phone);
              const otp = await sendOtp(phone);
              if (otp.ok) {
                toast.success(otp.message || 'کد ارسال شد');
                setStep('otp');
              } else {
                toast.error(otp.message || 'ارسال ناموفق');
              }
              return;
            }
            if (requireAdminPassword && !password.trim()) {
              toast.error('رمز ادمین لازم است');
              return;
            }
            const res = await loginWithOtp({
              phonenumber: phone,
              code: toEnDigits(code),
              password: password.trim() ? password : undefined,
            });
            if (res.ok) {
              router.push('/counting/dashboard');
              return;
            }
            if (res.message === 'رمز ادمین لازم است') {
              setRequireAdminPassword(true);
              toast.error(res.message);
              return;
            }
            toast.error(res.message || 'ورود ناموفق');
          });
        }}
      >
        <Input
          label="شماره موبایل"
          value={phonenumber}
          onChange={(e) => setPhonenumber(toEnDigits(e.target.value))}
          disabled={step === 'otp'}
          dir="ltr"
        />
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
          </>
        ) : null}
        <Button type="submit" fullWidth disabled={pending}>
          {step === 'phone' ? 'ادامه' : 'ورود'}
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
        <Link href="/counting" className="font-medium text-primary hover:underline">
          آشنایی با پنل
        </Link>
      </p>
    </SignInShell>
  );
}
