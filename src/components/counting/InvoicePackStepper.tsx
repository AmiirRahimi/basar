'use client';

import { useRef, useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { IconButton, Popover, PopoverAnchor, PopoverContent } from '@/ui';
import { faNumber } from '@/lib/format';
import {
  defaultPackToTake,
  formatStockFa,
  formatTakenFa,
  remainingOf,
  subtractPacks,
  totalPacks,
  type ClothPack,
} from '@/lib/packs';

const HOLD_MS = 420;

export function InvoicePackStepper({
  packSize,
  available,
  taken,
  error,
  onTake,
  onUntake,
}: {
  packSize: number;
  available: ClothPack[];
  taken: ClothPack[];
  error?: string;
  onTake: (items: number) => void;
  onUntake: () => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const holdTimer = useRef<number | null>(null);
  const held = useRef(false);
  const pressed = useRef(false);

  const remaining = subtractPacks(available, taken) || [];
  const nextDefault = defaultPackToTake(remaining, packSize);
  const canTake = nextDefault != null;
  const canUntake = totalPacks(taken) > 0;
  const choices = remaining.filter((pack) => pack.count > 0);

  function clearHold() {
    if (holdTimer.current != null) {
      window.clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
  }

  function startHold() {
    pressed.current = true;
    held.current = false;
    clearHold();
    holdTimer.current = window.setTimeout(() => {
      held.current = true;
      if (choices.length) setPickerOpen(true);
    }, HOLD_MS);
  }

  function endHold() {
    clearHold();
    if (!pressed.current) return;
    pressed.current = false;
    if (held.current) return;
    if (nextDefault != null) onTake(nextDefault);
  }

  function cancelHold() {
    clearHold();
    pressed.current = false;
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-gray-500">موجودی: {formatStockFa(available)}</p>
      <div className="flex items-center gap-2">
        <IconButton
          type="button"
          variant="outline"
          size="sm"
          disabled={!canUntake}
          onClick={onUntake}
          aria-label="کم کردن بسته"
        >
          <Minus className="h-4 w-4" />
        </IconButton>
        <div className="min-w-[4.5rem] rounded-xl border border-gray-200 bg-white px-3 py-2 text-center text-sm">
          {faNumber(totalPacks(taken))} بسته
        </div>
        <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
          <PopoverAnchor asChild>
            <IconButton
              type="button"
              variant="outline"
              size="sm"
              className="touch-none"
              disabled={!canTake}
              onPointerDown={startHold}
              onPointerUp={endHold}
              onPointerLeave={cancelHold}
              onPointerCancel={cancelHold}
              onContextMenu={(e) => e.preventDefault()}
              aria-label="افزودن بسته"
              title="کلیک برای بسته کامل؛ نگه دارید برای انتخاب بسته دیگر"
            >
              <Plus className="h-4 w-4" />
            </IconButton>
          </PopoverAnchor>
          <PopoverContent align="end" className="w-64 space-y-2 p-3" dir="rtl">
            <p className="text-sm font-medium">انتخاب بسته</p>
            <p className="text-xs text-gray-500">بسته کامل در اولویت است؛ بسته‌های ناقص را از اینجا انتخاب کنید.</p>
            {choices.length ? (
              <div className="grid gap-2">
                {choices.map((pack) => (
                  <button
                    key={pack.items}
                    type="button"
                    className="rounded-lg border border-gray-200 px-3 py-2 text-right text-sm hover:border-primary/40 hover:bg-primary/5"
                    onClick={() => {
                      onTake(pack.items);
                      setPickerOpen(false);
                    }}
                  >
                    {faNumber(pack.items)} تایی
                    <span className="mr-2 text-xs text-gray-500">
                      {faNumber(remainingOf(remaining, pack.items))} بسته مانده
                      {pack.items === packSize ? ' — کامل' : ' — ناقص'}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">بسته‌ای نمانده است</p>
            )}
          </PopoverContent>
        </Popover>
      </div>
      <p className="text-xs text-gray-600">{formatTakenFa(taken)}</p>
      <p className="text-xs text-gray-500">مانده: {formatStockFa(remaining)}</p>
      <p className="text-[11px] text-gray-400">برای انتخاب بسته ناقص، دکمه به‌علاوه را نگه دارید.</p>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
