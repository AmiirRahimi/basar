'use client';

import Link from 'next/link';
import { Button } from '@/ui';
import { displayName, faDate, toman } from '@/lib/format';
import type { CartLine, Invoice } from '@/lib/types';

export function InvoicePrintView({ invoice, lines }: { invoice: Invoice; lines: CartLine[] }) {
  const totalCount = lines.reduce((sum, line) => sum + Number(line.count || 0), 0);
  const totalAmount = lines.reduce(
    (sum, line) => sum + Number(line.count || 0) * Number(line.price || 0),
    0,
  );

  return (
    <div className="print-container mx-auto min-h-screen max-w-3xl bg-white p-6 text-gray-900" dir="rtl">
      <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link href="/counting/invoices" className="text-sm text-primary">
          بازگشت به فاکتورها
        </Link>
        <Button onClick={() => window.print()}>چاپ</Button>
      </div>

      <article className="space-y-6">
        <header className="border-b pb-4">
          <h1 className="text-2xl font-semibold">فاکتور #{invoice.invoiceNumber ?? invoice._id}</h1>
          <p className="mt-2 text-sm text-gray-600">تاریخ: {faDate(invoice.timeStamp)}</p>
        </header>

        <section className="grid gap-1 text-sm">
          <p>
            <span className="text-gray-500">صاحب فاکتور: </span>
            {displayName(invoice._client)}
          </p>
          <p>
            <span className="text-gray-500">آدرس: </span>
            {invoice.receiverAddress || '—'}
          </p>
        </section>

        <table className="w-full border-collapse text-sm">
          <thead className="invoice-print-table-header">
            <tr className="border-b bg-gray-100">
              <th className="p-3 text-right font-medium">محصول</th>
              <th className="p-3 text-right font-medium">تعداد</th>
              <th className="p-3 text-right font-medium">فی</th>
              <th className="p-3 text-right font-medium">مبلغ ردیف</th>
            </tr>
          </thead>
          <tbody>
            {lines.length ? (
              lines.map((line, index) => (
                <tr key={line._id || `${relationFallback(line)}-${index}`} className="border-b">
                  <td className="p-3">{displayName(line._cloth)}</td>
                  <td className="p-3">{line.count}</td>
                  <td className="p-3">{toman(line.price)}</td>
                  <td className="p-3">{toman(Number(line.count || 0) * Number(line.price || 0))}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="p-3 text-gray-500" colSpan={4}>
                  قلمی ثبت نشده است
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="font-medium">
              <td className="p-3">جمع</td>
              <td className="p-3">{totalCount}</td>
              <td className="p-3" />
              <td className="p-3">{toman(totalAmount)}</td>
            </tr>
          </tfoot>
        </table>
      </article>
    </div>
  );
}

function relationFallback(line: CartLine) {
  if (line._cloth && typeof line._cloth === 'object') return String(line._cloth._id || '');
  return String(line._cloth || '');
}
