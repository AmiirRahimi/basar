'use client';

import { faNumber, toman } from '@/lib/format';
import {
  appendLargestPack,
  defaultPackToTake,
  formatPacksFa,
  leftoverOnlyStock,
  orderToPacks,
  popLastPack,
  remainingAfter,
  totalItems,
  totalPacks,
  type ClothPack,
} from '@/lib/packs';
import { Minus, Plus } from 'lucide-react';

export function ShopPackPicker({
  packSize,
  available,
  taken = [],
  takenOrder,
  unitPrice,
  minOrderQty,
  pending,
  mode = 'add',
  onSubmit,
  onChange,
  onRemove,
}: {
  packSize: number;
  available: ClothPack[];
  taken?: ClothPack[];
  takenOrder?: number[];
  unitPrice: number;
  minOrderQty: number;
  pending?: boolean;
  mode?: 'add' | 'edit';
  onSubmit?: (packs: ClothPack[], takenOrder: number[]) => Promise<void> | void;
  onChange?: (packs: ClothPack[], takenOrder: number[]) => Promise<void> | void;
  onRemove?: () => void;
}) {
  const order = takenOrder?.length
    ? takenOrder
    : taken.flatMap((pack) => Array.from({ length: pack.count }, () => pack.items));
  const packs = orderToPacks(order);
  const remaining = remainingAfter(available, packs) || [];
  const nextSize = defaultPackToTake(remaining, packSize);
  const pieces = totalItems(packs);
  const leftoverOnly = leftoverOnlyStock(available, packSize) || leftoverOnlyStock(remaining, packSize);
  const meetsMoq = pieces >= minOrderQty || (leftoverOnly && pieces > 0);

  async function commit(nextOrder: number[]) {
    const nextPacks = orderToPacks(nextOrder);
    await (onChange || onSubmit)?.(nextPacks, nextOrder);
  }

  return (
    <div className="space-y-3" dir="rtl">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-shop-ink/15 bg-shop-paper disabled:opacity-40"
            disabled={!order.length || pending}
            onClick={() => commit(popLastPack(order))}
            aria-label="کم کردن بسته"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="min-w-8 text-center text-base tabular-nums">{faNumber(totalPacks(packs))}</span>
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-shop-ink text-shop-bone disabled:opacity-40"
            disabled={nextSize == null || pending}
            onClick={() => {
              const next = appendLargestPack(available, order, packSize);
              if (next) commit(next);
            }}
            aria-label="افزودن بسته"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <p className="min-w-0 flex-1 text-right text-sm text-shop-ink/70">
          {nextSize != null
            ? leftoverOnly || nextSize !== packSize
              ? `بسته بعدی: ${faNumber(nextSize)} تایی`
              : `بسته کامل ${faNumber(packSize)} تایی`
            : 'بسته‌ای نمانده'}
        </p>
      </div>
      {packs.length ? (
        <p className="text-xs text-shop-ink/55">{formatPacksFa(packs)}</p>
      ) : (
        <p className="text-xs text-shop-ink/45">با + از بزرگ‌ترین بسته موجود اضافه می‌شود.</p>
      )}
      <div className="flex items-center justify-end text-sm">
        <span className="font-medium text-shop-saffron">{toman(pieces * unitPrice)}</span>
      </div>
      {!meetsMoq && pieces > 0 ? (
        <p className="text-xs text-shop-madder">سفارش از {faNumber(minOrderQty)} عدد کمتر نشود.</p>
      ) : null}
      {mode === 'edit' && onRemove ? (
        <button type="button" className="text-xs text-shop-madder" onClick={onRemove}>
          حذف از سبد
        </button>
      ) : null}
    </div>
  );
}
