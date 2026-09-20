'use client';

import Link from 'next/link';
import { Button } from '@/ui';
import { displayName, faDate, faNumber } from '@/lib/format';
import type { Invoice, Person, StoreRecord } from '@/lib/types';

export type BijakSender = {
  fullName?: string;
  phonenumber?: string;
  phoneNumber?: string;
  address?: string;
  city?: string;
};

function textOf(value: unknown) {
  if (value == null || value === '') return '';
  const text = String(value).trim();
  return text && text !== 'undefined' ? text : '';
}

function joinText(parts: unknown[], sep = '، ') {
  return parts.map(textOf).filter(Boolean).join(sep);
}

function phoneList(...groups: unknown[]) {
  const out: string[] = [];
  for (const group of groups) {
    const items = Array.isArray(group) ? group : [group];
    for (const item of items) {
      const text = textOf(item);
      if (text && !out.includes(text)) out.push(text);
    }
  }
  return out.join('، ');
}

function asPerson(value: Invoice['_client']): Person | null {
  return value && typeof value === 'object' ? value : null;
}

function asStore(value: Invoice['_storeId']): StoreRecord | null {
  return value && typeof value === 'object' ? value : null;
}

function asOwner(value: StoreRecord['_userId']): BijakSender | null {
  return value && typeof value === 'object' ? value : null;
}

function InfoBlock({
  title,
  name,
  phone,
  address,
}: {
  title: string;
  name: string;
  phone: string;
  address: string;
}) {
  return (
    <section className="space-y-1.5 border-t border-dashed border-gray-400 pt-3">
      <p className="text-[11px] font-semibold tracking-wide text-gray-500">{title}</p>
      <p className="text-sm font-semibold text-gray-900">{name || '—'}</p>
      <p className="text-[13px] text-gray-800">
        <span className="text-gray-500">تلفن: </span>
        <span dir="ltr" className="inline-block">
          {phone || '—'}
        </span>
      </p>
      <p className="text-[13px] leading-6 text-gray-800">
        <span className="text-gray-500">آدرس: </span>
        {address || '—'}
      </p>
    </section>
  );
}

export function InvoiceBijakView({
  invoice,
  sender,
}: {
  invoice: Invoice;
  sender?: BijakSender | null;
}) {
  const client = asPerson(invoice._client);
  const store = asStore(invoice._storeId);
  const owner = asOwner(store?._userId) || sender || null;
  const brandName =
    invoice.brandName ||
    (store?._brandId && typeof store._brandId === 'object' ? store._brandId.name : '') ||
    (invoice._brandId && typeof invoice._brandId === 'object' ? invoice._brandId.name : '');
  const storeName = invoice.storeName || store?.name || '';

  const senderName = textOf(owner?.fullName) || joinText([brandName, storeName]) || '—';
  const senderPhone = phoneList(
    owner?.phonenumber,
    owner?.phoneNumber,
    store?.phones,
    store?.phonenumbers,
    store?.landlines,
  );
  const senderAddress =
    joinText([owner?.city, owner?.address]) || joinText([store?.city, store?.address]);

  const customerName = displayName(client || invoice._client);
  const customerPhone = phoneList(client?.phoneNumber);
  const customerAddress = joinText([client?.city, invoice.receiverAddress || client?.address]);

  return (
    <div className="min-h-screen bg-zinc-200 px-4 py-6 text-gray-900 print:min-h-0 print:bg-white print:p-0" dir="rtl">
      <style>{`
        @media print {
          @page { size: 80mm 150mm; margin: 5mm; }
          html, body { background: #fff !important; margin: 0 !important; padding: 0 !important; }
          .no-print { display: none !important; }
          .print-bijak-sheet {
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: 0 !important;
            border-radius: 0 !important;
            padding: 0 !important;
          }
        }
      `}</style>

      <div className="no-print mx-auto mb-5 flex w-[min(20rem,100%)] flex-wrap items-center justify-between gap-3">
        <Link href={`/counting/invoices/${invoice._id}`} className="text-sm text-primary">
          بازگشت به فاکتور
        </Link>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/counting/invoices/${invoice._id}/print`}
            className="inline-flex h-9 items-center rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-700"
          >
            چاپ فاکتور
          </Link>
          <Button onClick={() => window.print()}>چاپ بیجک</Button>
        </div>
      </div>

      <article className="print-bijak-sheet mx-auto w-[80mm] max-w-full rounded-xl border border-gray-300 bg-white p-3.5 shadow-sm">
        <header className="space-y-1 pb-3 text-center">
          <p className="text-base font-bold leading-6">{brandName || '—'}</p>
          <p className="text-sm font-medium text-gray-800">{storeName || '—'}</p>
          <p className="pt-1 text-[13px] text-gray-600">
            بیجک · فاکتور {invoice.invoiceNumber != null ? faNumber(invoice.invoiceNumber) : '—'}
          </p>
          <p className="text-[12px] text-gray-500">تاریخ: {faDate(invoice.timeStamp)}</p>
        </header>

        <InfoBlock title="فرستنده" name={senderName} phone={senderPhone} address={senderAddress} />
        <InfoBlock title="گیرنده" name={customerName} phone={customerPhone} address={customerAddress} />
      </article>

      <p className="no-print mx-auto mt-4 w-[min(20rem,100%)] text-center text-xs text-gray-500">
        روی کاغذ کوچک چاپ می‌شود (۸۰×۱۵۰ میلی‌متر)، نه A4.
      </p>
    </div>
  );
}
