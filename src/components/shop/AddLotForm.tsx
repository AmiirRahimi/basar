'use client';

import { Button, Input } from '@/ui';
import { addToCart } from '@/actions/shop';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

export function AddLotForm({
  productId,
  minOrderQty,
}: {
  productId: string;
  minOrderQty: number;
}) {
  const [qty, setQty] = useState(minOrderQty);
  const [message, setMessage] = useState('');
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await addToCart(productId, Number(qty), minOrderQty);
          setMessage(res.message);
          if (res.ok) router.refresh();
        });
      }}
    >
      <Input
        label="تعداد (لات عمده)"
        type="number"
        min={minOrderQty}
        value={qty}
        onChange={(e) => setQty(Number(e.target.value))}
      />
      <Button type="submit" disabled={pending} fullWidth>
        افزودن به سبد عمده
      </Button>
      {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
    </form>
  );
}
