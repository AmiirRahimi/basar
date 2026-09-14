'use client';

import { checkoutWholesale } from '@/actions/shop';
import { Button, FormCard, Input } from '@/ui';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

export function CheckoutForm() {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [message, setMessage] = useState('');
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <FormCard>
      <form
        className="grid gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const res = await checkoutWholesale({ fullName, phone, address });
            setMessage(res.message);
            if (res.ok) router.push('/counting/invoices');
          });
        }}
      >
        <Input label="نام فروشگاه / خریدار" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
        <Input label="موبایل" value={phone} onChange={(e) => setPhone(e.target.value)} dir="ltr" required />
        <Input label="آدرس تحویل" value={address} onChange={(e) => setAddress(e.target.value)} required />
        <p className="text-sm text-muted-foreground">
          برای صدور فاکتور باید وارد پنل شمارش باشید. سفارش روی مشتری عمده ثبت می‌شود.
        </p>
        {message ? <p className="text-sm">{message}</p> : null}
        <Button type="submit" disabled={pending}>
          ثبت سفارش عمده
        </Button>
      </form>
    </FormCard>
  );
}
