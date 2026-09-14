'use client';

import { updateCartQty } from '@/actions/shop';
import { Input } from '@/ui';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

export function CartEditor({
  productId,
  qty,
  minOrderQty,
}: {
  productId: string;
  qty: number;
  minOrderQty: number;
}) {
  const router = useRouter();
  const [, start] = useTransition();
  return (
    <Input
      type="number"
      className="w-24"
      value={qty}
      min={0}
      onChange={(e) => {
        const next = Number(e.target.value);
        start(async () => {
          await updateCartQty(productId, next, minOrderQty);
          router.refresh();
        });
      }}
    />
  );
}
