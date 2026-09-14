'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input, SignInShell } from '@/ui';
import { checkPhone, loginWithOtp, sendOtp } from '@/actions/auth';

export function CountingLogin() {
  const router = useRouter();
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phonenumber, setPhonenumber] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
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
            if (step === 'phone') {
              if (!/^09\d{9}$/.test(phonenumber)) {
                setMessage('شماره باید با ۰۹ شروع شود');
                return;
              }
              await checkPhone(phonenumber);
              const otp = await sendOtp(phonenumber);
              setMessage(otp.ok ? 'کد ارسال شد' : otp.message);
              if (otp.ok) setStep('otp');
              return;
            }
            const res = await loginWithOtp({ phonenumber, code, password: password || undefined });
            if (res.ok) router.push('/counting/dashboard');
            else setMessage(res.message || 'ورود ناموفق');
          });
        }}
      >
        <Input
          label="شماره موبایل"
          value={phonenumber}
          onChange={(e) => setPhonenumber(e.target.value)}
          disabled={step === 'otp'}
          dir="ltr"
        />
        {step === 'otp' ? (
          <>
            <Input label="کد تایید" value={code} onChange={(e) => setCode(e.target.value)} dir="ltr" />
            <Input
              label="رمز ادمین (اختیاری)"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </>
        ) : null}
        {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
        <Button type="submit" fullWidth disabled={pending}>
          {step === 'phone' ? 'ادامه' : 'ورود'}
        </Button>
      </form>
    </SignInShell>
  );
}
