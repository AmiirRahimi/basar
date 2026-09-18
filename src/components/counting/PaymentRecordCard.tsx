'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { faDate, faNumber, toman } from '@/lib/format';
import { paymentApplied } from '@/lib/checks';
import {
  type AccountInvoice,
  type AccountPayment,
  paymentPartTiles,
  paymentTarget,
} from '@/lib/payment-display';

export function PaidBar({ paid, total }: { paid: number; total: number }) {
  const pct = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;
  return (
    <div>
      <div className="h-2 overflow-hidden rounded-full bg-gray-200">
        <div
          className={`h-full rounded-full ${pct >= 100 ? 'bg-emerald-500' : 'bg-teal-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-1 text-[11px] text-gray-500">{faNumber(pct)}٪ پرداخت شده</p>
    </div>
  );
}

export function InvoiceSettleCard({
  row,
  selected,
  href,
  onSelect,
  footer,
}: {
  row: AccountInvoice;
  selected?: boolean;
  href?: string;
  onSelect?: () => void;
  footer?: ReactNode;
}) {
  const settled = Number(row.remaining || 0) <= 0 && Number(row.total || 0) > 0;
  const counts = [
    row.paymentCount ? `${faNumber(row.paymentCount)} پرداخت` : '',
    row.cashCount ? `${faNumber(row.cashCount)} نقد` : '',
    row.checkCount ? `${faNumber(row.checkCount)} چک` : '',
  ].filter(Boolean);
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-gray-900">فاکتور {row.invoiceNumber || '—'}</p>
          <p className="mt-0.5 text-xs text-gray-500">{faDate(row.timeStamp)}</p>
        </div>
        {settled ? (
          <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-medium text-emerald-800">تسویه شده</span>
        ) : (
          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-medium text-amber-900">مانده دارد</span>
        )}
      </div>
      <div className="mt-3">
        <p className="text-[11px] text-gray-500">{settled ? 'چیزی برای پرداخت نمانده' : 'باید بپردازد'}</p>
        <p className={`text-xl font-semibold ${settled ? 'text-emerald-800' : 'text-gray-900'}`}>{toman(row.remaining)}</p>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-xl bg-white/80 px-3 py-2">
          <dt className="text-[11px] text-gray-500">مبلغ فاکتور</dt>
          <dd className="font-medium">{toman(row.total)}</dd>
        </div>
        <div className="rounded-xl bg-white/80 px-3 py-2">
          <dt className="text-[11px] text-gray-500">پرداخت‌شده</dt>
          <dd className="font-medium">{toman(row.paid)}</dd>
        </div>
        {Number(row.returnTotal || 0) > 0 ? (
          <div className="col-span-2 rounded-xl bg-white/80 px-3 py-2">
            <dt className="text-[11px] text-gray-500">برگشتی</dt>
            <dd className="font-medium">{toman(row.returnTotal)}</dd>
          </div>
        ) : null}
      </dl>
      <div className="mt-3">
        <PaidBar paid={Number(row.paid || 0) + Number(row.returnTotal || 0)} total={row.total} />
      </div>
      {counts.length ? <p className="mt-2 text-xs text-gray-600">{counts.join(' · ')}</p> : null}
      {!settled ? (
        <p className="mt-2 text-xs text-gray-500">این مانده را می‌توان با چند نقد و چند چک تسویه کرد.</p>
      ) : null}
    </>
  );

  return (
    <article
      className={`rounded-2xl border p-4 ${
        selected ? 'border-teal-300 bg-teal-50/80' : 'border-gray-100 bg-gray-50/80'
      }`}
    >
      {onSelect ? (
        <button type="button" className="w-full text-right" onClick={onSelect}>
          {body}
        </button>
      ) : (
        body
      )}
      {href ? (
        <Link
          href={href}
          className="mt-3 inline-flex text-xs font-medium text-teal-800 hover:underline"
          onClick={(event) => event.stopPropagation()}
        >
          ریز پرداخت‌ها
        </Link>
      ) : null}
      {footer}
    </article>
  );
}

export function PaymentRecordCard({
  row,
  payable,
  showTarget = true,
}: {
  row: AccountPayment;
  payable: boolean;
  showTarget?: boolean;
}) {
  const applied = paymentApplied(row);
  const parts = paymentPartTiles(row);
  return (
    <article className="rounded-2xl border border-gray-100 bg-white p-4">
      {showTarget ? (
        <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-800">
          {paymentTarget(row, payable)}
        </div>
      ) : null}
      <div className={`flex items-start justify-between gap-3 ${showTarget ? 'mt-3' : ''}`}>
        <div>
          <p className="text-xs text-gray-500">{faDate(row.timeStamp)}</p>
          <p className="mt-1 text-base font-semibold text-gray-900">{toman(applied)}</p>
          <p className="text-[11px] text-gray-500">جمع نقد، چک و تخفیف</p>
        </div>
      </div>
      {parts.length ? (
        <dl className="mt-3 grid grid-cols-2 gap-2">
          {parts.map((part) => (
            <div key={part.key} className={`rounded-xl px-3 py-2 ${part.className}`}>
              <dt className="text-[11px]">{part.label}</dt>
              <dd className="text-sm font-medium">{toman(part.amount)}</dd>
              {part.note ? <p className="mt-0.5 text-[11px] opacity-80">{part.note}</p> : null}
            </div>
          ))}
        </dl>
      ) : (
        <p className="mt-3 text-sm text-gray-500">مبلغی برای این ردیف ثبت نشده است.</p>
      )}
      {row.description ? <p className="mt-2 text-xs text-gray-600">{String(row.description)}</p> : null}
    </article>
  );
}
