'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { displayName, faNumber, toman } from '@/lib/format';
import {
  type AccountInvoice,
  type AccountPayment,
  invoiceKey,
  paymentMethodCounts,
} from '@/lib/payment-display';
import { InvoiceSettleCard, PaymentRecordCard } from './PaymentRecordCard';

function sortPayments(rows: AccountPayment[]) {
  return [...rows].sort((a, b) => new Date(b.timeStamp || 0).getTime() - new Date(a.timeStamp || 0).getTime());
}

export function PersonPaymentsView({
  account,
  personId,
  invoiceId,
}: {
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
  personId: string;
  invoiceId?: string;
}) {
  const payable = account.kind === 'payable';
  const invoices = account.invoices || [];
  const payments = sortPayments(account.payments || []);
  const counts = paymentMethodCounts(payments);
  const byInvoice = new Map<string, AccountPayment[]>();
  const unassigned: AccountPayment[] = [];
  for (const row of payments) {
    const id = invoiceKey(row._invoice);
    if (!id) {
      unassigned.push(row);
      continue;
    }
    const list = byInvoice.get(id) || [];
    list.push(row);
    byInvoice.set(id, list);
  }
  const known = new Set(invoices.map((row) => String(row._id)));
  const extraInvoices: AccountInvoice[] = [...byInvoice.entries()]
    .filter(([id]) => !known.has(id))
    .map(([id, rows]) => {
      const sample = rows[0]?._invoice;
      const invoiceNumber = sample && typeof sample === 'object' ? sample.invoiceNumber : undefined;
      const paid = paymentMethodCounts(rows).paidTotal;
      return {
        _id: id,
        invoiceNumber,
        total: paid,
        paid,
        remaining: 0,
        ...paymentMethodCounts(rows),
      };
    });
  const groups = [...invoices, ...extraInvoices]
    .sort((a, b) => {
      const aOpen = Number(a.remaining || 0) > 0 ? 1 : 0;
      const bOpen = Number(b.remaining || 0) > 0 ? 1 : 0;
      if (aOpen !== bOpen) return bOpen - aOpen;
      return new Date(b.timeStamp || 0).getTime() - new Date(a.timeStamp || 0).getTime();
    })
    .map((invoice) => ({
      invoice,
      payments: byInvoice.get(String(invoice._id)) || [],
    }))
    .filter((group) => (invoiceId ? String(group.invoice._id) === invoiceId : true));
  const showUnassigned = !invoiceId && unassigned.length > 0;
  const selectedInvoice = invoiceId
    ? [...invoices, ...extraInvoices].find((row) => String(row._id) === invoiceId)
    : null;

  return (
    <div className="space-y-6">
      <Link href="/counting/account" className="inline-flex items-center gap-1 text-sm text-teal-800 hover:underline">
        <ChevronRight className="h-4 w-4" />
        بازگشت به حساب
      </Link>
      <section className="rounded-2xl border border-gray-100 bg-white p-4">
        <h2 className="text-sm font-medium text-gray-900">{displayName(account.person)}</h2>
        <p className="mt-1 text-xs text-gray-500">
          {faNumber(counts.paymentCount)} پرداخت
          {counts.cashCount ? ` · ${faNumber(counts.cashCount)} نقد` : ''}
          {counts.checkCount ? ` · ${faNumber(counts.checkCount)} چک` : ''}
        </p>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-gray-50 px-3 py-2">
            <dt className="text-[11px] text-gray-500">پرداخت‌شده</dt>
            <dd className="text-base font-semibold">{toman(account.paidTotal ?? counts.paidTotal)}</dd>
          </div>
          <div className="rounded-xl bg-gray-50 px-3 py-2">
            <dt className="text-[11px] text-gray-500">
              {payable ? 'باید بپردازید' : Number(account.creditToCustomer || 0) > 0 ? 'بستانکار مشتری' : 'باید بپردازد'}
            </dt>
            <dd className="text-base font-semibold">
              {toman(Number(account.creditToCustomer || 0) > 0 ? account.creditToCustomer : account.remaining)}
            </dd>
          </div>
          {Number(account.returnTotal || 0) > 0 ? (
            <div className="rounded-xl bg-gray-50 px-3 py-2 sm:col-span-2">
              <dt className="text-[11px] text-gray-500">برگشتی</dt>
              <dd className="text-base font-semibold">{toman(account.returnTotal)}</dd>
            </div>
          ) : null}
        </dl>
      </section>
      {selectedInvoice ? (
        <p className="text-sm text-gray-600">
          فقط پرداخت‌های فاکتور {selectedInvoice.invoiceNumber || '—'} نمایش داده می‌شود.{' '}
          <Link href={`/counting/account/${personId}/payments`} className="text-teal-800 hover:underline">
            همه فاکتورها
          </Link>
        </p>
      ) : null}
      {payable ? (
        <section className="space-y-3">
          <h3 className="font-medium">پرداخت‌های مانده بدهی</h3>
          {payments.length ? (
            payments.map((row) => <PaymentRecordCard key={row._id} row={row} payable />)
          ) : (
            <p className="rounded-2xl border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-500">
              هنوز پرداختی ثبت نشده است.
            </p>
          )}
        </section>
      ) : (
        <div className="space-y-10">
          {groups.map((group, index) => {
            const settled =
              Number(group.invoice.remaining || 0) <= 0 && Number(group.invoice.total || 0) > 0;
            return (
              <section
                key={String(group.invoice._id)}
                id={`invoice-${group.invoice._id}`}
                className="overflow-hidden rounded-3xl border-2 border-gray-200 bg-white shadow-sm"
              >
                <header
                  className={`border-b px-4 py-3 sm:px-5 ${
                    settled
                      ? 'border-emerald-100 bg-emerald-50/70'
                      : 'border-amber-100 bg-amber-50/70'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-[11px] font-medium text-gray-500">
                        فاکتور {faNumber(index + 1)} از {faNumber(groups.length)}
                      </p>
                      <h3 className="mt-0.5 text-base font-semibold text-gray-900">
                        فاکتور {group.invoice.invoiceNumber || '—'}
                      </h3>
                    </div>
                    {settled ? (
                      <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-medium text-emerald-800">
                        تسویه شده
                      </span>
                    ) : (
                      <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-medium text-amber-900">
                        مانده دارد
                      </span>
                    )}
                  </div>
                </header>

                <div className="space-y-4 p-4 sm:p-5">
                  <InvoiceSettleCard row={group.invoice} embedded />

                  <div className="space-y-3 border-t border-dashed border-gray-200 pt-4">
                    <h4 className="text-sm font-medium text-gray-800">
                      پرداخت‌های فاکتور {group.invoice.invoiceNumber || '—'}
                      <span className="mr-2 text-xs font-normal text-gray-500">
                        ({faNumber(group.payments.length)} مورد)
                      </span>
                    </h4>
                    {group.payments.length ? (
                      <div className="space-y-3 rounded-2xl bg-gray-50/80 p-3">
                        {group.payments.map((row) => (
                          <PaymentRecordCard
                            key={row._id}
                            row={row}
                            payable={false}
                            showTarget={false}
                          />
                        ))}
                      </div>
                    ) : (
                      <p className="rounded-2xl border border-dashed border-gray-200 px-4 py-6 text-center text-sm text-gray-500">
                        برای این فاکتور پرداختی ثبت نشده است.
                      </p>
                    )}
                  </div>
                </div>
              </section>
            );
          })}
          {showUnassigned ? (
            <section className="overflow-hidden rounded-3xl border-2 border-gray-200 bg-white shadow-sm">
              <header className="border-b border-gray-100 bg-gray-50 px-4 py-3 sm:px-5">
                <h3 className="text-base font-semibold text-gray-900">پرداخت روی مانده کل فاکتورها</h3>
                <p className="mt-0.5 text-xs text-gray-500">به یک فاکتور خاص وصل نشده‌اند</p>
              </header>
              <div className="space-y-3 bg-gray-50/80 p-4 sm:p-5">
                {unassigned.map((row) => (
                  <PaymentRecordCard key={row._id} row={row} payable={false} />
                ))}
              </div>
            </section>
          ) : null}
          {!groups.length && !showUnassigned ? (
            <p className="rounded-2xl border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-500">
              هنوز پرداختی برای این شخص ثبت نشده است.
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
