'use client';

import { faNumber, toman } from '@/lib/format';
import { packLabelFa, remainingOf, subtractPacks, totalItems, type ClothPack } from '@/lib/packs';
import { cn } from '@/ui/lib/cn';
import { Minus, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';

function uniqueSizes(available: ClothPack[], taken: ClothPack[]) {
  return [...new Set([...available, ...taken].map((pack) => pack.items).filter((items) => items > 0))].sort((a, b) => b - a);
}

export function ShopPackPicker({
  packSize,
  available,
  taken = [],
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
  unitPrice: number;
  minOrderQty: number;
  pending?: boolean;
  mode?: 'add' | 'edit';
  onSubmit?: (packs: ClothPack[], takenOrder: number[]) => Promise<void> | void;
  onChange?: (packs: ClothPack[], takenOrder: number[]) => Promise<void> | void;
  onRemove?: () => void;
}) {
  const [draftOrder, setDraftOrder] = useState<number[]>(() =>
    taken.flatMap((pack) => Array.from({ length: pack.count }, () => pack.items)),
  );
  const [message, setMessage] = useState('');
  const controlled = !onSubmit;
  const order = controlled
    ? taken.flatMap((pack) => Array.from({ length: pack.count }, () => pack.items))
    : draftOrder;
  const packs = useMemo(() => {
    const map = new Map<number, number>();
    for (const items of order) map.set(items, (map.get(items) || 0) + 1);
    return [...map.entries()]
      .sort((a, b) => b[0] - a[0])
      .map(([items, count]) => ({ items, count }));
  }, [order]);
  const remaining = subtractPacks(available, packs) || [];
  const pieces = totalItems(packs);
  const sizes = uniqueSizes(available, packs);
  const meetsMoq = pieces >= minOrderQty;

  async function emit(nextOrder: number[]) {
    const nextPacks = nextOrder.reduce((rows, items) => {
      const found = rows.find((row) => row.items === items);
      if (found) found.count += 1;
      else rows.push({ items, count: 1 });
      return rows;
    }, [] as ClothPack[]);
    const merged = nextPacks.sort((a, b) => b.items - a.items);
    if (!controlled) setDraftOrder(nextOrder);
    setMessage('');
    await onChange?.(merged, nextOrder);
  }

  async function plus(items: number) {
    if (remainingOf(remaining, items) < 1) return;
    await emit([...order, items]);
  }

  async function minus(items: number) {
    const index = order.lastIndexOf(items);
    if (index < 0) return;
    await emit(order.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-3" dir="rtl">
      <p className="text-sm text-shop-ink/70">{packLabelFa(packSize)}</p>
      <div className="grid gap-2">
        {sizes.length ? (
          sizes.map((items) => {
            const have = remainingOf(packs, items);
            const left = remainingOf(remaining, items);
            const full = items === packSize;
            return (
              <div
                key={items}
                className={cn(
                  'flex items-center gap-3 rounded-2xl border px-3 py-2.5',
                  full ? 'border-shop-saffron/40 bg-shop-saffron/8' : 'border-shop-ink/10 bg-shop-paper',
                )}
              >
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-shop-ink/15 bg-shop-paper disabled:opacity-40"
                    disabled={!have || pending}
                    onClick={() => minus(items)}
                    aria-label="کم کردن بسته"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="min-w-8 text-center text-sm tabular-nums">{faNumber(have)}</span>
                  <button
                    type="button"
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-shop-ink text-shop-bone disabled:opacity-40"
                    disabled={left < 1 || pending}
                    onClick={() => plus(items)}
                    aria-label="افزودن بسته"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
                <p className="min-w-0 flex-1 text-right text-sm font-medium">{packLabelFa(items)}</p>
              </div>
            );
          })
        ) : (
          <p className="rounded-2xl border border-dashed border-shop-ink/15 px-3 py-4 text-sm text-shop-ink/50">
            بسته‌ای برای فروش نمانده است.
          </p>
        )}
      </div>
      <div className="flex items-center justify-end text-sm">
        <span className="font-medium text-shop-saffron">{toman(pieces * unitPrice)}</span>
      </div>
      {!meetsMoq && pieces > 0 ? (
        <p className="text-xs text-shop-madder">سفارش از {packLabelFa(packSize)} کمتر نشود.</p>
      ) : null}
      {mode === 'edit' && onRemove ? (
        <button type="button" className="text-xs text-shop-madder" onClick={onRemove}>
          حذف از سبد
        </button>
      ) : null}
      {onSubmit ? (
        <button
          type="button"
          disabled={pending || !meetsMoq}
          onClick={async () => {
            if (!meetsMoq) {
              setMessage(`سفارش از ${packLabelFa(packSize)} کمتر نشود`);
              return;
            }
            await onSubmit(packs, order);
          }}
          className="w-full rounded-full bg-shop-saffron py-3 text-sm font-medium text-shop-ink disabled:opacity-50"
        >
          {pending ? 'در حال ثبت...' : pieces ? 'ثبت بسته‌ها در سبد' : 'بسته‌ای انتخاب نشده'}
        </button>
      ) : null}
      {message ? <p className="text-xs text-shop-madder">{message}</p> : null}
    </div>
  );
}
