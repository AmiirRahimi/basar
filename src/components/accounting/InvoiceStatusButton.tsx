'use client';

import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  WHOLESALE_INVOICE_STATUSES,
  wholesaleInvoiceStatusLabel,
  type WholesaleInvoiceStatus,
} from '@/lib/invoice-status';
import { cn } from '@/ui';

export function InvoiceStatusButton({
  status,
  disabled,
  onChange,
}: {
  status: WholesaleInvoiceStatus;
  disabled?: boolean;
  onChange: (status: WholesaleInvoiceStatus) => void;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const closeTimer = useRef<number | null>(null);
  const [open, setOpen] = useState(false);
  const [place, setPlace] = useState({ top: 0, right: 0 });
  const current = WHOLESALE_INVOICE_STATUSES.findIndex((item) => item.id === status);

  function show() {
    if (disabled) return;
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) setPlace({ top: rect.bottom + 8, right: Math.max(8, window.innerWidth - rect.right) });
    setOpen(true);
  }

  function hide() {
    closeTimer.current = window.setTimeout(() => setOpen(false), 140);
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-800 shadow-sm transition hover:border-gray-300"
      >
        {wholesaleInvoiceStatusLabel(status)}
      </button>
      {open
        ? createPortal(
            <div
              style={{ top: place.top, right: place.right }}
              onMouseEnter={show}
              onMouseLeave={hide}
              className="fixed z-[80] w-56 rounded-2xl border border-gray-200 bg-white p-3 shadow-lg"
              dir="rtl"
            >
              <p className="mb-2 text-xs text-gray-500">مراحل وضعیت فاکتور</p>
              <ol>
                {WHOLESALE_INVOICE_STATUSES.map((item, index) => {
                  const done = index < current;
                  const active = index === current;
                  return (
                    <li key={item.id} className="flex gap-2">
                      <span className="flex w-3 flex-col items-center pt-2">
                        <span
                          className={cn(
                            'h-2.5 w-2.5 rounded-full border',
                            active
                              ? 'border-teal-700 bg-teal-600'
                              : done
                                ? 'border-teal-600 bg-teal-500'
                                : 'border-gray-300 bg-white',
                          )}
                        />
                        {index < WHOLESALE_INVOICE_STATUSES.length - 1 ? (
                          <span className={cn('mt-1 h-5 w-px', done ? 'bg-teal-400' : 'bg-gray-200')} />
                        ) : null}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setOpen(false);
                          if (item.id !== status) onChange(item.id);
                        }}
                        className={cn(
                          'mb-1 flex-1 rounded-xl px-2 py-1.5 text-right text-sm',
                          active ? 'bg-teal-50 font-medium text-teal-900' : 'text-gray-700 hover:bg-gray-50',
                        )}
                      >
                        {item.label}
                      </button>
                    </li>
                  );
                })}
              </ol>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
