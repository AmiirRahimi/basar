'use client';

import { useEffect, useRef, useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { IconButton, fieldLabelClassName } from '@/ui';
import { faNumber } from '@/lib/format';
import {
  defaultPackToTake,
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
  const rootRef = useRef<HTMLDivElement | null>(null);
  const holdTimer = useRef<number | null>(null);
  const held = useRef(false);
  const pressed = useRef(false);

  const remaining = subtractPacks(available, taken) || [];
  const nextDefault = defaultPackToTake(remaining, packSize);
  const canTake = nextDefault != null;
  const canUntake = totalPacks(taken) > 0;
  const choices = remaining.filter((pack) => pack.count > 0);

  useEffect(() => {
    if (!pickerOpen) return;
    function onPointerDown(event: PointerEvent) {
      const root = rootRef.current;
      if (!root) return;
      if (event.target instanceof Node && root.contains(event.target)) return;
      setPickerOpen(false);
    }
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => document.removeEventListener('pointerdown', onPointerDown, true);
  }, [pickerOpen]);

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
    setPickerOpen(false);
    if (nextDefault != null) onTake(nextDefault);
  }

  function cancelHold() {
    clearHold();
    pressed.current = false;
  }

  return (
    <div ref={rootRef} className="relative flex flex-col gap-1.5">
      <span className={fieldLabelClassName()}>بسته</span>
      <div className="flex h-9 items-center gap-2">
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
        <div className="flex h-9 min-w-[4.5rem] items-center justify-center rounded-xl border border-gray-200 bg-white px-3 text-sm">
          {faNumber(totalPacks(taken))} بسته
        </div>
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
          aria-expanded={pickerOpen}
          title="کلیک برای بسته کامل؛ نگه دارید برای بسته دیگر"
        >
          <Plus className="h-4 w-4" />
        </IconButton>
      </div>
      {pickerOpen ? (
        <div className="absolute start-0 top-full z-20 mt-1 w-56 space-y-2 rounded-xl border border-gray-200 bg-white p-3 shadow-lg">
          <p className="text-sm font-medium">انتخاب بسته</p>
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
                    {faNumber(remainingOf(remaining, pack.items))} مانده
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">بسته‌ای نمانده است</p>
          )}
        </div>
      ) : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
