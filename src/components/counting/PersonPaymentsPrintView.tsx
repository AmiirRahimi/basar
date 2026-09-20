'use client';

import Link from 'next/link';
import { Button } from '@/ui';
import { displayName, faDate, faNumber, toman } from '@/lib/format';
import { paymentApplied } from '@/lib/checks';
import {
  type AccountInvoice,
  type AccountPayment,
  paymentPartTiles,
  paymentTarget,
} from '@/lib/payment-display';
import { buildPersonPaymentGroups, type PersonPaymentGroup } from '@/lib/person-payments';
import { Price } from './Price';

export type PersonPaymentsPrintScope = 'all' | 'payments' | 'invoices';

function paymentPartsLabel(row: AccountPayment) {
  const parts = paymentPartTiles(row);
  if (!parts.length) return '—';
  return parts
    .map((part) => `${part.label} ${toman(part.amount)}${part.note ? ` (${part.note})` : ''}`)
    .join(' · ');
}

function PaymentsTable({
  rows,
  payable,
  showInvoice,
}: {
  rows: AccountPayment[];
  payable: boolean;
  showInvoice?: boolean;
}) {
  if (!rows.length) {
    return <p className="text-sm text-gray-500">پرداختی ثبت نشده است.</p>;
  }
  return (
    <table className="w-full border-collapse text-sm">
      <thead className="invoice-print-table-header">
        <tr className="border-b bg-gray-100">
          <th className="p-2 text-right font-medium">تاریخ</th>
          {showInvoice ? <th className="p-2 text-right font-medium">فاکتور</th> : null}
          <th className="p-2 text-right font-medium">مبلغ</th>
          <th className="p-2 text-right font-medium">جزئیات</th>
          <th className="p-2 text-right font-medium">توضیح</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row._id} className="border-b align-top">
            <td className="p-2 whitespace-nowrap">{faDate(row.timeStamp)}</td>
            {showInvoice ? (
              <td className="p-2">{paymentTarget(row, payable)}</td>
            ) : null}
            <td className="p-2 whitespace-nowrap font-medium">{toman(paymentApplied(row))}</td>
            <td className="p-2">{paymentPartsLabel(row)}</td>
            <td className="p-2">{row.description ? String(row.description) : '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function InvoiceBlock({
  group,
  index,
  total,
}: {
  group: PersonPaymentGroup;
  index: number;
  total: number;
}) {
  const invoice = group.invoice;
  const settled = Number(invoice.remaining || 0) <= 0 && Number(invoice.total || 0) > 0;
  return (
    <section className="print-invoice-block space-y-4 break-inside-avoid border-b border-gray-200 pb-6">
      <header>
        <p className="text-xs text-gray-500">
          فاکتور {faNumber(index + 1)} از {faNumber(total)}
        </p>
        <h2 className="text-lg font-semibold">
          فاکتور {invoice.invoiceNumber || '—'}
          <span className="mr-2 text-sm font-normal text-gray-500">
            {settled ? '· تسویه شده' : '· مانده دارد'}
          </span>
        </h2>
        <p className="text-sm text-gray-600">تاریخ فاکتور: {faDate(invoice.timeStamp)}</p>
      </header>
      <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
        <div className="rounded-lg bg-gray-50 px-3 py-2">
          <dt className="text-[11px] text-gray-500">مبلغ فاکتور</dt>
          <dd className="font-medium">
            <Price value={invoice.total} />
          </dd>
        </div>
        <div className="rounded-lg bg-gray-50 px-3 py-2">
          <dt className="text-[11px] text-gray-500">پرداخت‌شده</dt>
          <dd className="font-medium">
            <Price value={invoice.paid} />
          </dd>
        </div>
        <div className="rounded-lg bg-gray-50 px-3 py-2">
          <dt className="text-[11px] text-gray-500">برگشتی</dt>
          <dd className="font-medium">
            <Price value={invoice.returnTotal || 0} />
          </dd>
        </div>
        <div className="rounded-lg bg-gray-50 px-3 py-2">
          <dt className="text-[11px] text-gray-500">مانده</dt>
          <dd className="font-medium">
            <Price value={invoice.remaining} />
          </dd>
        </div>
      </dl>
      <div>
        <h3 className="mb-2 text-sm font-medium">پرداخت‌های این فاکتور</h3>
        <PaymentsTable rows={group.payments} payable={false} />
      </div>
    </section>
  );
}

export function PersonPaymentsPrintView({
  personId,
  account,
  scope,
  invoiceIds,
}: {
  personId: string;
  account: {
    kind?: string;
    person?: unknown;
    remaining?: number;
    paidTotal?: number;
    returnTotal?: number;
    creditToCustomer?: number;
    invoices?: AccountInvoice[];
    payments?: AccountPayment[];
  };
  scope: PersonPaymentsPrintScope;
  invoiceIds?: string[];
}) {
  const payable = account.kind === 'payable';
  const backHref = `/counting/account/${personId}/payments`;
  const { groups, unassigned } = buildPersonPaymentGroups(
    account.invoices || [],
    account.payments || [],
  );
  const idSet = invoiceIds?.length ? new Set(invoiceIds.map(String)) : null;
  const selectedGroups =
    scope === 'invoices' && idSet
      ? groups.filter((group) => idSet.has(String(group.invoice._id)))
      : groups;
  const allPayments = [
    ...selectedGroups.flatMap((group) => group.payments),
    ...(scope === 'all' || scope === 'payments' ? unassigned : []),
  ];

  const title =
    scope === 'payments'
      ? 'فقط پرداخت‌ها'
      : scope === 'invoices'
        ? selectedGroups.length === 1
          ? `فاکتور ${selectedGroups[0]?.invoice.invoiceNumber || '—'} و پرداخت‌ها`
          : `${faNumber(selectedGroups.length)} فاکتور و پرداخت‌ها`
        : 'همه فاکتورها و پرداخت‌ها';

  return (
    <div className="print-container mx-auto min-h-screen max-w-4xl bg-white p-6 text-gray-900" dir="rtl">
      <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link href={backHref} className="text-sm text-primary">
          بازگشت به پرداخت‌ها
        </Link>
        <Button onClick={() => window.print()}>چاپ / ذخیره PDF</Button>
      </div>

      <article className="space-y-6">
        <header className="border-b pb-4">
          <h1 className="text-2xl font-semibold">{displayName(account.person)}</h1>
          <p className="mt-1 text-sm text-gray-600">{title}</p>
          <p className="mt-1 text-xs text-gray-500">تاریخ چاپ: {faDate(new Date().toISOString())}</p>
        </header>

        <dl className="grid gap-2 text-sm sm:grid-cols-3">
          <div className="rounded-lg bg-gray-50 px-3 py-2">
            <dt className="text-[11px] text-gray-500">پرداخت‌شده</dt>
            <dd className="font-semibold">{toman(account.paidTotal)}</dd>
          </div>
          <div className="rounded-lg bg-gray-50 px-3 py-2">
            <dt className="text-[11px] text-gray-500">
              {payable
                ? 'باید بپردازید'
                : Number(account.creditToCustomer || 0) > 0
                  ? 'بستانکار مشتری'
                  : 'باید بپردازد'}
            </dt>
            <dd className="font-semibold">
              {toman(
                Number(account.creditToCustomer || 0) > 0 ? account.creditToCustomer : account.remaining,
              )}
            </dd>
          </div>
          {Number(account.returnTotal || 0) > 0 ? (
            <div className="rounded-lg bg-gray-50 px-3 py-2">
              <dt className="text-[11px] text-gray-500">برگشتی</dt>
              <dd className="font-semibold">{toman(account.returnTotal)}</dd>
            </div>
          ) : null}
        </dl>

        {payable || scope === 'payments' ? (
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">فهرست پرداخت‌ها</h2>
            <PaymentsTable
              rows={payable ? account.payments || [] : allPayments}
              payable={payable}
              showInvoice={!payable}
            />
          </section>
        ) : (
          <div className="space-y-8">
            {selectedGroups.map((group, index) => (
              <InvoiceBlock
                key={String(group.invoice._id)}
                group={group}
                index={index}
                total={selectedGroups.length}
              />
            ))}
            {scope === 'all' && unassigned.length ? (
              <section className="space-y-3 break-inside-avoid">
                <h2 className="text-lg font-semibold">پرداخت روی مانده کل فاکتورها</h2>
                <PaymentsTable rows={unassigned} payable={false} showInvoice />
              </section>
            ) : null}
            {!selectedGroups.length && !(scope === 'all' && unassigned.length) ? (
              <p className="text-sm text-gray-500">موردی برای چاپ نیست.</p>
            ) : null}
          </div>
        )}
      </article>
    </div>
  );
}
