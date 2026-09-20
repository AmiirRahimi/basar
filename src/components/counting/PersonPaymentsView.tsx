'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronRight, Printer } from 'lucide-react';
import { Button, Checkbox } from '@/ui';
import { displayName, faDate, faNumber, toman } from '@/lib/format';
import { paymentApplied } from '@/lib/checks';
import {
  type AccountInvoice,
  type AccountPayment,
  paymentMethodCounts,
  paymentPartTiles,
  paymentTarget,
} from '@/lib/payment-display';
import { buildPersonPaymentGroups, personPaymentsPrintHref } from '@/lib/person-payments';
import { InvoiceSettleCard, PaymentRecordCard } from './PaymentRecordCard';

function downloadPaymentsCsv(personName: string, payments: AccountPayment[], payable: boolean) {
  const header = ['تاریخ', 'فاکتور', 'مبلغ', 'جزئیات', 'توضیح'];
  const lines = payments.map((row) => {
    const parts = paymentPartTiles(row)
      .map((part) => `${part.label} ${part.amount}${part.note ? ` ${part.note}` : ''}`)
      .join(' | ');
    return [
      faDate(row.timeStamp),
      paymentTarget(row, payable),
      String(paymentApplied(row)),
      parts,
      row.description ? String(row.description) : '',
    ]
      .map((cell) => `"${String(cell).replaceAll('"', '""')}"`)
      .join(',');
  });
  const csv = `\uFEFF${[header.join(','), ...lines].join('\n')}`;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `payments-${personName || 'customer'}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function sortFlat(rows: AccountPayment[]) {
  return [...rows].sort(
    (a, b) => new Date(b.timeStamp || 0).getTime() - new Date(a.timeStamp || 0).getTime(),
  );
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
  const router = useRouter();
  const payable = account.kind === 'payable';
  const { groups: allGroups, unassigned } = useMemo(
    () => buildPersonPaymentGroups(account.invoices || [], account.payments || []),
    [account.invoices, account.payments],
  );
  const groups = useMemo(
    () => allGroups.filter((group) => (invoiceId ? String(group.invoice._id) === invoiceId : true)),
    [allGroups, invoiceId],
  );
  const payments = useMemo(
    () =>
      sortFlat(
        invoiceId
          ? groups.flatMap((group) => group.payments)
          : [...groups.flatMap((group) => group.payments), ...unassigned],
      ),
    [groups, invoiceId, unassigned],
  );
  const counts = paymentMethodCounts(account.payments || []);
  const showUnassigned = !invoiceId && unassigned.length > 0;
  const selectedInvoice = invoiceId
    ? allGroups.find((group) => String(group.invoice._id) === invoiceId)?.invoice
    : null;

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const canSelect = !payable && !invoiceId && groups.length > 0;

  function toggleSelected(id: string) {
    setSelectedIds((rows) => (rows.includes(id) ? rows.filter((row) => row !== id) : [...rows, id]));
  }

  function toggleAll() {
    if (selectedIds.length === groups.length) {
      setSelectedIds([]);
      return;
    }
    setSelectedIds(groups.map((group) => String(group.invoice._id)));
  }

  const printAllHref = personPaymentsPrintHref(personId, { scope: 'all' });
  const printPaymentsHref = personPaymentsPrintHref(personId, { scope: 'payments' });
  const printSelectedHref = personPaymentsPrintHref(personId, {
    scope: 'invoices',
    ids: invoiceId ? [invoiceId] : selectedIds,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/counting/account" className="inline-flex items-center gap-1 text-sm text-teal-800 hover:underline">
          <ChevronRight className="h-4 w-4" />
          بازگشت به حساب
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          {invoiceId ? (
            <Button size="sm" variant="outline" onClick={() => router.push(printSelectedHref)}>
              <Printer className="ml-1.5 h-3.5 w-3.5" />
              چاپ این فاکتور و پرداخت‌ها
            </Button>
          ) : (
            <>
              <Button size="sm" variant="outline" onClick={() => router.push(printAllHref)}>
                <Printer className="ml-1.5 h-3.5 w-3.5" />
                چاپ همه فاکتورها و پرداخت‌ها
              </Button>
              <Button size="sm" variant="outline" onClick={() => router.push(printPaymentsHref)}>
                چاپ فقط پرداخت‌ها
              </Button>
              {canSelect ? (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!selectedIds.length}
                  onClick={() => router.push(printSelectedHref)}
                >
                  چاپ انتخاب‌شده‌ها ({faNumber(selectedIds.length)})
                </Button>
              ) : null}
            </>
          )}
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!payments.length}
            onClick={() => downloadPaymentsCsv(displayName(account.person), payments, payable)}
          >
            خروجی CSV پرداخت‌ها
          </Button>
        </div>
      </div>

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
              {payable
                ? 'باید بپردازید'
                : Number(account.creditToCustomer || 0) > 0
                  ? 'بستانکار مشتری'
                  : 'باید بپردازد'}
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

      {canSelect ? (
        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
          <Checkbox
            checked={selectedIds.length > 0 && selectedIds.length === groups.length}
            onChange={toggleAll}
            label="انتخاب همه فاکتورها برای چاپ"
          />
          <span className="text-xs text-gray-400">{faNumber(selectedIds.length)} فاکتور انتخاب شده</span>
        </div>
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
            const id = String(group.invoice._id);
            return (
              <section
                key={id}
                id={`invoice-${id}`}
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
                    <div className="min-w-0 flex-1 space-y-2">
                      <div>
                        <p className="text-[11px] font-medium text-gray-500">
                          فاکتور {faNumber(index + 1)} از {faNumber(groups.length)}
                        </p>
                        <h3 className="mt-0.5 text-base font-semibold text-gray-900">
                          فاکتور {group.invoice.invoiceNumber || '—'}
                        </h3>
                      </div>
                      {canSelect ? (
                        <Checkbox
                          checked={selectedIds.includes(id)}
                          onChange={() => toggleSelected(id)}
                          label="انتخاب برای چاپ"
                        />
                      ) : null}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {settled ? (
                        <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-medium text-emerald-800">
                          تسویه شده
                        </span>
                      ) : (
                        <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-medium text-amber-900">
                          مانده دارد
                        </span>
                      )}
                      <button
                        type="button"
                        className="text-xs font-medium text-teal-800 hover:underline"
                        onClick={() =>
                          router.push(personPaymentsPrintHref(personId, { scope: 'invoices', ids: [id] }))
                        }
                      >
                        چاپ این فاکتور
                      </button>
                    </div>
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
